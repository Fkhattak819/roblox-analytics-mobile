import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import type { AnalyticsDateRange } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { experiences } from '@/src/data/sample-data';
import { useSession } from '@/src/state/session-context';

type NotificationMode = 'Every sale' | 'Smart' | 'Milestones' | 'Digest';

export type WorkspaceExperience = Readonly<{
  id: string;
  universeId: string;
  name: string;
  creator: string;
  image: ImageSourcePropType;
  connected: boolean;
}>;

type AppContextValue = {
  selectedExperienceId: string | null;
  setSelectedExperienceId: (id: string | null) => void;
  selectedExperience: (typeof experiences)[number] | null;
  selectedWorkspaceExperience: WorkspaceExperience;
  workspaceExperiences: WorkspaceExperience[];
  dateRange: AnalyticsDateRange;
  setDateRange: (range: AnalyticsDateRange) => void;
  comparePrevious: boolean;
  setComparePrevious: (value: boolean) => void;
  notificationMode: NotificationMode;
  setNotificationMode: (mode: NotificationMode) => void;
  liveSalesAlertsEnabled: boolean;
  setLiveSalesAlertsEnabled: (value: boolean) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: React.PropsWithChildren) {
  const { revision } = useSession();
  return <AppStateProvider key={revision}>{children}</AppStateProvider>;
}

function AppStateProvider({ children }: React.PropsWithChildren) {
  const session = useSession();
  const connected = appEnvironment.dataMode === 'aws_dev' && session.status === 'authenticated';
  const connectedUniverseIds = useMemo(
    () => connected ? session.session?.authorizedUniverseIds ?? [] : [],
    [connected, session.session?.authorizedUniverseIds],
  );
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(() => connectedUniverseIds[0] ?? null);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('28D');
  const [comparePrevious, setComparePrevious] = useState(true);
  const [notificationMode, setNotificationMode] = useState<NotificationMode>('Smart');
  const [liveSalesAlertsEnabled, setLiveSalesAlertsEnabled] = useState(false);

  const workspaceExperiences = useMemo<WorkspaceExperience[]>(() => {
    if (!connected) {
      return experiences.map((experience) => ({
        id: experience.id,
        universeId: experience.id === 'most-words-win' ? '10009166512' : '0',
        name: experience.id === 'most-words-win' ? 'Most Words Win!' : experience.name,
        creator: experience.creator,
        image: experience.image,
        connected: false,
      }));
    }
    const creator = session.session?.user.preferredUsername
      ?? session.session?.user.nickname
      ?? session.session?.user.name
      ?? 'Roblox creator';
    return connectedUniverseIds.map((universeId) => ({
      id: universeId,
      universeId,
      name: universeId === '10009166512' ? 'Most Words Win!' : `Universe ${universeId}`,
      creator,
      image: universeId === '10009166512'
        ? experiences[0].image
        : require('@/assets/images/roblox-analytics-logo-transparent.png'),
      connected: true,
    }));
  }, [connected, connectedUniverseIds, session.session?.user.name,
    session.session?.user.nickname, session.session?.user.preferredUsername]);
  const selectedWorkspaceExperience = useMemo<WorkspaceExperience>(() =>
    workspaceExperiences.find((experience) => experience.id === selectedExperienceId)
    ?? workspaceExperiences[0] ?? {
      id: 'unavailable', universeId: '0', name: 'No authorized experience', creator: 'Roblox creator',
      image: require('@/assets/images/roblox-analytics-logo-transparent.png'), connected,
    }, [connected, selectedExperienceId, workspaceExperiences]);

  const value = useMemo<AppContextValue>(() => ({
    selectedExperienceId,
    setSelectedExperienceId,
    selectedExperience: experiences.find((experience) => experience.id === selectedExperienceId) ?? null,
    selectedWorkspaceExperience,
    workspaceExperiences,
    dateRange,
    setDateRange,
    comparePrevious,
    setComparePrevious,
    notificationMode,
    setNotificationMode,
    liveSalesAlertsEnabled,
    setLiveSalesAlertsEnabled,
  }), [comparePrevious, dateRange, liveSalesAlertsEnabled, notificationMode, selectedExperienceId,
    selectedWorkspaceExperience, workspaceExperiences]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
