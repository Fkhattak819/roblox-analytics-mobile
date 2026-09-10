import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { AnalyticsDateRange, AnalyticsSectionId, AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { AnalyticsChartCard, AnalyticsErrorState, AnalyticsLoadingSkeleton, AnalyticsMetricCard } from '@/src/components/analytics';
import { HorizontalBars } from '@/src/components/charts';
import { Card, ExperienceHeader, ProgressBar, Screen, StudioText } from '@/src/components/ui';
import { createSampleSnapshot, sectionConfigs } from '@/src/data/analytics-samples';
import { mostWordsWinBenchmarks } from '@/src/data/roblox-benchmarks';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors } from '@/src/theme/tokens';

const isSample = appEnvironment.dataMode === 'sample';
const sections = [
  { id: 'engagement', title: 'Engagement', subtitle: 'How players spend time in your experience', color: colors.blue },
  { id: 'retention', title: 'Retention', subtitle: 'Give players a reason to come back', color: colors.green },
  { id: 'acquisition', title: 'Acquisition', subtitle: 'Where your next players discover you', color: colors.cyan },
  { id: 'monetization', title: 'Monetization', subtitle: 'Revenue and the health of your economy', color: colors.purple },
  { id: 'audience', title: 'Demographics', subtitle: 'Get to know the people who play', color: colors.cyan },
  { id: 'economy', title: 'Economy', subtitle: 'Track the flow of in-experience currency', color: colors.yellow },
  { id: 'funnels', title: 'Funnels', subtitle: 'Understand each step of the player journey', color: colors.blue },
  { id: 'performance', title: 'Monitoring', subtitle: 'Keep your experience running smoothly', color: colors.green },
] as const;
const webOnly = new Set<AnalyticsSectionId>(['audience', 'funnels']);
function openSection(section: string) { router.push({ pathname: '/analytics/[section]', params: { section } }); }
function openTools(group?: string) { router.push({ pathname: '/creator-tools', params: group ? { group } : {} }); }

function Heading({ title, subtitle, action = 'View all', onPress }: { title: string; subtitle: string; action?: string; onPress?: () => void }) {
  return <View style={styles.heading}>
    <View style={styles.flex}><StudioText accessibilityRole="header" size={22} weight="bold">{title}</StudioText><StudioText tone="muted" size={12}>{subtitle}</StudioText></View>
    {onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${action} ${title}`} onPress={onPress} style={styles.action}><StudioText tone="blue" weight="semibold" size={12}>{action} ›</StudioText></Pressable> : null}
  </View>;
}
function Chips({ options, value, onChange }: { options: readonly string[]; value?: string; onChange: (value: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{options.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item === value }} key={item} onPress={() => onChange(item)} style={[styles.chip, item === value && styles.selectedChip]}><StudioText size={12} weight="semibold" tone={item === value ? 'blue' : 'secondary'}>{item}</StudioText></Pressable>)}</ScrollView>;
}
function snapshotSample(section: AnalyticsSectionId, range: AnalyticsDateRange, universeId: string): AnalyticsSnapshot {
  const config = sectionConfigs[section];
  return config ? createSampleSnapshot(section, config, range, universeId) : {
    mode: 'sample', source: 'sample_data', freshness: 'fixture', section, range, universeId,
    metrics: [], charts: [], breakdowns: [], message: 'Sample preview · no events in this section',
  };
}
function SnapshotSection({ section, universeId, range, compare }: {
  section: typeof sections[number]; universeId: string; range: AnalyticsDateRange; compare: boolean;
}) {
  const sample = useMemo(() => snapshotSample(section.id, range, universeId), [section.id, range, universeId]);
  const unavailable = !isSample && webOnly.has(section.id);
  const { snapshot, loading, error, reload } = useAnalyticsSnapshot({ universeId, section: section.id, range, sampleSnapshot: sample, enabled: !unavailable });
  const [chartIndex, setChartIndex] = useState(0);
  const chart = snapshot?.charts[chartIndex] ?? snapshot?.charts[0];
  const points = chart?.series[0]?.points ?? [];
  const labels = points.length ? [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]].map((point) => new Date(point.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })) : [];
  return <View style={styles.section}>
    <Heading title={section.title} subtitle={section.subtitle} onPress={() => openSection(section.id)} />
    <StudioText size={11} tone="muted">{isSample ? 'Sample fixture · Aug 6 – Sep 1, 2026' : `${range === '24H' ? 'Last 24 hours' : `Last ${range.replace('D', '')} days`} · ${snapshot?.asOf ? `Updated ${new Date(snapshot.asOf).toLocaleDateString()}` : 'Official analytics'}`}</StudioText>
    {loading ? <AnalyticsLoadingSkeleton /> : unavailable ? <Card style={styles.empty}>
      <Ionicons name={section.id === 'funnels' ? 'filter-outline' : 'people-outline'} size={26} color={section.color} />
      <StudioText weight="semibold" size={17}>View {section.title.toLowerCase()} in Creator Hub</StudioText>
      <StudioText tone="muted" size={13}>This report is available on Roblox. Open the tools directory to view it for this experience.</StudioText>
      <Pressable accessibilityRole="button" onPress={() => openTools('Analytics')} style={styles.action}><StudioText tone="blue" weight="semibold" size={13}>Open analytics tools ›</StudioText></Pressable>
    </Card> : error ? <AnalyticsErrorState message={error} onRetry={reload} /> : <>
      {snapshot?.metrics.length ? <View style={styles.grid}>{snapshot.metrics.slice(0, 4).map((metric) => <View key={metric.id} style={styles.cell}><AnalyticsMetricCard label={metric.label} value={metric.displayValue} delta={compare ? metric.change : undefined} direction={metric.direction} /></View>)}</View> : null}
      {(snapshot?.charts.length ?? 0) > 1 ? <Chips options={snapshot!.charts.map((item) => item.title)} value={chart?.title} onChange={(title) => setChartIndex(snapshot!.charts.findIndex((item) => item.title === title))} /> : null}
      {chart ? <AnalyticsChartCard title={chart.title} value={chart.displayValue} summary={chart.summary} values={points.map((point) => point.value)} pointTimes={points.map((point) => point.time)} labels={labels} comparisonValues={chart.series[1]?.points.map((point) => point.value)} showComparison={compare} yAxisLabels={chart.yAxisLabels} color={section.color} onExplore={() => openSection(section.id)} /> : null}
      {snapshot?.breakdowns.map((breakdown) => <Card key={breakdown.id} style={styles.breakdown}>
        <StudioText weight="semibold" size={16}>{breakdown.title}</StudioText>
        {breakdown.subtitle ? <StudioText tone="muted" size={12}>{breakdown.subtitle}</StudioText> : null}
        <HorizontalBars items={breakdown.items.map((item) => ({ label: item.label, display: item.displayValue, value: Math.max(0, item.rawValue ?? 0), color: section.color }))} />
      </Card>)}
      {!snapshot?.metrics.length && !snapshot?.charts.length && !snapshot?.breakdowns.length ? <Card style={styles.empty}><Ionicons name="analytics-outline" size={26} color={section.color} /><StudioText size={17} weight="semibold">{section.id === 'economy' ? 'Start measuring your economy' : 'No data for this period'}</StudioText><StudioText size={13} tone="muted">{section.id === 'economy' ? 'Track currency sources and sinks with economy events in your experience.' : snapshot?.message ?? 'Data will appear here when a snapshot is available.'}</StudioText><Pressable accessibilityRole="button" onPress={() => openSection(section.id)} style={styles.action}><StudioText tone="blue" size={13}>View {section.title.toLowerCase()} ›</StudioText></Pressable></Card> : null}
      {!isSample && snapshot ? <StudioText size={11} tone="muted">{snapshot.message}</StudioText> : null}
    </>}
    {section.id === 'monetization' ? <View style={styles.grid}>{[{ title: 'Products & passes', detail: 'Manage what players can buy', icon: 'pricetag-outline' }, { title: 'Creator Rewards', detail: 'Review rewards separately', icon: 'gift-outline' }].map((item) => <Card key={item.title} style={[styles.cell, styles.shortcut]} onPress={() => openTools('Monetization')}><Ionicons name={item.icon as 'pricetag-outline'} size={22} color={section.color} /><StudioText size={14} weight="semibold">{item.title}</StudioText><StudioText size={11} tone="muted">{item.detail} ›</StudioText></Card>)}</View> : null}
    {section.id === 'performance' ? <Card style={styles.breakdown}><StudioText size={16} weight="semibold">Experience health</StudioText>{['Error report', 'Crashes', 'Data Stores', 'Activity History'].map((title) => <Pressable key={title} accessibilityRole="button" onPress={() => openTools('Monitoring')} style={styles.toolRow}><StudioText size={14}>{title}</StudioText><Ionicons name="chevron-forward" size={16} color={colors.textMuted} /></Pressable>)}</Card> : null}
  </View>;
}

export default function HomeScreen() {
  const { selectedWorkspaceExperience: experience } = useApp();
  const [range, setRange] = useState<AnalyticsDateRange>('28D');
  const [compare, setCompare] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const jump = async (title: string) => {
    const reduced = await AccessibilityInfo.isReduceMotionEnabled();
    scrollRef.current?.scrollTo({ y: positions.current[title] ?? 0, animated: !reduced });
  };
  return <Screen scrollRef={scrollRef} contentContainerStyle={styles.screen}>
    <View style={styles.heading}><View style={styles.flex}><StudioText tone="muted" size={12} weight="medium">CREATOR OVERVIEW</StudioText><StudioText size={29} weight="bold">Home</StudioText></View><Pressable accessibilityRole="button" accessibilityLabel="Open creator tools" onPress={() => openTools()} style={styles.iconButton}><Ionicons name="grid-outline" size={23} color={colors.text} /></Pressable></View>
    <ExperienceHeader image={experience.image} name={experience.name} creator={experience.universeId === '10009166512' ? 'BrainNourishmentGames' : experience.creator} onPress={() => router.push('/experience-picker')} />
    <View style={styles.status}><View style={[styles.dot, { backgroundColor: isSample ? colors.yellow : colors.blue }]} /><StudioText tone="muted" size={11}>{isSample ? 'Sample preview · Most Words Win reference data' : 'Connected experience · cached Roblox analytics'}</StudioText></View>

    <View style={styles.controls}>{!isSample ? <Chips options={['7D', '28D', '56D', '90D']} value={range} onChange={(value) => setRange(value as AnalyticsDateRange)} /> : <StudioText size={12} tone="secondary">Sample period · Aug 6 – Sep 1</StudioText>}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: compare }} onPress={() => setCompare((value) => !value)} style={styles.compare}><Ionicons name={compare ? 'checkbox' : 'square-outline'} size={19} color={compare ? colors.blue : colors.textMuted} /><StudioText size={12}>Compare previous period</StudioText></Pressable></View>
    <Chips options={['Engagement', 'Benchmarks', 'Retention', 'Acquisition', 'Monetization', 'Demographics', 'Economy', 'Funnels', 'Monitoring', 'Creator tools']} onChange={(title) => void jump(title)} />

    {sections.map((section, index) => <React.Fragment key={section.id}>
      <View onLayout={(event) => { positions.current[section.title] = event.nativeEvent.layout.y; }}><SnapshotSection key={`${experience.universeId}-${refreshKey}`} section={section} universeId={experience.universeId} range={section.id === 'performance' ? '24H' : range} compare={compare} /></View>
      {index === 0 ? <>
    <Card style={styles.insight}><Ionicons name="bulb-outline" color={colors.blue} size={23} /><View style={styles.flex}><StudioText size={16} weight="semibold">Find your next opportunity</StudioText><StudioText size={13} lineHeight={19} tone="secondary">Start with retention, then compare acquisition sources and payer conversion to see where to focus.</StudioText><Pressable accessibilityRole="button" onPress={() => void jump('Retention')} style={styles.action}><StudioText size={12} tone="blue" weight="semibold">Review retention ↓</StudioText></Pressable></View></Card>
      <View style={styles.section} onLayout={(event) => { positions.current.Benchmarks = event.nativeEvent.layout.y; }}>
        <Heading title="Genre benchmarks" subtitle="See how your experience compares" action="Analytics" onPress={() => router.push('/(tabs)/analytics')} />
        {isSample && experience.universeId === '10009166512' ? <><StudioText tone="muted" size={11}>Most Words Win · recorded Sep 2, 2026 · 7-day averages</StudioText>{mostWordsWinBenchmarks.map((item) => <Card key={item.id} style={styles.benchmark}><StudioText size={14} weight="semibold">{item.title.replace(/ \(.*\)/, '')}</StudioText><View style={styles.heading}><StudioText size={27} weight="bold">{item.value}</StudioText><StudioText tone="muted" size={12}>Percentile {item.percentile}</StudioText></View><ProgressBar value={item.percentile} color={item.accent} /><View style={styles.heading}><StudioText tone="muted" size={11}>Similar experiences · median {item.median}</StudioText><StudioText tone="secondary" size={11}>Top 10%: {item.topDecile}</StudioText></View></Card>)}</> : <Card style={styles.empty}><StudioText size={16} weight="semibold">Compare with similar experiences</StudioText><StudioText tone="muted" size={13}>Genre benchmarks are available in Roblox Creator Hub for eligible experiences.</StudioText><Pressable accessibilityRole="button" onPress={() => openTools('Overview')} style={styles.action}><StudioText size={13} tone="blue">Open experience overview ›</StudioText></Pressable></Card>}
      </View></> : null}
    </React.Fragment>)}
    <View style={styles.section} onLayout={(event) => { positions.current['Creator tools'] = event.nativeEvent.layout.y; }}>
      <Heading title="Creator tools" subtitle="Everything else your experience needs" action="All tools" onPress={() => openTools()} />
      <View style={styles.grid}>{[{ title: 'Configure', icon: 'options-outline', detail: 'Places, servers & permissions' }, { title: 'Audience', icon: 'people-outline', detail: 'Feedback, access & localization' }, { title: 'Promotion', icon: 'megaphone-outline', detail: 'Events, badges & notifications' }, { title: 'Safety', icon: 'shield-checkmark-outline', detail: 'Moderation & collaborators' }].map((item) => <Card key={item.title} style={[styles.cell, styles.shortcut]} onPress={() => openTools(item.title)}><Ionicons name={item.icon as 'options-outline'} size={24} color={colors.blue} /><StudioText size={16} weight="semibold">{item.title}</StudioText><StudioText size={12} tone="muted">{item.detail}</StudioText></Card>)}</View>
    </View>
    <View style={styles.ending}><StudioText size={12} tone="muted">{isSample ? 'You’re viewing sample data. Connect Roblox to see your experience’s analytics.' : 'Reports may update at different times. Check each section’s data status.'}</StudioText><Pressable accessibilityRole="button" onPress={() => isSample ? router.push('/settings/connections') : setRefreshKey((value) => value + 1)} style={styles.action}><StudioText size={13} tone="blue" weight="semibold">{isSample ? 'Connect Roblox ›' : 'Refresh reports'}</StudioText></Pressable><Pressable accessibilityRole="button" onPress={() => void jump('Top')} style={styles.action}><StudioText size={13} tone="muted">Back to top ↑</StudioText></Pressable></View>
  </Screen>;
}
const styles = StyleSheet.create({
  screen: { gap: 20, paddingTop: 8, paddingBottom: 36 }, flex: { flex: 1, gap: 5 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 14 },
  status: { flexDirection: 'row', gap: 7, alignItems: 'center' }, dot: { width: 6, height: 6, borderRadius: 3 },
  intro: { gap: 7, marginTop: 4 }, controls: { gap: 8 }, compare: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  chips: { gap: 8 }, chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }, selectedChip: { backgroundColor: colors.blueSoft, borderColor: colors.blueBorder },
  insight: { flexDirection: 'row', gap: 12, backgroundColor: colors.blueSoft, borderColor: colors.blueBorder, padding: 18 },
  action: { minHeight: 44, justifyContent: 'center' }, section: { gap: 14, marginTop: 12, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, cell: { width: '48%', flexGrow: 1 },
  breakdown: { gap: 18, padding: 18 }, empty: { gap: 12, padding: 20 }, benchmark: { gap: 16, padding: 18 },
  shortcut: { padding: 16, gap: 10, minHeight: 140 }, toolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  ending: { alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 20 },
});
