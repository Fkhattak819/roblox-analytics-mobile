import { useCallback, useEffect, useState } from 'react';

import type { AnalyticsDateRange, AnalyticsSectionId, AnalyticsSnapshot } from '@/domain/analytics';
import {
  AnalyticsApiError,
  loadAnalyticsSnapshot,
  requestAnalyticsSync,
} from '@/services/analytics-api';
import { appEnvironment } from '@/services/backend-api';
import { getStoredSessionToken } from '@/services/roblox-auth';
import { useSession } from '@/src/state/session-context';

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
  const session = useSession();
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
    if (appEnvironment.dataMode === 'aws_dev' && session.status !== 'authenticated') {
      void Promise.resolve().then(() => {
        if (controller.signal.aborted) return;
        setSnapshot(undefined);
        setLoading(false);
        setError(session.status === 'checking' ? undefined : 'Connect Roblox to load official analytics.');
      });
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
        let result: Awaited<ReturnType<typeof loadAnalyticsSnapshot>>;
        let syncRequested = false;
        const sync = async () => {
          if (!sessionToken || syncRequested) return;
          await requestAnalyticsSync({ universeId, section, range, sessionToken, signal: controller.signal });
          syncRequested = true;
        };
        // A user retry must request new data, rather than only reread a failed cache.
        if (attempt > 0) await sync();
        try {
          result = await loadWithTransientRetry(options, controller.signal);
          const stale = result.snapshot.freshness === 'stale'
            || (result.snapshot.asOf && Date.now() - Date.parse(result.snapshot.asOf) > 48 * 60 * 60 * 1_000);
          if (sessionToken && stale) {
            try {
              await sync();
              const updated = await pollForSnapshot(options, controller.signal, result.snapshot.asOf);
              if (!updated) return;
              result = updated;
            } catch {
              if (controller.signal.aborted) return;
              result = { ...result, snapshot: { ...result.snapshot, freshness: 'stale',
                message: `Saved report from ${result.snapshot.asOf?.slice(0, 10) ?? 'an earlier sync'}. The latest report is not ready yet; retry shortly.` } };
            }
          }
        } catch (initialError) {
          if (
            !(initialError instanceof AnalyticsApiError)
            || initialError.code !== 'analytics_snapshot_not_found'
            || !sessionToken
          ) throw initialError;

          await sync();
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
  }, [attempt, enabled, range, sampleSnapshot, section, session.revision, session.status, universeId]);

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
  previousAsOf?: string,
) {
  for (const delay of [800, 1_600, 2_400, 3_200, 4_000]) {
    if (!(await wait(delay, signal))) return undefined;
    try {
      const result = await loadAnalyticsSnapshot(options);
      if (!previousAsOf || (result.snapshot.asOf && Date.parse(result.snapshot.asOf) > Date.parse(previousAsOf))) return result;
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
