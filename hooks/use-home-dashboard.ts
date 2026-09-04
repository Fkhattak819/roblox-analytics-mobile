import { useCallback, useEffect, useState } from 'react';

import { offlineSampleHome } from '@/data/sample-home';
import type { HomeSnapshot } from '@/domain/home';
import {
  appEnvironment,
  loadHomeSnapshot,
  type HomeTransport,
} from '@/services/backend-api';

type DashboardStatus = 'loading' | 'loaded' | 'error';

type DashboardState = Readonly<{
  status: DashboardStatus;
  snapshot?: HomeSnapshot;
  transport?: HomeTransport;
  error?: string;
}>;

const initialState: DashboardState =
  appEnvironment.dataMode === 'sample'
    ? { status: 'loaded', snapshot: offlineSampleHome, transport: 'offline' }
    : { status: 'loading' };

export function useHomeDashboard() {
  const [state, setState] = useState<DashboardState>(initialState);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (signal?: AbortSignal, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setState({ status: 'loading' });

    try {
      const result = await loadHomeSnapshot({ signal });
      setState({ status: 'loaded', ...result });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unable to load the dashboard',
      });
    } finally {
      if (refresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (appEnvironment.dataMode === 'sample') return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(undefined, true);
  }, [load]);

  return {
    ...state,
    dataMode: appEnvironment.dataMode,
    refreshing,
    refresh,
  };
}
