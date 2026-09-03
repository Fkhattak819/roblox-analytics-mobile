import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AnalyticsChartCard,
  AnalyticsDataStatus,
  AnalyticsErrorState,
  AnalyticsFilterBar,
  AnalyticsLoadingSkeleton,
  AnalyticsMetricCard,
  AnalyticsSectionHeader,
} from '@/src/components/analytics';
import { AnalyticsBenchmarkCarousel } from '@/src/components/analytics-benchmarks';
import { AnalyticsQuickLookGrid, buildAnalyticsQuickLookItems } from '@/src/components/analytics-quick-look';
import { Card, Screen, StudioText } from '@/src/components/ui';
import type { AnalyticsDateRange, AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { experiences } from '@/src/data/sample-data';
import { mostWordsWinBenchmarks } from '@/src/data/roblox-benchmarks';
import { useAnalyticsQuickLook } from '@/src/hooks/use-analytics-quick-look';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

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
const MOST_WORDS_WIN_UNIVERSE_ID = '10009166512';
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
    <View style={styles.trendSwitcher}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option)}
            style={[styles.trendOption, active && styles.trendOptionActive]}>
            <StudioText size={9.5} weight="semibold" style={{ color: active ? '#9BB0FF' : colors.textMuted }} numberOfLines={1}>
              {option}
            </StudioText>
          </Pressable>
        );
      })}
    </View>
  );
}

function BenchmarkCard({ title, value, percentile }: { title: string; value: string; percentile: number }) {
  return (
    <Card style={styles.benchmarkCard}>
      <View style={styles.benchmarkTop}>
        <View style={styles.flex}>
          <StudioText weight="medium" size={12} numberOfLines={1}>{title}</StudioText>
          <StudioText weight="semibold" size={18}>{value}</StudioText>
        </View>
        <StudioText weight="semibold" size={12} tone="green">{percentile}th</StudioText>
      </View>
      <View style={styles.benchmarkTrack}>
        <View style={[styles.benchmarkFill, { width: `${percentile}%` }]} />
        <View style={[styles.benchmarkMarker, { left: `${Math.max(2, Math.min(96, percentile))}%` }]} />
      </View>
      <View style={styles.benchmarkLabels}>
        <StudioText tone="muted" size={8}>0th</StudioText>
        <StudioText tone="muted" size={8}>50th</StudioText>
        <StudioText tone="muted" size={8}>90th</StudioText>
      </View>
    </Card>
  );
}

export default function AnalyticsScreen() {
  const { selectedExperience, dateRange, setDateRange, comparePrevious, setComparePrevious } = useApp();
  const [trendMetric, setTrendMetric] = useState<string>('Day 1 retention');
  const displayExperience = selectedExperience ?? experiences[0];
  const displayExperienceName = displayExperience.id === 'most-words-win' ? 'Most Words Win!' : displayExperience.name;
  const universeId = displayExperience.id === 'most-words-win' ? MOST_WORDS_WIN_UNIVERSE_ID : '0';
  const sampleSnapshot = useMemo(() => createOverviewSampleSnapshot(dateRange, universeId), [dateRange, universeId]);
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
    () => snapshot?.charts.slice(0, 3).map((chart) => chart.title) ?? trendOptions,
    [snapshot],
  );
  const trendChart = snapshot?.charts.find((chart) => chart.title === trendMetric);

  useEffect(() => {
    if (availableTrendOptions.length && !availableTrendOptions.includes(trendMetric)) {
      setTrendMetric(availableTrendOptions[0]);
    }
  }, [availableTrendOptions, trendMetric]);

  const nextDateRange = useMemo(() => {
    const currentIndex = dateRanges.indexOf(dateRange);
    return dateRanges[(currentIndex + 1) % dateRanges.length];
  }, [dateRange]);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.selectorRow}>
        <Pressable onPress={() => router.push('/experience-picker')} style={({ pressed }) => [styles.experienceSelector, pressed && styles.pressed]}>
          <Image source={displayExperience.image} style={styles.experienceImage} contentFit="cover" />
          <View style={styles.flex}>
            <StudioText tone="muted" weight="semibold" size={9}>EXPERIENCE ANALYTICS</StudioText>
            <StudioText weight="semibold" size={16} numberOfLines={1}>{displayExperienceName}</StudioText>
          </View>
          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityLabel="Open notifications" onPress={() => router.push('/notifications')} style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}>
          <Ionicons name="notifications-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <StudioText weight="bold" size={27} lineHeight={33}>Analytics</StudioText>
        <StudioText tone="muted" size={12}>{displayExperienceName} · {isConnectedMode ? 'Roblox Open Cloud snapshot' : 'Roblox reference snapshot'}</StudioText>
      </View>

      <AnalyticsFilterBar
        dateLabel={dateLabels[dateRange]}
        compareEnabled={comparePrevious}
        onDatePress={() => setDateRange(nextDateRange)}
        onComparePress={() => setComparePrevious(!comparePrevious)}
      />

      {loading ? <AnalyticsLoadingSkeleton /> : null}
      {error ? <AnalyticsErrorState message={error} onRetry={reload} /> : null}

      {!loading && !error && snapshot ? (
        <>
          <AnalyticsSectionHeader title="Overview" detail={snapshot.asOf ? `Updated ${formatAsOf(snapshot.asOf)}` : 'Last inspected Sep 2'} />
          <View style={styles.metricsGrid}>
            {snapshot.metrics.map((metric) => (
              <View key={metric.id} style={styles.metricCell}>
                <AnalyticsMetricCard label={metric.label} value={metric.displayValue} delta={metric.change} direction={metric.direction} />
              </View>
            ))}
          </View>

          <AnalyticsDataStatus live={isOfficial} text={snapshot.message} />

          {!isOfficial ? (
            <>
              <AnalyticsSectionHeader title="Insights" detail="1 insight" />
              <Card style={styles.insightCard}>
                <View style={styles.insightIcon}><Ionicons name="trending-up" size={19} color="#8EA7FF" /></View>
                <View style={styles.flex}>
                  <StudioText weight="semibold" size={14}>Weekly plays from ads</StudioText>
                  <StudioText tone="muted" size={11} lineHeight={16}>New users from ads can temporarily shift overall engagement.</StudioText>
                  <StudioText tone="blue" weight="semibold" size={11}>View acquisition ›</StudioText>
                </View>
              </Card>
            </>
          ) : null}

          <AnalyticsSectionHeader title="Trend explorer" detail="Current vs previous" />
          <TrendSwitcher value={trendMetric} options={availableTrendOptions} onChange={setTrendMetric} />
          {trendChart ? (
            <AnalyticsChartCard
              title={trendChart.title}
              value={trendChart.displayValue}
              summary={trendChart.summary}
              values={trendChart.series[0]?.points.map((point) => point.value) ?? []}
              comparisonValues={trendChart.series[1]?.points.map((point) => point.value)}
              labels={chartLabels(trendChart)}
              yAxisLabels={trendChart.yAxisLabels}
              showComparison={comparePrevious}
            />
          ) : null}

          {isConnectedMode ? (
            <View style={styles.benchmarkSection}>
              <AnalyticsSectionHeader title="Benchmarks" detail="Party & casual · 7 day avg" />
              <AnalyticsBenchmarkCarousel benchmarks={mostWordsWinBenchmarks} />
              <AnalyticsDataStatus live={false} label="ROBLOX WEB" text="Captured from Roblox web · Open Cloud does not expose benchmark comparisons" />
            </View>
          ) : null}

          {!isOfficial ? (
            <>
              <AnalyticsSectionHeader title="Benchmarks" detail="Party & casual genre · reference only" />
              <BenchmarkCard title="Average playtime" value="7.3 min" percentile={30} />
              <BenchmarkCard title="Day 1 retention" value="7.34%" percentile={49} />
            </>
          ) : null}

          <AnalyticsSectionHeader title="Explore analytics" detail="6 core sections" />
          <AnalyticsQuickLookGrid items={quickLookItems} />

          <AnalyticsSectionHeader title="More analytics" detail="12 sections" />
          <Card
            accessibilityLabel="Open all analytics sections"
            onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: 'all' } })}
            style={styles.allAnalyticsCard}>
            <View style={styles.catalogIcon}><Ionicons name="list" size={20} color={colors.blue} /></View>
            <View style={styles.flex}>
              <StudioText weight="semibold" size={14}>All analytics</StudioText>
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

const styles = StyleSheet.create({
  screen: { paddingTop: 10, gap: 14 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  experienceSelector: { flex: 1, height: 60, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  experienceImage: { width: 44, height: 44, borderRadius: 8 },
  bellButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  titleBlock: { gap: 2, marginTop: 10, marginBottom: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCell: { width: '48.2%' },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 10 },
  insightIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  trendSwitcher: { height: 32, flexDirection: 'row', padding: 2, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundRaised },
  trendOption: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingHorizontal: 3 },
  trendOptionActive: { backgroundColor: '#273044' },
  benchmarkSection: { gap: 12, marginTop: 6, marginBottom: 8 },
  benchmarkCard: { padding: 12, gap: 9, borderRadius: radii.md },
  benchmarkTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  benchmarkTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceSoft },
  benchmarkFill: { height: 6, borderRadius: 3, backgroundColor: '#7AC463' },
  benchmarkMarker: { position: 'absolute', top: -3, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 2, borderColor: '#A6E68E' },
  benchmarkLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  allAnalyticsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 12 },
  catalogIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.blueSoft },
});
