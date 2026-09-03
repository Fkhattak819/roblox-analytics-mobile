import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AnalyticsChartCard,
  AnalyticsDataStatus,
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsFilterBar,
  AnalyticsLoadingSkeleton,
  AnalyticsMetricCard,
  AnalyticsSectionHeader,
} from '@/src/components/analytics';
import { HorizontalBars } from '@/src/components/charts';
import { Badge, Card, Divider, ExperienceHeader, ListRow, PageHeader, Screen, StudioText } from '@/src/components/ui';
import { experiences } from '@/src/data/sample-data';
import { analyticsSectionIds, type AnalyticsDateRange, type AnalyticsSectionId, type AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Metric = { label: string; value: string; delta?: string; direction?: 'positive' | 'negative' | 'neutral' };
type Breakdown = { label: string; value: number; display: string; color?: string };
type Chart = {
  title: string;
  value: string;
  summary: string;
  values: number[];
  comparison?: number[];
  yAxis?: string[];
  color?: string;
  emptyMessage?: string;
};
type SectionConfig = {
  title: string;
  subtitle: string;
  dateLabel: string;
  metrics: Metric[];
  charts: Chart[];
  breakdownTitle?: string;
  breakdownSubtitle?: string;
  breakdown?: Breakdown[];
  empty?: { icon: IconName; title: string; description: string; action?: string };
  footnote?: string;
};

const labels = ['Aug 6', 'Aug 19', 'Sep 1'];
const sampleTimes = [
  '2026-08-06T00:00:00Z',
  '2026-08-10T00:00:00Z',
  '2026-08-14T00:00:00Z',
  '2026-08-19T00:00:00Z',
  '2026-08-23T00:00:00Z',
  '2026-08-27T00:00:00Z',
  '2026-09-01T00:00:00Z',
] as const;
const MOST_WORDS_WIN_UNIVERSE_ID = '10009166512';
const officialSyncableSections = new Set<AnalyticsSectionId>([
  'overview',
  'engagement',
  'retention',
  'monetization',
  'acquisition',
  'performance',
  'economy',
  'thumbnails',
  'advertising',
  'matchmaking',
  'data-stores',
  'memory-stores',
  'speech-to-text',
  'text-to-speech',
  'safety',
]);

const sectionConfigs: Record<string, SectionConfig> = {
  engagement: {
    title: 'Engagement',
    subtitle: 'Take action to boost engagement and fun.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Daily active users', value: '124' },
      { label: 'Average playtime', value: '4.1 min' },
      { label: 'Total playtime', value: '11.4 hr' },
      { label: 'Average session time', value: '2.8 min' },
    ],
    charts: [
      { title: 'Daily active users', value: '124', summary: 'Daily average over selected period', values: [84, 97, 112, 91, 104, 115, 124], comparison: [92, 90, 99, 102, 98, 104, 108], yAxis: ['150', '75', '0'] },
      { title: 'Average playtime', value: '4.1 min', summary: 'Daily average over selected period', values: [3.1, 3.4, 3.7, 3.3, 3.9, 4.3, 4.1], comparison: [3.5, 3.6, 3.8, 3.7, 3.8, 3.9, 4.0], yAxis: ['5', '2.5', '0'] },
      { title: 'Sessions', value: '145', summary: 'Daily average over selected period', values: [98, 111, 124, 103, 119, 137, 145], comparison: [105, 108, 116, 120, 117, 123, 129], yAxis: ['160', '80', '0'] },
    ],
    breakdownTitle: 'New and returning users',
    breakdownSubtitle: 'Daily active users in the latest sample',
    breakdown: [
      { label: 'New users', value: 115, display: '115', color: colors.blue },
      { label: 'Returning users', value: 9, display: '9', color: colors.cyan },
    ],
  },
  retention: {
    title: 'Retention',
    subtitle: 'Take action to get more users to return.',
    dateLabel: 'Last 56 days',
    metrics: [
      { label: 'Day 1 retention', value: '4.20%' },
      { label: 'Day 7 retention', value: '0.00%', direction: 'neutral' },
      { label: 'Day 30 retention', value: '0.00%', direction: 'neutral' },
      { label: 'Stickiness (DAU/MAU)', value: '8.02%', delta: '↓ 55.1%', direction: 'negative' },
    ],
    charts: [
      { title: 'Day 1 retention', value: '4.20%', summary: 'Daily average over selected period', values: [3.2, 4.1, 2.9, 5.8, 3.7, 7.3, 4.2], comparison: [5.1, 4.8, 4.5, 4.4, 4.2, 4.0, 3.9], yAxis: ['10%', '5%', '0%'], color: colors.purple },
      { title: 'Stickiness (DAU/MAU)', value: '8.02%', summary: 'Daily average over selected period', values: [14.2, 12.8, 10.3, 9.7, 8.9, 8.4, 8.02], comparison: [15.2, 15.1, 14.9, 14.7, 14.6, 14.4, 14.3], yAxis: ['20%', '10%', '0%'], color: colors.purple },
    ],
    breakdownTitle: 'Cohort snapshot',
    breakdownSubtitle: 'New-user cohorts visible in Creator Dashboard',
    breakdown: [
      { label: 'Aug 29 · Day 1', value: 20, display: '20.00%', color: colors.purple },
      { label: 'Aug 28 · Day 1', value: 13.04, display: '13.04%', color: '#927EE3' },
      { label: 'Aug 27 · Day 1', value: 11.11, display: '11.11%', color: '#7967BD' },
      { label: 'Aug 26 · Day 1', value: 3.85, display: '3.85%', color: '#65579B' },
    ],
    footnote: 'Roblox cohort dates are UTC. Recent cohorts show N/A until enough days have elapsed.',
  },
  acquisition: {
    title: 'Acquisition',
    subtitle: 'Take action to attract new users.',
    dateLabel: 'Last 56 days',
    metrics: [
      { label: 'New-user impressions', value: '3,049' },
      { label: 'Returning impressions', value: '119' },
      { label: 'New users with plays', value: '57' },
      { label: 'Returning users with plays', value: '9' },
    ],
    charts: [
      { title: 'Unique users with impressions', value: '3,168', summary: 'New and returning users', values: [44, 71, 95, 320, 487, 905, 1246], comparison: [38, 42, 51, 64, 72, 78, 81], yAxis: ['1.2K', '600', '0'], color: colors.cyan },
      { title: 'Unique users with plays', value: '66', summary: 'By acquisition source', values: [8, 11, 9, 17, 22, 31, 66], comparison: [7, 9, 12, 13, 14, 18, 21], yAxis: ['75', '35', '0'], color: colors.cyan },
    ],
    breakdownTitle: 'Top sources by new users with plays',
    breakdownSubtitle: 'Source ordering from Creator Dashboard',
    breakdown: [
      { label: 'Sponsored Ads', value: 2555, display: '2,555', color: colors.blue },
      { label: 'Friends', value: 450, display: '450', color: colors.cyan },
      { label: 'Other', value: 145, display: '145', color: colors.purple },
      { label: 'Home Recommendation', value: 58, display: '58', color: colors.green },
      { label: 'Search', value: 11, display: '11', color: colors.yellow },
    ],
  },
  monetization: {
    title: 'Monetization',
    subtitle: 'Net sales after Roblox and creator fees.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Daily Robux spent', value: 'R$ 2' },
      { label: 'Total Robux spent', value: 'R$ 42' },
      { label: 'Payer conversion rate', value: '0.02%' },
      { label: 'Paying users', value: '0', direction: 'neutral' },
    ],
    charts: [
      { title: 'Daily Robux spent', value: 'R$ 2', summary: 'Daily average · R$ 42 total', values: [0, 0, 0, 0, 14, 0, 28], comparison: [0, 0, 0, 0, 0, 0, 0], yAxis: ['30', '15', '0'], color: colors.green },
      { title: 'Payer conversion rate', value: '0.02%', summary: 'Daily average over selected period', values: [0, 0, 0, 0.04, 0, 0, 0.02], comparison: [0, 0, 0, 0, 0, 0, 0], yAxis: ['0.05%', '0.025%', '0%'], color: colors.green },
    ],
    breakdownTitle: 'Robux sources',
    breakdownSubtitle: 'Net Robux in the selected period',
    breakdown: [
      { label: 'Developer Products', value: 42, display: 'R$ 42', color: colors.green },
      { label: 'Unknown', value: 0, display: 'R$ 0', color: colors.textFaint },
    ],
    footnote: 'Refunds and reversals are excluded unless processed on the same day. Engagement metrics may be delayed.',
  },
  audience: {
    title: 'Demographics',
    subtitle: 'Take action on your audience demographics.',
    dateLabel: 'Most recent',
    metrics: [
      { label: 'Monthly active users', value: '3,227' },
      { label: 'United States', value: '48.2%' },
      { label: 'Female', value: '70.6%' },
      { label: 'English', value: '66.7%' },
    ],
    charts: [],
    breakdownTitle: 'Audience mix',
    breakdownSubtitle: 'Monthly active users as of Aug 31',
    breakdown: [
      { label: 'United States', value: 48.2, display: '48.2%', color: colors.blue },
      { label: 'Female', value: 70.6, display: '70.6%', color: colors.cyan },
      { label: 'Age 18–20', value: 44.1, display: '44.1%', color: colors.purple },
      { label: 'English', value: 66.7, display: '66.7%', color: colors.green },
    ],
  },
  performance: {
    title: 'Performance & Stability',
    subtitle: 'Client and server health signals.',
    dateLabel: 'Last 1 day',
    metrics: [
      { label: 'Concurrent users', value: '0', direction: 'neutral' },
      { label: 'Peak concurrent players', value: '0', direction: 'neutral' },
    ],
    charts: [],
    empty: {
      icon: 'speedometer-outline',
      title: 'Not enough recent samples',
      description: 'Roblox currently reports zero concurrent users and no recent client crash, memory, frame-rate, or CPU data for the selected period.',
      action: 'Try a longer date range',
    },
  },
  economy: {
    title: 'Economy',
    subtitle: 'Take action to grow your economy.',
    dateLabel: 'Last 28 days',
    metrics: [],
    charts: [],
    empty: {
      icon: 'cash-outline',
      title: 'Add economy events',
      description: 'Instrument economy events to unlock top sinks, top sources, and wallet-balance analytics in Roblox Creator Dashboard.',
      action: 'View Events setup',
    },
  },
  funnels: {
    title: 'Funnels',
    subtitle: 'Take action to improve your funnels.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Total users', value: '3,225' },
      { label: 'Total conversion', value: '6.08%' },
    ],
    charts: [
      { title: 'Onboarding conversion', value: '6.08%', summary: 'By user · 4-step funnel', values: [100, 74, 31, 6.08], yAxis: ['100%', '50%', '0%'], color: colors.blue },
    ],
    breakdownTitle: 'Onboarding steps',
    breakdownSubtitle: 'Completion relative to step 1',
    breakdown: [
      { label: '1. Started onboarding', value: 100, display: '100%', color: colors.blue },
      { label: '2. Started round', value: 74, display: '74%', color: '#7290FF' },
      { label: '3. Completed round', value: 31, display: '31%', color: colors.cyan },
      { label: '4. Returned next day', value: 6.08, display: '6.08%', color: colors.green },
    ],
  },
  'custom-events': {
    title: 'Custom events',
    subtitle: 'Creator-defined events available in Explore.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Events discovered', value: '3' },
    ],
    charts: [],
    breakdownTitle: 'Available events',
    breakdownSubtitle: 'Observed in Roblox Explore',
    breakdown: [
      { label: 'RoundStarted', value: 100, display: 'Available', color: colors.blue },
      { label: 'RoundCompleted', value: 100, display: 'Available', color: colors.cyan },
      { label: 'ReturnedNextDay', value: 100, display: 'Available', color: colors.green },
    ],
    footnote: 'Choose aggregation, time interval, breakdown, chart type, overlays, and smoothing in Roblox Explore.',
  },
};

const additionalSections = [
  { id: 'economy', title: 'Economy', subtitle: 'Currency sources and sinks', icon: 'cash-outline' as IconName },
  { id: 'funnels', title: 'Funnels', subtitle: 'Onboarding and custom funnels', icon: 'filter-outline' as IconName },
  { id: 'custom-events', title: 'Custom events', subtitle: 'Creator-defined events', icon: 'code-slash-outline' as IconName },
  { id: 'thumbnails', title: 'Thumbnails', subtitle: 'Creative performance', icon: 'images-outline' as IconName },
  { id: 'advertising', title: 'Advertising', subtitle: 'Publisher reporting', icon: 'megaphone-outline' as IconName },
  { id: 'matchmaking', title: 'Matchmaking', subtitle: 'Queue and server fill', icon: 'git-network-outline' as IconName },
  { id: 'data-stores', title: 'Data Stores', subtitle: 'Requests and storage usage', icon: 'server-outline' as IconName },
  { id: 'memory-stores', title: 'Memory Stores', subtitle: 'Usage and request units', icon: 'hardware-chip-outline' as IconName },
  { id: 'speech-to-text', title: 'Speech-to-text', subtitle: 'Transcription status and usage', icon: 'mic-outline' as IconName },
  { id: 'text-to-speech', title: 'Text-to-speech', subtitle: 'Synthesis usage and errors', icon: 'volume-high-outline' as IconName },
  { id: 'safety', title: 'Safety', subtitle: 'Abuse reporting metrics', icon: 'shield-checkmark-outline' as IconName },
  { id: 'explore', title: 'Explore', subtitle: 'Custom chart builder', icon: 'options-outline' as IconName },
] as const;

function AllAnalyticsScreen() {
  const { selectedExperience } = useApp();
  const experience = selectedExperience ?? experiences[0];
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';
  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader title="All analytics" subtitle="Official Roblox surfaces" back />
      <ExperienceHeader image={experience.image} name={experience.name === 'Most Words Win' ? 'Most Words Win!' : experience.name} creator={isConnectedMode ? `Universe ${MOST_WORDS_WIN_UNIVERSE_ID}` : experience.creator} />
      <AnalyticsSectionHeader title="Analytics catalog" detail="12 surfaces" />
      <Card style={styles.catalogCard}>
        {additionalSections.map((section, index) => (
          <React.Fragment key={section.id}>
            <ListRow icon={section.icon} title={section.title} subtitle={section.subtitle} onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: section.id } })} />
            {index < additionalSections.length - 1 ? <Divider /> : null}
          </React.Fragment>
        ))}
      </Card>
      <AnalyticsDataStatus live={isConnectedMode} text="Catalog separates supported Open Cloud snapshots from Roblox web-only analytics" />
    </Screen>
  );
}

function InvalidSection({ sectionId }: { sectionId: string }) {
  const section = additionalSections.find((item) => item.id === sectionId);
  const { selectedExperience } = useApp();
  const experience = selectedExperience ?? experiences[0];
  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader title={section?.title ?? 'Analytics'} subtitle={section?.subtitle ?? 'Roblox analytics'} back />
      <ExperienceHeader image={experience.image} name={experience.name === 'Most Words Win' ? 'Most Words Win!' : experience.name} creator={appEnvironment.dataMode === 'aws_dev' ? `Universe ${MOST_WORDS_WIN_UNIVERSE_ID}` : experience.creator} />
      <AnalyticsEmptyState
        icon={section?.icon ?? 'analytics-outline'}
        title="Unsupported analytics section"
        description="This route is not part of the documented analytics catalog."
      />
    </Screen>
  );
}

export default function AnalyticsDetailScreen() {
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const sectionId = Array.isArray(params.section) ? params.section[0] : params.section ?? 'engagement';

  if (sectionId === 'all') return <AllAnalyticsScreen />;
  if (!(analyticsSectionIds as readonly string[]).includes(sectionId)) return <InvalidSection sectionId={sectionId} />;

  const catalogSection = additionalSections.find((item) => item.id === sectionId);
  const config = sectionConfigs[sectionId] ?? {
    title: catalogSection?.title ?? 'Analytics',
    subtitle: catalogSection?.subtitle ?? 'Roblox analytics',
    dateLabel: 'Last 28 days',
    metrics: [],
    charts: [],
    empty: {
      icon: catalogSection?.icon ?? 'analytics-outline',
      title: sectionId === 'explore' ? 'Configure in Roblox Explore' : 'No sample data for this category',
      description: sectionId === 'explore'
        ? 'Roblox Explore supports metric source, aggregation, interval, breakdown, line, bar, stacked, pie, table, comparison, benchmark, smoothing, filters, and annotations.'
        : 'The mobile surface is ready for an official cached snapshot. Nothing is estimated.',
      action: sectionId === 'explore' ? 'Choose a metric' : undefined,
    },
  } satisfies SectionConfig;

  return <ConfiguredAnalyticsDetail sectionId={sectionId as AnalyticsSectionId} config={config} />;
}

function ConfiguredAnalyticsDetail({
  sectionId,
  config,
}: {
  sectionId: AnalyticsSectionId;
  config: SectionConfig;
}) {
  const { selectedExperience, comparePrevious, setComparePrevious } = useApp();
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(() => defaultRangeFor(sectionId));
  const [filter, setFilter] = useState<'All users' | 'Phone'>('All users');
  const [breakdown, setBreakdown] = useState<'None' | 'Platform'>('None');
  const experience = selectedExperience ?? experiences[0];
  const universeId = experience.id === 'most-words-win' ? MOST_WORDS_WIN_UNIVERSE_ID : '0';
  const unavailableInConnectedMode = appEnvironment.dataMode === 'aws_dev' && !officialSyncableSections.has(sectionId);
  const sampleSnapshot = useMemo(
    () => createSampleSnapshot(sectionId, config, dateRange, universeId),
    [config, dateRange, sectionId, universeId],
  );
  const { snapshot, loading, error, reload } = useAnalyticsSnapshot({
    universeId,
    section: sectionId,
    range: dateRange,
    sampleSnapshot,
    enabled: !unavailableInConnectedMode,
  });

  const ranges = rangesFor(sectionId);
  const nextRange = ranges[(ranges.indexOf(dateRange) + 1) % ranges.length];
  const activeDateLabel = dateRange === '24H'
    ? 'Last 1 day'
    : dateRange === '7D'
      ? 'Last 7 days'
      : dateRange === '28D'
        ? config.dateLabel
        : dateRange === '56D'
          ? 'Last 56 days'
          : 'Last 90 days';
  const isOfficial = snapshot?.source === 'roblox_open_cloud';
  const hasLocalPreviewControls = appEnvironment.dataMode === 'sample';
  const metrics = snapshot?.metrics ?? [];
  const charts = snapshot?.charts ?? [];
  const primaryBreakdown = snapshot?.breakdowns[0];
  const emptyState = snapshot?.emptyState;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        back
        right={<Badge
          label={hasLocalPreviewControls ? 'SAMPLE' : unavailableInConnectedMode ? 'ROBLOX WEB' : 'OFFICIAL'}
          tone={hasLocalPreviewControls || unavailableInConnectedMode ? 'yellow' : 'green'}
        />}
      />
      <ExperienceHeader image={experience.image} name={experience.name === 'Most Words Win' ? 'Most Words Win!' : experience.name} creator={appEnvironment.dataMode === 'aws_dev' ? `Universe ${MOST_WORDS_WIN_UNIVERSE_ID}` : experience.creator} />

      <AnalyticsFilterBar
        dateLabel={activeDateLabel}
        filterLabel={filter === 'All users' ? 'Filter by' : filter}
        breakdownLabel={`Breakdown: ${breakdown}`}
        compareEnabled={comparePrevious}
        onDatePress={() => setDateRange(nextRange)}
        onFilterPress={hasLocalPreviewControls ? () => setFilter(filter === 'All users' ? 'Phone' : 'All users') : undefined}
        onBreakdownPress={hasLocalPreviewControls ? () => setBreakdown(breakdown === 'None' ? 'Platform' : 'None') : undefined}
        onComparePress={() => setComparePrevious(!comparePrevious)}
      />

      {unavailableInConnectedMode ? (
        <AnalyticsEmptyState
          icon={config.empty?.icon ?? 'analytics-outline'}
          title="Available in Roblox Creator Dashboard"
          description="This section is visible in Roblox's web dashboard, but it is not exposed by the app's supported Analytics Query connection. No sample values are shown in connected mode."
        />
      ) : null}

      {!unavailableInConnectedMode && loading ? <AnalyticsLoadingSkeleton /> : null}
      {!unavailableInConnectedMode && error ? <AnalyticsErrorState message={error} onRetry={reload} /> : null}

      {!unavailableInConnectedMode && !loading && !error && metrics.length ? (
        <>
          <AnalyticsSectionHeader title="Key metrics" detail="Current period" />
          <View style={styles.metricGrid}>
            {metrics.map((metric) => (
              <View key={metric.id} style={styles.metricCell}>
                <AnalyticsMetricCard label={metric.label} value={metric.displayValue} delta={metric.change} direction={metric.direction} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {!unavailableInConnectedMode && !loading && !error && emptyState ? (
        <AnalyticsEmptyState
          icon={config.empty?.icon ?? 'analytics-outline'}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      ) : null}

      {!unavailableInConnectedMode && !loading && !error ? charts.map((chart, chartIndex) => (
        <AnalyticsChartCard
          key={chart.id}
          title={chart.title}
          value={chart.displayValue}
          summary={chart.summary}
          values={chart.series[0]?.points.map((point) => point.value) ?? []}
          comparisonValues={chart.series[1]?.points.map((point) => point.value)}
          yAxisLabels={chart.yAxisLabels}
          color={config.charts[chartIndex]?.color}
          labels={chartLabels(chart)}
          showComparison={comparePrevious}
        />
      )) : null}

      {!unavailableInConnectedMode && !loading && !error && primaryBreakdown?.items.length ? (
        <>
          <View style={styles.sectionTitleBlock}>
            <StudioText weight="bold" size={19}>{primaryBreakdown.title}</StudioText>
            {primaryBreakdown.subtitle ? <StudioText tone="muted" size={11}>{primaryBreakdown.subtitle}</StudioText> : null}
          </View>
          <Card style={styles.breakdownCard}>
            <HorizontalBars items={primaryBreakdown.items.map((item, index) => ({
              label: item.label,
              value: item.rawValue,
              display: item.displayValue,
              color: config.breakdown?.[index]?.color,
            }))} />
          </Card>
        </>
      ) : null}

      {!unavailableInConnectedMode && !loading && !error && config.footnote ? (
        <View style={styles.footnote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <StudioText tone="muted" size={10} lineHeight={15} style={styles.flex}>{config.footnote}</StudioText>
        </View>
      ) : null}

      {!unavailableInConnectedMode && !loading && !error && snapshot ? (
        <AnalyticsDataStatus live={isOfficial} text={snapshot.message} />
      ) : null}
    </Screen>
  );
}

function createSampleSnapshot(
  section: AnalyticsSectionId,
  config: SectionConfig,
  range: AnalyticsDateRange,
  universeId: string,
): AnalyticsSnapshot {
  return {
    mode: 'sample',
    source: 'sample_data',
    freshness: 'fixture',
    universeId,
    section,
    range,
    metrics: config.metrics.map((metric, index) => ({
      id: `${section}-metric-${index}`,
      label: metric.label,
      displayValue: metric.value,
      ...(metric.delta ? { change: metric.delta } : {}),
      ...(metric.direction ? { direction: metric.direction } : {}),
    })),
    charts: config.charts.map((chart, chartIndex) => ({
      id: `${section}-chart-${chartIndex}`,
      title: chart.title,
      displayValue: chart.value,
      summary: chart.summary,
      ...(chart.yAxis ? { yAxisLabels: chart.yAxis } : {}),
      series: [
        { id: 'current', label: 'Total', points: pointsFor(chart.values) },
        ...(chart.comparison ? [{ id: 'previous', label: 'Previous period', points: pointsFor(chart.comparison) }] : []),
      ],
    })),
    breakdowns: config.breakdown?.length ? [{
      id: `${section}-breakdown`,
      title: config.breakdownTitle ?? 'Breakdown',
      ...(config.breakdownSubtitle ? { subtitle: config.breakdownSubtitle } : {}),
      items: config.breakdown.map((item, index) => ({
        id: `${section}-breakdown-${index}`,
        label: item.label,
        displayValue: item.display,
        rawValue: item.value,
      })),
    }] : [],
    ...(config.empty ? {
      emptyState: {
        title: config.empty.title,
        description: config.empty.description,
        ...(config.empty.action ? { action: config.empty.action } : {}),
      },
    } : {}),
    message: 'Sample mode · metrics reflect the Sep 2 Creator Dashboard audit, not a live API session',
  };
}

function defaultRangeFor(section: AnalyticsSectionId): AnalyticsDateRange {
  if (section === 'performance') return '24H';
  if (section === 'retention' || section === 'acquisition') return '56D';
  return '28D';
}

function rangesFor(section: AnalyticsSectionId): readonly AnalyticsDateRange[] {
  if (section === 'performance') return ['24H', '7D', '28D'];
  if (section === 'retention' || section === 'acquisition') return ['7D', '28D', '56D', '90D'];
  return ['7D', '28D', '56D', '90D'];
}

function pointsFor(values: number[]) {
  return values.map((value, index) => ({
    time: sampleTimes[Math.min(index, sampleTimes.length - 1)],
    value,
  }));
}

function chartLabels(chart: AnalyticsSnapshot['charts'][number]): string[] {
  const points = chart.series[0]?.points ?? [];
  if (!points.length) return labels;
  const candidates = [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]];
  return candidates.map((point) => new Date(point.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xs, gap: 14 },
  flex: { flex: 1 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCell: { width: '48.4%' },
  sectionTitleBlock: { gap: 2 },
  breakdownCard: { padding: 14, borderRadius: radii.md },
  catalogCard: { paddingVertical: 0 },
  footnote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 2 },
});
