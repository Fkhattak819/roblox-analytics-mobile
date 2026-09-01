import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LineChart, Sparkline } from '@/src/components/charts';
import { Card, Screen, StudioText } from '@/src/components/ui';
import { analyticsSections, experiences } from '@/src/data/sample-data';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

type TrendMetric = 'Qualified plays' | 'Playtime' | 'D1 retention';
type DateRange = '24H' | '7D' | '30D' | '90D';

const trendOptions = ['Qualified plays', 'Playtime', 'D1 retention'] as const;
const dateRanges: readonly DateRange[] = ['24H', '7D', '30D', '90D'];
const dateLabels: Record<DateRange, string> = {
  '24H': 'Last 24 hours',
  '7D': 'Last 7 days',
  '30D': 'Last 28 days',
  '90D': 'Last 90 days',
};

const trendMetrics: Record<TrendMetric, { label: string; value: string; delta: string; values: number[] }> = {
  'Qualified plays': {
    label: 'QUALIFIED PLAYS',
    value: '22.4K',
    delta: '↑ 8.6%',
    values: [14.2, 15.4, 16.8, 17.6, 18.1, 19.7, 20.4, 21.1, 22.4],
  },
  Playtime: {
    label: 'AVERAGE PLAYTIME',
    value: '12.4 min',
    delta: '↑ 4.1%',
    values: [10.2, 10.8, 10.5, 11.1, 11.4, 11.6, 11.8, 12.1, 12.4],
  },
  'D1 retention': {
    label: 'D1 RETENTION',
    value: '28.6%',
    delta: '↑ 2.1%',
    values: [24.1, 24.8, 25.2, 25.0, 26.1, 26.8, 27.3, 27.9, 28.6],
  },
};

const displayMetrics: Record<string, { value: string; detail: string }> = {
  engagement: { value: '12.8K DAU', detail: 'Playtime · sessions' },
  retention: { value: '28.6% D1', detail: '61st percentile' },
  acquisition: { value: '8.1K qualified', detail: 'Impressions → plays' },
  monetization: { value: 'R$ 4.8K', detail: '1.8% payer conversion' },
  audience: { value: '41.6K MAU', detail: '68% on mobile' },
  performance: { value: 'Healthy', detail: '0.14% crash · 49 FPS' },
};

function SectionHeading({ title, action }: { title: string; action: string }) {
  return (
    <View style={styles.sectionHeading}>
      <StudioText weight="bold" size={19}>{title}</StudioText>
      <StudioText weight="semibold" size={12} style={{ color: colors.green }}>{action}</StudioText>
    </View>
  );
}

function ScopeControl({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.scopeControl, pressed && styles.pressed]}>
      <StudioText tone="muted" size={9} weight="medium">{label}</StudioText>
      <View style={styles.scopeValueRow}>
        <StudioText size={13} weight="medium" numberOfLines={1} style={styles.scopeValue}>{value}</StudioText>
        <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

function OverviewMetric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <Card style={styles.overviewMetric}>
      <StudioText tone="muted" size={9}>{label}</StudioText>
      <StudioText weight="semibold" size={22}>{value}</StudioText>
      <StudioText tone="green" weight="medium" size={10}>{delta}</StudioText>
    </Card>
  );
}

function TrendSwitcher({ value, onChange }: { value: TrendMetric; onChange: (metric: TrendMetric) => void }) {
  return (
    <View style={styles.trendSwitcher}>
      {trendOptions.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} onPress={() => onChange(option)} style={[styles.trendOption, active && styles.trendOptionActive]}>
            <StudioText size={10} weight="medium" style={{ color: active ? '#8FA6FF' : colors.textSecondary }}>{option}</StudioText>
          </Pressable>
        );
      })}
    </View>
  );
}

function MiniPreview({ section }: { section: string }) {
  if (section === 'retention') {
    return (
      <View style={styles.retentionPreview}>
        <View style={[styles.previewTrack, styles.flex]}>
          <View style={[styles.previewFill, { width: '61%', backgroundColor: '#8CD77A' }]} />
        </View>
        <View style={styles.retentionMarker} />
      </View>
    );
  }

  if (section === 'acquisition') {
    return (
      <View style={styles.funnelPreview}>
        <View style={[styles.funnelBar, { width: '100%' }]} />
        <View style={[styles.funnelBar, { width: '70%' }]} />
        <View style={[styles.funnelBar, { width: '46%' }]} />
      </View>
    );
  }

  if (section === 'monetization' || section === 'audience') {
    return (
      <View style={styles.segmentPreview}>
        <View style={[styles.segmentPart, { flex: 5, backgroundColor: colors.blue }]} />
        <View style={[styles.segmentPart, { flex: 2.1, backgroundColor: colors.green }]} />
        <View style={[styles.segmentPart, { flex: 1.1, backgroundColor: colors.yellow }]} />
      </View>
    );
  }

  return (
    <View style={styles.sparkWrap}>
      <Sparkline
        values={section === 'performance' ? [46, 47, 48, 47, 49, 48, 50, 49, 51] : [10, 11, 13, 14, 13, 16, 15, 17, 18]}
        color={section === 'performance' ? colors.green : colors.blue}
        height={27}
      />
    </View>
  );
}

function AnalyticsRouteCard({ section }: { section: (typeof analyticsSections)[number] }) {
  const metric = displayMetrics[section.id];
  return (
    <Card
      accessibilityLabel={`Open ${section.title} analytics`}
      onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: section.id } })}
      style={styles.routeCard}>
      <View style={styles.routeTitleRow}>
        <StudioText weight="medium" size={13}>{section.title}</StudioText>
        <Ionicons name="chevron-forward" size={15} color={colors.blue} />
      </View>
      <View style={styles.routeValueRow}>
        {section.id === 'performance' ? <View style={styles.healthyDot} /> : null}
        <StudioText weight="semibold" size={20} numberOfLines={1} adjustsFontSizeToFit>{metric.value}</StudioText>
      </View>
      <StudioText tone="muted" size={10} numberOfLines={1}>{metric.detail}</StudioText>
      <MiniPreview section={section.id} />
    </Card>
  );
}

export default function AnalyticsScreen() {
  const {
    selectedExperience,
    dateRange,
    setDateRange,
    comparePrevious,
    setComparePrevious,
  } = useApp();
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('Qualified plays');
  const trend = trendMetrics[trendMetric];
  const displayExperience = selectedExperience ?? experiences[0];
  const displayExperienceName = displayExperience.id === 'most-words-win'
    ? 'Most Words Win!'
    : displayExperience.name;

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
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityLabel="Open notifications" onPress={() => router.push('/notifications')} style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}>
          <Ionicons name="notifications-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <StudioText weight="bold" size={27} lineHeight={33}>Analytics</StudioText>
        <StudioText tone="muted" size={12}>Roblox official · updated 2 min ago</StudioText>
      </View>

      <View style={styles.scopeRow}>
        <ScopeControl
          label="DATE RANGE"
          value={dateLabels[dateRange]}
          onPress={() => setDateRange(nextDateRange)}
        />
        <ScopeControl
          label="COMPARE"
          value={comparePrevious ? 'Previous period' : 'No comparison'}
          onPress={() => setComparePrevious(!comparePrevious)}
        />
      </View>

      <SectionHeading title="Overview" action="Roblox official" />
      <View style={styles.metricsRow}>
        <OverviewMetric label="DAILY ACTIVE USERS" value="12.8K" delta="↑ 6.2% vs previous" />
        <OverviewMetric label="AVERAGE PLAYTIME" value="12.4 min" delta="↑ 4.1% vs previous" />
      </View>
      <View style={styles.metricsRow}>
        <OverviewMetric label="D1 RETENTION" value="28.6%" delta="↑ 2.1% vs previous" />
        <OverviewMetric label="DAILY REVENUE" value="R$ 4.8K" delta="↑ 4.7% vs previous" />
      </View>

      <Card style={styles.freshnessCard}>
        <View style={styles.freshnessLine}>
          <View style={styles.freshnessDot} />
          <StudioText tone="secondary" size={11} style={styles.flex}>
            Reconciled through Aug 18 · next sync in 13 min
          </StudioText>
        </View>
      </Card>

      <View style={styles.sectionHeading}>
        <StudioText weight="bold" size={19}>Trend explorer</StudioText>
        <StudioText weight="semibold" tone="blue" size={12}>Open ›</StudioText>
      </View>

      <TrendSwitcher value={trendMetric} onChange={setTrendMetric} />
      <View style={styles.trendSummary}>
        <View>
          <StudioText tone="muted" weight="medium" size={9}>{trend.label}</StudioText>
          <View style={styles.trendValueRow}>
            <StudioText weight="semibold" size={25}>{trend.value}</StudioText>
            <StudioText weight="semibold" size={12} style={{ color: colors.green }}>{trend.delta}</StudioText>
          </View>
        </View>
        <StudioText tone="muted" size={10}>{comparePrevious ? `vs previous ${dateRange === '7D' ? '7 days' : 'period'}` : 'comparison off'}</StudioText>
      </View>
      <View style={styles.chartWrap}>
        <LineChart
          values={trend.values}
          comparisonValues={[14.8, 15.1, 16.1, 16.8, 18.5, 18.9, 19.2, 19.5, 20.1]}
          labels={dateRange === '24H' ? ['12am', '12pm', 'Now'] : ['Aug 14', 'Aug 17', 'Today']}
          height={92}
          selectedIndex={6}
          showLastDot={false}
          fillArea={false}
        />
      </View>

      <SectionHeading title="Explore analytics" action="6 core sections" />
      <View style={styles.routeGrid}>
        {analyticsSections.map((section) => <AnalyticsRouteCard key={section.id} section={section} />)}
      </View>

      <SectionHeading title="More analytics" action="12 sections" />
      <Card
        accessibilityLabel="Open all analytics sections"
        onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: 'all' } })}
        style={styles.allAnalyticsCard}>
        <View style={styles.catalogIcon}>
          <Ionicons name="list" size={21} color={colors.blue} />
        </View>
        <View style={styles.flex}>
          <StudioText weight="semibold" size={14}>All analytics</StudioText>
          <StudioText tone="muted" size={10}>12 additional Roblox sections</StudioText>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.blue} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 10, gap: 14 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  experienceSelector: {
    flex: 1,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#14171D',
  },
  experienceImage: { width: 44, height: 44, borderRadius: 9 },
  bellButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  titleBlock: { gap: 2, marginTop: 12, marginBottom: 8 },
  scopeRow: { flexDirection: 'row', gap: spacing.sm },
  scopeControl: {
    flex: 1,
    minWidth: 0,
    height: 42,
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 11,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scopeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scopeValue: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  overviewMetric: { flex: 1, height: 94, padding: 11, gap: 5, borderRadius: 10 },
  freshnessCard: { height: 38, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 0, borderRadius: radii.sm },
  freshnessLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freshnessDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
  trendSummary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  trendValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  trendSwitcher: { height: 30, flexDirection: 'row', padding: 2, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: '#11141A' },
  trendOption: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  trendOptionActive: { backgroundColor: '#263048' },
  chartWrap: { marginTop: -8, marginHorizontal: -9 },
  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  routeCard: { width: '48.4%', minHeight: 113, padding: 10, gap: 4, borderRadius: 12 },
  routeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  routeValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  healthyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  sparkWrap: { height: 27, marginTop: 'auto', overflow: 'hidden' },
  retentionPreview: { height: 17, flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingRight: 9 },
  previewTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceSoft, overflow: 'hidden' },
  previewFill: { height: '100%', borderRadius: 3 },
  retentionMarker: {
    position: 'absolute',
    left: '61%',
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#A6E68E',
    backgroundColor: colors.surface,
  },
  funnelPreview: { gap: 4, marginTop: 'auto' },
  funnelBar: { height: 5, borderRadius: 3, backgroundColor: colors.blue },
  segmentPreview: { flexDirection: 'row', height: 7, gap: 3, marginTop: 'auto' },
  segmentPart: { borderRadius: 4 },
  allAnalyticsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12 },
  catalogIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.blueSoft,
  },
});
