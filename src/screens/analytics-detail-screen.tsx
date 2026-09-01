import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HorizontalBars, LineChart } from '@/src/components/charts';
import {
  Badge,
  Card,
  Divider,
  ExperienceHeader,
  ListRow,
  PageHeader,
  Screen,
  SegmentedControl,
  StudioText,
} from '@/src/components/ui';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type DateRange = '24H' | '7D' | '30D' | '90D';

type Kpi = {
  label: string;
  value: string;
  change: string;
};

type Breakdown = {
  label: string;
  value: number;
  display: string;
  color?: string;
};

type SectionConfig = {
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  heroLabel: string;
  heroValue: string;
  heroDelta: string;
  trend: number[];
  kpis: Kpi[];
  breakdownTitle: string;
  breakdownSubtitle: string;
  breakdown: Breakdown[];
  insight: string;
};

const ranges = ['24H', '7D', '30D', '90D'] as const;

const sectionConfigs: Record<string, SectionConfig> = {
  engagement: {
    title: 'Engagement',
    subtitle: 'Sessions, playtime and stickiness',
    icon: 'pulse-outline',
    color: colors.blue,
    heroLabel: 'DAILY ACTIVE USERS',
    heroValue: '12.8K',
    heroDelta: '↑ 6.2% vs previous',
    trend: [8.6, 9.1, 9.5, 10.4, 10.2, 11.1, 11.6, 12.0, 12.8],
    kpis: [
      { label: 'AVERAGE PLAYTIME', value: '12.4 min', change: '↑ 4.1%' },
      { label: 'QUALIFIED PLAYS', value: '22.4K', change: '↑ 8.6%' },
      { label: 'SESSIONS / USER', value: '2.6', change: '↑ 0.2' },
      { label: 'STICKINESS', value: '30.8%', change: '↑ 1.4 pts' },
    ],
    breakdownTitle: 'Session length',
    breakdownSubtitle: 'Share of completed sessions',
    breakdown: [
      { label: 'Under 5 min', value: 38, display: '38%' },
      { label: '5–15 min', value: 34, display: '34%', color: colors.cyan },
      { label: '15–30 min', value: 18, display: '18%', color: colors.purple },
      { label: '30+ min', value: 10, display: '10%', color: colors.green },
    ],
    insight: 'Mobile cohorts added 1.8 minutes of average playtime after the latest experience update.',
  },
  retention: {
    title: 'Retention',
    subtitle: 'Returning-player cohorts',
    icon: 'repeat-outline',
    color: colors.purple,
    heroLabel: 'DAY 1 RETENTION',
    heroValue: '28.6%',
    heroDelta: '↑ 2.1 pts vs previous',
    trend: [24.1, 24.8, 25.4, 25.1, 26.0, 26.8, 27.1, 27.9, 28.6],
    kpis: [
      { label: 'DAY 7', value: '12.4%', change: '↑ 1.2 pts' },
      { label: 'DAY 30', value: '5.8%', change: '↑ 0.4 pts' },
      { label: 'RETURNING USERS', value: '4.1K', change: '↑ 7.3%' },
      { label: 'BENCHMARK', value: '61st', change: '↑ 4 places' },
    ],
    breakdownTitle: 'Cohort curve',
    breakdownSubtitle: 'Players returning after first play',
    breakdown: [
      { label: 'Day 1', value: 28.6, display: '28.6%', color: colors.purple },
      { label: 'Day 7', value: 12.4, display: '12.4%', color: '#8F78E1' },
      { label: 'Day 14', value: 8.2, display: '8.2%', color: '#7967BD' },
      { label: 'Day 30', value: 5.8, display: '5.8%', color: '#65579B' },
    ],
    insight: 'The Aug 14 cohort is tracking 2.6 points above the previous seven-day median.',
  },
  acquisition: {
    title: 'Acquisition',
    subtitle: 'Discovery sources and conversion',
    icon: 'funnel-outline',
    color: colors.cyan,
    heroLabel: 'QUALIFIED PLAYS',
    heroValue: '8.1K',
    heroDelta: '↑ 12.4% vs previous',
    trend: [5.1, 5.4, 5.9, 6.1, 6.0, 6.8, 7.2, 7.7, 8.1],
    kpis: [
      { label: 'IMPRESSIONS', value: '128K', change: '↑ 9.8%' },
      { label: 'DETAIL VISITS', value: '42.8K', change: '↑ 10.6%' },
      { label: 'VISIT → PLAY', value: '18.9%', change: '↑ 1.1 pts' },
      { label: 'HOME RECOMMENDS', value: '52%', change: '↑ 3.8 pts' },
    ],
    breakdownTitle: 'Discovery funnel',
    breakdownSubtitle: 'Current period conversion',
    breakdown: [
      { label: 'Impressions', value: 128, display: '128K' },
      { label: 'Detail visits', value: 42.8, display: '42.8K', color: '#7693FF' },
      { label: 'Qualified plays', value: 8.1, display: '8.1K', color: colors.cyan },
      { label: '10-min sessions', value: 6.4, display: '6.4K', color: colors.green },
    ],
    insight: 'Home recommendations produced the strongest lift; search conversion remained steady.',
  },
  monetization: {
    title: 'Monetization',
    subtitle: 'Revenue, payers and product mix',
    icon: 'diamond-outline',
    color: colors.green,
    heroLabel: 'DAILY REVENUE',
    heroValue: 'R$ 4.8K',
    heroDelta: '↑ 4.7% vs previous',
    trend: [3.2, 3.6, 3.4, 3.9, 4.1, 4.0, 4.4, 4.6, 4.8],
    kpis: [
      { label: 'DAILY PAYERS', value: '231', change: '↑ 5.0%' },
      { label: 'PAYER CONVERSION', value: '1.8%', change: '↑ 0.2 pts' },
      { label: 'ARPPU', value: 'R$ 20.78', change: '↑ 1.4%' },
      { label: 'ARPDAU', value: 'R$ 0.38', change: '↑ 2.8%' },
    ],
    breakdownTitle: 'Revenue sources',
    breakdownSubtitle: 'Processed Robux by source',
    breakdown: [
      { label: 'Developer products', value: 62, display: 'R$ 3.0K · 62%', color: colors.green },
      { label: 'Game passes', value: 21, display: 'R$ 1.0K · 21%', color: colors.blue },
      { label: 'Subscriptions', value: 12, display: 'R$ 576 · 12%', color: colors.purple },
      { label: 'Other', value: 5, display: 'R$ 240 · 5%', color: colors.yellow },
    ],
    insight: 'Developer products drove 62% of processed revenue. Official totals may settle after reconciliation.',
  },
  audience: {
    title: 'Audience',
    subtitle: 'Regions, devices and demographics',
    icon: 'people-outline',
    color: colors.yellow,
    heroLabel: 'MONTHLY ACTIVE USERS',
    heroValue: '41.6K',
    heroDelta: '↑ 5.1% vs previous',
    trend: [34.4, 35.2, 36.1, 36.8, 37.9, 38.4, 39.3, 40.2, 41.6],
    kpis: [
      { label: 'MOBILE SHARE', value: '68%', change: '↑ 2.4 pts' },
      { label: 'TOP REGION', value: 'United States', change: '41% of MAU' },
      { label: 'NEW USERS', value: '11.2K', change: '↑ 6.7%' },
      { label: 'AGE 13–17', value: '37%', change: 'Largest cohort' },
    ],
    breakdownTitle: 'Device mix',
    breakdownSubtitle: 'Monthly active users by platform',
    breakdown: [
      { label: 'Phone', value: 68, display: '68%', color: colors.blue },
      { label: 'Desktop', value: 19, display: '19%', color: colors.cyan },
      { label: 'Tablet', value: 9, display: '9%', color: colors.purple },
      { label: 'Console', value: 4, display: '4%', color: colors.yellow },
    ],
    insight: 'Phone growth led the weekly audience increase, especially in the United States and Brazil.',
  },
  performance: {
    title: 'Performance',
    subtitle: 'Crashes, frame rate and server health',
    icon: 'speedometer-outline',
    color: colors.orange,
    heroLabel: 'SUCCESSFUL SESSIONS',
    heroValue: '99.7%',
    heroDelta: '↑ 0.08 pts vs previous',
    trend: [99.31, 99.42, 99.38, 99.49, 99.55, 99.61, 99.58, 99.66, 99.7],
    kpis: [
      { label: 'CRASH RATE', value: '0.14%', change: '↓ 0.03 pts' },
      { label: 'AVERAGE FPS', value: '49', change: '↑ 2 FPS' },
      { label: 'SERVER MEMORY', value: '61%', change: 'Within target' },
      { label: 'JOIN TIME', value: '4.2 sec', change: '↓ 0.4 sec' },
    ],
    breakdownTitle: 'Health by device',
    breakdownSubtitle: 'Successful session rate',
    breakdown: [
      { label: 'Desktop', value: 99.82, display: '99.82%', color: colors.green },
      { label: 'Console', value: 99.75, display: '99.75%', color: colors.green },
      { label: 'Tablet', value: 99.68, display: '99.68%', color: colors.cyan },
      { label: 'Phone', value: 99.61, display: '99.61%', color: colors.blue },
    ],
    insight: 'Crash rate improved after the latest server release. Phone join time remains the main watch item.',
  },
};

const additionalSections = [
  { id: 'economy', title: 'Economy', subtitle: 'Currency sources and sinks', icon: 'cash-outline' as IconName },
  { id: 'funnels', title: 'Funnels', subtitle: 'Custom conversion paths', icon: 'filter-outline' as IconName },
  { id: 'custom-events', title: 'Custom events', subtitle: 'Creator-defined events', icon: 'code-slash-outline' as IconName },
  { id: 'thumbnails', title: 'Thumbnails', subtitle: 'Creative performance', icon: 'images-outline' as IconName },
  { id: 'advertising', title: 'Advertising', subtitle: 'Campaign performance', icon: 'megaphone-outline' as IconName },
  { id: 'matchmaking', title: 'Matchmaking', subtitle: 'Queue and server fill', icon: 'git-network-outline' as IconName },
  { id: 'data-stores', title: 'Data Stores', subtitle: 'Requests and budgets', icon: 'server-outline' as IconName },
  { id: 'memory-stores', title: 'Memory Stores', subtitle: 'Usage and limits', icon: 'hardware-chip-outline' as IconName },
  { id: 'speech-to-text', title: 'Speech-to-text', subtitle: 'Voice transcription', icon: 'mic-outline' as IconName },
  { id: 'text-to-speech', title: 'Text-to-speech', subtitle: 'Synthesized voice usage', icon: 'volume-high-outline' as IconName },
  { id: 'safety', title: 'Safety', subtitle: 'Moderation and incidents', icon: 'shield-checkmark-outline' as IconName },
  { id: 'feedback', title: 'Feedback', subtitle: 'Player sentiment', icon: 'chatbubble-ellipses-outline' as IconName },
] as const;

function DataStatusCard() {
  return (
    <Card style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View style={styles.statusTitle}>
          <View style={styles.statusDot} />
          <StudioText weight="semibold" size={14}>Data status</StudioText>
        </View>
        <View style={styles.badgeRow}>
          <Badge label="OFFICIAL" tone="green" />
          <Badge label="PROCESSED" tone="blue" />
        </View>
      </View>
      <StudioText tone="muted" size={11} lineHeight={16}>
        Read-only sample values mirror Roblox&apos;s official reporting shape. A live Open Cloud connection is not active in this build.
      </StudioText>
    </Card>
  );
}

function MetricTile({ metric }: { metric: Kpi }) {
  return (
    <Card style={styles.metricTile}>
      <StudioText tone="muted" weight="medium" size={9}>{metric.label}</StudioText>
      <StudioText weight="semibold" size={20} numberOfLines={1} adjustsFontSizeToFit>{metric.value}</StudioText>
      <StudioText weight="semibold" size={11} style={{ color: colors.green }}>{metric.change}</StudioText>
    </Card>
  );
}

function AllAnalyticsScreen() {
  const { selectedExperience } = useApp();

  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader title="All analytics" subtitle="12 additional Roblox sections" back />
      <ExperienceHeader
        image={selectedExperience?.image}
        name={selectedExperience?.name ?? 'All experiences'}
        creator={selectedExperience?.creator ?? 'Portfolio rollup'}
      />
      <View style={styles.sectionTitleRow}>
        <StudioText weight="bold" size={19}>Roblox data surfaces</StudioText>
        <Badge label="OFFICIAL" tone="green" />
      </View>
      <Card style={styles.catalogCard}>
        {additionalSections.map((section, index) => (
          <React.Fragment key={section.id}>
            <ListRow
              icon={section.icon}
              title={section.title}
              subtitle={section.subtitle}
              onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: section.id } })}
            />
            {index < additionalSections.length - 1 ? <Divider /> : null}
          </React.Fragment>
        ))}
      </Card>
      <DataStatusCard />
    </Screen>
  );
}

function EmptyAnalyticsScreen({ sectionId }: { sectionId: string }) {
  const { selectedExperience } = useApp();
  const section = additionalSections.find((item) => item.id === sectionId);
  const title = section?.title ?? 'Analytics';
  const subtitle = section?.subtitle ?? 'Roblox analytics section';

  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader title={title} subtitle={subtitle} back right={<Badge label="OFFICIAL SOURCE" tone="green" />} />
      <ExperienceHeader
        image={selectedExperience?.image}
        name={selectedExperience?.name ?? 'All experiences'}
        creator={selectedExperience?.creator ?? 'Portfolio rollup'}
      />
      <Card style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Ionicons name={section?.icon ?? 'analytics-outline'} size={28} color={colors.blue} />
        </View>
        <StudioText weight="bold" size={19}>No sample data yet</StudioText>
        <StudioText tone="muted" size={13} lineHeight={19} style={styles.emptyCopy}>
          This surface is ready for official, processed values when its Open Cloud source is connected. Nothing is estimated or filled in.
        </StudioText>
        <Badge label="NOT CONNECTED" tone="neutral" />
      </Card>
      <DataStatusCard />
    </Screen>
  );
}

export default function AnalyticsDetailScreen() {
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const sectionId = Array.isArray(params.section) ? params.section[0] : params.section ?? 'engagement';
  const { selectedExperience, dateRange, setDateRange } = useApp();
  const config = sectionConfigs[sectionId];

  if (sectionId === 'all') return <AllAnalyticsScreen />;
  if (!config) return <EmptyAnalyticsScreen sectionId={sectionId} />;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        back
        right={<Badge label="PROCESSED" tone="blue" />}
      />
      <ExperienceHeader
        image={selectedExperience?.image}
        name={selectedExperience?.name ?? 'All experiences'}
        creator={selectedExperience?.creator ?? 'Portfolio rollup'}
      />

      <SegmentedControl
        options={ranges}
        value={dateRange as DateRange}
        onChange={setDateRange}
      />

      <Card style={[styles.heroCard, { borderColor: `${config.color}55` }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: `${config.color}1F` }]}>
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.flex}>
            <StudioText tone="muted" weight="medium" size={10}>{config.heroLabel}</StudioText>
            <View style={styles.heroValueRow}>
              <StudioText weight="bold" size={30}>{config.heroValue}</StudioText>
              <StudioText weight="semibold" size={11} style={{ color: colors.green }}>{config.heroDelta}</StudioText>
            </View>
          </View>
        </View>
        <LineChart values={config.trend} labels={['Aug 14', 'Aug 17', 'Today']} height={160} color={config.color} />
      </Card>

      <View style={styles.sectionTitleRow}>
        <StudioText weight="bold" size={19}>Key metrics</StudioText>
        <StudioText tone="green" weight="semibold" size={12}>Roblox official</StudioText>
      </View>
      <View style={styles.metricGrid}>
        {config.kpis.map((metric) => <MetricTile key={metric.label} metric={metric} />)}
      </View>

      <View style={styles.sectionTitleBlock}>
        <StudioText weight="bold" size={19}>{config.breakdownTitle}</StudioText>
        <StudioText tone="muted" size={11}>{config.breakdownSubtitle}</StudioText>
      </View>
      <Card>
        <HorizontalBars items={config.breakdown} />
      </Card>

      <Card style={styles.insightCard}>
        <View style={styles.insightIcon}>
          <Ionicons name="sparkles" size={18} color={colors.blue} />
        </View>
        <View style={styles.flex}>
          <StudioText weight="semibold" size={13}>What changed</StudioText>
          <StudioText tone="muted" size={11} lineHeight={16}>{config.insight}</StudioText>
        </View>
      </Card>

      <DataStatusCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xs, gap: 16 },
  flex: { flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionTitleBlock: { gap: 2 },
  heroCard: { paddingBottom: 8 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile: { width: '48.4%', minHeight: 102, padding: 12, gap: 6, borderRadius: radii.md },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  insightIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  statusCard: { backgroundColor: colors.backgroundRaised, borderRadius: radii.md },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catalogCard: { paddingVertical: 0 },
  emptyCard: { minHeight: 265, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 },
  emptyIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyCopy: { textAlign: 'center', maxWidth: 300 },
});
