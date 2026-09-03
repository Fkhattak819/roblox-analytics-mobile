import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import {
  ImageSourcePropType,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  Text as NativeText,
  TextProps as NativeTextProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, contentMaxWidth, fonts, radii, shadow, spacing } from '@/src/theme/tokens';
import { metricTrendColor } from '@/src/utils/metric-trend';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';
type TextTone = 'primary' | 'secondary' | 'muted' | 'blue' | 'green' | 'yellow' | 'red';

const toneColors: Record<TextTone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  blue: colors.blue,
  green: colors.green,
  yellow: colors.yellow,
  red: colors.red,
};

export type StudioTextProps = NativeTextProps & {
  weight?: TextWeight;
  tone?: TextTone;
  size?: number;
  lineHeight?: number;
};

export function StudioText({
  weight = 'regular',
  tone = 'primary',
  size = 15,
  lineHeight,
  style,
  ...props
}: StudioTextProps) {
  return (
    <NativeText
      {...props}
      style={[
        {
          color: toneColors[tone],
          fontFamily: fonts[weight],
          fontSize: size,
          lineHeight: lineHeight ?? Math.round(size * 1.28),
        },
        style,
      ]}
    />
  );
}

type ScreenProps = React.PropsWithChildren<{
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps['refreshControl'];
  footer?: React.ReactNode;
}>;

export function Screen({ children, scroll = true, contentContainerStyle, refreshControl, footer }: ScreenProps) {
  const content = (
    <View style={[styles.screenContent, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : content}
      {footer}
    </SafeAreaView>
  );
}

const persistentTabs = [
  { key: 'home', label: 'Home', icon: 'home-outline' as IconName, route: '/(tabs)' as const },
  { key: 'experiences', label: 'Experiences', icon: 'image-outline' as IconName, route: '/(tabs)/experiences' as const },
  { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' as IconName, route: '/(tabs)/analytics' as const },
  { key: 'sales', label: 'Sales', icon: 'bag-handle-outline' as IconName, route: '/(tabs)/sales' as const },
  { key: 'more', label: 'More', icon: 'ellipsis-horizontal' as IconName, route: '/(tabs)/more' as const },
] as const;

export function PersistentTabBar({ active }: { active: 'home' | 'experiences' | 'analytics' | 'sales' | 'more' }) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.persistentTabSafeArea}>
      <View style={styles.persistentTabRow}>
        {persistentTabs.map((tab) => {
          const selected = tab.key === active;
          const color = selected ? colors.text : colors.textMuted;
          return (
            <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => router.replace(tab.route)} style={({ pressed }) => [styles.persistentTab, pressed && styles.pressed]}>
              <Ionicons name={tab.icon} size={19} color={color} />
              <StudioText weight={selected ? 'semibold' : 'regular'} size={9.5} style={{ color }}>{tab.label}</StudioText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export function PageHeader({
  title,
  subtitle,
  back = false,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderLeading}>
        {back ? (
          <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={() => router.back()} />
        ) : null}
        <View style={styles.flex}>
          <StudioText size={24} weight="bold">{title}</StudioText>
          {subtitle ? <StudioText tone="muted" size={13}>{subtitle}</StudioText> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export function PortfolioHeader({ title = 'Portfolio', subtitle = 'All experiences' }: { title?: string; subtitle?: string }) {
  return (
    <View style={styles.portfolioHeader}>
      <View>
        <StudioText size={26} weight="bold">{title}</StudioText>
        <StudioText tone="muted" size={13}>{subtitle}</StudioText>
      </View>
      <Pressable
        accessibilityLabel="Open account"
        onPress={() => router.push('/settings/account')}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
        <StudioText weight="bold" size={14}>FK</StudioText>
      </Pressable>
    </View>
  );
}

export function ExperienceHeader({
  image,
  name,
  creator,
  onPress,
}: {
  image?: ImageSourcePropType;
  name: string;
  creator?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.experienceHeader, pressed && styles.pressed]}>
      {image ? <Image source={image} style={styles.experienceHeaderImage} contentFit="cover" /> : (
        <View style={styles.allExperiencesIcon}><Ionicons name="grid" size={19} color={colors.blue} /></View>
      )}
      <View style={styles.flex}>
        <StudioText weight="semibold" size={16} numberOfLines={1}>{name}</StudioText>
        {creator ? <StudioText tone="muted" size={12} numberOfLines={1}>{creator}</StudioText> : null}
      </View>
      {onPress ? <Ionicons name="chevron-down" size={17} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}>) {
  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && styles.cardPressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.flex}>
        <StudioText weight="bold" size={19}>{title}</StudioText>
        {subtitle ? <StudioText tone="muted" size={12}>{subtitle}</StudioText> : null}
      </View>
      {action ? (
        <Pressable hitSlop={10} onPress={onAction}>
          <StudioText tone="blue" weight="semibold" size={13}>{action}</StudioText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function IconButton({ icon, onPress, accessibilityLabel }: { icon: IconName; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'blue' | 'green' | 'yellow' | 'red';
}) {
  const palette = {
    neutral: { background: colors.surfaceSoft, foreground: colors.textSecondary },
    blue: { background: colors.blueSoft, foreground: '#9DB0FF' },
    green: { background: colors.greenSoft, foreground: colors.green },
    yellow: { background: colors.yellowSoft, foreground: colors.yellow },
    red: { background: colors.redSoft, foreground: colors.red },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <StudioText weight="semibold" size={11} style={{ color: palette.foreground }}>{label}</StudioText>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  change,
  icon,
  accent = colors.blue,
  direction,
  children,
  onPress,
}: React.PropsWithChildren<{
  label: string;
  value: string;
  change?: string;
  icon?: IconName;
  accent?: string;
  direction?: 'positive' | 'negative' | 'neutral';
  onPress?: () => void;
}>) {
  return (
    <Card style={styles.metricCard} onPress={onPress}>
      <View style={styles.metricTop}>
        <StudioText tone="muted" weight="medium" size={12}>{label}</StudioText>
        {icon ? <Ionicons name={icon} size={16} color={accent} /> : null}
      </View>
      <StudioText weight="bold" size={24}>{value}</StudioText>
      {change ? <StudioText size={12} weight="semibold" style={{ color: metricTrendColor(change, direction) }}>{change}</StudioText> : null}
      {children}
    </Card>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  leading,
  danger = false,
  showChevron = true,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  leading?: React.ReactNode;
  danger?: boolean;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}>
      {leading ?? (icon ? <View style={styles.rowIcon}><Ionicons name={icon} size={19} color={danger ? colors.red : colors.textSecondary} /></View> : null)}
      <View style={styles.flex}>
        <StudioText size={15} weight="medium" style={danger ? { color: colors.red } : undefined}>{title}</StudioText>
        {subtitle ? <StudioText tone="muted" size={12}>{subtitle}</StudioText> : null}
      </View>
      {value ? <StudioText tone="secondary" size={13}>{value}</StudioText> : null}
      {showChevron && onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function ProgressBar({ value, color = colors.blue }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.max(0, Math.min(100, value))}%` }]} />
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmentedControl}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [styles.segment, selected && styles.segmentSelected, pressed && styles.pressed]}>
            <StudioText weight={selected ? 'semibold' : 'medium'} tone={selected ? 'primary' : 'muted'} size={13}>{option}</StudioText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const uiStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  cardsRow: { flexDirection: 'row', gap: spacing.sm },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  screenContent: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
    gap: spacing.lg,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.68 },
  pageHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pageHeaderLeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  portfolioHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue,
    borderWidth: 1,
    borderColor: '#88A0FF',
  },
  experienceHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  experienceHeaderImage: { width: 38, height: 38, borderRadius: radii.sm },
  allExperiencesIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: -8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 4 },
  metricCard: { flex: 1, minWidth: 0, minHeight: 94, padding: 12 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surfaceSoft },
  progressFill: { height: '100%', borderRadius: 4 },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentSelected: { backgroundColor: colors.surfaceSoft, ...shadow },
  persistentTabSafeArea: { backgroundColor: '#0B0D11', borderTopWidth: 1, borderTopColor: '#171A20' },
  persistentTabRow: { height: 49, flexDirection: 'row', alignItems: 'center' },
  persistentTab: { flex: 1, height: 49, alignItems: 'center', justifyContent: 'center', gap: 3 },
});
