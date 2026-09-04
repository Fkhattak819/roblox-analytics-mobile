import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Badge, Card, Divider, PageHeader, Screen, StudioText, uiStyles } from '@/src/components/ui';
import { appEnvironment } from '@/services/backend-api';
import { notificationMilestones } from '@/src/data/sample-data';
import { useApp } from '@/src/state/app-context';
import { colors, radii, spacing } from '@/src/theme/tokens';

const modes = ['Every sale', 'Smart', 'Milestones', 'Digest'] as const;

export default function NotificationsScreen() {
  const { notificationMode, setNotificationMode } = useApp();
  const [enabled, setEnabled] = useState(true);
  const [quietHours, setQuietHours] = useState(true);

  if (appEnvironment.dataMode === 'aws_dev') {
    return (
      <Screen>
        <PageHeader back title="Notifications" subtitle="Delivery and alert configuration" />
        <Card style={styles.unavailableCard}>
          <View style={styles.unavailableIcon}><Ionicons name="notifications-off-outline" size={23} color={colors.yellow} /></View>
          <View style={uiStyles.flex}>
            <StudioText weight="bold" size={16}>Push notifications are not configured</StudioText>
            <StudioText tone="muted" size={12} lineHeight={17}>This build does not register a device push token or send background alerts. Your official analytics remain available in the app.</StudioText>
          </View>
          <Badge label="NOT SET UP" tone="yellow" />
        </Card>
        <Card style={styles.notice} onPress={() => router.push('/live-sales-setup')}>
          <Ionicons name="information-circle-outline" size={19} color={colors.blue} />
          <View style={uiStyles.flex}>
            <StudioText weight="semibold" size={13}>Live sales require a separate integration</StudioText>
            <StudioText tone="muted" size={11} lineHeight={16}>Review why exact sale alerts cannot come from the aggregate Analytics Query connection.</StudioText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader back title="Notifications" subtitle="Choose how roblox-analytics-mobile gets your attention" />
      <Card>
        <View style={uiStyles.rowBetween}>
          <View style={uiStyles.flex}>
            <StudioText weight="bold" size={16}>Push notifications</StudioText>
            <StudioText tone="muted" size={12}>Sales, milestones, and data health</StudioText>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: colors.borderStrong, true: colors.blue }} thumbColor={colors.white} />
        </View>
      </Card>

      <View style={styles.heading}>
        <StudioText weight="bold" size={18}>Sales alerts</StudioText>
        <Badge label="Signed live events" tone="green" />
      </View>
      <View style={styles.modeGrid}>
        {modes.map((mode) => {
          const selected = notificationMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => setNotificationMode(mode)}
              style={({ pressed }) => [styles.modeCard, selected && styles.modeSelected, pressed && styles.pressed]}>
              <Ionicons
                name={mode === 'Every sale' ? 'flash-outline' : mode === 'Smart' ? 'sparkles-outline' : mode === 'Milestones' ? 'trophy-outline' : 'mail-outline'}
                size={21}
                color={selected ? colors.blue : colors.textSecondary}
              />
              <StudioText weight="semibold" size={14}>{mode}</StudioText>
              <StudioText tone="muted" size={11} lineHeight={15}>
                {mode === 'Every sale' ? 'A notification for every verified event.' : mode === 'Smart' ? 'Important sales and unusual movement.' : mode === 'Milestones' ? 'Only when revenue crosses a target.' : 'A calm scheduled summary.'}
              </StudioText>
              {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.blue} style={styles.check} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Card>
        <StudioText weight="bold" size={15}>Revenue milestones</StudioText>
        <View style={styles.chips}>
          {notificationMilestones.map((milestone, index) => (
            <View key={milestone} style={[styles.chip, index < 3 && styles.chipActive]}>
              <StudioText weight="semibold" size={12} tone={index < 3 ? 'blue' : 'muted'}>R$ {milestone.toLocaleString()}</StudioText>
            </View>
          ))}
        </View>
        <Divider />
        <View style={uiStyles.rowBetween}>
          <View style={uiStyles.flex}>
            <StudioText weight="semibold" size={14}>Quiet hours</StudioText>
            <StudioText tone="muted" size={11}>11:00 PM – 7:00 AM</StudioText>
          </View>
          <Switch value={quietHours} onValueChange={setQuietHours} trackColor={{ false: colors.borderStrong, true: colors.blue }} thumbColor={colors.white} />
        </View>
      </Card>

      <Card style={styles.notice}>
        <Ionicons name="information-circle-outline" size={19} color={colors.yellow} />
        <StudioText tone="secondary" size={12} lineHeight={17} style={uiStyles.flex}>
          Live alerts are preliminary until reconciled with official Roblox Open Cloud totals. Player identity is never included.
        </StudioText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  unavailableCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  unavailableIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.yellowSoft },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modeCard: { width: '48%', minHeight: 128, padding: 14, gap: 7, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  modeSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  pressed: { opacity: 0.7 },
  check: { position: 'absolute', right: 10, top: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundRaised },
  chipActive: { borderColor: colors.blueBorder, backgroundColor: colors.blueSoft },
  notice: { flexDirection: 'row', alignItems: 'flex-start', borderColor: colors.yellowBorder, backgroundColor: colors.yellowSoft },
});
