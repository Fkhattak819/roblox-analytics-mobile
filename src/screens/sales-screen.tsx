import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import type { AnalyticsDateRange, AnalyticsSnapshot } from '@/domain/analytics';
import { appEnvironment } from '@/services/backend-api';
import { AnalyticsDataStatus, AnalyticsErrorState, AnalyticsLoadingSkeleton, AnalyticsMetricCard } from '@/src/components/analytics';
import { LineChart } from '@/src/components/charts';
import {
  Badge,
  Card,
  Divider,
  ProgressBar,
  Screen,
  SectionTitle,
  StudioText,
  uiStyles,
} from '@/src/components/ui';
import { experiences, liveSales, products, revenueTrend, type Sale } from '@/src/data/sample-data';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

const sections = ['Overview', 'Live', 'Products'] as const;
type SalesSection = (typeof sections)[number];
const salesRangeOptions = ['24H', '7D', '30D', '90D'] as const;
type SalesDateRange = (typeof salesRangeOptions)[number];

const salesRangeLabels: Record<SalesDateRange, string> = {
  '24H': 'Last 24 hours',
  '7D': 'Last 7 days',
  '30D': 'Last 30 days',
  '90D': 'Last 90 days',
};

const revenueSources = [
  { label: 'Developer products', value: 62, display: 'R$ 52.3K · 62%', color: colors.blue },
  { label: 'Game passes', value: 21, display: 'R$ 17.7K · 21%', color: colors.purple },
  { label: 'Subscriptions', value: 12, display: 'R$ 10.1K · 12%', color: colors.green },
  { label: 'Other & commissions', value: 5, display: 'R$ 4.2K · 5%', color: colors.orange },
];

function SalesMetric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <Card style={styles.salesMetric}>
      <StudioText tone="muted" weight="medium" size={9}>{label}</StudioText>
      <StudioText weight="semibold" size={20}>{value}</StudioText>
      <StudioText tone="green" weight="semibold" size={10}>{delta}</StudioText>
    </Card>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/sale/[id]', params: { id: sale.id } })}
      style={({ pressed }) => [styles.saleRow, pressed && styles.pressed]}>
      <View style={[styles.saleIcon, sale.status === 'Preliminary' && styles.saleIconLive]}>
        <Ionicons name="bag-check-outline" size={18} color={sale.status === 'Preliminary' ? colors.yellow : colors.green} />
      </View>
      <View style={uiStyles.flex}>
        <StudioText weight="semibold" size={14}>{sale.product}</StudioText>
        <StudioText tone="muted" size={11}>{sale.experience} · {sale.time}</StudioText>
      </View>
      <View style={styles.saleValue}>
        <StudioText weight="bold" size={14}>R$ {sale.price}</StudioText>
        <Badge label={sale.status} tone={sale.status === 'Official' ? 'green' : 'yellow'} />
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

function Overview({ onSelect }: { onSelect: (section: SalesSection) => void }) {
  return (
    <>
      <Card
        onPress={() => router.push('/analytics/monetization')}
        accessibilityLabel="Open monetization analytics"
        style={styles.revenueHero}>
        <StudioText tone="muted" weight="medium" size={9}>TOTAL REVENUE</StudioText>
        <View style={styles.revenueValueRow}>
          <StudioText weight="bold" size={29}>R$ 84,290</StudioText>
          <View style={styles.revenueDelta}>
            <Ionicons name="arrow-up" size={12} color={colors.green} />
            <StudioText tone="green" weight="semibold" size={12}>18.4%</StudioText>
          </View>
        </View>
        <StudioText tone="muted" size={10}>vs previous 7 days</StudioText>
        <View style={styles.revenueChart}>
          <LineChart values={revenueTrend} color={colors.blue} height={48} showLastDot={false} />
        </View>
        <StudioText tone="muted" size={9}>Official aggregate · reconciled</StudioText>
      </Card>

      <View style={styles.coreMetricsHeader}>
        <StudioText weight="bold" size={17}>Core metrics</StudioText>
        <Pressable hitSlop={8} onPress={() => router.push('/analytics/monetization')}>
          <StudioText tone="blue" weight="medium" size={11}>View details ›</StudioText>
        </Pressable>
      </View>
      <View style={styles.metricsGrid}>
        <SalesMetric label="SALES" value="1,246" delta="↑ 12.8%" />
        <SalesMetric label="PAYING USERS" value="987" delta="↑ 9.4%" />
        <SalesMetric label="PAYER CONVERSION" value="2.6%" delta="↑ 0.3 pts" />
        <SalesMetric label="ARPPU" value="R$ 85.4" delta="↑ 7.9%" />
      </View>

      <Card style={styles.revenueSourcesCard}>
        <View style={uiStyles.rowBetween}>
          <StudioText weight="bold" size={17}>Revenue sources</StudioText>
          <Pressable hitSlop={8} onPress={() => router.push('/analytics/monetization')}>
            <StudioText tone="blue" weight="medium" size={11}>Monetization ›</StudioText>
          </Pressable>
        </View>
        <StudioText tone="muted" size={10}>Where earned Robux came from</StudioText>
        <View style={styles.sourceList}>
          {revenueSources.map((source) => (
            <View key={source.label} style={styles.sourceRow}>
              <View style={uiStyles.rowBetween}>
                <StudioText size={11}>{source.label}</StudioText>
                <StudioText weight="medium" size={11}>{source.display}</StudioText>
              </View>
              <ProgressBar value={source.value} color={source.color} />
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Top products" action="See all" onAction={() => onSelect('Products')} />
      <Card style={styles.listCard}>
        {products.slice(0, 3).map((product, index) => (
          <React.Fragment key={product.id}>
            <Pressable
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
              style={({ pressed }) => [styles.productRow, pressed && styles.pressed]}>
              <View style={styles.productRank}><StudioText weight="bold" size={13}>{index + 1}</StudioText></View>
              <View style={uiStyles.flex}>
                <StudioText weight="semibold" size={14}>{product.name}</StudioText>
                <StudioText tone="muted" size={11}>{product.type} · {product.sales} sales</StudioText>
              </View>
              <StudioText weight="bold" size={14}>R$ {product.revenue.toLocaleString()}</StudioText>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
            {index < 2 ? <Divider /> : null}
          </React.Fragment>
        ))}
      </Card>

      <SectionTitle title="Live sales" subtitle="Signed events, reconciled with official data" action="View live" onAction={() => onSelect('Live')} />
      <Card style={styles.listCard}>
        {liveSales.slice(0, 3).map((sale, index) => (
          <React.Fragment key={sale.id}>
            <SaleRow sale={sale} />
            {index < 2 ? <Divider /> : null}
          </React.Fragment>
        ))}
      </Card>
    </>
  );
}

function LiveSales() {
  return (
    <>
      <Card style={styles.liveHero}>
        <StudioText tone="muted" weight="medium" size={9}>ROBUX TODAY</StudioText>
        <View style={styles.liveHeroValueRow}>
          <StudioText weight="bold" size={29}>R$ 4,832</StudioText>
          <StudioText tone="green" weight="semibold" size={12}>↑ 22.6%</StudioText>
        </View>
        <View style={styles.liveStats}>
          <LiveStat label="SALES" value="18" />
          <LiveStat label="AVG SALE" value="R$ 268" />
          <LiveStat label="VELOCITY" value="3.6 / min" />
        </View>
        <LiveStepChart />
      </Card>

      <Card onPress={() => router.push('/notifications')} style={styles.smartGrouping}>
        <View style={uiStyles.flex}>
          <StudioText tone="blue" weight="semibold" size={9}>SMART GROUPING</StudioText>
          <StudioText weight="semibold" size={14}>12 routine sales grouped</StudioText>
          <StudioText tone="muted" size={10}>R$ 2,180 · last 5 min</StudioText>
        </View>
        <StudioText tone="blue" weight="medium" size={11}>Open  ›</StudioText>
      </Card>

      <SectionTitle title="Confirmed purchases" action="Filter  ›" />
      <View style={styles.livePurchaseList}>
        {liveSales.slice(0, 4).map((sale) => <LivePurchaseRow key={sale.id} sale={sale} />)}
      </View>

      <SectionTitle title="Sale alerts" subtitle="Choose signal, not noise" action="Configure  ›" onAction={() => router.push('/notifications')} />
      <Card style={styles.alertModes}>
        <AlertMode label="Every sale" value="OFF" />
        <AlertMode label="Smart" value="ON" active />
        <AlertMode label="Milestones" />
        <AlertMode label="Digest" value="DAILY" last />
      </Card>

      <Card style={styles.liveDisclosure}>
        <StudioText weight="semibold" size={13}>How exact alerts work</StudioText>
        <StudioText tone="muted" size={11} lineHeight={16}>Exact purchase alerts require signed, opt-in SDK or webhook instrumentation. Official aggregate analytics stays read-only.</StudioText>
      </Card>
      <StudioText tone="muted" size={10} style={styles.privacyLine}>Player identity excluded by default  ·  Learn more  ›</StudioText>
    </>
  );
}

function LiveStat({ label, value }: { label: string; value: string }) {
  return <View style={styles.liveStat}><StudioText tone="muted" size={8}>{label}</StudioText><StudioText weight="semibold" size={18}>{value}</StudioText></View>;
}

function LiveStepChart() {
  return (
    <View style={styles.liveChart}>
      <Svg width="100%" height="34" viewBox="0 0 325 34">
        <Line x1="0" y1="31" x2="325" y2="31" stroke={colors.border} strokeWidth="1" />
        <Path d="M0 30H24V25H53V28H85V18H110V24H143V12H168V20H206V16H242V8H276V13H325" fill="none" stroke={colors.green} strokeWidth="2" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function LivePurchaseRow({ sale }: { sale: Sale }) {
  const statusTone = sale.status === 'Delayed' ? colors.yellow : colors.green;
  return (
    <Pressable onPress={() => router.push({ pathname: '/sale/[id]', params: { id: sale.id } })} style={({ pressed }) => [styles.livePurchaseRow, pressed && styles.pressed]}>
      <View style={styles.liveProductTile}><StudioText weight="bold" size={14}>P</StudioText></View>
      <View style={uiStyles.flex}>
        <StudioText weight="semibold" size={13}>{sale.product}</StudioText>
        <StudioText tone="muted" size={10}>{sale.experience} · {sale.time}</StudioText>
      </View>
      <View style={styles.livePurchaseAmount}>
        <StudioText weight="semibold" size={13}>R$ {sale.price.toLocaleString()}</StudioText>
        <StudioText weight="semibold" size={8} style={{ color: statusTone }}>{sale.status.toUpperCase()}</StudioText>
      </View>
    </Pressable>
  );
}

function AlertMode({ label, value, active = false, last = false }: { label: string; value?: string; active?: boolean; last?: boolean }) {
  return (
    <View style={[styles.alertMode, !last && styles.alertModeDivider]}>
      <StudioText size={12}>{label}</StudioText>
      {value ? <StudioText tone={active ? 'green' : 'muted'} weight="semibold" size={9}>{value}</StudioText> : null}
    </View>
  );
}

function Products() {
  return (
    <>
      <View style={uiStyles.rowBetween}>
        <StudioText tone="muted" size={12}>Ranked by official 7-day revenue</StudioText>
        <Badge label="Read only" tone="blue" />
      </View>
      {products.map((product, index) => (
        <Card key={product.id} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
          <View style={uiStyles.rowBetween}>
            <View style={uiStyles.row}>
              <View style={styles.productRank}><StudioText weight="bold" size={13}>{index + 1}</StudioText></View>
              <View>
                <StudioText weight="bold" size={16}>{product.name}</StudioText>
                <StudioText tone="muted" size={12}>{product.type}</StudioText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
          </View>
          <Divider />
          <View style={styles.productStats}>
            <View><StudioText tone="muted" size={11}>Price</StudioText><StudioText weight="semibold">R$ {product.price}</StudioText></View>
            <View><StudioText tone="muted" size={11}>Sales</StudioText><StudioText weight="semibold">{product.sales}</StudioText></View>
            <View><StudioText tone="muted" size={11}>Revenue</StudioText><StudioText weight="semibold">R$ {product.revenue.toLocaleString()}</StudioText></View>
          </View>
        </Card>
      ))}
    </>
  );
}

function ConnectedSalesOverview({ snapshot, loading, error, reload }: { snapshot?: AnalyticsSnapshot; loading: boolean; error?: string; reload: () => void }) {
  if (loading) return <AnalyticsLoadingSkeleton />;
  if (error) return <AnalyticsErrorState message={error} onRetry={reload} />;
  if (!snapshot) return null;
  const revenueChart = snapshot.charts.find((chart) => chart.id === 'daily-revenue');
  return (
    <>
      <Card onPress={() => router.push('/analytics/monetization')} accessibilityLabel="Open monetization analytics" style={styles.revenueHero}>
        <StudioText tone="muted" weight="medium" size={9}>OFFICIAL ROBLOX MONETIZATION</StudioText>
        <StudioText weight="bold" size={29}>{snapshot.metrics.find((metric) => metric.id === 'daily-revenue')?.displayValue ?? 'No revenue'}</StudioText>
        <StudioText tone="muted" size={10}>Daily Robux spent · selected period</StudioText>
        {revenueChart ? <View style={styles.revenueChart}><LineChart values={revenueChart.series[0]?.points.map((point) => point.value) ?? []} color={colors.blue} height={48} showLastDot={false} /></View> : null}
      </Card>
      <View style={styles.coreMetricsHeader}>
        <StudioText weight="bold" size={17}>Core metrics</StudioText>
        <Pressable hitSlop={8} onPress={() => router.push('/analytics/monetization')}><StudioText tone="blue" weight="medium" size={11}>View details ›</StudioText></Pressable>
      </View>
      <View style={styles.metricsGrid}>
        {snapshot.metrics.map((metric) => (
          <View key={metric.id} style={styles.connectedMetricCell}>
            <AnalyticsMetricCard label={metric.label} value={metric.displayValue} delta={metric.change} direction={metric.direction} />
          </View>
        ))}
      </View>
      <AnalyticsDataStatus live text={snapshot.message} />
      <Card style={styles.liveDisclosure}>
        <StudioText weight="semibold" size={13}>Aggregate analytics only</StudioText>
        <StudioText tone="muted" size={11} lineHeight={16}>Product rankings and individual purchase alerts are hidden until a supported, signed event source is configured.</StudioText>
      </Card>
    </>
  );
}

function ConnectedSalesUnavailable({ section }: { section: Exclude<SalesSection, 'Overview'> }) {
  return (
    <Card style={styles.liveDisclosure}>
      <StudioText weight="semibold" size={15}>{section === 'Live' ? 'Live sales are not configured' : 'Product-level sales are unavailable'}</StudioText>
      <StudioText tone="muted" size={11} lineHeight={16}>{section === 'Live'
        ? 'Official Roblox analytics are aggregate. Exact alerts require optional signed server events.'
        : 'The current read-only Analytics Query connection does not expose a reliable product ranking feed.'}</StudioText>
      {section === 'Live' ? <Pressable onPress={() => router.push('/live-sales-setup')}><StudioText tone="blue" weight="semibold" size={12}>Review optional setup ›</StudioText></Pressable> : null}
    </Card>
  );
}

function createSalesFallbackSnapshot(): AnalyticsSnapshot {
  return {
    mode: 'sample', source: 'sample_data', freshness: 'fixture', universeId: '10009166512', section: 'monetization', range: '7D',
    metrics: [], charts: [], breakdowns: [], message: 'Sample sales summary',
  };
}

function SalesExperienceSelector({ experience }: { experience: (typeof experiences)[number] }) {
  const displayName = experience.id === 'most-words-win' ? 'Most Words Win!' : experience.name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose experience. Current experience: ${displayName}`}
      onPress={() => router.push('/experience-picker')}
      style={({ pressed }) => [styles.experienceSelector, pressed && styles.pressed]}>
      <Image source={experience.image} contentFit="cover" style={styles.experienceImage} />
      <View style={uiStyles.flex}>
        <StudioText tone="muted" weight="medium" size={9}>EXPERIENCE ANALYTICS</StudioText>
        <StudioText weight="semibold" size={17} numberOfLines={1}>{displayName}</StudioText>
      </View>
      <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

function SalesSegments({ value, onChange }: { value: SalesSection; onChange: (section: SalesSection) => void }) {
  return (
    <View style={styles.salesSegments}>
      {sections.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [styles.salesSegment, selected && styles.salesSegmentSelected, pressed && styles.pressed]}>
            <StudioText
              weight={selected ? 'semibold' : 'medium'}
              tone={selected ? 'primary' : 'muted'}
              size={11}
              style={selected ? styles.salesSegmentText : undefined}>
              {option}
            </StudioText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SalesScreen() {
  const [section, setSection] = useState<SalesSection>('Overview');
  const [salesDateRange, setSalesDateRange] = useState<SalesDateRange>('7D');
  const { selectedExperience } = useApp();
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';
  const displayExperience = selectedExperience ?? experiences[0];
  const nextRange = salesRangeOptions[(salesRangeOptions.indexOf(salesDateRange) + 1) % salesRangeOptions.length];
  const selectSection = (nextSection: SalesSection) => setSection(nextSection);
  const analyticsRange: AnalyticsDateRange = salesDateRange === '30D' ? '28D' : salesDateRange;
  const sampleSnapshot = useMemo(createSalesFallbackSnapshot, []);
  const analytics = useAnalyticsSnapshot({
    universeId: '10009166512',
    section: 'monetization',
    range: analyticsRange,
    sampleSnapshot,
    enabled: isConnectedMode,
  });
  const sampleContent = section === 'Live'
    ? <LiveSales />
    : section === 'Products'
      ? <Products />
      : <Overview onSelect={selectSection} />;
  const content = isConnectedMode
    ? section === 'Overview'
      ? <ConnectedSalesOverview snapshot={analytics.snapshot} loading={analytics.loading} error={analytics.error} reload={analytics.reload} />
      : <ConnectedSalesUnavailable section={section} />
    : sampleContent;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.topControls}>
        <SalesExperienceSelector experience={displayExperience} />
        <Pressable
          accessibilityLabel="Notification settings"
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}>
          <Ionicons name="notifications-outline" size={19} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.salesTitleRow}>
        <View style={uiStyles.flex}>
          <StudioText weight="bold" size={28}>{section === 'Live' ? 'Live sales' : 'Sales'}</StudioText>
          <StudioText tone="muted" size={11}>{isConnectedMode
            ? section === 'Overview' ? 'Roblox Open Cloud snapshot' : 'This data source is not configured'
            : section === 'Live' ? 'Preliminary events · updates in real time' : 'Official revenue · updated 2 min ago'}</StudioText>
        </View>
        {section === 'Live' && !isConnectedMode ? <View style={styles.livePill}><View style={styles.liveDot} /><StudioText tone="green" weight="semibold" size={9}>LIVE</StudioText></View> : <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Date range: ${salesRangeLabels[salesDateRange]}`}
          onPress={() => setSalesDateRange(nextRange)}
          style={({ pressed }) => [styles.dateRangeButton, pressed && styles.pressed]}>
          <StudioText weight="medium" size={11}>{salesRangeLabels[salesDateRange]}</StudioText>
          <Ionicons name="chevron-down" size={10} color={colors.textSecondary} />
        </Pressable>}
      </View>

      <SalesSegments value={section} onChange={selectSection} />
      {content}
      {section === 'Overview' && !isConnectedMode ? <Card style={styles.footerTruth}>
        <Ionicons name="shield-checkmark-outline" size={19} color={colors.green} />
        <View style={uiStyles.flex}>
          <StudioText weight="semibold" size={13}>Truth you can trace</StudioText>
          <StudioText tone="muted" size={11}>Official totals come from Open Cloud. Live events are labeled until reconciled.</StudioText>
        </View>
      </Card> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xs, paddingHorizontal: 18, gap: 10 },
  pressed: { opacity: 0.68 },
  topControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  experienceSelector: {
    flex: 1,
    minWidth: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundRaised,
  },
  experienceImage: { width: 42, height: 42, borderRadius: 9 },
  notificationButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.surface,
  },
  salesTitleRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateRangeButton: {
    minWidth: 121,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  salesSegments: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundRaised,
  },
  salesSegment: { flex: 1, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  salesSegmentSelected: { backgroundColor: '#253354' },
  salesSegmentText: { color: '#C6D1FF' },
  revenueHero: { padding: 12, gap: 2, borderRadius: 13, backgroundColor: colors.surface },
  revenueValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  revenueDelta: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  revenueChart: { marginTop: 6, marginHorizontal: -2, marginBottom: 1 },
  coreMetricsHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  connectedMetricCell: { width: '48.4%' },
  salesMetric: { width: '48.85%', minHeight: 85, justifyContent: 'center', padding: 11, gap: 3, borderRadius: 12 },
  revenueSourcesCard: { padding: 12, gap: 7, borderRadius: 12 },
  sourceList: { gap: 13, marginTop: 4 },
  sourceRow: { gap: 6 },
  listCard: { paddingVertical: 4, gap: 0 },
  truthCard: { borderColor: '#5A4920', backgroundColor: '#1D1A13' },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
  livePill: { minWidth: 84, height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#17653A', backgroundColor: '#0F3422', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  liveHero: { height: 158, padding: 12, gap: 2, borderRadius: 13 },
  liveHeroValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveStats: { flexDirection: 'row', marginTop: 7 },
  liveStat: { flex: 1, gap: 1 },
  liveChart: { height: 34, marginTop: 1 },
  smartGrouping: { minHeight: 82, borderColor: '#36579C', backgroundColor: '#151B2A', borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center' },
  livePurchaseList: { gap: 7 },
  livePurchaseRow: { minHeight: 72, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  liveProductTile: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#552765', alignItems: 'center', justifyContent: 'center' },
  livePurchaseAmount: { alignItems: 'flex-end', gap: 3 },
  alertModes: { padding: 0, gap: 0, overflow: 'hidden' },
  alertMode: { minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertModeDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  liveDisclosure: { gap: 4, backgroundColor: colors.backgroundRaised },
  privacyLine: { textAlign: 'center', paddingBottom: 5 },
  saleRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 9 },
  saleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft },
  saleIconLive: { backgroundColor: colors.yellowSoft },
  saleValue: { alignItems: 'flex-end', gap: 4 },
  productRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8 },
  productRank: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  productStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerTruth: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.backgroundRaised },
});
