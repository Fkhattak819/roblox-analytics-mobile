import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AnalyticsChartCard,
  AnalyticsDataStatus,
  AnalyticsErrorState,
  AnalyticsFilterBar,
  AnalyticsLoadingSkeleton,
  AnalyticsMetricCard,
  AnalyticsSectionHeader,
} from '@/src/components/analytics';
import { buildAnalyticsQuickLookItems } from '@/src/components/analytics-quick-look';
import { Card, ExperienceHeader, Screen, StudioText } from '@/src/components/ui';
import type { AnalyticsDateRange, AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { mostWordsWinBenchmarks } from '@/src/data/roblox-benchmarks';
import { useAnalyticsQuickLook } from '@/src/hooks/use-analytics-quick-look';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors, spacing } from '@/src/theme/tokens';

type TrendMetric = 'Day 1 retention' | 'New users' | 'Average playtime';

const trendOptions = ['Day 1 retention', 'New users', 'Average playtime'] as const;
const dateRanges: readonly AnalyticsDateRange[] = ['24H', '7D', '28D', '90D'];
const dateLabels: Record<AnalyticsDateRange, string> = {
  '24H': 'Last 24 hours',
  '7D': 'Last 7 days',
  '28D': 'Last 28 days',
  '56D': 'Last 56 days',
  '90D': 'Last 90 days',
};
const overviewTimes = [
  '2026-08-26T00:00:00Z',
  '2026-08-27T00:00:00Z',
  '2026-08-28T00:00:00Z',
  '2026-08-29T00:00:00Z',
  '2026-08-30T00:00:00Z',
  '2026-08-31T00:00:00Z',
  '2026-09-01T00:00:00Z',
] as const;

const trendMetrics: Record<TrendMetric, {
  value: string;
  delta: string;
  values: number[];
  comparison: number[];
  yAxis: string[];
}> = {
  'Day 1 retention': {
    value: '6.63%',
    delta: '↑ 328.1%',
    values: [3.9, 5.1, 4.6, 6.0, 7.3, 8.1, 6.6],
    comparison: [1.8, 1.6, 1.4, 1.7, 1.3, 1.8, 1.5],
    yAxis: ['10%', '5%', '0%'],
  },
  'New users': {
    value: '302',
    delta: '↑ 32.3%',
    values: [26, 27, 23, 10, 7, 4, 205],
    comparison: [34, 29, 31, 28, 32, 37, 37],
    yAxis: ['200', '100', '0'],
  },
  'Average playtime': {
    value: '6.6 min',
    delta: '↑ 1.3%',
    values: [4.2, 5.8, 6.1, 5.4, 7.3, 8.0, 6.6],
    comparison: [5.9, 6.1, 5.7, 6.0, 6.4, 6.2, 6.5],
    yAxis: ['10', '5', '0'],
  },
};

function TrendSwitcher({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (metric: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendSwitcher}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option)}
            style={[styles.trendOption, active && styles.trendOptionActive]}>
            <StudioText size={11} weight="semibold" style={{ color: active ? colors.blue : colors.textMuted }}>
              {option}
            </StudioText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function AnalyticsScreen() {
  const { selectedWorkspaceExperience, dateRange, setDateRange, comparePrevious, setComparePrevious } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const reportsY = useRef(0);
  const jumpToReports = async () => {
    const reduced = await AccessibilityInfo.isReduceMotionEnabled();
    scrollRef.current?.scrollTo({ y: reportsY.current, animated: !reduced });
  };
  const [trendMetric, setTrendMetric] = useState<string>('Day 1 retention');
  const displayExperience = selectedWorkspaceExperience;
  const displayExperienceName = displayExperience.name;
  const universeId = displayExperience.universeId;
  const sampleSnapshot = useMemo(() => createOverviewSampleSnapshot('7D', universeId), [universeId]);
  const { snapshot, loading, error, reload } = useAnalyticsSnapshot({
    universeId,
    section: 'overview',
    range: dateRange,
    sampleSnapshot,
  });
  const quickLook = useAnalyticsQuickLook({ universeId, enabled: isConnectedModeUniverse(universeId) });
  const isOfficial = snapshot?.source === 'roblox_open_cloud';
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';
  const quickLookItems = useMemo(() => buildAnalyticsQuickLookItems({
    overview: snapshot,
    snapshots: quickLook.snapshots,
    connected: isConnectedMode,
    loading: quickLook.loading,
  }), [isConnectedMode, quickLook.loading, quickLook.snapshots, snapshot]);
  const availableTrendOptions = useMemo<readonly string[]>(
    () => snapshot?.charts.map((chart) => chart.title) ?? trendOptions,
    [snapshot],
  );
  const selectedTrendMetric = availableTrendOptions.includes(trendMetric)
    ? trendMetric
    : availableTrendOptions[0] ?? trendMetric;
  const trendChart = snapshot?.charts.find((chart) => chart.title === selectedTrendMetric);

  const nextDateRange = useMemo(() => {
    const currentIndex = dateRanges.indexOf(dateRange);
    return dateRanges[(currentIndex + 1) % dateRanges.length];
  }, [dateRange]);

  return (
    <Screen scrollRef={scrollRef} contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <StudioText tone="muted" size={12} weight="medium">EXPERIENCE REPORTS</StudioText>
          <StudioText weight="bold" size={29}>Analytics</StudioText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open analytics tools" onPress={() => router.push({ pathname: '/creator-tools', params: { group: 'Analytics' } })} style={styles.toolsButton}>
          <Ionicons name="options-outline" size={23} color={colors.text} />
        </Pressable>
      </View>
      <ExperienceHeader image={displayExperience.image} name={displayExperienceName} creator={displayExperience.creator} onPress={() => router.push('/experience-picker')} />
      <View style={styles.controls}>
        {isConnectedMode ? <AnalyticsFilterBar
          dateLabel={dateLabels[dateRange]}
          dateOptions={dateRanges.map((range) => ({ label: dateLabels[range], selected: range === dateRange, onSelect: () => setDateRange(range) }))}
          compareEnabled={comparePrevious}
          onDatePress={() => setDateRange(nextDateRange)}
          onComparePress={() => setComparePrevious(!comparePrevious)}
        /> : <>
          <StudioText tone="muted" size={12}>Sample overview · Aug 26 – Sep 1, 2026</StudioText>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: comparePrevious }} onPress={() => setComparePrevious(!comparePrevious)} style={styles.compareButton}>
            <Ionicons name={comparePrevious ? 'checkbox' : 'square-outline'} size={19} color={comparePrevious ? colors.blue : colors.textMuted} />
            <StudioText size={12}>Compare previous period</StudioText>
          </Pressable>
        </>}
      </View>

      {loading ? <AnalyticsLoadingSkeleton /> : null}
      {error ? <AnalyticsErrorState message={error} onRetry={reload} /> : null}

      {!loading && !error && snapshot ? (
        <>
          <View style={styles.header}><View style={styles.flex}><StudioText size={22} weight="bold">Overview</StudioText><StudioText size={11} tone="muted">{snapshot.asOf ? `Updated ${formatAsOf(snapshot.asOf)}` : isConnectedMode ? 'Selected period' : '7-day reference'}</StudioText></View><Pressable accessibilityRole="button" accessibilityLabel="Jump to analytics reports" onPress={() => void jumpToReports()} style={{ minHeight: 44, justifyContent: 'center' }}><StudioText size={12} weight="semibold" tone="blue">All reports ↓</StudioText></Pressable></View>
          <View style={styles.metricsGrid}>
            {snapshot.metrics.map((metric) => (
              <View key={metric.id} style={styles.metricCell}>
                <AnalyticsMetricCard label={metric.label} value={metric.displayValue} delta={comparePrevious ? metric.change : undefined} direction={metric.direction} />
              </View>
            ))}
          </View>

          <AnalyticsSectionHeader title="Performance over time" detail={comparePrevious ? 'Current vs previous' : 'Current period'} />
          <TrendSwitcher value={selectedTrendMetric} options={availableTrendOptions} onChange={setTrendMetric} />
          {trendChart ? (
            <AnalyticsChartCard
              title={trendChart.title}
              value={trendChart.displayValue}
              summary={comparePrevious ? trendChart.summary : undefined}
              values={trendChart.series[0]?.points.map((point) => point.value) ?? []}
              comparisonValues={trendChart.series[1]?.points.map((point) => point.value)}
              labels={chartLabels(trendChart)}
              pointTimes={trendChart.series[0]?.points.map((point) => point.time)}
              yAxisLabels={trendChart.yAxisLabels}
              showComparison={comparePrevious}
              onExplore={() => router.push({ pathname: '/analytics/[section]', params: { section: trendReport(selectedTrendMetric) } })}
            />
          ) : null}

          <AnalyticsDataStatus live={isOfficial} text={snapshot.message} />

          <View style={styles.section} onLayout={(event) => { reportsY.current = event.nativeEvent.layout.y; }}>
            <AnalyticsSectionHeader title="Reports" detail="Explore your experience" />
            <StudioText tone="muted" size={12}>{isConnectedMode ? 'Each report shows its own latest available period.' : 'Sample report previews · Aug 6 – Sep 1'}</StudioText>
            <Card style={styles.reportList}>
              {quickLookItems.map((item, index) => (
                <Pressable key={item.section} accessibilityRole="button" accessibilityLabel={`Open ${item.title} report`} onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: item.section } })} style={[styles.reportRow, index > 0 && styles.reportDivider]}>
                  <View style={styles.reportIcon}><Ionicons name={reportIcons[item.section]} size={21} color={colors.blue} /></View>
                  <View style={styles.flex}>
                    <StudioText size={15} weight="semibold">{item.section === 'audience' ? 'Demographics' : item.title}</StudioText>
                    <StudioText size={12} tone="muted">{item.detail}</StudioText>
                  </View>
                  <View style={styles.reportValue}><StudioText size={13} weight="semibold">{item.value}</StudioText><Ionicons name="chevron-forward" size={15} color={colors.textMuted} /></View>
                </Pressable>
              ))}
            </Card>
          </View>

          {!isConnectedMode && universeId === '10009166512' ? <View style={styles.section}>
            <AnalyticsSectionHeader title="Genre benchmarks" detail="Recorded Sep 2" />
            <StudioText tone="muted" size={12}>Most Words Win · 7-day averages · similar experiences</StudioText>
            {mostWordsWinBenchmarks.slice(0, 2).map((item) => <Card key={item.id} style={styles.benchmarkCard}>
              <StudioText size={14} weight="semibold">{item.title.replace(/ \(.*\)/, '')}</StudioText>
              <View style={styles.header}><StudioText size={26} weight="bold">{item.value}</StudioText><StudioText size={12} tone="muted">Percentile {item.percentile}</StudioText></View>
              <View style={styles.benchmarkTrack}><View style={[styles.benchmarkFill, { width: `${item.percentile}%`, backgroundColor: item.accent }]} /></View>
              <View style={styles.header}><StudioText size={11} tone="muted">Median {item.median}</StudioText><StudioText size={11} tone="muted">Top 10% {item.topDecile}</StudioText></View>
            </Card>)}
          </View> : null}

          <AnalyticsSectionHeader title="Creator Hub tools" detail="All sections" />
          <Card
            accessibilityLabel="Open analytics tools"
            onPress={() => router.push({ pathname: '/creator-tools', params: { group: 'Analytics' } })}
            style={styles.allAnalyticsCard}>
            <View style={styles.catalogIcon}><Ionicons name="list" size={20} color={colors.blue} /></View>
            <View style={styles.flex}>
              <StudioText weight="semibold" size={14}>Analytics tools</StudioText>
              <StudioText tone="muted" size={10}>Economy, funnels, events, stores and more</StudioText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.blue} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function createOverviewSampleSnapshot(range: AnalyticsDateRange, universeId: string): AnalyticsSnapshot {
  return {
    mode: 'sample',
    source: 'sample_data',
    freshness: 'fixture',
    universeId,
    section: 'overview',
    range,
    metrics: [
      { id: 'daily-active-users', label: 'Daily active users', displayValue: '287', rawValue: 287, change: '↑ 20.0%', direction: 'positive' },
      { id: 'new-users', label: 'New users', displayValue: '302', rawValue: 302, change: '↑ 32.3%', direction: 'positive' },
      { id: 'forward-d1-retention', label: 'Day 1 retention', displayValue: '6.63%', rawValue: 6.63, change: '↑ 328.1%', direction: 'positive' },
      { id: 'daily-revenue', label: 'Daily revenue', displayValue: 'R$ 4', rawValue: 4, change: '↑ 114.3%', direction: 'positive' },
    ],
    charts: trendOptions.map((title) => {
      const trend = trendMetrics[title];
      return {
        id: title.toLowerCase().replaceAll(' ', '-'),
        title,
        displayValue: trend.value,
        summary: `${trend.delta} vs previous 7 days`,
        yAxisLabels: trend.yAxis,
        series: [
          { id: 'current', label: 'Total', points: overviewPoints(trend.values) },
          { id: 'previous', label: 'Previous period', points: overviewPoints(trend.comparison) },
        ],
      };
    }),
    breakdowns: [],
    message: 'Sample mode · values mirror the Sep 2 Roblox audit and are not a live connection',
  };
}

function trendReport(title: string): string {
  const label = title.toLowerCase();
  if (/retention|stickiness/.test(label)) return 'retention';
  if (/revenue|robux|payer/.test(label)) return 'monetization';
  if (/new user|impression|acquisition/.test(label)) return 'acquisition';
  if (/crash|fps|concurrent/.test(label)) return 'performance';
  return 'engagement';
}

function overviewPoints(values: number[]) {
  return values.map((value, index) => ({ time: overviewTimes[index], value }));
}

function chartLabels(chart: AnalyticsSnapshot['charts'][number]): string[] {
  const points = chart.series[0]?.points ?? [];
  if (!points.length) return ['Start', 'Middle', 'Now'];
  return [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]].map((point) =>
    new Date(point.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
}

function formatAsOf(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isConnectedModeUniverse(universeId: string): boolean {
  return appEnvironment.dataMode === 'aws_dev' && /^\d+$/.test(universeId) && universeId !== '0';
}

const reportIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  engagement: 'people-outline', retention: 'repeat-outline', acquisition: 'compass-outline',
  monetization: 'wallet-outline', audience: 'earth-outline', performance: 'pulse-outline',
};
const styles = StyleSheet.create({
  screen: { paddingTop: 8, paddingBottom: 32, gap: 20 },
  flex: { flex: 1, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toolsButton: { minWidth: 48, minHeight: 48, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  controls: { gap: 4 },
  compareButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCell: { width: '48%', flexGrow: 1 },
  trendSwitcher: { gap: 8 },
  trendOption: { minHeight: 44, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  trendOptionActive: { backgroundColor: colors.blueSoft, borderColor: colors.blueBorder },
  section: { gap: 14, marginTop: 8 },
  reportList: { padding: 0, gap: 0 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 88, flexWrap: 'wrap' },
  reportDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  reportIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.blueSoft },
  reportValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benchmarkCard: { padding: 18, gap: 16 },
  benchmarkTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceSoft },
  benchmarkFill: { height: 6, borderRadius: 3 },
  allAnalyticsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  catalogIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.blueSoft },
});
