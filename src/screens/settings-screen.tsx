import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  Badge,
  Card,
  Divider,
  ListRow,
  PageHeader,
  ProgressBar,
  Screen,
  SegmentedControl,
  StudioText,
} from '@/src/components/ui';
import { colors, radii, spacing } from '@/src/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const screenMeta: Record<string, { title: string; subtitle: string; icon: IconName }> = {
  account: { title: 'Profile', subtitle: 'Identity and creator account', icon: 'person-outline' },
  currency: { title: 'Currency display', subtitle: 'Choose how revenue appears', icon: 'cash-outline' },
  appearance: { title: 'Appearance', subtitle: 'Make roblox-analytics-mobile feel right', icon: 'moon-outline' },
  connections: { title: 'Connections', subtitle: 'Identity and analytics access', icon: 'link-outline' },
  'data-freshness': { title: 'Data freshness', subtitle: 'Know what is official and what is early', icon: 'time-outline' },
  export: { title: 'Export data', subtitle: 'Prepare a clean CSV export', icon: 'download-outline' },
  'api-security': { title: 'API key security', subtitle: 'How your analytics access stays safe', icon: 'key-outline' },
  'event-signing': { title: 'Event signing', subtitle: 'Verify live events before showing them', icon: 'shield-checkmark-outline' },
  sessions: { title: 'Sessions', subtitle: 'Devices signed in to roblox-analytics-mobile', icon: 'phone-portrait-outline' },
  help: { title: 'Help center', subtitle: 'Answers for the prototype', icon: 'help-circle-outline' },
  privacy: { title: 'Privacy', subtitle: 'What roblox-analytics-mobile does and does not collect', icon: 'document-text-outline' },
  about: { title: 'About roblox-analytics-mobile', subtitle: 'A calmer mobile view of Creator analytics', icon: 'information-circle-outline' },
};

function SectionLabel({ children }: React.PropsWithChildren) {
  return <StudioText tone="muted" weight="semibold" size={11} style={styles.sectionLabel}>{String(children).toUpperCase()}</StudioText>;
}

function SettingSection({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </View>
  );
}

function KeyValueRow({
  label,
  value,
  valueTone = 'primary',
}: {
  label: string;
  value: string;
  valueTone?: 'primary' | 'secondary' | 'muted' | 'blue' | 'green' | 'yellow' | 'red';
}) {
  return (
    <View style={styles.keyValueRow}>
      <StudioText tone="muted" size={12}>{label}</StudioText>
      <StudioText tone={valueTone} weight="semibold" size={12} style={styles.keyValueValue}>{value}</StudioText>
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.smallIcon}><Ionicons name={icon} size={18} color={colors.textSecondary} /></View>
      <View style={styles.flex}>
        <StudioText weight="medium" size={14}>{title}</StudioText>
        <StudioText tone="muted" size={11}>{subtitle}</StudioText>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceSoft, true: colors.blue }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function InfoBanner({
  icon = 'information-circle-outline',
  title,
  body,
  tone = 'blue',
}: {
  icon?: IconName;
  title: string;
  body: string;
  tone?: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const palette = {
    blue: { color: colors.blue, background: colors.blueSoft, border: '#354477' },
    green: { color: colors.green, background: colors.greenSoft, border: '#28543A' },
    yellow: { color: colors.yellow, background: colors.yellowSoft, border: '#574922' },
    red: { color: colors.red, background: colors.redSoft, border: '#60303A' },
  }[tone];

  return (
    <View style={[styles.infoBanner, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Ionicons name={icon} size={20} color={palette.color} />
      <View style={styles.flex}>
        <StudioText weight="semibold" size={13}>{title}</StudioText>
        <StudioText tone="secondary" size={11} lineHeight={16}>{body}</StudioText>
      </View>
    </View>
  );
}

function StatusSource({
  icon,
  title,
  subtitle,
  badge,
  badgeTone,
  freshness,
  progress,
  color,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: 'blue' | 'green' | 'yellow' | 'red' | 'neutral';
  freshness: string;
  progress: number;
  color: string;
}) {
  return (
    <Card>
      <View style={styles.sourceTop}>
        <View style={[styles.sourceIcon, { backgroundColor: `${color}1F` }]}>
          <Ionicons name={icon} size={19} color={color} />
        </View>
        <View style={styles.flex}>
          <StudioText weight="semibold" size={15}>{title}</StudioText>
          <StudioText tone="muted" size={11}>{subtitle}</StudioText>
        </View>
        <Badge label={badge} tone={badgeTone} />
      </View>
      <ProgressBar value={progress} color={color} />
      <View style={styles.sourceFooter}>
        <StudioText tone="muted" size={11}>Freshness</StudioText>
        <StudioText weight="semibold" size={11} style={{ color }}>{freshness}</StudioText>
      </View>
    </Card>
  );
}

function CheckRow({ children }: React.PropsWithChildren) {
  return (
    <View style={styles.checkRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.green} />
      <StudioText tone="secondary" size={12} style={styles.flex}>{children}</StudioText>
    </View>
  );
}

function SettingButton({ label, icon, onPress }: { label: string; icon: IconName; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={17} color={colors.blue} />
      <StudioText tone="blue" weight="semibold" size={13}>{label}</StudioText>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ screen?: string | string[] }>();
  const screen = Array.isArray(params.screen) ? params.screen[0] : params.screen ?? 'account';
  const meta = screenMeta[screen] ?? {
    title: 'Settings',
    subtitle: 'roblox-analytics-mobile preferences',
    icon: 'settings-outline' as IconName,
  };

  const [currency, setCurrency] = useState<'Robux' | 'USD estimate'>('Robux');
  const [appearance, setAppearance] = useState<'Dark' | 'System'>('Dark');
  const [exportRange, setExportRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [officialOnly, setOfficialOnly] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [eventSigning, setEventSigning] = useState(true);
  const [replayProtection, setReplayProtection] = useState(true);

  const renderContent = () => {
    switch (screen) {
      case 'account':
        return (
          <>
            <Card style={styles.profileCard}>
              <View style={styles.profileAvatar}><StudioText weight="bold" size={25}>FK</StudioText></View>
              <View style={styles.profileCopy}>
                <StudioText weight="bold" size={20}>Fahd Khattak</StudioText>
                <StudioText tone="muted" size={12}>@fahd · Creator account</StudioText>
                <Badge label="OAuth connected" tone="green" />
              </View>
            </Card>
            <SettingSection title="Roblox identity">
              <Card>
                <KeyValueRow label="Sign-in method" value="Roblox OAuth" />
                <Divider />
                <KeyValueRow label="Identity access" value="Profile only" valueTone="green" />
                <Divider />
                <KeyValueRow label="Creator groups" value="2 connected" />
              </Card>
            </SettingSection>
            <InfoBanner
              icon="lock-closed-outline"
              title="Identity is separate from analytics"
              body="OAuth signs you in and identifies your creator account. It does not expose the Open Cloud key used by the server to fetch analytics."
              tone="blue"
            />
            <SettingSection title="Workspace access">
              <Card>
                <ListRow icon="albums-outline" title="BrainNourish Studios" subtitle="Owner · 3 experiences" value="Active" showChevron={false} />
                <Divider />
                <ListRow icon="albums-outline" title="Squishy Works" subtitle="Member · 2 experiences" value="Active" showChevron={false} />
              </Card>
            </SettingSection>
          </>
        );

      case 'currency':
        return (
          <>
            <Card style={styles.heroSettingCard}>
              <View style={styles.heroSettingIcon}><Ionicons name="diamond-outline" size={25} color={colors.blue} /></View>
              <StudioText weight="bold" size={28}>{currency === 'Robux' ? 'R$ 84,290' : '$295.02'}</StudioText>
              <StudioText tone="muted" size={12}>Example portfolio revenue · 30 days</StudioText>
            </Card>
            <SettingSection title="Display as">
              <SegmentedControl options={['Robux', 'USD estimate'] as const} value={currency} onChange={setCurrency} />
            </SettingSection>
            <InfoBanner
              title="Robux is the source of truth"
              body="Currency conversions are estimates for quick reference. roblox-analytics-mobile keeps official revenue and exports denominated in Robux."
              tone="blue"
            />
          </>
        );

      case 'appearance':
        return (
          <>
            <Card style={styles.appearancePreview}>
              <View style={styles.previewHeader}><View style={styles.previewAvatar} /><View style={styles.previewLines}><View style={styles.previewLineWide} /><View style={styles.previewLineShort} /></View></View>
              <View style={styles.previewMetrics}><View style={styles.previewMetric} /><View style={styles.previewMetric} /></View>
              <View style={styles.previewChart}><View style={styles.previewChartLine} /></View>
            </Card>
            <SettingSection title="Theme">
              <SegmentedControl options={['Dark', 'System'] as const} value={appearance} onChange={setAppearance} />
            </SettingSection>
            <InfoBanner title="Built for quick checks" body="Dark surfaces, restrained color, and Builder Sans keep dense creator data readable on a small screen." />
          </>
        );

      case 'connections':
        return (
          <>
            <InfoBanner
              icon="shield-checkmark-outline"
              title="Two connections, two different jobs"
              body="Roblox OAuth handles your identity. A dedicated Open Cloud key stays on the roblox-analytics-mobile server and supplies read-only analytics."
              tone="green"
            />
            <SettingSection title="Identity connection">
              <Card>
                <View style={styles.connectionTop}>
                  <View style={[styles.connectionLogo, { backgroundColor: colors.blueSoft }]}><Ionicons name="person" size={21} color={colors.blue} /></View>
                  <View style={styles.flex}><StudioText weight="bold" size={16}>Roblox OAuth</StudioText><StudioText tone="muted" size={11}>Signed in as @fahd</StudioText></View>
                  <Badge label="Connected" tone="green" />
                </View>
                <Divider />
                <KeyValueRow label="Purpose" value="Identity only" />
                <KeyValueRow label="Session renewed" value="Today, 8:42 AM" />
              </Card>
            </SettingSection>
            <SettingSection title="Analytics connection">
              <Card>
                <View style={styles.connectionTop}>
                  <View style={[styles.connectionLogo, { backgroundColor: colors.greenSoft }]}><Ionicons name="cloud-done" size={21} color={colors.green} /></View>
                  <View style={styles.flex}><StudioText weight="bold" size={16}>Open Cloud relay</StudioText><StudioText tone="muted" size={11}>Server-side connection</StudioText></View>
                  <Badge label="Healthy" tone="green" />
                </View>
                <Divider />
                <KeyValueRow label="Scope" value="universe.analytics:read" valueTone="blue" />
                <KeyValueRow label="Key location" value="Encrypted server vault" valueTone="green" />
                <KeyValueRow label="Key fingerprint" value="…7A4C" />
                <KeyValueRow label="Protected universes" value="5" />
                <KeyValueRow label="Official refresh" value="4 min ago" valueTone="green" />
                <KeyValueRow label="Last rotation" value="July 28, 2026" />
              </Card>
              <StudioText tone="muted" size={11} lineHeight={16} style={styles.finePrint}>
                The fingerprint identifies which key is active; it is not the secret key and cannot be used to access Roblox data.
              </StudioText>
            </SettingSection>
            <SettingSection title="Protected universes">
              <Card>
                <ListRow icon="game-controller-outline" title="Most Words Win" subtitle="Official analytics enabled" value="Fresh" showChevron={false} />
                <Divider />
                <ListRow icon="game-controller-outline" title="Fling Squishies" subtitle="Official analytics enabled" value="Fresh" showChevron={false} />
                <Divider />
                <ListRow icon="ellipsis-horizontal" title="3 more experiences" subtitle="Scoped on the server" showChevron={false} />
              </Card>
            </SettingSection>
            <InfoBanner
              icon="warning-outline"
              title="Never paste a Roblox browser cookie"
              body="roblox-analytics-mobile will never ask for .ROBLOSECURITY. If any app asks for it, stop—the cookie can grant account access."
              tone="yellow"
            />
          </>
        );

      case 'data-freshness':
        return (
          <>
            <InfoBanner
              title="Every number carries a status"
              body="roblox-analytics-mobile keeps official, reconciled, and preliminary data visibly distinct so an early signal never looks final."
              tone="blue"
            />
            <StatusSource icon="stats-chart" title="Creator analytics" subtitle="Sessions, retention, acquisition" badge="Official" badgeTone="green" freshness="4 min ago" progress={92} color={colors.green} />
            <StatusSource icon="diamond" title="Revenue totals" subtitle="Sales and product performance" badge="Reconciled" badgeTone="blue" freshness="14 min ago" progress={78} color={colors.blue} />
            <StatusSource icon="flash" title="Live sale events" subtitle="Signed event stream" badge="Preliminary" badgeTone="yellow" freshness="Just now" progress={100} color={colors.yellow} />
            <SettingSection title="Status guide">
              <Card>
                <ListRow leading={<View style={[styles.legendDot, { backgroundColor: colors.green }]} />} title="Official" subtitle="Confirmed by the analytics source" showChevron={false} />
                <Divider />
                <ListRow leading={<View style={[styles.legendDot, { backgroundColor: colors.blue }]} />} title="Reconciled" subtitle="Matched against the official revenue total" showChevron={false} />
                <Divider />
                <ListRow leading={<View style={[styles.legendDot, { backgroundColor: colors.yellow }]} />} title="Preliminary" subtitle="Useful early signal that can still change" showChevron={false} />
              </Card>
            </SettingSection>
          </>
        );

      case 'export':
        return (
          <>
            <SettingSection title="Date range">
              <SegmentedControl options={['7D', '30D', '90D'] as const} value={exportRange} onChange={setExportRange} />
            </SettingSection>
            <SettingSection title="Export rules">
              <Card style={styles.zeroGapCard}>
                <ToggleRow icon="checkmark-done-outline" title="Official data only" subtitle="Leave preliminary live events out" value={officialOnly} onValueChange={setOfficialOnly} />
                <Divider />
                <ToggleRow icon="pricetag-outline" title="Include data status" subtitle="Add official or reconciled to each row" value={includeStatus} onValueChange={setIncludeStatus} />
              </Card>
            </SettingSection>
            <Card>
              <View style={styles.exportPreviewTop}><Ionicons name="document-text-outline" size={25} color={colors.green} /><View style={styles.flex}><StudioText weight="bold" size={15}>portfolio-{exportRange.toLowerCase()}.csv</StudioText><StudioText tone="muted" size={11}>5 experiences · 18 metrics · Sample data</StudioText></View><Badge label="Preview" tone="blue" /></View>
              <Divider />
              <KeyValueRow label="Source" value={officialOnly ? 'Official + reconciled' : 'All statuses'} />
              <KeyValueRow label="Freshness columns" value={includeStatus ? 'Included' : 'Hidden'} />
              <SettingButton label="Prepare sample export" icon="download-outline" />
            </Card>
            <InfoBanner title="Prototype export" body="This sample build previews export choices without sending or modifying Roblox data." />
          </>
        );

      case 'api-security':
        return (
          <>
            <Card style={styles.securityScoreCard}>
              <View style={styles.securityRing}><Ionicons name="shield-checkmark" size={34} color={colors.green} /></View>
              <View style={styles.flex}><StudioText weight="bold" size={19}>Connection is safely scoped</StudioText><StudioText tone="muted" size={12}>Read-only · server-side · five universes</StudioText></View>
              <Badge label="Safe" tone="green" />
            </Card>
            <SettingSection title="Key controls">
              <Card>
                <CheckRow>Dedicated Open Cloud key; not shared with Roblox OAuth.</CheckRow>
                <Divider />
                <CheckRow>Only the universe.analytics:read scope is enabled.</CheckRow>
                <Divider />
                <CheckRow>The secret is encrypted on the server and never stored on this phone.</CheckRow>
                <Divider />
                <CheckRow>Access is limited to five explicitly selected universes.</CheckRow>
              </Card>
            </SettingSection>
            <SettingSection title="Active key">
              <Card>
                <KeyValueRow label="Fingerprint" value="oc_live_••••7A4C" />
                <KeyValueRow label="Last rotated" value="July 28, 2026" />
                <KeyValueRow label="Recommended rotation" value="October 26, 2026" valueTone="blue" />
                <KeyValueRow label="Last successful use" value="4 min ago" valueTone="green" />
              </Card>
              <StudioText tone="muted" size={11} lineHeight={16} style={styles.finePrint}>A fingerprint is a safe identifier, not a credential. Rotation happens in the Roblox Creator Dashboard and the roblox-analytics-mobile server vault.</StudioText>
            </SettingSection>
            <InfoBanner
              icon="hand-left-outline"
              title="We never need your browser cookie"
              body="Do not share .ROBLOSECURITY with roblox-analytics-mobile—or anyone. The app uses supported OAuth and Open Cloud access instead."
              tone="yellow"
            />
          </>
        );

      case 'event-signing':
        return (
          <>
            <InfoBanner
              icon="shield-checkmark-outline"
              title="Signed before it reaches the app"
              body="The roblox-analytics-mobile backend verifies each live event signature and timestamp. Invalid or replayed events are discarded."
              tone="green"
            />
            <SettingSection title="Verification">
              <Card style={styles.zeroGapCard}>
                <ToggleRow icon="finger-print-outline" title="Verify event signatures" subtitle="Reject events that fail HMAC verification" value={eventSigning} onValueChange={setEventSigning} />
                <Divider />
                <ToggleRow icon="timer-outline" title="Replay protection" subtitle="Reject expired or repeated event IDs" value={replayProtection} onValueChange={setReplayProtection} />
              </Card>
            </SettingSection>
            <SettingSection title="Recent checks">
              <Card>
                <KeyValueRow label="Last verified event" value="28 sec ago" valueTone="green" />
                <KeyValueRow label="Events verified today" value="418" />
                <KeyValueRow label="Rejected today" value="0" valueTone="green" />
                <KeyValueRow label="Signing secret" value="Server-side only" valueTone="green" />
              </Card>
            </SettingSection>
            <InfoBanner
              icon="flash-outline"
              title="Verified does not mean final"
              body="A valid signature proves where a live event came from. The sale remains Preliminary until it reconciles with official revenue."
              tone="yellow"
            />
          </>
        );

      case 'sessions':
        return (
          <>
            <SettingSection title="Current session">
              <Card>
                <ListRow icon="phone-portrait" title="This iPhone" subtitle="Chicago, IL · Active now" value="Current" showChevron={false} />
                <Divider />
                <KeyValueRow label="Signed in" value="Today, 8:42 AM" />
                <KeyValueRow label="Authentication" value="Roblox OAuth" valueTone="green" />
              </Card>
            </SettingSection>
            <SettingSection title="Other sessions">
              <Card>
                <ListRow icon="laptop-outline" title="Safari on Mac" subtitle="Chicago, IL · 2 hours ago" value="Trusted" showChevron={false} />
              </Card>
            </SettingSection>
            <InfoBanner title="Session safety" body="OAuth sessions can be revoked without rotating the separate Open Cloud analytics key." />
          </>
        );

      case 'help':
        return (
          <>
            <Card style={styles.helpHero}>
              <View style={styles.helpIcon}><Ionicons name="sparkles" size={24} color={colors.blue} /></View>
              <View style={styles.flex}><StudioText weight="bold" size={17}>roblox-analytics-mobile prototype guide</StudioText><StudioText tone="muted" size={12}>Quick answers for understanding the sample app</StudioText></View>
            </Card>
            <SettingSection title="Common questions">
              <Card style={styles.zeroGapCard}>
                <ListRow icon="analytics-outline" title="Why does a number say Preliminary?" subtitle="Live signals can change before reconciliation" showChevron={false} />
                <Divider />
                <ListRow icon="cloud-outline" title="Where does analytics data come from?" subtitle="A read-only Open Cloud connection" showChevron={false} />
                <Divider />
                <ListRow icon="lock-closed-outline" title="Is my API key stored on my phone?" subtitle="No—the key remains on the server" showChevron={false} />
                <Divider />
                <ListRow icon="flask-outline" title="Is this using live data?" subtitle="No—this build uses clearly marked sample data" showChevron={false} />
              </Card>
            </SettingSection>
          </>
        );

      case 'privacy':
        return (
          <>
            <InfoBanner icon="eye-off-outline" title="No player identity" body="roblox-analytics-mobile is designed around aggregate creator analytics. Live events carry product and amount—not player names or identities." tone="green" />
            <SettingSection title="What the app can use">
              <Card>
                <CheckRow>Your OAuth creator identity and authorized group memberships.</CheckRow>
                <Divider />
                <CheckRow>Aggregate, read-only analytics for selected universes.</CheckRow>
                <Divider />
                <CheckRow>Signed product-sale events without player identity.</CheckRow>
                <Divider />
                <CheckRow>Freshness and connection-health metadata.</CheckRow>
              </Card>
            </SettingSection>
            <SettingSection title="What never belongs on the phone">
              <Card>
                <ListRow icon="key-outline" title="Open Cloud secret" subtitle="Encrypted server-side only" value="Not stored" showChevron={false} />
                <Divider />
                <ListRow icon="warning-outline" title=".ROBLOSECURITY cookie" subtitle="Never requested or accepted" value="Never" showChevron={false} />
                <Divider />
                <ListRow icon="person-remove-outline" title="Player identity" subtitle="Not included in live sale events" value="Excluded" showChevron={false} />
              </Card>
            </SettingSection>
            <StudioText tone="muted" size={11} lineHeight={16} style={styles.finePrint}>Prototype policy summary · This build uses sample data and does not connect to a production service.</StudioText>
          </>
        );

      case 'about':
        return (
          <>
            <Card style={styles.aboutCard}>
              <View style={styles.appIcon}><Ionicons name="pulse" size={34} color={colors.white} /></View>
              <StudioText weight="bold" size={26}>roblox-analytics-mobile</StudioText>
              <StudioText tone="muted" size={13}>Creator analytics at a glance</StudioText>
              <Badge label="Sample-data prototype" tone="blue" />
            </Card>
            <SettingSection title="Build">
              <Card>
                <KeyValueRow label="Version" value="1.0 prototype" />
                <KeyValueRow label="Platform" value="Expo · React Native" />
                <KeyValueRow label="Data mode" value="Read-only sample" valueTone="blue" />
                <KeyValueRow label="Typography" value="Builder Sans" />
              </Card>
            </SettingSection>
            <InfoBanner title="Made for the creator in motion" body="Portfolio-first insights, honest freshness labels, and focused drill-downs make it easier to check what changed without opening a desktop dashboard." />
            <StudioText tone="muted" size={11} style={styles.centerText}>Built for Roblox creators · Not affiliated with Roblox Corporation</StudioText>
          </>
        );

      default:
        return (
          <Card style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={30} color={colors.blue} />
            <StudioText weight="bold" size={17}>Setting not found</StudioText>
            <StudioText tone="muted" size={12} style={styles.centerText}>This setting is not included in the sample prototype.</StudioText>
          </Card>
        );
    }
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <PageHeader title={meta.title} subtitle={meta.subtitle} back right={<View style={styles.headerIcon}><Ionicons name={meta.icon} size={19} color={colors.blue} /></View>} />
      {renderContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  pressed: { opacity: 0.68 },
  section: { gap: spacing.xs },
  sectionLabel: { marginLeft: 5, letterSpacing: 0.8 },
  headerIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  keyValueRow: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  keyValueValue: { flexShrink: 1, textAlign: 'right' },
  toggleRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  smallIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: radii.md, padding: spacing.md },
  sourceTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sourceIcon: { width: 39, height: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sourceFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7 },
  settingButton: { minHeight: 43, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.blueSoft, marginTop: spacing.xs },
  profileCard: { alignItems: 'center', paddingVertical: spacing.xl },
  profileAvatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderWidth: 2, borderColor: '#8DA3FF' },
  profileCopy: { alignItems: 'center', gap: 4 },
  heroSettingCard: { alignItems: 'center', paddingVertical: spacing.xl },
  heroSettingIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  appearancePreview: { backgroundColor: '#101217', padding: spacing.lg, gap: spacing.md },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blue },
  previewLines: { flex: 1, gap: 7 },
  previewLineWide: { height: 9, width: '52%', borderRadius: 5, backgroundColor: colors.textSecondary },
  previewLineShort: { height: 7, width: '34%', borderRadius: 4, backgroundColor: colors.textFaint },
  previewMetrics: { flexDirection: 'row', gap: spacing.sm },
  previewMetric: { flex: 1, height: 64, borderRadius: 11, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
  previewChart: { height: 90, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden', justifyContent: 'center' },
  previewChartLine: { height: 3, width: '72%', backgroundColor: colors.blue, transform: [{ rotate: '-7deg' }], alignSelf: 'center', borderRadius: 2 },
  connectionTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  connectionLogo: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  finePrint: { marginHorizontal: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginHorizontal: 11 },
  zeroGapCard: { gap: 0 },
  exportPreviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  securityScoreCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  securityRing: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: '#2B6142' },
  helpHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  helpIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  aboutCard: { alignItems: 'center', paddingVertical: spacing.xl },
  appIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, marginBottom: spacing.xs },
  centerText: { textAlign: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xxl },
});
