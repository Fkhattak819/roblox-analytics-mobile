import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LineChart } from '@/src/components/charts';
import { appEnvironment } from '@/services/backend-api';
import { Card, Divider, PageHeader, PersistentTabBar, Screen, StudioText } from '@/src/components/ui';
import { liveSales, revenueTrend } from '@/src/data/sample-data';
import { colors } from '@/src/theme/tokens';
import { metricTrendColor } from '@/src/utils/metric-trend';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sale = liveSales.find((item) => item.id === id) ?? liveSales[0];

  if (appEnvironment.dataMode === 'aws_dev') {
    return (
      <Screen contentContainerStyle={styles.screen} footer={<PersistentTabBar active="sales" />}>
        <PageHeader title="Sale detail" subtitle="Most Words Win!" back />
        <Card style={styles.unavailableCard}>
          <Ionicons name="receipt-outline" size={25} color={colors.textMuted} />
          <StudioText weight="semibold" size={17}>Individual sales are not available</StudioText>
          <StudioText tone="muted" size={12} lineHeight={17}>Exact purchase events require the optional signed server integration. The active Roblox connection provides aggregate monetization only.</StudioText>
          <Pressable onPress={() => router.push('/live-sales-setup')}><StudioText tone="blue" weight="semibold" size={12}>Review optional setup ›</StudioText></Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.screen} footer={<PersistentTabBar active="sales" />}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <StudioText weight="bold" size={27}>Sale detail</StudioText>
          <StudioText tone="muted" size={11}>Confirmed purchase · 12:41 AM</StudioText>
        </View>
        <StatusPill label="RECONCILED" />
      </View>

      <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}>
        <StudioText tone="blue" weight="medium" size={11}>‹  Live sales</StudioText>
      </Pressable>

      <Card style={styles.purchaseCard}>
        <StudioText tone="green" weight="semibold" size={9}>CONFIRMED PURCHASE</StudioText>
        <StudioText weight="bold" size={29}>R$ {sale.price.toLocaleString()}</StudioText>
        <StudioText weight="semibold" size={17}>{sale.product}</StudioText>
        <View style={styles.productLinkRow}>
          <StudioText tone="muted" size={11}>{'Developer product · Most Words Win!'}</StudioText>
          <Pressable onPress={() => router.push('/product/premium-bundle')}><StudioText tone="blue" weight="medium" size={11}>Product  ›</StudioText></Pressable>
        </View>
        <StudioText tone="muted" size={9} style={styles.purchaseRef}>Purchase ref 8D7F-21A9</StudioText>
      </Card>

      <Card style={styles.transactionCard}>
        <StudioText weight="semibold" size={16}>Transaction</StudioText>
        <DetailRow label="Purchase type" value="Developer product" />
        <Divider />
        <DetailRow label="Quantity" value="1" />
        <Divider />
        <DetailRow label="Received" value="Today · 12:41 AM" />
        <Divider />
        <DetailRow label="State" value="Reconciled" green />
        <Divider />
        <DetailRow label="Source" value="Official + instrumented" />
      </Card>

      <StudioText weight="semibold" size={17}>Premium Bundle today</StudioText>
      <View style={styles.metricRow}>
        <Metric label="REVENUE" value="R$ 12.8K" delta="↑ 20.4%" />
        <Metric label="SALES" value="146" delta="↑ 18 sales" />
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View><StudioText weight="semibold" size={14}>Recent product revenue</StudioText><StudioText tone="muted" size={10}>Last 24 hours</StudioText></View>
          <StudioText weight="semibold" size={13}>R$ 12.8K today</StudioText>
        </View>
        <LineChart values={revenueTrend} color={colors.blue} height={92} showLastDot={false} />
      </Card>

      <Card onPress={() => router.push('/product/premium-bundle')} style={styles.analyticsLink}>
        <View style={styles.analyticsIcon}><Ionicons name="analytics-outline" size={19} color={colors.blue} /></View>
        <View style={styles.flex}>
          <StudioText weight="semibold" size={14}>View Premium Bundle analytics</StudioText>
          <StudioText tone="muted" size={10}>Trend, conversion, share, recent sales</StudioText>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </Card>

      <Card style={styles.privacyCard}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.green} />
        <View style={styles.flex}><StudioText weight="semibold" size={13}>Private by default</StudioText><StudioText tone="muted" size={10} lineHeight={14}>No player identity is shown. Purchase references are workspace-safe and access-controlled.</StudioText></View>
      </Card>
    </Screen>
  );
}

function StatusPill({ label }: { label: string }) {
  return <View style={styles.statusPill}><StudioText tone="green" weight="semibold" size={8}>{label}</StudioText></View>;
}

function DetailRow({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return <View style={styles.detailRow}><StudioText tone="muted" size={11}>{label}</StudioText><StudioText tone={green ? 'green' : 'primary'} weight="medium" size={11}>{value}</StudioText></View>;
}

function Metric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <Card style={styles.metric}><StudioText tone="muted" size={9}>{label}</StudioText><StudioText weight="semibold" size={21}>{value}</StudioText><StudioText weight="semibold" size={9} style={{ color: metricTrendColor(delta) }}>{delta}</StudioText></Card>;
}

const styles = StyleSheet.create({
  screen: { paddingTop: 8, gap: 12, paddingBottom: 28 },
  flex: { flex: 1 },
  pressed: { opacity: 0.68 },
  titleRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPill: { minWidth: 108, height: 35, borderRadius: 18, borderWidth: 1, borderColor: colors.greenBorder, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  backLink: { width: 92, height: 30, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundRaised, alignItems: 'center', justifyContent: 'center' },
  purchaseCard: { minHeight: 160, gap: 4, padding: 13 },
  productLinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  purchaseRef: { marginTop: 13 },
  transactionCard: { gap: 0, padding: 13 },
  detailRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricRow: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, minHeight: 86, gap: 3, padding: 11 },
  chartCard: { gap: 5, padding: 13 },
  chartHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  analyticsLink: { minHeight: 68, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  analyticsIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  privacyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.backgroundRaised },
  unavailableCard: { alignItems: 'center', gap: 9, paddingVertical: 30 },
});
