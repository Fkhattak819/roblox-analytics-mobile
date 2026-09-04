import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

export type AppearancePreference = 'light' | 'dark' | 'system';

const APPEARANCE_KEY = '@roblox-analytics-mobile/appearance-v1';

type AppearanceContextValue = Readonly<{
  preference: AppearancePreference;
  ready: boolean;
  setPreference: (preference: AppearancePreference) => Promise<void>;
}>;

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function applyPreference(preference: AppearancePreference) {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

function isAppearancePreference(value: string | null): value is AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function AppearanceProvider({ children }: React.PropsWithChildren) {
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(APPEARANCE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const next = isAppearancePreference(stored) ? stored : 'system';
        setPreferenceState(next);
        applyPreference(next);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (next: AppearancePreference) => {
    setPreferenceState(next);
    applyPreference(next);
    await AsyncStorage.setItem(APPEARANCE_KEY, next);
  }, []);

  const value = useMemo(() => ({ preference, ready, setPreference }), [preference, ready, setPreference]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearancePreference() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error('useAppearancePreference must be used inside AppearanceProvider');
  return value;
}

export function appearanceLabel(preference: AppearancePreference) {
  return preference === 'light' ? 'Light' : preference === 'dark' ? 'Dark' : 'System';
}
