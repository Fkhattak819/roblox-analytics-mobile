import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { appEnvironment } from '@/services/backend-api';
import { Card, PageHeader, PersistentTabBar, Screen, StudioText } from '@/src/components/ui';
import { experiences, liveSales } from '@/src/data/sample-data';
import { colors } from '@/src/theme/tokens';
import { metricTrendColor } from '@/src/utils/metric-trend';

export default function ProductDetailScreen() {
  if (appEnvironment.dataMode === 'aws_dev') {
    return (
      <Screen contentContainerStyle={styles.screen} footer={<PersistentTabBar active="sales" />}>
        <PageHeader title="Product analytics" subtitle="Most Words Win!" back />
        <Card style={styles.unavailableCard}>
          <Ionicons name="cube-outline" size={25} color={colors.textMuted} />
          <StudioText weight="semibold" size={17}>Product-level analytics are unavailable</StudioText>
          <StudioText tone="muted" size={12} lineHeight={17}>The current read-only Analytics Query connection does not expose a reliable product ranking or product-detail feed. No sample product data is shown.</StudioText>
          <Pressable onPress={() => router.push('/analytics/monetization')}><StudioText tone="blue" weight="semibold" size={12}>Open aggregate monetization ›</StudioText></Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screen} footer={<PersistentTabBar active="sales" />}>
      <View style={styles.topControls}>
        <Pressable onPress={() => router.push('/experience-picker')} style={({ pressed }) => [styles.experienceSelector, pressed && styles.pressed]}>
          <Image source={experiences[0].image} contentFit="cover" style={styles.experienceImage} />
          <View style={styles.flex}><StudioText tone="muted" weight="medium" size={9}>EXPERIENCE ANALYTICS</StudioText><StudioText weight="semibold" size={17}>Most Words Win!</StudioText></View>
          <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => router.push('/notifications')} style={styles.notificationButton}><Ionicons name="notifications-outline" size={19} color={colors.text} /></Pressable>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.flex}><StudioText weight="bold" size={27}>Product analytics</StudioText><StudioText tone="muted" size={11}>Official revenue · updated 2 min ago</StudioText></View>
        <View style={styles.rangeButton}><StudioText weight="medium" size={11}>Last 30 days</StudioText><Ionicons name="chevron-down" size={10} color={colors.textSecondary} /></View>
      </View>

      <View style={styles.segments}><Segment label="Overview" /><Segment label="Live" /><Segment label="Products" selected /></View>

      <Card style={styles.heroCard}>
        <View style={styles.productIdentity}>
          <View style={styles.productTile}><StudioText weight="bold" size={16}>P</StudioText></View>
          <View style={styles.flex}><StudioText weight="semibold" size={17}>Premium Bundle</StudioText><StudioText tone="muted" size={11}>Developer product · R$ 1,499</StudioText></View>
        </View>
        <StudioText style={styles.purpleLabel} weight="semibold" size={9}>TOP EARNING PRODUCT</StudioText>
        <View style={styles.heroValueRow}><StudioText weight="bold" size={28}>R$ 31.8K</StudioText><StudioText tone="green" weight="semibold" size={11}>↑ 24.0%</StudioText></View>
        <StudioText tone="muted" size={9}>Official aggregate · reconciled</StudioText>
      </Card>

      <StudioText weight="semibold" size={17}>Performance</StudioText>
      <View style={styles.metricsGrid}>
        <Metric label="REVENUE" value="R$ 31.8K" delta="↑ 24.0%" />
        <Metric label="SALES" value="412" delta="↑ 18.2%" />
        <Metric label="CONVERSION" value="3.2%" delta="↑ 0.4 pts" />
        <Metric label="REVENUE SHARE" value="38%" delta="↑ 3.1 pts" />
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.chartTitle}><StudioText weight="semibold" size={16}>Revenue & conversion</StudioText><StudioText tone="muted" size={10}>30 days</StudioText></View>
        <View style={styles.legend}><Legend color={colors.blue} label="Revenue" /><Legend color={colors.green} label="Conversion" /></View>
        <RevenueConversionChart />
      </Card>

      <View style={styles.sectionTitle}><StudioText weight="semibold" size={17}>Recent live activity</StudioText><StudioText tone="blue" weight="medium" size={11}>View all  ›</StudioText></View>
      <View style={styles.activityList}>
        {liveSales.slice(0, 3).map((sale) => (
          <Pressable key={sale.id} onPress={() => router.push({ pathname: '/sale/[id]', params: { id: sale.id } })} style={styles.activityRow}>
            <View style={styles.activityTile}><StudioText weight="bold" size={12}>P</StudioText></View>
            <View style={styles.flex}><StudioText weight="semibold" size={13}>Premium Bundle</StudioText><StudioText tone="muted" size={10}>Most Words Win! · {sale.time}</StudioText></View>
            <View style={styles.activityAmount}><StudioText weight="semibold" size={12}>R$ 1,499</StudioText><StudioText tone="green" weight="semibold" size={8}>{sale.status.toUpperCase()}</StudioText></View>
          </Pressable>
        ))}
      </View>

      <Card style={styles.signalCard}>
        <StudioText tone="blue" weight="semibold" size={9}>PERFORMANCE SIGNAL</StudioText>
        <StudioText weight="semibold" size={15}>Revenue grew faster than traffic</StudioText>
        <StudioText tone="muted" size={11} lineHeight={16}>Conversion improved 0.4 pts while product revenue rose 24%, suggesting the offer is gaining efficiency.</StudioText>
      </Card>
    </Screen>
  );
}

function Segment({ label, selected = false }: { label: string; selected?: boolean }) {
  return <View style={[styles.segment, selected && styles.segmentSelected]}><StudioText tone={selected ? 'primary' : 'muted'} weight={selected ? 'semibold' : 'medium'} size={11} style={selected ? styles.selectedText : undefined}>{label}</StudioText></View>;
}

function Metric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <Card style={styles.metric}><StudioText tone="muted" size={8}>{label}</StudioText><StudioText weight="semibold" size={20}>{value}</StudioText><StudioText weight="semibold" size={9} style={{ color: metricTrendColor(delta) }}>{delta}</StudioText></Card>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><StudioText tone="muted" size={9}>{label}</StudioText></View>;
}

function RevenueConversionChart() {
  return (
    <Svg width="100%" height="112" viewBox="0 0 329 112">
      {[25, 55, 85].map((y) => <Line key={y} x1="0" y1={y} x2="329" y2={y} stroke={colors.border} strokeWidth="1" />)}
      <Path d="M0 87 C30 85 42 80 68 76 C95 72 112 82 139 70 C165 58 184 65 211 51 C240 37 261 46 287 28 C305 17 316 24 329 15" fill="none" stroke={colors.blue} strokeWidth="2" />
      <Path d="M0 79 C30 81 44 74 68 72 C95 68 112 75 139 66 C165 57 184 62 211 48 C240 41 258 51 285 38 C307 27 316 35 329 30" fill="none" stroke={colors.green} strokeWidth="2" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 8, gap: 10, paddingBottom: 28 },
  flex: { flex: 1 },
  pressed: { opacity: 0.68 },
  topControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  experienceSelector: { flex: 1, height: 60, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundRaised, padding: 6, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  experienceImage: { width: 42, height: 42, borderRadius: 9 },
  notificationButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  titleRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeButton: { minWidth: 121, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segments: { height: 38, padding: 3, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundRaised, flexDirection: 'row' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  segmentSelected: { backgroundColor: colors.blueSoft },
  selectedText: { color: colors.blue },
  heroCard: { gap: 5, padding: 13 },
  productIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  productTile: { width: 48, height: 48, borderRadius: 11, backgroundColor: '#552765', alignItems: 'center', justifyContent: 'center' },
  purpleLabel: { color: '#D7A6FF' },
  heroValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '48.85%', minHeight: 85, gap: 3, padding: 11 },
  chartCard: { padding: 13, gap: 6 },
  chartTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legend: { flexDirection: 'row', gap: 26 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityList: { gap: 7 },
  activityRow: { minHeight: 62, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityTile: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#552765', alignItems: 'center', justifyContent: 'center' },
  activityAmount: { alignItems: 'flex-end', gap: 3 },
  signalCard: { gap: 5, borderColor: colors.blueBorder, backgroundColor: colors.blueSoft },
  unavailableCard: { alignItems: 'center', gap: 9, paddingVertical: 30 },
});
