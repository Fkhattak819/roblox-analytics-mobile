import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { Badge, Screen, StudioText } from '@/src/components/ui';
import { experiences, groups, type Experience } from '@/src/data/sample-data';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors, fonts, radii, spacing } from '@/src/theme/tokens';

type ExperiencePresentation = {
  name: string;
  access: 'Public' | 'Private';
  ageRating?: string;
  ccu: string;
  ccuDelta: string;
  dau: string;
  dauDelta: string;
  retention: string;
  retentionDelta: string;
  revenue: string;
  revenueDelta: string;
};

const experiencePresentation: Record<string, ExperiencePresentation> = {
  'most-words-win': {
    name: 'Most Words Win!',
    access: 'Public',
    ageRating: 'Ages 16+',
    ccu: '1,041',
    ccuDelta: '+8.3%',
    dau: '12.8K',
    dauDelta: '+6.2%',
    retention: '28.6%',
    retentionDelta: '+2.1%',
    revenue: 'R$ 3.9K',
    revenueDelta: '+4.7%',
  },
  'fling-squishies': {
    name: 'Fling Squishies and People',
    access: 'Private',
    ccu: '0',
    ccuDelta: '—',
    dau: '0',
    dauDelta: '—',
    retention: '—',
    retentionDelta: '—',
    revenue: '—',
    revenueDelta: '—',
  },
  'wiggles-park': {
    name: "Wiggle’s Park",
    access: 'Public',
    ccu: '482',
    ccuDelta: '+4.2%',
    dau: '6.4K',
    dauDelta: '+3.8%',
    retention: '21.4%',
    retentionDelta: '+0.8%',
    revenue: 'R$ 1.8K',
    revenueDelta: '+2.9%',
  },
  'ragdoll-arena': {
    name: 'Ragdoll Arena',
    access: 'Public',
    ccu: '127',
    ccuDelta: '+1.9%',
    dau: '2.1K',
    dauDelta: '+2.0%',
    retention: '16.8%',
    retentionDelta: '-0.4%',
    revenue: 'R$ 720',
    revenueDelta: '+1.2%',
  },
  'squishy-collectors': {
    name: 'Squishy Collectors',
    access: 'Private',
    ccu: '0',
    ccuDelta: '—',
    dau: '0',
    dauDelta: '—',
    retention: '—',
    retentionDelta: '—',
    revenue: '—',
    revenueDelta: '—',
  },
};

const yourGameIds = new Set(['most-words-win', 'fling-squishies']);
const groupGameIds: Record<string, string[]> = {
  brainnourish: ['wiggles-park', 'ragdoll-arena'],
  'squishy-works': ['squishy-collectors'],
};

function detailFor(experience: Experience) {
  return experiencePresentation[experience.id] ?? {
    name: experience.name,
    access: experience.status === 'Live' ? 'Public' : 'Private',
    ccu: experience.ccu.toLocaleString(),
    ccuDelta: '—',
    dau: experience.plays.toLocaleString(),
    dauDelta: '—',
    retention: '—',
    retentionDelta: '—',
    revenue: `R$ ${experience.revenue.toLocaleString()}`,
    revenueDelta: '—',
  } satisfies ExperiencePresentation;
}

export default function ExperiencesScreen() {
  const { selectedExperience } = useApp();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';
  const sampleSnapshot = useMemo(createExperienceSampleSnapshot, []);
  const { snapshot } = useAnalyticsSnapshot({
    universeId: '10009166512',
    section: 'overview',
    range: '28D',
    sampleSnapshot,
  });
  const connectedPresentation = useMemo(() => presentationFromSnapshot(snapshot), [snapshot]);
  const availableExperiences = isConnectedMode ? experiences.slice(0, 1) : experiences;

  const filteredExperiences = useMemo(() => availableExperiences.filter((experience) => {
    if (!normalizedQuery) return true;
    const detail = detailFor(experience);
    return `${detail.name} ${experience.creator}`.toLocaleLowerCase().includes(normalizedQuery);
  }), [availableExperiences, normalizedQuery]);

  const filteredIds = new Set(filteredExperiences.map((experience) => experience.id));
  const yourGames = filteredExperiences.filter((experience) => yourGameIds.has(experience.id));
  const groupsWithGames = isConnectedMode ? [] : groups.map((group) => ({
    ...group,
    games: experiences.filter((experience) =>
      groupGameIds[group.id]?.includes(experience.id) && filteredIds.has(experience.id)),
  })).filter((group) => group.games.length > 0 || group.name.toLocaleLowerCase().includes(normalizedQuery));

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <PortfolioSwitcher
        title={isConnectedMode ? 'Most Words Win!' : selectedExperience ? detailFor(selectedExperience).name : 'All experiences'}
        image={isConnectedMode ? experiences[0].image : undefined}
        onPress={() => router.push('/experience-picker')}
      />

      <View style={styles.titleBlock}>
        <StudioText size={28} lineHeight={34} weight="bold">Experiences</StudioText>
        <StudioText tone="muted" size={13}>{isConnectedMode ? '1 connected game · Roblox Open Cloud' : '5 connected games · 2 groups'}</StudioText>
      </View>

      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
        <TextInput
          accessibilityLabel="Search games or groups"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search games or groups"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" hitSlop={9} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </Pressable>
        ) : <Ionicons name="reorder-three" size={19} color={colors.textMuted} />}
      </View>

      {yourGames.length ? (
        <View style={styles.section}>
          <SectionHeading title={isConnectedMode ? 'Authorized experience' : 'Your games'} detail={isConnectedMode ? 'Official analytics' : 'Recently active'} />
          {yourGames.map((experience) => (
            <ExperienceCard key={experience.id} experience={experience} expanded presentation={isConnectedMode ? connectedPresentation : undefined} />
          ))}
        </View>
      ) : null}

      {groupsWithGames.length ? (
        <View style={styles.section}>
          <SectionHeading title="Group games" detail="2 groups · 3 games" staticDetail />
          {groupsWithGames.map((group) => (
            <View key={group.id} style={styles.groupBlock}>
              <GroupHeader
                image={group.image}
                name={group.name}
                role={group.id === 'brainnourish' ? 'Developer · 2 games' : 'Manager · 1 game'}
              />
              {group.games.map((experience) => (
                <ExperienceCard key={experience.id} experience={experience} />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {!filteredExperiences.length ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search" size={22} color={colors.textMuted} />
          </View>
          <StudioText weight="semibold">No experiences found</StudioText>
          <StudioText tone="muted" size={13} style={styles.centerText}>Try a game or group name from this portfolio.</StudioText>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/settings/connections')}
        style={({ pressed }) => [styles.manageRow, pressed && styles.pressed]}>
        <StudioText tone="secondary" size={13}>Manage connected experiences</StudioText>
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </Pressable>
    </Screen>
  );
}

function PortfolioSwitcher({ title, image, onPress }: { title: string; image?: Experience['image']; onPress: () => void }) {
  return (
    <View style={styles.portfolioRow}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.portfolioButton, pressed && styles.pressed]}>
        {image ? (
          <Image source={image} contentFit="cover" style={styles.portfolioImage} />
        ) : (
          <View style={styles.brandTile}>
            <StudioText weight="bold" size={13}>RA</StudioText>
          </View>
        )}
        <View style={styles.portfolioText}>
          <StudioText tone="muted" weight="medium" size={10}>CREATOR PORTFOLIO</StudioText>
          <View style={styles.switcherTitleRow}>
            <StudioText weight="semibold" size={16} numberOfLines={1}>{title}</StudioText>
            <Ionicons name="caret-down" size={10} color={colors.textSecondary} />
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Open notifications"
        onPress={() => router.push('/notifications')}
        style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}>
        <Ionicons name="notifications-outline" size={19} color={colors.text} />
      </Pressable>
    </View>
  );
}

function SectionHeading({ title, detail, staticDetail = false }: { title: string; detail: string; staticDetail?: boolean }) {
  return (
    <View style={styles.sectionHeading}>
      <StudioText weight="semibold" size={17}>{title}</StudioText>
      <View style={styles.sectionDetail}>
        <StudioText tone="muted" size={12}>{detail}</StudioText>
        {!staticDetail ? <Ionicons name="caret-down" size={9} color={colors.textMuted} /> : null}
      </View>
    </View>
  );
}

function GroupHeader({ image, name, role }: { image: Experience['image']; name: string; role: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.groupHeader, pressed && styles.pressed]}>
      <Image source={image} style={styles.groupImage} contentFit="cover" />
      <View style={styles.groupHeaderText}>
        <StudioText weight="semibold" size={14}>{name}</StudioText>
        <StudioText tone="muted" size={11}>{role}</StudioText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function ExperienceCard({ experience, expanded = false, presentation }: { experience: Experience; expanded?: boolean; presentation?: ExperiencePresentation }) {
  const detail = presentation ?? detailFor(experience);
  const openDetail = () => router.push({ pathname: '/experience/[id]', params: { id: experience.id } });

  return (
    <Pressable
      accessibilityLabel={`Open ${detail.name}`}
      accessibilityRole="button"
      onPress={openDetail}
      style={({ pressed }) => [styles.experienceCard, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <Image source={experience.image} style={expanded ? styles.largeGameImage : styles.compactGameImage} contentFit="cover" />
        <View style={styles.cardTitleBlock}>
          <StudioText weight="semibold" size={expanded ? 16 : 14} numberOfLines={1}>{detail.name}</StudioText>
          <View style={styles.cardBadges}>
            <Badge
              label={detail.ageRating ? `${detail.access} · ${detail.ageRating}` : detail.access}
              tone={detail.access === 'Public' ? 'green' : 'neutral'}
            />
          </View>
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
      </View>

      {expanded ? (
        <View style={styles.expandedStats}>
          <View style={styles.statsRow}>
            <Stat label="Concurrent users" value={detail.ccu} delta={detail.ccuDelta} />
            <Stat label="Daily active users" value={detail.dau} delta={detail.dauDelta} />
          </View>
          <View style={styles.statsRow}>
            <Stat label="D1 retention" value={detail.retention} delta={detail.retentionDelta} />
            <Stat label="Daily revenue" value={detail.revenue} delta={detail.revenueDelta} />
          </View>
        </View>
      ) : (
        <View style={styles.compactStats}>
          <CompactStat label="CCU" value={detail.ccu} />
          <CompactStat label="D1" value={detail.retention} />
        </View>
      )}
    </Pressable>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  const deltaTone = delta.startsWith('-') || delta.startsWith('↓') ? colors.red : delta === '—' ? colors.textMuted : colors.green;
  const formattedDelta = delta === '—'
    ? '—'
    : delta.startsWith('↑') || delta.startsWith('↓')
      ? delta
      : `${delta.startsWith('-') ? '↓' : '↑'} ${delta.replace(/^[+-]/, '')}`;
  return (
    <View style={styles.stat}>
      <StudioText tone="muted" size={10}>{label}</StudioText>
      <View style={styles.statValueRow}>
        <StudioText weight="semibold" size={13}>{value}</StudioText>
        <StudioText weight="semibold" size={10} style={{ color: deltaTone }}>{formattedDelta}</StudioText>
      </View>
    </View>
  );
}

function createExperienceSampleSnapshot(): AnalyticsSnapshot {
  return {
    mode: 'sample',
    source: 'sample_data',
    freshness: 'fixture',
    universeId: '10009166512',
    section: 'overview',
    range: '28D',
    metrics: [],
    charts: [],
    breakdowns: [],
    message: 'Sample experience summary',
  };
}

function presentationFromSnapshot(snapshot: AnalyticsSnapshot | undefined): ExperiencePresentation {
  const metric = (id: string) => snapshot?.metrics.find((item) => item.id === id);
  const dau = metric('daily-active-users');
  const retention = metric('forward-d1-retention');
  const revenue = metric('daily-revenue');
  return {
    name: 'Most Words Win!',
    access: 'Public',
    ccu: '—',
    ccuDelta: '—',
    dau: dau?.displayValue ?? '—',
    dauDelta: dau?.change ?? '—',
    retention: retention?.displayValue ?? '—',
    retentionDelta: retention?.change ?? '—',
    revenue: revenue?.displayValue ?? '—',
    revenueDelta: revenue?.change ?? '—',
  };
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compactStat}>
      <StudioText tone="muted" size={10}>{label}</StudioText>
      <StudioText weight="semibold" size={13}>{value}</StudioText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: 18, paddingTop: 4 },
  pressed: { opacity: 0.68 },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  portfolioRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  portfolioButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandTile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#282C34',
  },
  portfolioImage: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surfaceSoft },
  portfolioText: { flex: 1, gap: 2 },
  switcherTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  titleBlock: { gap: 3 },
  searchField: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingVertical: 0,
  },
  section: { gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionDetail: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  groupBlock: { gap: 10 },
  groupHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupImage: { width: 34, height: 34, borderRadius: 7 },
  groupHeaderText: { flex: 1, minHeight: 48, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  experienceCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  largeGameImage: { width: 58, height: 58, borderRadius: 7 },
  compactGameImage: { width: 58, height: 58, borderRadius: 7 },
  cardTitleBlock: { flex: 1, gap: 7, paddingTop: 1 },
  cardBadges: { flexDirection: 'row', alignItems: 'center' },
  expandedStats: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  statsRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  stat: { flex: 1, gap: 5, paddingVertical: 11, paddingRight: 12 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  compactStats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 11 },
  compactStat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manageRow: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    backgroundColor: colors.backgroundRaised,
  },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: spacing.xl },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
});
