import React, { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { sessionController } from '@/services/roblox-auth';
import { appEnvironment } from '@/services/backend-api';

export function useSession() {
  return useSyncExternalStore(sessionController.subscribe, sessionController.getSnapshot, sessionController.getSnapshot);
}

export function SessionLifecycle({ children }: React.PropsWithChildren) {
  const state = useSession();
  useEffect(() => {
    // A sample build must not restore a previous live session or contact its API.
    if (appEnvironment.dataMode === 'sample') return;
    void sessionController.restore();
    const listener = AppState.addEventListener('change', (next) => {
      const status = sessionController.getSnapshot().status;
      // Browser sign-in also backgrounds the app; do not cancel that pending flow.
      if (next === 'active' && (status === 'authenticated' || status === 'unavailable')) {
        void sessionController.restore();
      }
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (state.status !== 'authenticated' || !state.session) return;
    const delay = Math.min(2_147_483_647, Math.max(0, Date.parse(state.session.expiresAt) - Date.now()));
    const timer = setTimeout(() => { void sessionController.restore(); }, delay);
    return () => clearTimeout(timer);
  }, [state]);
  return children;
}
