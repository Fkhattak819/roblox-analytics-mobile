import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { LineChart } from '@/src/components/charts';
import { Badge, Card, MetricCard, PageHeader, ProgressBar, Screen, SectionTitle, StudioText } from '@/src/components/ui';
import { experiences } from '@/src/data/sample-data';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

type DetailMetrics = {
  displayName: string;
  access: 'Public' | 'Private';
  ccu: string;
  ccuDelta: string;
  dau: string;
  dauDelta: string;
  retention: string;
  retentionDelta: string;
  revenue: string;
  revenueDelta: string;
  crashFree: number;
  serverHealth: number;
  trend: number[];
};

const metricsById: Record<string, DetailMetrics> = {
  'most-words-win': {
    displayName: 'Most Words Win!', access: 'Public', ccu: '1,041', ccuDelta: '+8.3%', dau: '12.8K', dauDelta: '+6.2%',
    retention: '28.6%', retentionDelta: '+2.1%', revenue: 'R$ 3.9K', revenueDelta: '+4.7%', crashFree: 99.8, serverHealth: 96,
    trend: [760, 800, 790, 860, 900, 870, 940, 910, 980, 1020, 995, 1041],
  },
  'fling-squishies': {
    displayName: 'Fling Squishies and People', access: 'Private', ccu: '0', ccuDelta: '—', dau: '0', dauDelta: '—',
    retention: '—', retentionDelta: '—', revenue: '—', revenueDelta: '—', crashFree: 100, serverHealth: 100,
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  'wiggles-park': {
    displayName: "Wiggle’s Park", access: 'Public', ccu: '482', ccuDelta: '+4.2%', dau: '6.4K', dauDelta: '+3.8%',
    retention: '21.4%', retentionDelta: '+0.8%', revenue: 'R$ 1.8K', revenueDelta: '+2.9%', crashFree: 99.4, serverHealth: 91,
    trend: [350, 370, 360, 402, 390, 421, 437, 429, 451, 466, 458, 482],
  },
  'ragdoll-arena': {
    displayName: 'Ragdoll Arena', access: 'Public', ccu: '127', ccuDelta: '+1.9%', dau: '2.1K', dauDelta: '+2.0%',
    retention: '16.8%', retentionDelta: '-0.4%', revenue: 'R$ 720', revenueDelta: '+1.2%', crashFree: 98.7, serverHealth: 82,
    trend: [102, 111, 108, 119, 116, 121, 118, 126, 123, 130, 124, 127],
  },
  'squishy-collectors': {
    displayName: 'Squishy Collectors', access: 'Private', ccu: '0', ccuDelta: '—', dau: '0', dauDelta: '—',
    retention: '—', retentionDelta: '—', revenue: '—', revenueDelta: '—', crashFree: 100, serverHealth: 100,
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

export default function ExperienceDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const experience = experiences.find((item) => item.id === id);
  const { setSelectedExperienceId } = useApp();
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';
  const sampleSnapshot = useMemo(createDetailFallbackSnapshot, []);
  const { snapshot } = useAnalyticsSnapshot({
    universeId: '10009166512',
    section: 'overview',
    range: '28D',
    sampleSnapshot,
    enabled: isConnectedMode && experience?.id === 'most-words-win',
  });

  if (!experience) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <PageHeader title="Experience" back />
        <View style={styles.notFound}>
          <Ionicons name="game-controller-outline" size={30} color={colors.textMuted} />
          <StudioText weight="semibold" size={18}>Experience not found</StudioText>
          <StudioText tone="muted" size={13} style={styles.centerText}>This sample experience may no longer be connected.</StudioText>
        </View>
      </Screen>
    );
  }

  const sampleMetrics = metricsById[experience.id] ?? {
    displayName: experience.name,
    access: experience.status === 'Live' ? 'Public' as const : 'Private' as const,
    ccu: experience.ccu.toLocaleString(), ccuDelta: '—', dau: experience.plays.toLocaleString(), dauDelta: '—',
    retention: '—', retentionDelta: '—', revenue: `R$ ${experience.revenue.toLocaleString()}`, revenueDelta: '—',
    crashFree: 99.5, serverHealth: 90, trend: [72, 80, 79, 85, 89, 92, 91, 96],
  };
  const metrics = isConnectedMode ? detailMetricsFromSnapshot(snapshot) : sampleMetrics;
  const liveTrend = snapshot?.charts.find((chart) => chart.id === 'daily-active-users')?.series[0]?.points.map((point) => point.value) ?? [];

  const openAnalytics = (section?: 'engagement' | 'retention' | 'monetization' | 'performance') => {
    setSelectedExperienceId(experience.id);
    if (section) {
      router.push({ pathname: '/analytics/[section]', params: { section } });
      return;
    }
    router.navigate('/(tabs)/analytics');
  };

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <PageHeader
        title="Experience"
        subtitle={isConnectedMode ? 'Official analytics details' : 'Portfolio details'}
        back
      />

      <View style={styles.hero}>
        <Image source={experience.image} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroText}>
          <StudioText weight="bold" size={23} lineHeight={28}>{metrics.displayName}</StudioText>
          <StudioText tone="muted" size={13}>{isConnectedMode ? 'Universe 10009166512' : experience.creator}</StudioText>
          <View style={styles.badgeRow}>
            {isConnectedMode ? <Badge label="AUTHORIZED" tone="green" /> : <><Badge label={metrics.access} tone={metrics.access === 'Public' ? 'green' : 'neutral'} /><Badge label={experience.health} tone={experience.health === 'Healthy' ? 'green' : 'yellow'} /></>}
          </View>
        </View>
      </View>

      <Card style={styles.sourceCard}>
        <View style={styles.sourceBadges}>
          <Badge label={isConnectedMode ? 'OFFICIAL' : 'SAMPLE DATA'} tone={isConnectedMode ? 'green' : 'blue'} />
          <Badge label="READ ONLY" />
        </View>
        <StudioText tone="muted" size={12}>{isConnectedMode ? 'Cached Roblox Open Cloud analytics. No Roblox account data can be changed from this app.' : 'Preview metrics from the product spec. No Roblox account data is changed from this app.'}</StudioText>
      </Card>

      <View style={styles.sectionBlock}>
        <SectionTitle title="Snapshot" subtitle={isConnectedMode ? 'Last 28 days' : 'Last 24 hours'} />
        <View style={styles.metricRow}>
          <MetricCard label="CCU" value={metrics.ccu} change={metrics.ccuDelta} icon="people-outline" onPress={() => openAnalytics('engagement')} />
          <MetricCard label="DAU" value={metrics.dau} change={metrics.dauDelta} icon="pulse-outline" onPress={() => openAnalytics('engagement')} />
        </View>
        <View style={styles.metricRow}>
          <MetricCard label="D1 retention" value={metrics.retention} change={metrics.retentionDelta} icon="repeat-outline" accent={colors.purple} onPress={() => openAnalytics('retention')} />
          <MetricCard label="Daily revenue" value={metrics.revenue} change={metrics.revenueDelta} icon="diamond-outline" accent={colors.green} onPress={() => openAnalytics('monetization')} />
        </View>
      </View>

      <Card style={styles.trendCard} onPress={() => openAnalytics('engagement')} accessibilityLabel="Open engagement analytics">
        <View style={styles.cardHeading}>
          <View>
            <StudioText weight="semibold" size={16}>{isConnectedMode ? 'Daily active users' : 'Concurrent users'}</StudioText>
            <StudioText tone="muted" size={11}>{isConnectedMode ? 'Official daily series' : 'Today · hourly'}</StudioText>
          </View>
          <View style={styles.openDetailIcon}>
            <Ionicons name="arrow-forward" size={15} color={colors.blue} />
          </View>
        </View>
        <LineChart values={isConnectedMode ? liveTrend : metrics.trend} height={132} labels={isConnectedMode ? ['Start', 'Middle', 'Now'] : ['12a', '6a', '12p', 'Now']} />
      </Card>

      <View style={styles.sectionBlock}>
        <SectionTitle title="Game health" subtitle="Latest processed signals" />
        <Card style={styles.healthCard} onPress={() => openAnalytics('performance')} accessibilityLabel="Open performance analytics">
          {!isConnectedMode ? <><HealthRow label="Crash-free sessions" value={`${metrics.crashFree}%`} progress={metrics.crashFree} color={colors.green} /><View style={styles.divider} /><HealthRow label="Server health" value={experience.health} progress={metrics.serverHealth} color={experience.health === 'Healthy' ? colors.green : colors.yellow} /><View style={styles.divider} /></> : null}
          <View style={styles.healthMetaRow}>
            <View style={styles.healthMetaIcon}><Ionicons name="cloud-done-outline" size={18} color={colors.blue} /></View>
            <View style={styles.healthMetaText}>
              <StudioText weight="medium" size={14}>Analytics freshness</StudioText>
              <StudioText tone="muted" size={11}>{isConnectedMode ? 'Open official performance metrics' : 'Reconciled through today at 9:38 AM'}</StudioText>
            </View>
            <Badge label="Official" tone="green" />
          </View>
        </Card>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => openAnalytics()}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Ionicons name="stats-chart" size={18} color={colors.white} />
        <StudioText weight="semibold" size={15}>Open analytics</StudioText>
        <Ionicons name="arrow-forward" size={18} color={colors.white} />
      </Pressable>
    </Screen>
  );
}

function createDetailFallbackSnapshot(): AnalyticsSnapshot {
  return {
    mode: 'sample', source: 'sample_data', freshness: 'fixture', universeId: '10009166512', section: 'overview', range: '28D',
    metrics: [], charts: [], breakdowns: [], message: 'Sample experience detail',
  };
}

function detailMetricsFromSnapshot(snapshot: AnalyticsSnapshot | undefined): DetailMetrics {
  const metric = (id: string) => snapshot?.metrics.find((item) => item.id === id);
  const dau = metric('daily-active-users');
  const retention = metric('forward-d1-retention');
  const revenue = metric('daily-revenue');
  return {
    displayName: 'Most Words Win!', access: 'Public', ccu: '—', ccuDelta: '—',
    dau: dau?.displayValue ?? '—', dauDelta: dau?.change ?? '—',
    retention: retention?.displayValue ?? '—', retentionDelta: retention?.change ?? '—',
    revenue: revenue?.displayValue ?? '—', revenueDelta: revenue?.change ?? '—',
    crashFree: 0, serverHealth: 0, trend: [0, 0, 0],
  };
}

function HealthRow({ label, value, progress, color }: { label: string; value: string; progress: number; color: string }) {
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthLabels}>
        <StudioText tone="secondary" size={13}>{label}</StudioText>
        <StudioText weight="semibold" size={13}>{value}</StudioText>
      </View>
      <ProgressBar value={progress} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: spacing.lg, paddingTop: 4 },
  pressed: { opacity: 0.72 },
  moreButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroImage: { width: 76, height: 76, borderRadius: radii.md },
  heroText: { flex: 1, gap: 4 },
  badgeRow: { flexDirection: 'row', gap: 7, paddingTop: 3 },
  sourceCard: { gap: 9, backgroundColor: colors.backgroundRaised },
  sourceBadges: { flexDirection: 'row', gap: 7 },
  sectionBlock: { gap: 12 },
  metricRow: { flexDirection: 'row', gap: 12 },
  trendCard: { paddingBottom: 8 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openDetailIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  healthCard: { gap: 14 },
  healthRow: { gap: 8 },
  healthLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  healthMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  healthMetaIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  healthMetaText: { flex: 1 },
  primaryButton: {
    minHeight: 50,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.blue,
  },
  notFound: { alignItems: 'center', gap: 9, paddingVertical: 64 },
  centerText: { textAlign: 'center' },
});
