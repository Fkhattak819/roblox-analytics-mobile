import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Divider, PageHeader, Screen, StudioText, uiStyles } from '@/src/components/ui';
import { liveSales } from '@/src/data/sample-data';
import { colors } from '@/src/theme/tokens';

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sale = liveSales.find((item) => item.id === id) ?? liveSales[0];
  const preliminary = sale.status === 'Preliminary';

  return (
    <Screen>
      <PageHeader back title="Sale detail" subtitle={`Event ${sale.id.replace('sale-', '#')}`} right={<Badge label={sale.status} tone={preliminary ? 'yellow' : 'green'} />} />
      <Card style={styles.amountCard}>
        <View style={[styles.amountIcon, { backgroundColor: preliminary ? colors.yellowSoft : colors.greenSoft }]}>
          <Ionicons name="bag-check-outline" size={26} color={preliminary ? colors.yellow : colors.green} />
        </View>
        <StudioText tone="muted" weight="medium" size={12}>Gross purchase</StudioText>
        <StudioText weight="bold" size={36}>R$ {sale.price}</StudioText>
        <StudioText tone="secondary" size={13}>{sale.product}</StudioText>
      </Card>
      <Card>
        <DetailRow label="Experience" value={sale.experience} />
        <Divider />
        <DetailRow label="Product" value={sale.product} />
        <Divider />
        <DetailRow label="Received" value={sale.time} />
        <Divider />
        <DetailRow label="Source" value={preliminary ? 'Signed live event' : 'Roblox Open Cloud'} />
        <Divider />
        <DetailRow label="Player data" value="Not collected" />
      </Card>
      <View>
        <StudioText weight="bold" size={18}>Verification timeline</StudioText>
        <StudioText tone="muted" size={12}>How this event becomes official</StudioText>
      </View>
      <Card>
        <TimelineRow icon="checkmark" title="Event signature verified" subtitle="Payload accepted from your game server" complete />
        <View style={styles.timelineLine} />
        <TimelineRow icon={preliminary ? 'hourglass-outline' : 'checkmark'} title="Matched with official total" subtitle={preliminary ? 'Waiting for the next Open Cloud refresh' : 'Reconciled successfully'} complete={!preliminary} />
        <View style={styles.timelineLine} />
        <TimelineRow icon="lock-closed-outline" title="Included in settled reporting" subtitle={preliminary ? 'Pending reconciliation' : 'Official reporting source'} complete={!preliminary} />
      </Card>
      <Card style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.green} />
        <StudioText tone="secondary" size={12} lineHeight={17} style={uiStyles.flex}>
          roblox-analytics-mobile never treats a live event as official before Open Cloud confirms it.
        </StudioText>
      </Card>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={uiStyles.rowBetween}><StudioText tone="muted" size={13}>{label}</StudioText><StudioText weight="semibold" size={13}>{value}</StudioText></View>;
}

function TimelineRow({ icon, title, subtitle, complete = false }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; subtitle: string; complete?: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineIcon, complete && styles.timelineComplete]}><Ionicons name={icon} size={16} color={complete ? colors.green : colors.textMuted} /></View>
      <View style={uiStyles.flex}><StudioText weight="semibold" size={14}>{title}</StudioText><StudioText tone="muted" size={11}>{subtitle}</StudioText></View>
    </View>
  );
}

const styles = StyleSheet.create({
  amountCard: { alignItems: 'center', paddingVertical: 26 },
  amountIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  timelineComplete: { backgroundColor: colors.greenSoft, borderColor: '#28583E' },
  timelineLine: { width: 1, height: 18, marginLeft: 16, backgroundColor: colors.border },
  notice: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.backgroundRaised },
});
