import { useCallback, useEffect, useState } from 'react';

import type { AnalyticsDateRange, AnalyticsSectionId, AnalyticsSnapshot } from '@/domain/analytics';
import { AnalyticsApiError, loadAnalyticsSnapshot } from '@/services/analytics-api';
import { appEnvironment } from '@/services/backend-api';
import { getStoredSessionToken } from '@/services/roblox-auth';

export type AnalyticsQuickLookSection = Extract<
  AnalyticsSectionId,
  'engagement' | 'retention' | 'acquisition' | 'monetization' | 'performance'
>;

export type AnalyticsQuickLookSnapshots = Partial<Record<AnalyticsQuickLookSection, AnalyticsSnapshot>>;

type QuickLookTarget = Readonly<{
  section: AnalyticsQuickLookSection;
  ranges: readonly AnalyticsDateRange[];
}>;

const targets: readonly QuickLookTarget[] = [
  { section: 'engagement', ranges: ['28D'] },
  { section: 'retention', ranges: ['56D', '28D'] },
  { section: 'acquisition', ranges: ['56D', '28D', '7D'] },
  { section: 'monetization', ranges: ['28D'] },
  { section: 'performance', ranges: ['24H', '7D', '28D'] },
];

export function useAnalyticsQuickLook({
  universeId,
  enabled = true,
}: {
  universeId: string;
  enabled?: boolean;
}) {
  const canLoad = enabled && appEnvironment.dataMode === 'aws_dev' && /^\d+$/.test(universeId);
  const [snapshots, setSnapshots] = useState<AnalyticsQuickLookSnapshots>({});
  const [loading, setLoading] = useState(canLoad);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    if (!canLoad) {
      return () => controller.abort();
    }

    void (async () => {
      if (active) setLoading(true);
      try {
        const sessionToken = await getStoredSessionToken();
        if (!sessionToken) return;

        const entries: [AnalyticsQuickLookSection, AnalyticsSnapshot | undefined][] = [];
        for (const target of targets) {
          const snapshot = await loadFirstCachedSnapshot({
            universeId,
            target,
            sessionToken,
            signal: controller.signal,
          });
          entries.push([target.section, snapshot]);
        }

        if (active) {
          setSnapshots(Object.fromEntries(entries.filter((entry) => Boolean(entry[1]))) as AnalyticsQuickLookSnapshots);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, canLoad, universeId]);

  return {
    snapshots: canLoad ? snapshots : {},
    loading: canLoad ? loading : false,
    reload,
  };
}

async function loadFirstCachedSnapshot({
  universeId,
  target,
  sessionToken,
  signal,
}: {
  universeId: string;
  target: QuickLookTarget;
  sessionToken: string;
  signal: AbortSignal;
}): Promise<AnalyticsSnapshot | undefined> {
  for (const range of target.ranges) {
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const result = await loadAnalyticsSnapshot({
            universeId,
            section: target.section,
            range,
            sessionToken,
            signal,
            sampleSnapshot: emptySnapshot(universeId, target.section, range),
          });
          if (result.snapshot.metrics.length > 0) return result.snapshot;
          break;
        } catch (error) {
          if (signal.aborted) return undefined;
          if (error instanceof AnalyticsApiError && error.code === 'analytics_snapshot_not_found') break;
          if (error instanceof AnalyticsApiError && error.status >= 500 && attempt === 0) continue;
          return undefined;
        }
      }
    } catch {
      if (signal.aborted) return undefined;
      // Quick-look cards are supplemental. The section screen owns actionable errors and retry UI.
      return undefined;
    }
  }
  return undefined;
}

function emptySnapshot(
  universeId: string,
  section: AnalyticsQuickLookSection,
  range: AnalyticsDateRange,
): AnalyticsSnapshot {
  return {
    mode: 'sample',
    source: 'sample_data',
    freshness: 'fixture',
    universeId,
    section,
    range,
    metrics: [],
    charts: [],
    breakdowns: [],
    message: 'Local placeholder used only by Sample Mode.',
  };
}
