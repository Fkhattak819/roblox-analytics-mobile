import { useCallback, useEffect, useState } from 'react';

import type { AnalyticsDateRange, AnalyticsSectionId, AnalyticsSnapshot } from '@/domain/analytics';
import {
  AnalyticsApiError,
  loadAnalyticsSnapshot,
  requestAnalyticsSync,
} from '@/services/analytics-api';
import { appEnvironment } from '@/services/backend-api';
import { getStoredSessionToken } from '@/services/roblox-auth';

type AnalyticsSnapshotState = Readonly<{
  snapshot?: AnalyticsSnapshot;
  loading: boolean;
  error?: string;
  reload: () => void;
}>;

export function useAnalyticsSnapshot({
  universeId,
  section,
  range,
  sampleSnapshot,
  enabled = true,
}: {
  universeId: string;
  section: AnalyticsSectionId;
  range: AnalyticsDateRange;
  sampleSnapshot: AnalyticsSnapshot;
  enabled?: boolean;
}): AnalyticsSnapshotState {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | undefined>(
    appEnvironment.dataMode === 'sample' ? sampleSnapshot : undefined,
  );
  const [loading, setLoading] = useState(appEnvironment.dataMode === 'aws_dev' && enabled);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (!enabled) {
      return () => controller.abort();
    }
    void (async () => {
      if (active) {
        setSnapshot(appEnvironment.dataMode === 'sample' ? sampleSnapshot : undefined);
        setLoading(appEnvironment.dataMode === 'aws_dev');
        setError(undefined);
      }
      try {
        const sessionToken = appEnvironment.dataMode === 'aws_dev'
          ? await getStoredSessionToken()
          : undefined;
        const options = {
          universeId,
          section,
          range,
          sampleSnapshot,
          sessionToken,
          signal: controller.signal,
        } as const;
        let result;
        try {
          result = await loadWithTransientRetry(options, controller.signal);
        } catch (initialError) {
          if (
            !(initialError instanceof AnalyticsApiError)
            || initialError.code !== 'analytics_snapshot_not_found'
            || !sessionToken
          ) throw initialError;

          await requestAnalyticsSync({
            universeId,
            section,
            range,
            sessionToken,
            signal: controller.signal,
          });
          const polled = await pollForSnapshot(options, controller.signal);
          if (!polled) return;
          result = polled;
        }
        if (active) setSnapshot(result.snapshot);
      } catch (loadError) {
        if (active && !controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Analytics could not be loaded.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt, enabled, range, sampleSnapshot, section, universeId]);

  return {
    snapshot: enabled ? snapshot : undefined,
    loading: enabled ? loading : false,
    error: enabled ? error : undefined,
    reload,
  };
}

async function loadWithTransientRetry(
  options: Parameters<typeof loadAnalyticsSnapshot>[0],
  signal: AbortSignal,
) {
  try {
    return await loadAnalyticsSnapshot(options);
  } catch (error) {
    if (!(error instanceof AnalyticsApiError) || error.status < 500) throw error;
    if (!(await wait(450, signal))) throw error;
    return loadAnalyticsSnapshot(options);
  }
}

async function pollForSnapshot(
  options: Parameters<typeof loadAnalyticsSnapshot>[0],
  signal: AbortSignal,
) {
  for (const delay of [800, 1_600, 2_400, 3_200, 4_000]) {
    if (!(await wait(delay, signal))) return undefined;
    try {
      return await loadAnalyticsSnapshot(options);
    } catch (error) {
      if (!(error instanceof AnalyticsApiError) || error.code !== 'analytics_snapshot_not_found') {
        throw error;
      }
    }
  }
  throw new Error('Official analytics sync is still processing. Try again shortly.');
}

function wait(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, milliseconds);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
