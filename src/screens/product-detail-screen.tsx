import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ColumnChart } from '@/src/components/charts';
import { Badge, Card, Divider, MetricCard, PageHeader, Screen, StudioText, uiStyles } from '@/src/components/ui';
import { products } from '@/src/data/sample-data';
import { colors } from '@/src/theme/tokens';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = products.find((item) => item.id === id) ?? products[0];

  return (
    <Screen>
      <PageHeader back title={product.name} subtitle={product.type} right={<Badge label="Official" tone="green" />} />
      <Card>
        <View style={uiStyles.rowBetween}>
          <View>
            <StudioText tone="muted" size={12}>7-day revenue</StudioText>
            <StudioText weight="bold" size={30}>R$ {product.revenue.toLocaleString()}</StudioText>
            <StudioText tone="green" weight="semibold" size={12}>+11.2% vs previous period</StudioText>
          </View>
          <View style={styles.productIcon}><Ionicons name="diamond-outline" size={24} color={colors.blue} /></View>
        </View>
        <ColumnChart values={[21, 28, 24, 37, 31, 43, 48]} color={colors.blue} height={126} />
      </Card>
      <View style={uiStyles.cardsRow}>
        <MetricCard label="Price" value={`R$ ${product.price}`} icon="pricetag-outline" />
        <MetricCard label="Sales" value={String(product.sales)} change="+8.6%" icon="bag-outline" accent={colors.green} />
      </View>
      <Card>
        <DetailRow label="Experience" value="Most Words Win" />
        <Divider />
        <DetailRow label="Product ID" value={`…${product.id.slice(-6)}`} />
        <Divider />
        <DetailRow label="Reporting" value="Official · processed" />
        <Divider />
        <DetailRow label="Last refresh" value="4 minutes ago" />
      </Card>
      <Card style={styles.notice}>
        <Ionicons name="eye-outline" size={20} color={colors.blue} />
        <View style={uiStyles.flex}>
          <StudioText weight="semibold" size={13}>Read-only product analytics</StudioText>
          <StudioText tone="muted" size={11}>Prices and product settings stay managed in Roblox Creator Hub.</StudioText>
        </View>
      </Card>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={uiStyles.rowBetween}><StudioText tone="muted" size={13}>{label}</StudioText><StudioText weight="semibold" size={13}>{value}</StudioText></View>;
}

const styles = StyleSheet.create({
  productIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundRaised },
});
