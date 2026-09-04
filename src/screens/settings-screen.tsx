import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Switch, View } from 'react-native';

import {
  Badge,
  Card,
  Divider,
  ListRow,
  PageHeader,
  PersistentTabBar,
  Screen,
  SegmentedControl,
  StudioText,
} from '@/src/components/ui';
import { AnalyticsDataStatus } from '@/src/components/analytics';
import type { AnalyticsSnapshot } from '@/domain/analytics';
import { colors, radii, spacing } from '@/src/theme/tokens';
import { appEnvironment } from '@/services/backend-api';
import { loadConnectionStatus, type ConnectionStatus } from '@/services/connections-api';
import { getStoredSessionToken, signInWithRoblox, signOutOfRoblox } from '@/services/roblox-auth';
import { resetOnboarding } from '@/src/state/onboarding-storage';
import { appearanceLabel, useAppearancePreference, type AppearancePreference } from '@/src/state/appearance-context';
import { useAnalyticsQuickLook } from '@/src/hooks/use-analytics-quick-look';
import { useAnalyticsSnapshot } from '@/src/hooks/use-analytics-snapshot';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const screenMeta: Record<string, { title: string; subtitle: string; icon: IconName }> = {
  account: { title: 'Profile', subtitle: 'Identity and creator account', icon: 'person-outline' },
  currency: { title: 'Currency display', subtitle: 'Choose how revenue appears', icon: 'cash-outline' },
  appearance: { title: 'Appearance', subtitle: 'Make roblox-analytics-mobile feel right', icon: 'moon-outline' },
  connections: { title: 'Connections', subtitle: 'Identity and analytics access', icon: 'link-outline' },
  'data-freshness': { title: 'Data coverage', subtitle: 'Know what is ready before you drill down', icon: 'layers-outline' },
  export: { title: 'Export data', subtitle: 'Prepare a clean CSV export', icon: 'download-outline' },
  'api-security': { title: 'API key security', subtitle: 'How your analytics access stays safe', icon: 'key-outline' },
  'event-signing': { title: 'Event signing', subtitle: 'Verify live events before showing them', icon: 'shield-checkmark-outline' },
  sessions: { title: 'Sessions', subtitle: 'Devices signed in to roblox-analytics-mobile', icon: 'phone-portrait-outline' },
  help: { title: 'Help center', subtitle: 'Answers about analytics and access', icon: 'help-circle-outline' },
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
    blue: { color: colors.blue, background: colors.blueSoft, border: colors.blueBorder },
    green: { color: colors.green, background: colors.greenSoft, border: colors.greenBorder },
    yellow: { color: colors.yellow, background: colors.yellowSoft, border: colors.yellowBorder },
    red: { color: colors.red, background: colors.redSoft, border: colors.redBorder },
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

const DATA_COVERAGE_UNIVERSE_ID = '10009166512';

function DataCoverageSettingsScreen() {
  const connected = appEnvironment.dataMode === 'aws_dev';
  const sampleSnapshot = useMemo<AnalyticsSnapshot>(() => ({
    mode: 'sample',
    source: 'sample_data',
    freshness: 'fixture',
    universeId: DATA_COVERAGE_UNIVERSE_ID,
    section: 'overview',
    range: '28D',
    metrics: [],
    charts: [],
    breakdowns: [],
    message: 'Connect Roblox to inspect official data coverage.',
  }), []);
  const overviewState = useAnalyticsSnapshot({
    universeId: DATA_COVERAGE_UNIVERSE_ID,
    section: 'overview',
    range: '28D',
    sampleSnapshot,
    enabled: connected,
  });
  const quickLook = useAnalyticsQuickLook({ universeId: DATA_COVERAGE_UNIVERSE_ID, enabled: connected });
  const overview = overviewState.snapshot?.metrics.length ? overviewState.snapshot : undefined;
  const { engagement, retention, acquisition, monetization, performance } = quickLook.snapshots;
  const loading = overviewState.loading || quickLook.loading;
  const message = overview?.message
    ?? (loading ? 'Checking cached Roblox analytics coverage…' : 'Open an analytics section to sync any missing snapshot.');

  return (
    <Screen
      contentContainerStyle={styles.coverageScreen}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { overviewState.reload(); quickLook.reload(); }} tintColor={colors.blue} />}>
      <PageHeader
        title="Data coverage"
        subtitle="Know what is ready before you drill down"
        back
        right={<View style={styles.headerIcon}><Ionicons name="layers-outline" size={19} color={colors.blue} /></View>}
      />
      <Card style={styles.coverageCard}>
        <CoverageRow label="Overview" snapshot={overview} />
        <CoverageRow label="Engagement" snapshot={engagement} />
        <CoverageRow label="Retention" snapshot={retention} />
        <CoverageRow label="Acquisition" snapshot={acquisition} />
        <CoverageRow label="Monetization" snapshot={monetization} />
        <CoverageRow label="Performance" snapshot={performance} />
        <View style={styles.coverageWebRow}>
          <Ionicons name="globe-outline" size={18} color={colors.yellow} />
          <View style={styles.flex}>
            <StudioText tone="secondary" weight="medium" size={12}>Audience</StudioText>
            <StudioText tone="muted" size={10}>Available in Roblox Creator Dashboard, not Open Cloud</StudioText>
          </View>
          <StudioText tone="yellow" weight="semibold" size={9}>WEB</StudioText>
        </View>
      </Card>
      <AnalyticsDataStatus live={Boolean(overview)} label={loading ? 'CHECKING' : overview ? 'OFFICIAL' : 'WAITING'} text={message} />
      {overviewState.error ? (
        <InfoBanner icon="cloud-offline-outline" title="Coverage could not refresh" body={overviewState.error} tone="red" />
      ) : null}
    </Screen>
  );
}

function CoverageRow({ label, snapshot }: { label: string; snapshot?: AnalyticsSnapshot }) {
  const ready = Boolean(snapshot?.metrics.length);
  return (
    <View style={styles.coverageRow}>
      <View style={[styles.coverageDot, !ready && styles.coverageDotMissing]} />
      <View style={styles.flex}>
        <StudioText tone="secondary" weight="medium" size={12}>{label}</StudioText>
        <StudioText tone="muted" size={10}>{ready ? `Updated ${coverageTimestamp(snapshot?.asOf)}` : 'Open section to sync'}</StudioText>
      </View>
      <StudioText tone={ready ? 'green' : 'muted'} weight="semibold" size={9}>{ready ? 'READY' : 'WAITING'}</StudioText>
    </View>
  );
}

function coverageTimestamp(value?: string) {
  if (!value) return 'from cached analytics';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ setting?: string | string[] }>();
  const screen = Array.isArray(params.setting) ? params.setting[0] : params.setting ?? 'account';
  const meta = screenMeta[screen] ?? {
    title: 'Settings',
    subtitle: 'roblox-analytics-mobile preferences',
    icon: 'settings-outline' as IconName,
  };

  const [currency, setCurrency] = useState<'Robux' | 'USD estimate'>('Robux');
  const { preference: appearance, setPreference: setAppearance } = useAppearancePreference();
  const [exportRange, setExportRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [officialOnly, setOfficialOnly] = useState(true);
  const [includeStatus, setIncludeStatus] = useState(true);
  const [eventSigning, setEventSigning] = useState(true);
  const [replayProtection, setReplayProtection] = useState(true);

  if (screen === 'account') return <ProfileFigmaScreen />;
  if (screen === 'connections') return <ConnectionsFigmaScreen />;
  if (screen === 'data-freshness') return <DataCoverageSettingsScreen />;

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
        const appearanceOptions = ['Light', 'Dark', 'System'] as const;
        const appearanceValues: Record<(typeof appearanceOptions)[number], AppearancePreference> = {
          Light: 'light',
          Dark: 'dark',
          System: 'system',
        };
        return (
          <>
            <Card style={styles.appearancePreview}>
              <View style={styles.previewHeader}><View style={styles.previewAvatar} /><View style={styles.previewLines}><View style={styles.previewLineWide} /><View style={styles.previewLineShort} /></View></View>
              <View style={styles.previewMetrics}><View style={styles.previewMetric} /><View style={styles.previewMetric} /></View>
              <View style={styles.previewChart}><View style={styles.previewChartLine} /></View>
            </Card>
            <SettingSection title="Theme">
              <SegmentedControl
                options={appearanceOptions}
                value={appearanceLabel(appearance)}
                onChange={(value) => void setAppearance(appearanceValues[value])}
              />
            </SettingSection>
            <InfoBanner title="Built for quick checks" body="Light and dark surfaces follow the Figma system while Builder Sans keeps dense creator data readable on a small screen." />
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
              <View style={styles.flex}><StudioText weight="bold" size={17}>roblox-analytics-mobile guide</StudioText><StudioText tone="muted" size={12}>Quick answers about data and security</StudioText></View>
            </Card>
            <SettingSection title="Common questions">
              <Card style={styles.zeroGapCard}>
                <ListRow icon="analytics-outline" title="Why does a number say Preliminary?" subtitle="Live signals can change before reconciliation" showChevron={false} />
                <Divider />
                <ListRow icon="cloud-outline" title="Where does analytics data come from?" subtitle="A read-only Open Cloud connection" showChevron={false} />
                <Divider />
                <ListRow icon="lock-closed-outline" title="Is my API key stored on my phone?" subtitle="No—the key remains on the server" showChevron={false} />
                <Divider />
                <ListRow icon="flask-outline" title="Is this using live data?" subtitle={appEnvironment.dataMode === 'aws_dev' ? 'Yes—official aggregate snapshots are clearly labeled' : 'No—this build uses clearly marked sample data'} showChevron={false} />
              </Card>
            </SettingSection>
          </>
        );

      case 'privacy':
        return (
          <>
            <InfoBanner
              icon="eye-off-outline"
              title="No player identity"
              body={appEnvironment.dataMode === 'aws_dev' ? 'The active Roblox connection supplies aggregate creator analytics only. Buyer-level events are not configured.' : 'Sample live events carry product and amount—not player names or identities.'}
              tone="green"
            />
            <SettingSection title="What the app can use">
              <Card>
                <CheckRow>Your OAuth creator identity.</CheckRow>
                <Divider />
                <CheckRow>Aggregate, read-only analytics for selected universes.</CheckRow>
                <Divider />
                <CheckRow>{appEnvironment.dataMode === 'aws_dev' ? 'Signed product-sale events only if you configure the optional server integration.' : 'Sample signed product-sale events without player identity.'}</CheckRow>
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
            <StudioText tone="muted" size={11} lineHeight={16} style={styles.finePrint}>{appEnvironment.dataMode === 'aws_dev' ? 'Connected mode · OAuth identifies the creator, while the Open Cloud key remains encrypted on the backend.' : 'Sample mode · This build does not connect to a production service.'}</StudioText>
          </>
        );

      case 'about':
        return (
          <>
            <Card style={styles.aboutCard}>
              <Image
                accessibilityLabel="Roblox Analytics logo"
                contentFit="cover"
                source={require('@/assets/images/roblox-analytics-logo.png')}
                style={styles.appIcon}
              />
              <StudioText weight="bold" size={26}>roblox-analytics-mobile</StudioText>
              <StudioText tone="muted" size={13}>Creator analytics at a glance</StudioText>
              <Badge label={appEnvironment.dataMode === 'aws_dev' ? 'CONNECTED BUILD' : 'SAMPLE BUILD'} tone={appEnvironment.dataMode === 'aws_dev' ? 'green' : 'blue'} />
            </Card>
            <SettingSection title="Build">
              <Card>
                <KeyValueRow label="Version" value="0.1" />
                <KeyValueRow label="Platform" value="Expo · React Native" />
                <KeyValueRow label="Data mode" value={appEnvironment.dataMode === 'aws_dev' ? 'Read-only Roblox analytics' : 'Read-only sample'} valueTone={appEnvironment.dataMode === 'aws_dev' ? 'green' : 'blue'} />
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

function CompactHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.compactHeader}>
      <Pressable hitSlop={10} onPress={() => router.back()}><StudioText tone="blue" weight="medium" size={13}>‹  More</StudioText></Pressable>
      <StudioText weight="semibold" size={23}>{title}</StudioText>
      <StudioText tone="muted" size={10}>{subtitle}</StudioText>
    </View>
  );
}

function TinyBadge({ label, tone }: { label: string; tone: 'blue' | 'green' | 'yellow' | 'red' }) {
  const palette = {
    blue: { bg: colors.blueSoft, fg: '#86A0FF' },
    green: { bg: colors.greenSoft, fg: colors.green },
    yellow: { bg: colors.yellowSoft, fg: colors.yellow },
    red: { bg: colors.redSoft, fg: colors.red },
  }[tone];
  return <View style={[styles.tinyBadge, { backgroundColor: palette.bg }]}><View style={[styles.tinyBadgeDot, { backgroundColor: palette.fg }]} /><StudioText weight="semibold" size={8} style={{ color: palette.fg }}>{label}</StudioText></View>;
}

function CompactSection({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <View style={styles.compactSection}><StudioText tone="muted" weight="medium" size={8}>{title}</StudioText>{children}</View>;
}

function CompactRow({ label, value, tone = 'primary', chevron = false }: { label: string; value?: string; tone?: 'primary' | 'muted' | 'blue' | 'green' | 'yellow' | 'red'; chevron?: boolean }) {
  return (
    <View style={styles.compactRow}>
      <StudioText tone={label === 'Display name' || label === 'Roblox username' || label === 'Identity status' || label === 'Time zone' || label === 'Currency' || label === 'Appearance' ? 'muted' : 'primary'} size={11}>{label}</StudioText>
      <View style={styles.compactRowValue}>{value ? <StudioText tone={tone} weight="medium" size={10}>{value}</StudioText> : null}{chevron ? <Ionicons name="chevron-forward" size={14} color={colors.textMuted} /> : null}</View>
    </View>
  );
}

function ProfileFigmaScreen() {
  const { preference } = useAppearancePreference();
  const [connection, setConnection] = useState<ConnectionStatus>();
  const [connectionError, setConnectionError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getStoredSessionToken();
        if (!token) throw new Error('Sign in with Roblox to verify your profile.');
        setConnection(await loadConnectionStatus({ universeId: '10009166512', sessionToken: token, signal: controller.signal }));
      } catch (error) {
        if (!controller.signal.aborted) setConnectionError(error instanceof Error ? error.message : 'Profile could not be loaded.');
      }
    })();
    return () => controller.abort();
  }, []);

  const username = connection?.identity.username ?? 'Roblox creator';
  const connected = Boolean(connection);
  const analyticsActive = connection?.analytics.status === 'active';

  const completeSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutOfRoblox();
      await resetOnboarding();
      router.replace('/onboarding');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your session could not be cleared from this device.';
      Alert.alert('Couldn’t sign out', message);
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'You’ll need to sign in with Roblox again to view your creator analytics.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void completeSignOut() },
      ],
    );
  };

  return (
    <Screen contentContainerStyle={styles.figmaScreen} footer={<PersistentTabBar active="more" />}>
      <CompactHeader title="Profile" subtitle="Creator identity and workspace settings" />
      <Card style={styles.identityCard}>
        <View style={styles.identityTop}>
          <View style={styles.identityAvatar}><Ionicons name="person-outline" size={19} color={colors.blue} /></View>
          <View style={styles.flex}><StudioText weight="semibold" size={15}>{username}</StudioText><StudioText tone="muted" size={10}>{connected ? `@${username}` : connectionError ?? 'Checking Roblox OAuth…'}</StudioText></View>
          <View style={styles.verifiedBadge}><StudioText tone={connected ? 'blue' : 'muted'} weight="semibold" size={8}>{connected ? 'VERIFIED' : 'CHECKING'}</StudioText></View>
        </View>
        <View style={styles.identityFooter}><View style={styles.connectedLabel}><View style={[styles.connectionDotSmall, !connected && { backgroundColor: colors.textMuted }]} /><StudioText tone="muted" size={10}>{connected ? 'Connected through Roblox OAuth' : 'OAuth verification pending'}</StudioText></View><StudioText tone={connected ? 'green' : 'muted'} weight="semibold" size={8}>{connected ? 'CONNECTED' : 'PENDING'}</StudioText></View>
      </Card>
      <CompactSection title="ACCOUNT DETAILS">
        <Card style={styles.compactGroup}>
          <CompactRow label="Roblox username" value={connected ? username : '—'} />
          <CompactRow label="Identity status" value={connected ? 'Connected' : 'Not verified'} tone={connected ? 'green' : 'yellow'} />
        </Card>
      </CompactSection>
      <CompactSection title="WORKSPACE">
        <Card style={styles.workspaceSummary}>
          <View style={styles.flex}><StudioText weight="semibold" size={13}>Most Words Win!</StudioText><StudioText tone="muted" size={10}>1 authorized experience</StudioText></View>
          <View style={styles.workspaceBadges}><StudioText tone={analyticsActive ? 'green' : 'muted'} weight="semibold" size={8}>{analyticsActive ? 'ANALYTICS ACTIVE' : 'AWAITING SYNC'}</StudioText></View>
        </Card>
      </CompactSection>
      <CompactSection title="PREFERENCES">
        <Card style={styles.compactGroup}>
          <CompactRow label="Time zone" value="America/Chicago" />
          <CompactRow label="Currency" value="Robux" />
          <CompactRow label="Appearance" value={appearanceLabel(preference)} />
        </Card>
      </CompactSection>
      <CompactSection title="ACCOUNT ACCESS">
        <Card style={styles.compactGroup}>
          <CompactRow label="Manage account" value="ROBLOX WEB" tone="blue" />
          <CompactRow label="Account exports" value="NOT AVAILABLE" tone="muted" />
        </Card>
      </CompactSection>
      <Card style={styles.readOnlyCard}><StudioText weight="semibold" size={12}>Read-only Roblox identity</StudioText><StudioText tone="muted" size={10}>roblox-analytics-mobile can read your profile, but cannot edit your Roblox account.</StudioText></Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out of Roblox"
        disabled={signingOut}
        onPress={confirmSignOut}
        style={({ pressed }) => [styles.signOutButton, (pressed || signingOut) && styles.pressed]}>
        <Ionicons name="log-out-outline" size={17} color={colors.red} />
        <StudioText tone="red" weight="semibold" size={12}>{signingOut ? 'Signing out…' : 'Sign out'}</StudioText>
      </Pressable>
    </Screen>
  );
}

function ConnectionCard({ title, subtitle, badge, tone, children }: React.PropsWithChildren<{ title: string; subtitle: string; badge: string; tone: 'blue' | 'green' | 'yellow' }>) {
  return (
    <Card style={styles.connectionCard}>
      <View style={styles.connectionCardHeader}><View style={styles.flex}><StudioText weight="semibold" size={14}>{title}</StudioText><StudioText tone="muted" size={10}>{subtitle}</StudioText></View><TinyBadge label={badge} tone={tone} /></View>
      <View style={styles.connectionDetails}>{children}</View>
    </Card>
  );
}

function ConnectionsFigmaScreen() {
  const [connection, setConnection] = useState<ConnectionStatus>();
  const [connectionError, setConnectionError] = useState<string>();
  const [connecting, setConnecting] = useState(false);
  const [refreshAttempt, setRefreshAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await getStoredSessionToken();
        if (!token) throw new Error('Sign in with Roblox to verify these connections.');
        setConnection(await loadConnectionStatus({
          universeId: '10009166512',
          sessionToken: token,
          signal: controller.signal,
        }));
      } catch (error) {
        if (!controller.signal.aborted) {
          setConnectionError(error instanceof Error ? error.message : 'Connection status could not be loaded.');
        }
      }
    })();
    return () => controller.abort();
  }, [refreshAttempt]);

  const connect = async () => {
    if (connecting) return;
    setConnecting(true);
    setConnectionError(undefined);
    try {
      await signInWithRoblox();
      setRefreshAttempt((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setConnectionError(message);
      Alert.alert('Couldn’t connect Roblox', message);
    } finally {
      setConnecting(false);
    }
  };

  const analyticsStatus = connection?.analytics.status;
  const analyticsBadge = analyticsStatus === 'active' ? 'ACTIVE' : analyticsStatus === 'error' ? 'NEEDS ATTENTION' : 'WAITING';
  const analyticsTone = analyticsStatus === 'active' ? 'green' : analyticsStatus === 'error' ? 'yellow' : 'blue';
  const updated = connection?.analytics.lastSyncedAt
    ? new Date(connection.analytics.lastSyncedAt).toLocaleString()
    : 'No completed sync yet';
  return (
    <Screen contentContainerStyle={styles.figmaScreen} footer={<PersistentTabBar active="more" />}>
      <CompactHeader title="Roblox connections" subtitle="Identity, analytics, and live event access" />
      <ConnectionCard title="Roblox identity" subtitle="OAuth PKCE · openid, profile" badge={connection ? 'CONNECTED' : 'NOT VERIFIED'} tone={connection ? 'green' : 'yellow'}><CompactRow label="Creator" value={connection?.identity.username ?? '—'} /><CompactRow label="Status" value={connectionError ?? (connection ? 'Verified' : 'Checking…')} tone={connection ? 'green' : 'muted'} /></ConnectionCard>
      {!connection ? <SettingButton label={connecting ? 'Connecting…' : 'Sign in with Roblox'} icon="log-in-outline" onPress={() => void connect()} /> : null}
      <ConnectionCard title="Open Cloud analytics" subtitle="1 allow-listed universe · server-side" badge={analyticsBadge} tone={analyticsTone}><CompactRow label="Last official sync" value={updated} /><CompactRow label="Scope" value="universe.analytics:read" tone="blue" /></ConnectionCard>
      <ConnectionCard title="Signed live events" subtitle="Optional real-time sales instrumentation" badge="NOT SET UP" tone="yellow"><CompactRow label="Enabled" value="No experiences" tone="muted" /><CompactRow label="Signing" value="Unavailable" /></ConnectionCard>
      <CompactSection title="PERMISSIONS"><Card style={styles.compactGroup}><CompactRow label="Creator identity" value={connection ? 'READ' : 'UNVERIFIED'} tone={connection ? 'green' : 'yellow'} /><CompactRow label="Aggregated analytics" value={analyticsStatus === 'active' ? 'READ' : 'WAITING'} tone={analyticsStatus === 'active' ? 'green' : 'yellow'} /><CompactRow label="Signed live events" value="DISABLED" tone="muted" /><CompactRow label="Game edits & Robux spend" value="BLOCKED" tone="red" /></Card></CompactSection>
      <CompactSection title="EXPERIENCE COVERAGE"><Card style={styles.compactGroup}><CompactRow label="Most Words Win!" value={analyticsStatus === 'active' ? 'OFFICIAL ANALYTICS' : 'AWAITING SYNC'} tone={analyticsStatus === 'active' ? 'green' : 'blue'} /></Card></CompactSection>
      <CompactSection title="CONNECTION ACTIVITY"><Card style={styles.compactGroup}><CompactRow label="Analytics refresh" value={updated} tone={analyticsStatus === 'active' ? 'green' : 'muted'} /><CompactRow label="Live delivery" value="Not configured" tone="muted" /></Card></CompactSection>
      <Card style={styles.securityTruth}><StudioText tone="muted" weight="medium" size={8}>SECURITY</StudioText><StudioText weight="semibold" size={12}>Keys stay backend-only</StudioText><StudioText tone="muted" size={9}>.ROBLOSECURITY is never requested or stored · OAuth PKCE · read-only analytics</StudioText></Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  coverageScreen: { paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: 14 },
  figmaScreen: { paddingTop: 7, paddingBottom: spacing.xxl, gap: 10 },
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
  coverageCard: { padding: 4, gap: 0, borderRadius: radii.md, overflow: 'hidden' },
  coverageRow: { minHeight: 58, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  coverageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  coverageDotMissing: { backgroundColor: colors.textFaint },
  coverageWebRow: { minHeight: 62, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7 },
  settingButton: { minHeight: 43, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.xs, backgroundColor: colors.blueSoft, marginTop: spacing.xs },
  profileCard: { alignItems: 'center', paddingVertical: spacing.xl },
  profileAvatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, borderWidth: 2, borderColor: '#8DA3FF' },
  profileCopy: { alignItems: 'center', gap: 4 },
  heroSettingCard: { alignItems: 'center', paddingVertical: spacing.xl },
  heroSettingIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  appearancePreview: { backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
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
  zeroGapCard: { gap: 0 },
  exportPreviewTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  securityScoreCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  securityRing: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: colors.greenBorder },
  helpHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  helpIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  aboutCard: { alignItems: 'center', paddingVertical: spacing.xl },
  appIcon: { width: 88, height: 88, borderRadius: 20, marginBottom: spacing.xs },
  centerText: { textAlign: 'center' },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xxl },
  compactHeader: { gap: 1, paddingBottom: 1 },
  tinyBadge: { minWidth: 70, height: 22, paddingHorizontal: 10, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tinyBadgeDot: { width: 5, height: 5, borderRadius: 3 },
  compactSection: { gap: 5 },
  compactGroup: { padding: 0, gap: 0, overflow: 'hidden' },
  compactRow: { minHeight: 35, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  compactRowValue: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  identityCard: { height: 82, padding: 11, gap: 6 },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  verifiedBadge: { minWidth: 64, height: 22, borderRadius: 11, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  identityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 5 },
  connectedLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  connectionDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  workspaceSummary: { minHeight: 69, padding: 11, flexDirection: 'row', alignItems: 'center' },
  workspaceBadges: { alignItems: 'flex-end', gap: 8 },
  readOnlyCard: { minHeight: 58, padding: 11, gap: 2, backgroundColor: colors.backgroundRaised },
  signOutButton: { minHeight: 44, borderRadius: radii.md, borderWidth: 1, borderColor: colors.redBorder, backgroundColor: colors.redSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  connectionCard: { minHeight: 124, padding: 11, gap: 7 },
  connectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectionDetails: { borderRadius: 9, overflow: 'hidden', backgroundColor: colors.backgroundRaised },
  securityTruth: { gap: 2, backgroundColor: colors.backgroundRaised },
});
