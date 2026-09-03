import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import type { AnalyticsDateRange, AnalyticsDirection, AnalyticsMetric, AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import {
  AnalyticsDataStatus,
  AnalyticsErrorState,
  AnalyticsLoadingSkeleton,
} from '@/src/components/analytics';
import { AnalyticsBenchmarkCarousel } from '@/src/components/analytics-benchmarks';
import { AnalyticsQuickLookGrid, buildAnalyticsQuickLookItems } from '@/src/components/analytics-quick-look';
import { LineChart, Sparkline } from '@/src/components/charts';
import { Card, ProgressBar, Screen, StudioText } from '@/src/components/ui';
import { mostWordsWinBenchmarks } from '@/src/data/roblox-benchmarks';
import { experiences, playersTrend, portfolioTrend, revenueTrend } from '@/src/data/sample-data';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useAnalyticsQuickLook } from '@/src/hooks/use-analytics-quick-look';
import { colors, spacing } from '@/src/theme/tokens';
import { metricTrendColor } from '@/src/utils/metric-trend';

function UpperLabel({ children }: React.PropsWithChildren) {
  return (
    <StudioText tone="muted" weight="semibold" size={10} style={styles.upperLabel}>
      {children}
    </StudioText>
  );
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString('en-US');
}

function PositiveDelta({ children }: React.PropsWithChildren) {
  return (
    <View style={styles.delta}>
      <Ionicons name="arrow-up" size={10} color={colors.green} />
      <StudioText tone="green" weight="semibold" size={11}>{children}</StudioText>
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.flex}>
        <StudioText weight="bold" size={20}>{title}</StudioText>
        {subtitle ? <StudioText tone="muted" size={11}>{subtitle}</StudioText> : null}
      </View>
      {action ? (
        <Pressable hitSlop={10} onPress={onPress}>
          <StudioText tone="blue" weight="semibold" size={11}>{action} ›</StudioText>
        </Pressable>
      ) : null}
    </View>
  );
}

function CompactMetric({
  label,
  value,
  change,
  footnote,
  values,
  color,
  direction = 'positive',
  onPress,
}: {
  label: string;
  value: string;
  change?: string;
  footnote: string;
  values: number[];
  color: string;
  direction?: AnalyticsDirection;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.compactMetric}>
      <UpperLabel>{label}</UpperLabel>
      <View style={styles.compactMetricMiddle}>
        <View style={styles.flex}>
          <StudioText weight="bold" size={23} lineHeight={26} numberOfLines={1} adjustsFontSizeToFit>{value}</StudioText>
          {change ? <DashboardDelta change={change} direction={direction} /> : null}
        </View>
        {values.length > 1 ? <Sparkline values={values} color={color} height={33} width={72} /> : null}
      </View>
      <StudioText tone="muted" size={10}>{footnote}</StudioText>
    </Card>
  );
}

function QualityCard({
  title,
  value,
  change,
  detail,
  values,
  color,
  direction = 'positive',
  onPress,
}: {
  title: string;
  value: string;
  change?: string;
  detail: string;
  values: number[];
  color: string;
  direction?: AnalyticsDirection;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.qualityCard}>
      <UpperLabel>{title}</UpperLabel>
      <View style={styles.qualityValueRow}>
        <StudioText weight="bold" size={22}>{value}</StudioText>
        {change ? <DashboardDelta change={change} direction={direction} /> : null}
      </View>
      <StudioText tone="muted" size={10}>{detail}</StudioText>
      {values.length > 1 ? (
        <View style={styles.qualityChart}>
          <LineChart values={values} color={color} height={64} showLastDot={false} />
        </View>
      ) : <View style={styles.qualityEmptyLine} />}
    </Card>
  );
}

const HOME_CAROUSEL_CARD_WIDTH = 305;
const HOME_CAROUSEL_GAP = 10;
const HOME_CAROUSEL_INTERVAL = HOME_CAROUSEL_CARD_WIDTH + HOME_CAROUSEL_GAP;

function PagerDots({ count, active, onSelect }: { count: number; active: number; onSelect: (index: number) => void }) {
  return (
    <View style={styles.pagerDots}>
      {Array.from({ length: count }).map((_, index) => (
        <Pressable
          key={index}
          accessibilityLabel={`Show card ${index + 1} of ${count}`}
          accessibilityRole="button"
          accessibilityState={{ selected: index === active }}
          hitSlop={8}
          onPress={() => onSelect(index)}
          style={styles.pagerDotButton}>
          <View style={[styles.pagerDot, index === active && styles.pagerDotActive]} />
        </Pressable>
      ))}
    </View>
  );
}

function HomeCarousel({ children }: React.PropsWithChildren) {
  const cards = React.Children.toArray(children);
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);

  const updateActiveCard = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.max(0, Math.min(cards.length - 1, Math.round(event.nativeEvent.contentOffset.x / HOME_CAROUSEL_INTERVAL)));
    setActive((current) => current === next ? current : next);
  };

  const selectCard = (index: number) => {
    setActive(index);
    scrollRef.current?.scrollTo({ x: index * HOME_CAROUSEL_INTERVAL, animated: true });
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        horizontal
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        snapToInterval={HOME_CAROUSEL_INTERVAL}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={updateActiveCard}
        contentContainerStyle={styles.horizontalCards}>
        {cards}
      </ScrollView>
      {cards.length > 1 ? <PagerDots count={cards.length} active={active} onSelect={selectCard} /> : null}
    </>
  );
}

function FunnelRow({
  label,
  value,
  percent,
  fill,
}: {
  label: string;
  value: string;
  percent: string;
  fill: number;
}) {
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelLabels}>
        <StudioText tone="secondary" weight="medium" size={11}>{label}</StudioText>
        <View style={styles.funnelNumbers}>
          <StudioText tone="secondary" weight="semibold" size={11}>{value}</StudioText>
          <StudioText tone="muted" size={10} style={styles.funnelPercent}>{percent}</StudioText>
        </View>
      </View>
      <ProgressBar value={fill} color={colors.blue} />
    </View>
  );
}

function HealthMetric({
  label,
  value,
  detail,
  change,
  direction,
}: {
  label: string;
  value: string;
  detail: string;
  change?: string;
  direction?: AnalyticsDirection;
}) {
  return (
    <View style={styles.healthMetric}>
      <UpperLabel>{label}</UpperLabel>
      <View style={styles.healthValueRow}>
        <StudioText weight="bold" size={19}>{value}</StudioText>
        {change ? <StudioText weight="semibold" size={10} style={{ color: metricTrendColor(change, direction) }}>{change}</StudioText> : null}
      </View>
      <StudioText tone="muted" size={9}>{detail}</StudioText>
    </View>
  );
}

function DashboardDelta({ change, direction = 'neutral' }: { change: string; direction?: AnalyticsDirection }) {
  return <StudioText weight="semibold" size={10} style={{ color: metricTrendColor(change, direction) }}>{change}</StudioText>;
}

function DateRangeDropdown({
  value,
  options,
  onChange,
}: {
  value: AnalyticsDateRange;
  options: readonly AnalyticsDateRange[];
  onChange: (value: AnalyticsDateRange) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.rangePicker}>
      <Pressable
        accessibilityLabel={`Date range: ${value}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.todayControl, open && styles.todayControlOpen, pressed && styles.pressed]}>
        <StudioText weight="medium" size={12}>{value}</StudioText>
        <Ionicons name={open ? 'caret-up' : 'caret-down'} size={9} color={colors.textSecondary} />
      </Pressable>
      {open ? (
        <View accessibilityRole="menu" style={styles.rangeMenu}>
          {options.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.rangeOption, selected && styles.rangeOptionSelected, pressed && styles.pressed]}>
                <StudioText weight={selected ? 'semibold' : 'medium'} size={12} style={{ color: selected ? colors.text : colors.textSecondary }}>{option}</StudioText>
                {selected ? <Ionicons name="checkmark" size={14} color={colors.blue} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function snapshotMetric(snapshot: AnalyticsSnapshot | undefined, id: string): AnalyticsMetric | undefined {
  return snapshot?.metrics.find((metric) => metric.id === id);
}

function snapshotChartValues(snapshot: AnalyticsSnapshot | undefined, id: string): number[] {
  return snapshot?.charts.find((chart) => chart.id === id)?.series[0]?.points.map((point) => point.value) ?? [];
}

function snapshotChartLabels(snapshot: AnalyticsSnapshot | undefined, id: string): string[] {
  const points = snapshot?.charts.find((chart) => chart.id === id)?.series[0]?.points ?? [];
  if (!points.length) return [];
  const indexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  return indexes.map((index) => new Date(points[index].time).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }));
}

function stagePercent(current?: AnalyticsMetric, previous?: AnalyticsMetric): string {
  if (!current || !previous || !previous.rawValue) return '—';
  return `${((Number(current.rawValue ?? 0) / previous.rawValue) * 100).toFixed(1)}%`;
}

function stageFill(metric: AnalyticsMetric | undefined, maximum: number): number {
  return metric?.rawValue === undefined || metric.rawValue === null ? 0 : (metric.rawValue / Math.max(1, maximum)) * 100;
}

function snapshotUpdateLabel(asOf?: string): string {
  if (!asOf) return 'cached snapshot';
  return new Date(asOf).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function HomeTrendCard({
  title,
  metric,
  values,
  labels,
  color,
  route,
}: {
  title: string;
  metric?: AnalyticsMetric;
  values: number[];
  labels: string[];
  color: string;
  route: 'engagement' | 'retention' | 'monetization';
}) {
  return (
    <Card onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: route } })} style={styles.analyticsCard}>
      <View style={styles.analyticsCardTop}>
        <StudioText weight="semibold" size={13}>{title}</StudioText>
        <StudioText tone="blue" weight="semibold" size={10}>Explore ›</StudioText>
      </View>
      <View style={styles.analyticsValueRow}>
        <StudioText weight="bold" size={20}>{metric?.displayValue ?? 'Not synced'}</StudioText>
        {metric?.change ? <DashboardDelta change={metric.change} direction={metric.direction} /> : null}
      </View>
      {values.length > 1 ? (
        <LineChart values={values} color={color} height={126} labels={labels} showLastDot={false} />
      ) : (
        <View style={styles.trendEmpty}>
          <Ionicons name="analytics-outline" size={21} color={colors.textFaint} />
          <StudioText tone="muted" size={10}>Open this section to sync its trend.</StudioText>
        </View>
      )}
    </Card>
  );
}

type HomeAnalyticsRoute = 'engagement' | 'retention' | 'acquisition' | 'monetization' | 'performance';

function FocusRow({
  icon,
  title,
  detail,
  signal,
  route,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  signal: string;
  route: HomeAnalyticsRoute;
}) {
  return (
    <Card
      accessibilityLabel={`${title}. ${detail}. ${signal}`}
      onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: route } })}
      style={styles.focusRow}>
      <View style={styles.focusIcon}><Ionicons name={icon} size={18} color="#9DB0FF" /></View>
      <View style={styles.flex}>
        <StudioText weight="semibold" size={13}>{title}</StudioText>
        <StudioText tone="muted" size={10} lineHeight={14}>{detail}</StudioText>
        <StudioText tone="blue" weight="semibold" size={10}>{signal}</StudioText>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
    </Card>
  );
}

function FreshnessRow({ label, snapshot }: { label: string; snapshot?: AnalyticsSnapshot }) {
  return (
    <View style={styles.freshnessRow}>
      <View style={[styles.freshnessDot, !snapshot && styles.freshnessDotMissing]} />
      <View style={styles.flex}>
        <StudioText tone="secondary" weight="medium" size={11}>{label}</StudioText>
        <StudioText tone="muted" size={9}>{snapshot ? `Updated ${snapshotUpdateLabel(snapshot.asOf)}` : 'Open section to sync'}</StudioText>
      </View>
      <StudioText tone={snapshot ? 'green' : 'muted'} weight="semibold" size={9}>{snapshot ? 'READY' : 'WAITING'}</StudioText>
    </View>
  );
}

export default function HomeScreen() {
  return appEnvironment.dataMode === 'aws_dev' ? <ConnectedHomeScreen /> : <SampleHomeScreen />;
}

function ConnectedHomeScreen() {
  const [range, setRange] = useState<AnalyticsDateRange>('28D');
  const sampleSnapshot = useMemo<AnalyticsSnapshot>(() => ({
    mode: 'sample',
    source: 'sample_data',
    freshness: 'fixture',
    universeId: '10009166512',
    section: 'overview',
    range,
    metrics: [],
    charts: [],
    breakdowns: [],
    message: 'No official analytics snapshot is available yet.',
  }), [range]);
  const { snapshot, loading, error, reload } = useAnalyticsSnapshot({
    universeId: '10009166512',
    section: 'overview',
    range,
    sampleSnapshot,
  });
  const quickLook = useAnalyticsQuickLook({ universeId: '10009166512' });
  const quickLookItems = useMemo(() => buildAnalyticsQuickLookItems({
    overview: snapshot,
    snapshots: quickLook.snapshots,
    connected: true,
    loading: quickLook.loading,
  }), [quickLook.loading, quickLook.snapshots, snapshot]);
  const ranges: readonly AnalyticsDateRange[] = ['7D', '28D', '56D'];
  const engagement = quickLook.snapshots.engagement;
  const retention = quickLook.snapshots.retention;
  const acquisition = quickLook.snapshots.acquisition;
  const monetization = quickLook.snapshots.monetization;
  const performance = quickLook.snapshots.performance;
  const dailyActiveUsers = snapshotMetric(engagement, 'daily-active-users') ?? snapshotMetric(snapshot, 'daily-active-users');
  const averagePlaytime = snapshotMetric(engagement, 'average-playtime') ?? snapshotMetric(snapshot, 'average-playtime');
  const totalPlaytime = snapshotMetric(engagement, 'total-playtime');
  const averageSession = snapshotMetric(engagement, 'average-session-time');
  const dayOneRetention = snapshotMetric(retention, 'forward-d1-retention') ?? snapshotMetric(snapshot, 'forward-d1-retention');
  const daySevenRetention = snapshotMetric(retention, 'forward-d7-retention');
  const dayThirtyRetention = snapshotMetric(retention, 'forward-d30-retention');
  const stickiness = snapshotMetric(retention, 'dau-mau-stickiness');
  const dailyRevenue = snapshotMetric(monetization, 'daily-revenue') ?? snapshotMetric(snapshot, 'daily-revenue');
  const payerConversion = snapshotMetric(monetization, 'payer-cvr');
  const averageRevenuePerPayer = snapshotMetric(monetization, 'arppu');
  const payingUsers = snapshotMetric(monetization, 'paying-users');
  const impressions = snapshotMetric(acquisition, 'impressions');
  const clicks = snapshotMetric(acquisition, 'clicks');
  const usersWithPlays = snapshotMetric(acquisition, 'users-with-plays');
  const qualifiedPlays = snapshotMetric(acquisition, 'qualified-plays');
  const peakCcu = snapshotMetric(performance, 'peak-ccu');
  const crashRate = snapshotMetric(performance, 'client-crash-rate');
  const clientFps = snapshotMetric(performance, 'client-fps-p10');
  const oomExits = snapshotMetric(performance, 'oom-exits');
  const heroValues = snapshotChartValues(engagement, 'daily-active-users').length
    ? snapshotChartValues(engagement, 'daily-active-users')
    : snapshotChartValues(snapshot, 'daily-active-users');
  const heroLabels = snapshotChartLabels(engagement, 'daily-active-users').length
    ? snapshotChartLabels(engagement, 'daily-active-users')
    : snapshotChartLabels(snapshot, 'daily-active-users');
  const funnelMaximum = Number(impressions?.rawValue ?? Math.max(
    Number(clicks?.rawValue ?? 0),
    Number(usersWithPlays?.rawValue ?? 0),
    Number(qualifiedPlays?.rawValue ?? 0),
    1,
  ));
  const insight = [qualifiedPlays, dailyActiveUsers, averagePlaytime, dayOneRetention, dailyRevenue]
    .find((metric) => Boolean(metric?.change));
  const insightRoute = insight === qualifiedPlays
    ? 'acquisition'
    : insight === dayOneRetention
      ? 'retention'
      : insight === dailyRevenue
        ? 'monetization'
        : 'engagement';
  const insightRange = insight === qualifiedPlays
    ? acquisition?.range
    : insight === dayOneRetention
      ? retention?.range
      : insight === dailyRevenue
        ? monetization?.range
        : engagement?.range ?? snapshot?.range;
  const performanceStatus = !crashRate || crashRate.rawValue === undefined || crashRate.rawValue === null
    ? 'waiting'
    : crashRate.rawValue <= 1
      ? 'healthy'
      : 'attention';
  const qualifiedRate = usersWithPlays?.rawValue
    ? (Number(qualifiedPlays?.rawValue ?? 0) / usersWithPlays.rawValue) * 100
    : undefined;
  const retentionNeedsFocus = Number(dayOneRetention?.rawValue ?? 0) < 5;
  const monetizationNeedsFocus = Number(payerConversion?.rawValue ?? 0) < 1;
  const acquisitionNeedsFocus = qualifiedRate !== undefined && qualifiedRate < 60;

  return (
    <Screen
      contentContainerStyle={styles.connectedScreen}
      refreshControl={<RefreshControl refreshing={loading || quickLook.loading} onRefresh={() => { reload(); quickLook.reload(); }} tintColor={colors.blue} />}>
      <View style={styles.creatorHeader}>
        <Pressable accessibilityLabel="Choose experience" onPress={() => router.push('/experience-picker')} style={({ pressed }) => [styles.creatorIdentity, pressed && styles.pressed]}>
          <Image source={experiences[0].image} contentFit="cover" style={styles.experienceAvatar} />
          <View><UpperLabel>EXPERIENCE ANALYTICS</UpperLabel><View style={styles.portfolioName}><StudioText weight="semibold" size={16}>Most Words Win!</StudioText><Ionicons name="caret-down" size={10} color={colors.textSecondary} /></View></View>
        </Pressable>
        <Pressable accessibilityLabel="Open notifications" onPress={() => router.push('/notifications')} style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}><Ionicons name="notifications-outline" size={19} color={colors.textSecondary} /></Pressable>
      </View>
      <View style={styles.homeHeading}>
        <View><StudioText weight="bold" size={27} lineHeight={30}>Home</StudioText><StudioText tone="muted" size={12}>Official analytics summary</StudioText><StudioText tone="green" weight="semibold" size={9} style={styles.connectionLabel}>ROBLOX OPEN CLOUD</StudioText></View>
        <DateRangeDropdown value={range} options={ranges} onChange={setRange} />
      </View>
      {loading ? <AnalyticsLoadingSkeleton /> : null}
      {error ? <AnalyticsErrorState message={error} onRetry={reload} /> : null}
      {!loading && !error && snapshot ? (
        <>
          <Card onPress={() => router.push('/analytics/engagement')} style={styles.heroCard}>
            <UpperLabel>DAILY ACTIVE USERS · UPDATED {snapshotUpdateLabel(engagement?.asOf ?? snapshot.asOf).toUpperCase()}</UpperLabel>
            <StudioText weight="bold" size={39} lineHeight={42}>{dailyActiveUsers?.displayValue ?? 'Not synced'}</StudioText>
            <View style={styles.heroDeltaRow}>
              {dailyActiveUsers?.change ? <DashboardDelta change={dailyActiveUsers.change} direction={dailyActiveUsers.direction} /> : null}
              <StudioText tone="muted" size={10}>vs previous period</StudioText>
            </View>
            <View style={styles.heroChart}>
              {heroValues.length > 1 ? (
                <LineChart values={heroValues} color={colors.blue} height={87} labels={heroLabels} showLastDot={false} />
              ) : (
                <View style={styles.heroEmpty}><StudioText tone="muted" size={10}>Open Engagement to sync the activity trend.</StudioText></View>
              )}
            </View>
            <View style={styles.heroFooter}>
              <StudioText tone="secondary" size={11}>Avg playtime  <StudioText weight="semibold" size={11}>{averagePlaytime?.displayValue ?? '—'}</StudioText></StudioText>
              <StudioText tone="secondary" size={11}>Peak CCU  <StudioText weight="semibold" size={11}>{peakCcu?.displayValue ?? '—'}</StudioText></StudioText>
            </View>
          </Card>

          <View style={styles.metricRowConnected}>
            <CompactMetric
              label="DAILY REVENUE"
              value={dailyRevenue?.displayValue ?? 'Not synced'}
              change={dailyRevenue?.change}
              direction={dailyRevenue?.direction}
              footnote={payerConversion ? `${payerConversion.displayValue} payer CVR` : 'Official Roblox revenue'}
              values={snapshotChartValues(monetization ?? snapshot, 'daily-revenue')}
              color={colors.green}
              onPress={() => router.push('/(tabs)/sales')}
            />
            <CompactMetric
              label="AVERAGE PLAYTIME"
              value={averagePlaytime?.displayValue ?? 'Not synced'}
              change={averagePlaytime?.change}
              direction={averagePlaytime?.direction}
              footnote={averageSession ? `${averageSession.displayValue} avg session` : `Last ${range}`}
              values={snapshotChartValues(engagement ?? snapshot, 'average-playtime')}
              color={colors.blue}
              onPress={() => router.push('/analytics/engagement')}
            />
          </View>

          <Card onPress={() => router.push('/analytics/performance')} style={styles.recordCardConnected}>
            <View style={styles.recordIcon}><Ionicons name="pulse-outline" size={20} color="#9DB0FF" /></View>
            <View style={styles.flex}>
              <StudioText weight="semibold" size={15}>{peakCcu ? `Recent peak · ${peakCcu.displayValue} CCU` : 'Performance snapshot'}</StudioText>
              <StudioText style={styles.recordDetail} size={11}>{peakCcu ? 'Aggregated Roblox signal · not a live counter' : 'Open Performance to load the latest signal'}</StudioText>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#9DB0FF" />
          </Card>

          <View style={styles.firstSection}>
            <SectionHeading title="Game quality" action="Analytics" onPress={() => router.push('/(tabs)/analytics')} />
            <HomeCarousel>
              <QualityCard
                title="QUALIFIED PLAYS"
                value={qualifiedPlays?.displayValue ?? 'Not synced'}
                change={qualifiedPlays?.change}
                direction={qualifiedPlays?.direction}
                detail={usersWithPlays ? `${usersWithPlays.displayValue} users started playing` : 'Discovery to meaningful play'}
                values={snapshotChartValues(acquisition, 'qualified-plays')}
                color={colors.blue}
                onPress={() => router.push('/analytics/acquisition')}
              />
              <QualityCard
                title="AVERAGE SESSION TIME"
                value={averageSession?.displayValue ?? 'Not synced'}
                change={averageSession?.change}
                direction={averageSession?.direction}
                detail={totalPlaytime ? `${totalPlaytime.displayValue} total playtime` : 'Latest cached engagement window'}
                values={snapshotChartValues(engagement, 'average-session-time')}
                color={colors.cyan}
                onPress={() => router.push('/analytics/engagement')}
              />
              <QualityCard
                title="DAY 1 RETENTION"
                value={dayOneRetention?.displayValue ?? 'Not synced'}
                change={dayOneRetention?.change}
                direction={dayOneRetention?.direction}
                detail={daySevenRetention ? `${daySevenRetention.displayValue} Day 7 retention` : 'Returning players after one day'}
                values={snapshotChartValues(retention, 'forward-d1-retention')}
                color={colors.purple}
                onPress={() => router.push('/analytics/retention')}
              />
            </HomeCarousel>
          </View>

          <View style={styles.section}>
            <SectionHeading title="What changed" action="View all" onPress={() => router.push('/(tabs)/analytics')} />
            <Card onPress={() => router.push({ pathname: '/analytics/[section]', params: { section: insightRoute } })} style={styles.insightCard}>
              <View style={styles.insightIcon}><Ionicons name="trending-up" size={19} color="#9DB0FF" /></View>
              <View style={styles.flex}>
                <StudioText weight="semibold" size={14} lineHeight={18}>
                  {insight ? `${insight.label} ${insight.change}` : 'Your official snapshots are ready to explore'}
                </StudioText>
                <StudioText tone="muted" size={10} style={styles.connectedInsightCopy}>
                  {insight ? `Compared with the previous ${insightRange ?? range} period. Tap through for the complete trend.` : 'Open an analytics section to load a comparison signal.'}
                </StudioText>
                <View style={styles.insightLink}><StudioText tone="blue" weight="semibold" size={11}>View insight</StudioText><Ionicons name="chevron-forward" size={11} color={colors.blue} /></View>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeading title="Explore analytics" subtitle="Six signals creators check most" action="View all" onPress={() => router.push('/(tabs)/analytics')} />
            <AnalyticsQuickLookGrid items={quickLookItems} />
          </View>

          <View style={styles.section}>
            <SectionHeading title="More analytics" subtitle="Latest cached data · Swipe to explore" />
            <HomeCarousel>
              <HomeTrendCard title="Player activity" metric={dailyActiveUsers} values={heroValues} labels={heroLabels} color={colors.blue} route="engagement" />
              <HomeTrendCard title="Day 1 retention" metric={dayOneRetention} values={snapshotChartValues(retention, 'forward-d1-retention')} labels={snapshotChartLabels(retention, 'forward-d1-retention')} color={colors.purple} route="retention" />
            </HomeCarousel>
          </View>

          <View style={styles.section}>
            <SectionHeading title="Benchmarks" subtitle="Party & casual · 7 day average" action="Analytics" onPress={() => router.push('/(tabs)/analytics')} />
            <AnalyticsBenchmarkCarousel benchmarks={mostWordsWinBenchmarks} />
          </View>

          <View style={styles.section}>
            <SectionHeading title="Retention snapshot" subtitle="Return behavior at a glance" action="Explore" onPress={() => router.push('/analytics/retention')} />
            <Card onPress={() => router.push('/analytics/retention')} style={styles.retentionCard}>
              <View style={styles.retentionGrid}>
                <HealthMetric label="DAY 1" value={dayOneRetention?.displayValue ?? '—'} detail="Next-day return" change={dayOneRetention?.change} direction={dayOneRetention?.direction} />
                <HealthMetric label="DAY 7" value={daySevenRetention?.displayValue ?? '—'} detail="Weekly return" change={daySevenRetention?.change} direction={daySevenRetention?.direction} />
                <HealthMetric label="DAY 30" value={dayThirtyRetention?.displayValue ?? '—'} detail="Long-term return" change={dayThirtyRetention?.change} direction={dayThirtyRetention?.direction} />
                <HealthMetric label="STICKINESS" value={stickiness?.displayValue ?? '—'} detail="DAU divided by MAU" change={stickiness?.change} direction={stickiness?.direction} />
              </View>
              {snapshotChartValues(retention, 'forward-d1-retention').length > 1 ? (
                <LineChart
                  values={snapshotChartValues(retention, 'forward-d1-retention')}
                  color={colors.purple}
                  height={112}
                  labels={snapshotChartLabels(retention, 'forward-d1-retention')}
                  showLastDot={false}
                />
              ) : <View style={styles.retentionEmpty}><StudioText tone="muted" size={10}>Open Retention to sync the cohort trend.</StudioText></View>}
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeading title="Monetization" action="Explore" onPress={() => router.push('/analytics/monetization')} />
            <HomeCarousel>
              <Card onPress={() => router.push('/analytics/monetization')} style={styles.moneyCard}>
                <UpperLabel>DAILY REVENUE</UpperLabel>
                <View style={styles.moneyValueRow}>
                  <StudioText weight="bold" size={27}>{dailyRevenue?.displayValue ?? 'Not synced'}</StudioText>
                  {dailyRevenue?.change ? <DashboardDelta change={dailyRevenue.change} direction={dailyRevenue.direction} /> : null}
                </View>
                <StudioText tone="muted" size={10}>Latest official cached period</StudioText>
                <View style={styles.moneyStats}>
                  <View style={styles.moneyStat}><UpperLabel>PAYER CVR</UpperLabel><StudioText weight="bold" size={17}>{payerConversion?.displayValue ?? '—'}</StudioText></View>
                  <View style={styles.moneyStat}><UpperLabel>ARPPU</UpperLabel><StudioText weight="bold" size={17}>{averageRevenuePerPayer?.displayValue ?? '—'}</StudioText></View>
                </View>
                <View style={styles.topProduct}>
                  <View style={styles.productTile}><Ionicons name="people-outline" size={15} color={colors.textSecondary} /></View>
                  <View style={styles.flex}><UpperLabel>PAYING USERS</UpperLabel><StudioText tone="secondary" weight="semibold" size={11}>{payingUsers?.displayValue ?? 'Not synced'}</StudioText></View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </Card>
              <HomeTrendCard title="Revenue trend" metric={dailyRevenue} values={snapshotChartValues(monetization ?? snapshot, 'daily-revenue')} labels={snapshotChartLabels(monetization ?? snapshot, 'daily-revenue')} color={colors.blue} route="monetization" />
            </HomeCarousel>
          </View>

          <View style={styles.section}>
            <SectionHeading title="Acquisition" action="Explore" onPress={() => router.push('/analytics/acquisition')} />
            <Card onPress={() => router.push('/analytics/acquisition')} style={styles.acquisitionCardConnected}>
              <UpperLabel>DISCOVERY TO QUALIFIED PLAY</UpperLabel>
              <View style={styles.acquisitionValue}>
                <StudioText weight="bold" size={21}>{qualifiedPlays ? `${qualifiedPlays.displayValue} qualified users` : 'Not synced'}</StudioText>
                {qualifiedPlays?.change ? <DashboardDelta change={qualifiedPlays.change} direction={qualifiedPlays.direction} /> : null}
              </View>
              <View style={styles.funnel}>
                <FunnelRow label="Impressions" value={impressions?.displayValue ?? '—'} percent={impressions ? '100%' : '—'} fill={stageFill(impressions, funnelMaximum)} />
                <FunnelRow label="Clicks" value={clicks?.displayValue ?? '—'} percent={stagePercent(clicks, impressions)} fill={stageFill(clicks, funnelMaximum)} />
                <FunnelRow label="Plays" value={usersWithPlays?.displayValue ?? '—'} percent={stagePercent(usersWithPlays, clicks ?? impressions)} fill={stageFill(usersWithPlays, funnelMaximum)} />
                <FunnelRow label="Qualified" value={qualifiedPlays?.displayValue ?? '—'} percent={stagePercent(qualifiedPlays, usersWithPlays)} fill={stageFill(qualifiedPlays, funnelMaximum)} />
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeading title="Performance health" action="Explore" onPress={() => router.push('/analytics/performance')} />
            <Card onPress={() => router.push('/analytics/performance')} style={styles.performanceCard}>
              <View style={styles.healthHeader}>
                <View style={[styles.healthDot, performanceStatus === 'attention' && styles.healthDotWarning, performanceStatus === 'waiting' && styles.healthDotWaiting]} />
                <StudioText weight="semibold" size={17}>{performanceStatus === 'healthy' ? 'Healthy' : performanceStatus === 'attention' ? 'Needs attention' : 'Awaiting signal'}</StudioText>
              </View>
              <StudioText tone="muted" size={11}>{performanceStatus === 'healthy' ? 'No major client crash regression detected' : performanceStatus === 'attention' ? 'Crash rate is above the mobile health threshold' : 'Open Performance to sync the latest health metrics'}</StudioText>
              <View style={styles.healthGrid}>
                <HealthMetric label="CRASH RATE" value={crashRate?.displayValue ?? '—'} detail="" change={crashRate?.change} direction={crashRate?.direction} />
                <HealthMetric label="FPS P10" value={clientFps?.displayValue ?? '—'} detail="" change={clientFps?.change} direction={clientFps?.direction} />
                <HealthMetric label="OOM EXITS" value={oomExits?.displayValue ?? '—'} detail="Latest cached period" change={oomExits?.change} direction={oomExits?.direction} />
                <HealthMetric label="RECENT PEAK" value={peakCcu?.displayValue ?? '—'} detail="concurrent players" change={peakCcu?.change} direction={peakCcu?.direction} />
              </View>
              <StudioText tone="muted" size={9}>Recent peak is aggregated, not a live counter</StudioText>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeading title="Focus next" subtitle="Rule-based prompts from your current signals" />
            <View style={styles.focusList}>
              <FocusRow
                icon={retentionNeedsFocus ? 'repeat-outline' : 'shield-checkmark-outline'}
                title={!dayOneRetention ? 'Unlock a retention insight' : retentionNeedsFocus ? 'Strengthen the first-session return loop' : 'Protect your retention gains'}
                detail={dayOneRetention ? `Day 1 retention is ${dayOneRetention.displayValue}. Review early-session drop-off before changing late-game content.` : 'Day 1 retention has not been synced yet.'}
                signal={dayOneRetention ? `Retention · ${dayOneRetention.displayValue}` : 'Sync Retention'}
                route="retention"
              />
              <FocusRow
                icon={monetizationNeedsFocus ? 'cart-outline' : 'cash-outline'}
                title={!payerConversion ? 'Unlock a monetization insight' : monetizationNeedsFocus ? 'Review the first purchase path' : 'Inspect what is driving payer conversion'}
                detail={payerConversion ? `Payer conversion is ${payerConversion.displayValue}. Check value clarity, timing, and the first offer players see.` : 'Payer conversion has not been synced yet.'}
                signal={payerConversion ? `Monetization · ${payerConversion.displayValue}` : 'Sync Monetization'}
                route="monetization"
              />
              <FocusRow
                icon={acquisitionNeedsFocus ? 'funnel-outline' : 'trending-up-outline'}
                title={qualifiedRate === undefined ? 'Unlock an acquisition insight' : acquisitionNeedsFocus ? 'Reduce discovery-to-play drop-off' : 'Build on qualified-play conversion'}
                detail={qualifiedRate === undefined ? 'The qualified-play ratio is not available yet.' : `${qualifiedRate.toFixed(1)}% of users with plays became qualified users in the cached period.`}
                signal={qualifiedPlays ? `Acquisition · ${qualifiedPlays.displayValue} qualified` : 'Sync Acquisition'}
                route="acquisition"
              />
            </View>
            <StudioText tone="muted" size={9} lineHeight={13}>Focus prompts are simple product heuristics, not additional Roblox metrics.</StudioText>
          </View>

          <View style={styles.lastSection}>
            <SectionHeading title="Data coverage" subtitle="Know what is ready before you drill down" action="Manage" onPress={() => router.push('/settings/connections')} />
            <Card style={styles.freshnessCard}>
              <FreshnessRow label="Overview" snapshot={snapshot} />
              <FreshnessRow label="Engagement" snapshot={engagement} />
              <FreshnessRow label="Retention" snapshot={retention} />
              <FreshnessRow label="Acquisition" snapshot={acquisition} />
              <FreshnessRow label="Monetization" snapshot={monetization} />
              <FreshnessRow label="Performance" snapshot={performance} />
              <View style={styles.webOnlyRow}>
                <Ionicons name="globe-outline" size={16} color={colors.yellow} />
                <View style={styles.flex}><StudioText tone="secondary" weight="medium" size={11}>Audience</StudioText><StudioText tone="muted" size={9}>Available in Roblox Creator Dashboard, not Open Cloud</StudioText></View>
                <StudioText style={{ color: colors.yellow }} weight="semibold" size={9}>WEB</StudioText>
              </View>
            </Card>
          </View>
          <AnalyticsDataStatus live={snapshot.source === 'roblox_open_cloud'} text={snapshot.message} />
        </>
      ) : null}
    </Screen>
  );
}

function SampleHomeScreen() {
  const dashboard = useHomeDashboard();
  const portfolio = dashboard.snapshot?.portfolio;
  const connectionLabel =
    dashboard.dataMode === 'sample'
      ? 'SAMPLE MODE · OFFLINE'
      : dashboard.status === 'loaded'
        ? 'AWS DEV · SAMPLE DATA'
        : dashboard.status === 'error'
          ? 'AWS DEV UNAVAILABLE'
          : 'CONNECTING TO AWS DEV';

  return (
    <Screen
      contentContainerStyle={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={dashboard.refreshing}
          onRefresh={dashboard.refresh}
          tintColor={colors.blue}
        />
      }>
      <View style={styles.creatorHeader}>
        <Pressable
          accessibilityLabel="Choose portfolio"
          onPress={() => router.push('/experience-picker')}
          style={({ pressed }) => [styles.creatorIdentity, pressed && styles.pressed]}>
          <View style={styles.spTile}><StudioText weight="bold" size={14}>RA</StudioText></View>
          <View>
            <UpperLabel>CREATOR PORTFOLIO</UpperLabel>
            <View style={styles.portfolioName}>
              <StudioText weight="semibold" size={16}>All experiences</StudioText>
              <Ionicons name="caret-down" size={10} color={colors.textSecondary} />
            </View>
          </View>
        </Pressable>
        <Pressable
          accessibilityLabel="Open notifications"
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}>
          <Ionicons name="notifications-outline" size={19} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.homeHeading}>
        <View>
          <StudioText weight="bold" size={27} lineHeight={30}>Home</StudioText>
          <StudioText tone="muted" size={12}>Across 3 experiences</StudioText>
          <StudioText
            tone={dashboard.status === 'error' ? 'red' : dashboard.status === 'loaded' ? 'green' : 'muted'}
            weight="semibold"
            size={9}
            style={styles.connectionLabel}>
            {connectionLabel}
          </StudioText>
        </View>
        <Pressable style={({ pressed }) => [styles.todayControl, pressed && styles.pressed]}>
          <StudioText weight="medium" size={12}>Today</StudioText>
          <Ionicons name="caret-down" size={9} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Card onPress={() => router.push('/analytics/engagement')} style={styles.heroCard}>
        <UpperLabel>CCU · UPDATED 1 MIN AGO</UpperLabel>
        <StudioText weight="bold" size={39} lineHeight={42}>1,284</StudioText>
        <View style={styles.heroDeltaRow}>
          <PositiveDelta>12.4%</PositiveDelta>
          <StudioText tone="muted" size={10}>vs same time yesterday</StudioText>
        </View>
        <View style={styles.heroChart}>
          <LineChart values={portfolioTrend} color={colors.blue} height={87} labels={['60m', '', '', 'now']} />
        </View>
        <View style={styles.heroFooter}>
          <StudioText tone="secondary" size={11}>Peak today  <StudioText weight="semibold" size={11}>1,672</StudioText></StudioText>
          <StudioText tone="secondary" size={11}><StudioText weight="semibold" size={11}>48</StudioText> servers</StudioText>
        </View>
      </Card>

      <View style={styles.metricRow}>
        <CompactMetric label="REVENUE TODAY" value="R$ 4.8K" change="4.7%" footnote="1.8% payer CVR" values={revenueTrend} color={colors.green} onPress={() => router.push('/(tabs)/sales')} />
        <CompactMetric label="PLAYERS TODAY" value={portfolio ? compactNumber(portfolio.dailyActiveUsers) : '12.8K'} change="6.2%" footnote="3.1K new" values={playersTrend} color={colors.blue} onPress={() => router.push('/analytics/acquisition')} />
      </View>

      <Card onPress={() => router.push('/analytics/engagement')} style={styles.recordCard}>
        <View style={styles.recordIcon}><Ionicons name="trophy-outline" size={20} color="#9DB0FF" /></View>
        <View style={styles.flex}>
          <StudioText weight="semibold" size={15}>New CCU record</StudioText>
          <StudioText style={styles.recordDetail} size={12}>1,672 players at 7:42 PM</StudioText>
        </View>
        <Ionicons name="chevron-forward" size={17} color="#9DB0FF" />
      </Card>

      <View style={styles.firstSection}>
        <SectionHeading title="Game quality" action="Analytics" onPress={() => router.push('/(tabs)/analytics')} />
        <HomeCarousel>
          <QualityCard title="QUALIFIED PLAYS" value="22.4K" change="8.6%" detail="3.1K more than the previous 7 days" values={[12, 15, 14, 18, 17, 22, 21, 25, 24, 28]} color={colors.blue} onPress={() => router.push('/analytics/engagement')} />
          <QualityCard title="AVERAGE SESSION" value={portfolio ? `${portfolio.averagePlaytimeMinutes.toFixed(1)}m` : '12.4m'} detail="Up 29 seconds this week" values={[10, 9, 9.5, 10.8, 11.6, 11.4, 12.4]} color={colors.cyan} onPress={() => router.push('/analytics/engagement')} />
        </HomeCarousel>
      </View>

      <View style={styles.section}>
        <SectionHeading title="What changed" action="View all" onPress={() => router.push('/(tabs)/analytics')} />
        <Card onPress={() => router.push('/analytics/acquisition')} style={styles.insightCard}>
          <View style={styles.insightIcon}><Ionicons name="trending-up" size={19} color="#9DB0FF" /></View>
          <View style={styles.flex}>
            <StudioText weight="semibold" size={14} lineHeight={18}>Qualified plays rose after the thumbnail update</StudioText>
            <View style={styles.insightMeta}>
              <PositiveDelta>9% this week</PositiveDelta>
              <StudioText tone="muted" size={10}>Discovery traffic converted better</StudioText>
            </View>
            <View style={styles.insightLink}>
              <StudioText tone="blue" weight="semibold" size={11}>View insight</StudioText>
              <Ionicons name="chevron-forward" size={11} color={colors.blue} />
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeading title="More analytics" subtitle="Last 7 days · Tap any chart to explore" />
        <HomeCarousel>
          <Card onPress={() => router.push('/analytics/engagement')} style={styles.analyticsCard}>
            <View style={styles.analyticsCardTop}>
              <StudioText weight="semibold" size={13}>Player activity</StudioText>
              <StudioText tone="blue" weight="semibold" size={10}>Explore ›</StudioText>
            </View>
            <View style={styles.analyticsValueRow}>
              <StudioText weight="bold" size={20}>{portfolio ? compactNumber(portfolio.dailyActiveUsers) : '12.8K'} DAU</StudioText>
              <PositiveDelta>6.2%</PositiveDelta>
            </View>
            <LineChart values={playersTrend} color={colors.blue} height={126} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
          </Card>
          <Card onPress={() => router.push('/analytics/retention')} style={styles.analyticsCard}>
            <View style={styles.analyticsCardTop}><StudioText weight="semibold" size={13}>Retention</StudioText><StudioText tone="blue" weight="semibold" size={10}>Explore ›</StudioText></View>
            <StudioText weight="bold" size={20}>D1 {portfolio ? portfolio.forwardD1Retention.toFixed(1) : '28.4'}%</StudioText>
            <LineChart values={[18, 19, 21, 22, 24, 23, 26, 28]} color={colors.purple} height={126} labels={['Mon', '', '', '', '', '', 'Sun']} />
          </Card>
        </HomeCarousel>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Monetization" action="Explore" onPress={() => router.push('/(tabs)/sales')} />
        <HomeCarousel>
          <Card onPress={() => router.push('/(tabs)/sales')} style={styles.moneyCard}>
            <UpperLabel>DAILY REVENUE</UpperLabel>
            <View style={styles.moneyValueRow}>
              <StudioText weight="bold" size={27}>R$ 4.8K</StudioText>
              <PositiveDelta>4.7%</PositiveDelta>
            </View>
            <StudioText tone="muted" size={10}>vs previous 7 days</StudioText>
            <View style={styles.moneyStats}>
              <View style={styles.moneyStat}><UpperLabel>PAYER CVR</UpperLabel><StudioText weight="bold" size={17}>1.8%</StudioText></View>
              <View style={styles.moneyStat}><UpperLabel>ARPPU</UpperLabel><StudioText weight="bold" size={17}>R$ 273</StudioText></View>
            </View>
            <View style={styles.topProduct}>
              <View style={styles.productTile}><StudioText weight="bold" size={10}>R$</StudioText></View>
              <View style={styles.flex}><UpperLabel>TOP PRODUCT</UpperLabel><StudioText tone="secondary" weight="semibold" size={11}>Premium Bundle · R$ 1.6K</StudioText></View>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
          </Card>
          <Card onPress={() => router.push('/analytics/monetization')} style={styles.moneyCard}>
            <UpperLabel>REVENUE TREND</UpperLabel>
            <StudioText weight="bold" size={23}>R$ 4.8K</StudioText>
            <LineChart values={revenueTrend} color={colors.blue} height={140} labels={['Mon', '', '', '', '', '', 'Sun']} />
          </Card>
        </HomeCarousel>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Acquisition" action="Explore" onPress={() => router.push('/analytics/acquisition')} />
        <Card onPress={() => router.push('/analytics/acquisition')} style={styles.acquisitionCard}>
          <UpperLabel>DISCOVERY TO QUALIFIED PLAY</UpperLabel>
          <View style={styles.acquisitionValue}>
            <StudioText weight="bold" size={21}>8.1K qualified players</StudioText>
            <PositiveDelta>9.0%</PositiveDelta>
          </View>
          <View style={styles.funnel}>
            <FunnelRow label="Impressions" value="182K" percent="100%" fill={100} />
            <FunnelRow label="Detail visits" value="24.6K" percent="13.5%" fill={67} />
            <FunnelRow label="Plays" value="13.2K" percent="53.7%" fill={49} />
            <FunnelRow label="Qualified" value="8.1K" percent="61.4%" fill={31} />
          </View>
        </Card>
      </View>

      <View style={styles.lastSection}>
        <SectionHeading title="Performance health" action="Explore" onPress={() => router.push('/analytics/performance')} />
        <Card onPress={() => router.push('/analytics/performance')} style={styles.performanceCard}>
          <View style={styles.healthHeader}>
            <View style={styles.healthDot} />
            <StudioText weight="semibold" size={17}>Healthy</StudioText>
          </View>
          <StudioText tone="muted" size={11}>No major client or server regressions</StudioText>
          <View style={styles.healthGrid}>
            <HealthMetric label="CRASH RATE" value="0.14%" detail="" change="↓ 0.03 pts" direction="positive" />
            <HealthMetric label="FPS P10" value="47" detail="" change="↑ 2 fps" direction="positive" />
            <HealthMetric label="OOM EXITS" value="3" detail="Last 7 days" />
            <HealthMetric label="RECENT PEAK" value="1.4K" detail="players" />
          </View>
          <StudioText tone="muted" size={9}>Recent peak is aggregated, not a live counter</StudioText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 10, paddingBottom: spacing.md, gap: 0 },
  connectedScreen: { paddingTop: 10, paddingBottom: spacing.xl, gap: 0 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  upperLabel: { letterSpacing: 0.15 },
  connectionLabel: { letterSpacing: 0.5, marginTop: 2 },
  creatorHeader: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spTile: { width: 39, height: 39, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2D34' },
  experienceAvatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surfaceSoft },
  portfolioName: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  bellButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171A20' },
  homeHeading: { minHeight: 76, zIndex: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangePicker: { position: 'relative', zIndex: 30 },
  todayControl: { minWidth: 105, height: 36, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayControlOpen: { borderColor: '#4969C9', backgroundColor: colors.surfaceRaised },
  rangeMenu: { position: 'absolute', top: 42, right: 0, width: 132, padding: 4, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised, shadowColor: colors.black, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  rangeOption: { minHeight: 38, paddingHorizontal: 10, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeOptionSelected: { backgroundColor: colors.blueSoft },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  heroCard: { height: 220, padding: 13, gap: 2, borderRadius: 14 },
  heroDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroChart: { marginHorizontal: -4, marginTop: -4, flex: 1 },
  heroEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginVertical: 8 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -8 },
  metricRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  metricRowConnected: { flexDirection: 'row', gap: 12, marginTop: 12 },
  compactMetric: { flex: 1, height: 112, minWidth: 0, padding: 11, gap: 2, borderRadius: 13 },
  compactMetricMiddle: { flexDirection: 'row', alignItems: 'center', marginRight: -5 },
  recordCard: { height: 78, marginTop: 12, borderColor: '#425AAB', backgroundColor: '#171B2A', borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  recordCardConnected: { minHeight: 78, marginTop: 12, borderColor: '#425AAB', backgroundColor: '#171B2A', borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  recordIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#263662' },
  recordDetail: { color: '#8DA3FF', marginTop: 2 },
  firstSection: { marginTop: 14, gap: 11 },
  section: { marginTop: 28, gap: 11 },
  lastSection: { marginTop: 28, gap: 11, paddingBottom: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  horizontalCards: { gap: 10, paddingRight: 18 },
  qualityCard: { width: 305, height: 144, padding: 12, gap: 1, borderRadius: 12, overflow: 'hidden' },
  qualityValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qualityChart: { marginHorizontal: -3, marginTop: -7 },
  qualityEmptyLine: { height: 3, marginTop: 'auto', borderRadius: 2, backgroundColor: colors.border },
  pagerDots: { height: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  pagerDotButton: { width: 12, height: 10, alignItems: 'center', justifyContent: 'center' },
  pagerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textFaint },
  pagerDotActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  insightCard: { minHeight: 96, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 13 },
  insightIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#253463' },
  connectedInsightCopy: { marginTop: 6 },
  insightMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 2, marginTop: 6 },
  insightLink: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 8 },
  analyticsCard: { width: 305, height: 214, padding: 13, gap: 3, borderRadius: 12, overflow: 'hidden' },
  analyticsCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analyticsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trendEmpty: { flex: 1, minHeight: 116, alignItems: 'center', justifyContent: 'center', gap: 7 },
  moneyCard: { width: 305, height: 215, padding: 11, gap: 0, borderRadius: 12, overflow: 'hidden' },
  moneyValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moneyStats: { flexDirection: 'row', gap: 9, marginTop: 6 },
  moneyStat: { flex: 1, minHeight: 43, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundRaised, padding: 7, gap: 0 },
  topProduct: { minHeight: 39, marginTop: 5, borderRadius: 9, backgroundColor: colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 5 },
  productTile: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#383D48' },
  acquisitionCard: { minHeight: 198, padding: 13, gap: 6, borderRadius: 13 },
  acquisitionCardConnected: { minHeight: 236, padding: 13, gap: 6, borderRadius: 13 },
  acquisitionValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  funnel: { gap: 11, marginTop: 4 },
  funnelRow: { gap: 5 },
  funnelLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  funnelNumbers: { flexDirection: 'row', alignItems: 'center', width: 92, justifyContent: 'space-between' },
  funnelPercent: { width: 38, textAlign: 'right' },
  performanceCard: { height: 239, padding: 13, gap: 3, borderRadius: 13 },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
  healthDotWarning: { backgroundColor: colors.yellow },
  healthDotWaiting: { backgroundColor: colors.textFaint },
  healthGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-evenly', rowGap: 5, marginTop: 6 },
  healthMetric: { width: '50%', gap: 1 },
  healthValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retentionCard: { minHeight: 262, padding: 13, gap: 8, borderRadius: 13 },
  retentionGrid: { flexDirection: 'row', flexWrap: 'wrap', minHeight: 112, rowGap: 10 },
  retentionEmpty: { height: 110, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderColor: colors.border },
  focusList: { gap: 9 },
  focusRow: { minHeight: 84, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13 },
  focusIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#253463' },
  freshnessCard: { padding: 4, borderRadius: 13, overflow: 'hidden' },
  freshnessRow: { minHeight: 50, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  freshnessDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  freshnessDotMissing: { backgroundColor: colors.textFaint },
  webOnlyRow: { minHeight: 54, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
});
