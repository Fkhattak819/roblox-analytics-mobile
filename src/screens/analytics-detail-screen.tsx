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
import { analyticsSectionIds, type AnalyticsDateRange, type AnalyticsSectionId, type AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

import { createSampleSnapshot, sectionConfigs, type SectionConfig } from '@/src/data/analytics-samples';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const labels = ['Aug 6', 'Aug 19', 'Sep 1'];
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
  const { selectedWorkspaceExperience: experience } = useApp();
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';
  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader title="All analytics" subtitle="Official Roblox surfaces" back />
      <ExperienceHeader image={experience.image} name={experience.name} creator={isConnectedMode ? `Universe ${experience.universeId}` : experience.creator} />
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
  const { selectedWorkspaceExperience: experience } = useApp();
  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader title={section?.title ?? 'Analytics'} subtitle={section?.subtitle ?? 'Roblox analytics'} back />
      <ExperienceHeader image={experience.image} name={experience.name} creator={appEnvironment.dataMode === 'aws_dev' ? `Universe ${experience.universeId}` : experience.creator} />
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
  const { selectedWorkspaceExperience: experience, comparePrevious, setComparePrevious } = useApp();
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>(() => defaultRangeFor(sectionId));
  const [filter, setFilter] = useState<'All users' | 'Phone'>('All users');
  const [breakdown, setBreakdown] = useState<'None' | 'Platform'>('None');
  const universeId = experience.universeId;
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
      <ExperienceHeader image={experience.image} name={experience.name} creator={appEnvironment.dataMode === 'aws_dev' ? `Universe ${experience.universeId}` : experience.creator} />

      <AnalyticsFilterBar
        dateLabel={activeDateLabel}
        dateOptions={ranges.map((range) => ({
          label: dateRangeLabel(range, config.dateLabel),
          selected: range === dateRange,
          onSelect: () => setDateRange(range),
        }))}
        filterLabel={filter === 'All users' ? 'Filter by' : filter}
        filterOptions={hasLocalPreviewControls ? [
          { label: 'All users', selected: filter === 'All users', onSelect: () => setFilter('All users') },
          { label: 'Phone', selected: filter === 'Phone', onSelect: () => setFilter('Phone') },
        ] : undefined}
        breakdownLabel={`Breakdown: ${breakdown}`}
        breakdownOptions={hasLocalPreviewControls ? [
          { label: 'None', selected: breakdown === 'None', onSelect: () => setBreakdown('None') },
          { label: 'Platform', selected: breakdown === 'Platform', onSelect: () => setBreakdown('Platform') },
        ] : undefined}
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
                <AnalyticsMetricCard label={metric.label} value={metric.displayValue} delta={comparePrevious ? metric.change : undefined} direction={metric.direction} />
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
          pointTimes={chart.series[0]?.points.map((point) => point.time)}
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

function dateRangeLabel(range: AnalyticsDateRange, defaultLabel: string) {
  if (range === '24H') return 'Last 1 day';
  if (range === '7D') return 'Last 7 days';
  if (range === '28D') return defaultLabel;
  if (range === '56D') return 'Last 56 days';
  return 'Last 90 days';
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
