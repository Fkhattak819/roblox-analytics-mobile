import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { LineChart, Sparkline } from '@/src/components/charts';
import { Card, ProgressBar, Screen, StudioText } from '@/src/components/ui';
import { playersTrend, portfolioTrend, revenueTrend } from '@/src/data/sample-data';
import { colors, spacing } from '@/src/theme/tokens';

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
  onPress,
}: {
  label: string;
  value: string;
  change: string;
  footnote: string;
  values: number[];
  color: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.compactMetric}>
      <UpperLabel>{label}</UpperLabel>
      <View style={styles.compactMetricMiddle}>
        <View style={styles.flex}>
          <StudioText weight="bold" size={23} lineHeight={26} numberOfLines={1} adjustsFontSizeToFit>{value}</StudioText>
          <PositiveDelta>{change}</PositiveDelta>
        </View>
        <Sparkline values={values} color={color} height={33} width={72} />
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
  onPress,
}: {
  title: string;
  value: string;
  change?: string;
  detail: string;
  values: number[];
  color: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.qualityCard}>
      <UpperLabel>{title}</UpperLabel>
      <View style={styles.qualityValueRow}>
        <StudioText weight="bold" size={22}>{value}</StudioText>
        {change ? <PositiveDelta>{change}</PositiveDelta> : null}
      </View>
      <StudioText tone="muted" size={10}>{detail}</StudioText>
      <View style={styles.qualityChart}>
        <LineChart values={values} color={color} height={64} showLastDot={false} />
      </View>
    </Card>
  );
}

function PagerDots({ count = 2, active = 0 }: { count?: number; active?: number }) {
  return (
    <View style={styles.pagerDots}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.pagerDot, index === active && styles.pagerDotActive]} />
      ))}
    </View>
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
  positive,
}: {
  label: string;
  value: string;
  detail: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.healthMetric}>
      <UpperLabel>{label}</UpperLabel>
      <View style={styles.healthValueRow}>
        <StudioText weight="bold" size={19}>{value}</StudioText>
        {change ? <StudioText tone={positive ? 'green' : 'muted'} weight="semibold" size={10}>{change}</StudioText> : null}
      </View>
      <StudioText tone="muted" size={9}>{detail}</StudioText>
    </View>
  );
}

export default function HomeScreen() {
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
          <QualityCard title="QUALIFIED PLAYS" value="22.4K" change="8.6%" detail="3.1K more than the previous 7 days" values={[12, 15, 14, 18, 17, 22, 21, 25, 24, 28]} color={colors.blue} onPress={() => router.push('/analytics/engagement')} />
          <QualityCard title="AVERAGE SESSION" value={portfolio ? `${portfolio.averagePlaytimeMinutes.toFixed(1)}m` : '12.4m'} detail="Up 29 seconds this week" values={[10, 9, 9.5, 10.8, 11.6, 11.4, 12.4]} color={colors.cyan} onPress={() => router.push('/analytics/engagement')} />
        </ScrollView>
        <PagerDots count={3} />
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
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
        </ScrollView>
        <PagerDots />
      </View>

      <View style={styles.section}>
        <SectionHeading title="Monetization" action="Explore" onPress={() => router.push('/(tabs)/sales')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
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
        </ScrollView>
        <PagerDots />
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
            <HealthMetric label="CRASH RATE" value="0.14%" detail="" change="↓ 0.03 pts" positive />
            <HealthMetric label="FPS P10" value="47" detail="" change="↑ 2 fps" positive />
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
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  upperLabel: { letterSpacing: 0.15 },
  connectionLabel: { letterSpacing: 0.5, marginTop: 2 },
  creatorHeader: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spTile: { width: 39, height: 39, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2D34' },
  portfolioName: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  bellButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171A20' },
  homeHeading: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayControl: { minWidth: 105, height: 36, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  heroCard: { height: 220, padding: 13, gap: 2, borderRadius: 14 },
  heroDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroChart: { marginHorizontal: -4, marginTop: -4, flex: 1 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -8 },
  metricRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  compactMetric: { flex: 1, height: 112, minWidth: 0, padding: 11, gap: 2, borderRadius: 13 },
  compactMetricMiddle: { flexDirection: 'row', alignItems: 'center', marginRight: -5 },
  recordCard: { height: 78, marginTop: 12, borderColor: '#425AAB', backgroundColor: '#171B2A', borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
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
  pagerDots: { height: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  pagerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textFaint },
  pagerDotActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
  insightCard: { minHeight: 96, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 13 },
  insightIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#253463' },
  insightMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 2, marginTop: 6 },
  insightLink: { flexDirection: 'row', alignItems: 'center', gap: 1, marginTop: 8 },
  analyticsCard: { width: 305, height: 214, padding: 13, gap: 3, borderRadius: 12, overflow: 'hidden' },
  analyticsCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analyticsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  moneyCard: { width: 305, height: 215, padding: 11, gap: 0, borderRadius: 12, overflow: 'hidden' },
  moneyValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moneyStats: { flexDirection: 'row', gap: 9, marginTop: 6 },
  moneyStat: { flex: 1, minHeight: 43, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundRaised, padding: 7, gap: 0 },
  topProduct: { minHeight: 39, marginTop: 5, borderRadius: 9, backgroundColor: colors.surfaceSoft, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 5 },
  productTile: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#383D48' },
  acquisitionCard: { minHeight: 198, padding: 13, gap: 6, borderRadius: 13 },
  acquisitionValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  funnel: { gap: 11, marginTop: 4 },
  funnelRow: { gap: 5 },
  funnelLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  funnelNumbers: { flexDirection: 'row', alignItems: 'center', width: 92, justifyContent: 'space-between' },
  funnelPercent: { width: 38, textAlign: 'right' },
  performanceCard: { height: 239, padding: 13, gap: 3, borderRadius: 13 },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
  healthGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-evenly', rowGap: 5, marginTop: 6 },
  healthMetric: { width: '50%', gap: 1 },
  healthValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
