import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { AnalyticsMetric, AnalyticsSnapshot } from '@/domain/analytics';
import { Sparkline } from '@/src/components/charts';
import { Card, StudioText } from '@/src/components/ui';
import type { AnalyticsQuickLookSnapshots } from '@/src/hooks/use-analytics-quick-look';
import { colors } from '@/src/theme/tokens';

type QuickLookSection = 'engagement' | 'retention' | 'acquisition' | 'monetization' | 'audience' | 'performance';
type PreviewKind = 'trend' | 'retention' | 'funnel' | 'segments' | 'health';

export type AnalyticsQuickLookItem = Readonly<{
  section: QuickLookSection;
  title: string;
  value: string;
  detail: string;
  preview: PreviewKind;
  values: number[];
  retentionValue?: number;
  funnelValues?: number[];
  available: boolean;
}>;

const sampleItems: readonly AnalyticsQuickLookItem[] = [
  { section: 'engagement', title: 'Engagement', value: '124 DAU', detail: '4.1 min avg playtime', preview: 'trend', values: [78, 91, 104, 102, 111, 116, 124], available: true },
  { section: 'retention', title: 'Retention', value: '4.20% D1', detail: '8.02% stickiness', preview: 'retention', values: [], retentionValue: 49, available: true },
  { section: 'acquisition', title: 'Acquisition', value: '3.2K reached', detail: '66 users with plays', preview: 'funnel', values: [], funnelValues: [100, 63, 28], available: true },
  { section: 'monetization', title: 'Monetization', value: 'R$ 42', detail: '0.02% payer conversion', preview: 'segments', values: [], available: true },
  { section: 'audience', title: 'Audience', value: '3.2K MAU', detail: '48.2% United States', preview: 'segments', values: [], available: true },
  { section: 'performance', title: 'Performance', value: 'No signal', detail: 'Low recent sample', preview: 'health', values: [0, 0, 0, 0], available: true },
];

export function buildAnalyticsQuickLookItems({
  overview,
  snapshots,
  connected,
  loading,
}: {
  overview?: AnalyticsSnapshot;
  snapshots: AnalyticsQuickLookSnapshots;
  connected: boolean;
  loading: boolean;
}): AnalyticsQuickLookItem[] {
  if (!connected) return [...sampleItems];

  const engagement = snapshots.engagement;
  const retention = snapshots.retention;
  const acquisition = snapshots.acquisition;
  const monetization = snapshots.monetization;
  const performance = snapshots.performance;

  const dau = findMetric(engagement, 'daily-active-users') ?? findMetric(overview, 'daily-active-users');
  const playtime = findMetric(engagement, 'average-playtime') ?? findMetric(overview, 'average-playtime');
  const d1 = findMetric(retention, 'forward-d1-retention') ?? findMetric(overview, 'forward-d1-retention');
  const d7 = findMetric(retention, 'forward-d7-retention');
  const qualified = findMetric(acquisition, 'qualified-plays');
  const plays = findMetric(acquisition, 'users-with-plays');
  const impressions = findMetric(acquisition, 'impressions');
  const revenue = findMetric(monetization, 'daily-revenue') ?? findMetric(overview, 'daily-revenue');
  const payerCvr = findMetric(monetization, 'payer-cvr');
  const peakCcu = findMetric(performance, 'peak-ccu');
  const crashRate = findMetric(performance, 'client-crash-rate');
  const fps = findMetric(performance, 'client-fps-p10');

  return [
    metricItem({
      section: 'engagement',
      title: 'Engagement',
      metric: dau,
      value: dau ? `${dau.displayValue} DAU` : undefined,
      detail: playtime ? `${playtime.displayValue} avg playtime` : 'Players and playtime',
      preview: 'trend',
      values: chartValues(engagement ?? overview, 'daily-active-users'),
      loading,
    }),
    metricItem({
      section: 'retention',
      title: 'Retention',
      metric: d1,
      value: d1 ? `${d1.displayValue} D1` : undefined,
      detail: d7 ? `${d7.displayValue} D7 retention` : 'Day 1 returning players',
      preview: 'retention',
      values: [],
      retentionValue: d1?.rawValue ?? undefined,
      loading,
    }),
    metricItem({
      section: 'acquisition',
      title: 'Acquisition',
      metric: qualified,
      value: qualified ? `${qualified.displayValue} qualified` : undefined,
      detail: plays ? `${plays.displayValue} users with plays` : 'Discovery to qualified play',
      preview: 'funnel',
      values: [],
      funnelValues: funnelPercentages([impressions, plays, qualified]),
      loading,
    }),
    metricItem({
      section: 'monetization',
      title: 'Monetization',
      metric: revenue,
      value: revenue?.displayValue,
      detail: payerCvr ? `${payerCvr.displayValue} payer conversion` : 'Daily Robux spent',
      preview: 'trend',
      values: chartValues(monetization ?? overview, 'daily-revenue'),
      loading,
    }),
    {
      section: 'audience',
      title: 'Audience',
      value: 'Roblox web',
      detail: 'Demographics not in Open Cloud',
      preview: 'segments',
      values: [],
      available: false,
    },
    metricItem({
      section: 'performance',
      title: 'Performance',
      metric: peakCcu ?? fps ?? crashRate,
      value: peakCcu ? `Peak ${peakCcu.displayValue} CCU` : fps ? `${fps.displayValue} FPS P10` : crashRate?.displayValue,
      detail: crashRate ? `${crashRate.displayValue} crash rate` : 'Client and server health',
      preview: 'health',
      values: chartValues(performance, peakCcu ? 'peak-ccu' : fps ? 'client-fps-p10' : 'client-crash-rate'),
      loading,
    }),
  ];
}

function metricItem({
  section,
  title,
  metric,
  value,
  detail,
  preview,
  values,
  retentionValue,
  funnelValues,
  loading,
}: Omit<AnalyticsQuickLookItem, 'value' | 'available'> & {
  metric?: AnalyticsMetric;
  value?: string;
  loading: boolean;
}): AnalyticsQuickLookItem {
  return {
    section,
    title,
    value: value ?? (loading ? 'Loading…' : 'Not synced'),
    detail: metric ? detail : loading ? 'Checking cached analytics' : 'Open to load official data',
    preview,
    values,
    ...(retentionValue === undefined ? {} : { retentionValue }),
    ...(funnelValues === undefined ? {} : { funnelValues }),
    available: Boolean(metric),
  };
}

function findMetric(snapshot: AnalyticsSnapshot | undefined, id: string) {
  return snapshot?.metrics.find((metric) => metric.id === id);
}

function chartValues(snapshot: AnalyticsSnapshot | undefined, id: string): number[] {
  return snapshot?.charts.find((chart) => chart.id === id)?.series[0]?.points.map((point) => point.value) ?? [];
}

function funnelPercentages(metrics: (AnalyticsMetric | undefined)[]): number[] {
  const values = metrics.map((metric) => metric?.rawValue ?? 0);
  const maximum = Math.max(...values, 1);
  return values.map((value) => Math.max(5, (value / maximum) * 100));
}

export function AnalyticsQuickLookGrid({ items }: { items: readonly AnalyticsQuickLookItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => <AnalyticsQuickLookCard key={item.section} item={item} />)}
    </View>
  );
}

function AnalyticsQuickLookCard({ item }: { item: AnalyticsQuickLookItem }) {
  return (
    <Card
      accessibilityLabel={`Open ${item.title} analytics. ${item.value}. ${item.detail}`}
      onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: item.section } })}
      style={styles.card}>
      <View style={styles.titleRow}>
        <StudioText weight="semibold" size={13}>{item.title}</StudioText>
        <Ionicons name="chevron-forward" size={14} color={colors.blue} />
      </View>
      <StudioText weight="semibold" size={18} numberOfLines={1} adjustsFontSizeToFit>{item.value}</StudioText>
      <StudioText tone="muted" size={9.5} numberOfLines={1}>{item.detail}</StudioText>
      <QuickPreview item={item} />
    </Card>
  );
}

function QuickPreview({ item }: { item: AnalyticsQuickLookItem }) {
  if (item.preview === 'retention') {
    const fill = Math.max(0, Math.min(100, item.retentionValue ?? 0));
    return (
      <View style={styles.retentionPreview}>
        <View style={styles.track}><View style={[styles.retentionFill, { width: `${fill}%` }]} /></View>
        {item.available ? <View style={[styles.marker, { left: `${Math.max(2, Math.min(96, fill))}%` }]} /> : null}
      </View>
    );
  }

  if (item.preview === 'funnel') {
    const values = item.funnelValues?.length ? item.funnelValues : [100, 63, 28];
    return (
      <View style={styles.funnelPreview}>
        {values.map((value, index) => <View key={index} style={[styles.funnelBar, { width: `${value}%`, opacity: item.available ? 1 : 0.35 }]} />)}
      </View>
    );
  }

  if (item.preview === 'segments') {
    if (!item.available) return <View style={[styles.unavailableLine, { backgroundColor: colors.textFaint }]} />;
    return (
      <View style={styles.segmentPreview}>
        <View style={[styles.segmentPart, { flex: 5, backgroundColor: colors.blue }]} />
        <View style={[styles.segmentPart, { flex: 2.1, backgroundColor: colors.cyan }]} />
        <View style={[styles.segmentPart, { flex: 1.1, backgroundColor: colors.yellow }]} />
      </View>
    );
  }

  const values = item.values.length > 1 ? item.values : [0, 0, 0, 0];
  return (
    <View style={styles.sparkWrap}>
      <Sparkline
        values={values}
        color={item.available ? item.preview === 'health' || item.section === 'monetization' ? colors.green : colors.blue : colors.textFaint}
        height={25}
        width={146}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48.4%', height: 112, paddingHorizontal: 11, paddingTop: 10, paddingBottom: 8, gap: 3, borderRadius: 12, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  sparkWrap: { height: 25, marginTop: 'auto', overflow: 'hidden' },
  retentionPreview: { height: 17, justifyContent: 'center', marginTop: 'auto', paddingRight: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceSoft, overflow: 'hidden' },
  retentionFill: { height: '100%', borderRadius: 3, backgroundColor: '#7AC463' },
  marker: { position: 'absolute', width: 11, height: 11, marginLeft: -5, borderRadius: 6, borderWidth: 2, borderColor: '#A6E68E', backgroundColor: colors.surface },
  funnelPreview: { gap: 3, marginTop: 'auto' },
  funnelBar: { height: 5, borderRadius: 3, backgroundColor: colors.blue },
  segmentPreview: { flexDirection: 'row', height: 7, gap: 3, marginTop: 'auto' },
  segmentPart: { borderRadius: 4 },
  unavailableLine: { height: 3, marginTop: 'auto', borderRadius: 2, opacity: 0.55 },
});
