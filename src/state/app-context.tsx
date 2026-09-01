import React, { createContext, useContext, useMemo, useState } from 'react';

import { experiences } from '@/src/data/sample-data';

type DateRange = '24H' | '7D' | '30D' | '90D';
type NotificationMode = 'Every sale' | 'Smart' | 'Milestones' | 'Digest';

type AppContextValue = {
  selectedExperienceId: string | null;
  setSelectedExperienceId: (id: string | null) => void;
  selectedExperience: (typeof experiences)[number] | null;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  comparePrevious: boolean;
  setComparePrevious: (value: boolean) => void;
  notificationMode: NotificationMode;
  setNotificationMode: (mode: NotificationMode) => void;
  liveSalesAlertsEnabled: boolean;
  setLiveSalesAlertsEnabled: (value: boolean) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: React.PropsWithChildren) {
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30D');
  const [comparePrevious, setComparePrevious] = useState(true);
  const [notificationMode, setNotificationMode] = useState<NotificationMode>('Smart');
  const [liveSalesAlertsEnabled, setLiveSalesAlertsEnabled] = useState(false);

  const value = useMemo<AppContextValue>(() => ({
    selectedExperienceId,
    setSelectedExperienceId,
    selectedExperience: experiences.find((experience) => experience.id === selectedExperienceId) ?? null,
    dateRange,
    setDateRange,
    comparePrevious,
    setComparePrevious,
    notificationMode,
    setNotificationMode,
    liveSalesAlertsEnabled,
    setLiveSalesAlertsEnabled,
  }), [comparePrevious, dateRange, liveSalesAlertsEnabled, notificationMode, selectedExperienceId]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
