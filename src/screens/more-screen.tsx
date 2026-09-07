import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen, StudioText } from '@/src/components/ui';
import { colors, radii } from '@/src/theme/tokens';
import { useSession } from '@/src/state/session-context';

type SettingsRowProps = {
  title: string;
  value?: string;
  valueTone?: 'muted' | 'blue' | 'green';
  onPress: () => void;
  last?: boolean;
};

function SettingsRow({ title, value, valueTone = 'muted', onPress, last = false }: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, !last && styles.rowDivider, pressed && styles.pressed]}>
      <StudioText size={13} style={styles.rowTitle}>{title}</StudioText>
      {value ? <StudioText tone={valueTone} size={10}>{value}</StudioText> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function SettingsGroup({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.group}>
      <StudioText tone="muted" weight="medium" size={9} style={styles.groupTitle}>{title}</StudioText>
      <Card style={styles.groupCard}>{children}</Card>
    </View>
  );
}

export default function MoreScreen() {
  const session = useSession();
  const connected = session.status === 'authenticated';
  const user = session.session?.user;
  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <View style={styles.titleBlock}>
        <StudioText size={24} weight="bold">More</StudioText>
        <StudioText tone="muted" size={10}>Account, access, and preferences</StudioText>
      </View>

      <Card style={styles.accountCard} onPress={() => router.push('/settings/account')} accessibilityLabel="Open profile and account">
        <View style={styles.accountTop}>
          <View style={styles.accountAvatar}>
            <Ionicons name="person-outline" size={19} color={colors.blue} />
          </View>
          <View style={styles.accountCopy}>
            <StudioText weight="semibold" size={15}>{user?.name ?? user?.preferredUsername ?? (connected ? 'Roblox creator' : 'Sample workspace')}</StudioText>
            <StudioText tone="muted" size={10}>{connected ? `Roblox ID ${user?.sub}` : 'No verified creator identity'}</StudioText>
          </View>
          <View style={styles.verifiedBadge}>
            <StudioText tone="blue" weight="semibold" size={8}>{connected ? 'SIGNED IN' : 'SAMPLE'}</StudioText>
          </View>
        </View>
        <View style={styles.accountConnection}>
          <View style={styles.connectionLabel}>
            <View style={[styles.connectionDot, !connected && { backgroundColor: colors.textMuted }]} />
            <StudioText tone="muted" size={10}>{connected ? 'Roblox identity connected' : 'Roblox identity not connected'}</StudioText>
          </View>
          <StudioText tone={connected ? 'green' : 'muted'} weight="semibold" size={8}>{connected ? 'CONNECTED' : 'NOT CONNECTED'}</StudioText>
        </View>
      </Card>

      <Card style={styles.workspaceCard} onPress={() => router.push('/settings/account')} accessibilityLabel="Open BrainNourishment Studios workspace">
        <View style={styles.workspaceCopy}>
          <StudioText tone="muted" weight="medium" size={8}>WORKSPACE</StudioText>
          <StudioText weight="semibold" size={13}>BrainNourishment Studios</StudioText>
          <StudioText tone="muted" size={10}>Sample experiences · no live analytics</StudioText>
        </View>
        <View style={styles.workspaceAction}>
          <StudioText tone="blue" weight="semibold" size={8}>SAMPLE</StudioText>
          <View style={styles.switchRow}>
            <StudioText tone="blue" weight="semibold" size={8}>SWITCH</StudioText>
            <Ionicons name="chevron-forward" size={11} color={colors.blue} />
          </View>
        </View>
      </Card>

      <Card style={styles.healthCard} onPress={() => router.push('/settings/connections')} accessibilityLabel="Open Roblox data connection">
        <View style={styles.healthCopy}>
          <StudioText weight="medium" size={14}>Sample analytics</StudioText>
          <StudioText tone="muted" size={10}>Live data is not connected</StudioText>
        </View>
        <View style={styles.healthyBadge}>
          <StudioText tone="muted" weight="semibold" size={8}>SAMPLE</StudioText>
        </View>
      </Card>

      <SettingsGroup title="ACCOUNT">
        <SettingsRow title="Profile and account" value={connected ? 'Signed in' : 'Sign in'} onPress={() => router.push('/settings/account')} />
        <SettingsRow title="Notifications" value="Smart alerts" onPress={() => router.push('/notifications')} />
        <SettingsRow title="Team & permissions" value="Not connected" onPress={() => router.push('/settings/account')} last />
      </SettingsGroup>

      <SettingsGroup title="DATA & SECURITY">
        <SettingsRow title="Roblox connections" value="View status" onPress={() => router.push('/settings/connections')} />
        <SettingsRow title="Data sources" value="Sample" onPress={() => router.push('/settings/data-freshness')} />
        <SettingsRow title="Privacy & security" value="View status" valueTone="blue" onPress={() => router.push('/settings/connections')} last />
      </SettingsGroup>

      <SettingsGroup title="SUPPORT">
        <SettingsRow title="Help & support" onPress={() => router.push('/settings/help')} />
        <SettingsRow title="About roblox-analytics-mobile" value="v0.1" onPress={() => router.push('/settings/about')} last />
      </SettingsGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: 11, paddingTop: 3 },
  pressed: { opacity: 0.68 },
  titleBlock: { gap: 0 },
  accountCard: { height: 86, padding: 12, gap: 6, borderRadius: radii.md },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueSoft,
  },
  accountCopy: { flex: 1, gap: 1 },
  verifiedBadge: {
    minWidth: 64,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueSoft,
  },
  accountConnection: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  connectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  connectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  workspaceCard: {
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  workspaceCopy: { flex: 1, gap: 2 },
  workspaceAction: { alignItems: 'flex-end', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  healthCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  healthCopy: { flex: 1, gap: 2 },
  healthyBadge: {
    minWidth: 58,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenSoft,
  },
  group: { gap: 5 },
  groupTitle: { marginLeft: 1 },
  groupCard: { padding: 0, gap: 0, borderRadius: radii.md, overflow: 'hidden' },
  settingsRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { flex: 1 },
});
