import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LineChart } from '@/src/components/charts';
import { Card, StudioText } from '@/src/components/ui';
import { colors, radii, spacing } from '@/src/theme/tokens';
import { metricTrendColor } from '@/src/utils/metric-trend';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type AnalyticsDropdownOption = {
  label: string;
  selected?: boolean;
  onSelect: () => void;
};

export function AnalyticsSectionHeader({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <StudioText weight="bold" size={19}>{title}</StudioText>
      {detail ? <StudioText tone="muted" weight="medium" size={11}>{detail}</StudioText> : null}
    </View>
  );
}

export function AnalyticsFilterBar({
  dateLabel,
  filterLabel,
  breakdownLabel,
  compareEnabled,
  dateOptions,
  filterOptions,
  breakdownOptions,
  onDatePress,
  onFilterPress,
  onBreakdownPress,
  onComparePress,
}: {
  dateLabel: string;
  filterLabel?: string;
  breakdownLabel?: string;
  compareEnabled?: boolean;
  dateOptions?: AnalyticsDropdownOption[];
  filterOptions?: AnalyticsDropdownOption[];
  breakdownOptions?: AnalyticsDropdownOption[];
  onDatePress: () => void;
  onFilterPress?: () => void;
  onBreakdownPress?: () => void;
  onComparePress?: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}>
      <FilterButton icon="calendar-clear-outline" label={dateLabel} onPress={onDatePress} options={dateOptions} emphasized />
      {onFilterPress ? <FilterButton icon="filter-outline" label={filterLabel ?? 'Filter by'} onPress={onFilterPress} options={filterOptions} /> : null}
      {onBreakdownPress ? <FilterButton icon="layers-outline" label={breakdownLabel ?? 'Breakdown: None'} onPress={onBreakdownPress} options={breakdownOptions} /> : null}
      {onComparePress ? (
        <FilterButton
          icon="git-compare-outline"
          label={compareEnabled ? 'Previous period' : 'Compare'}
          onPress={onComparePress}
          options={[
            {
              label: 'No comparison',
              selected: !compareEnabled,
              onSelect: () => { if (compareEnabled) onComparePress(); },
            },
            {
              label: 'Previous period',
              selected: compareEnabled,
              onSelect: () => { if (!compareEnabled) onComparePress(); },
            },
          ]}
          selected={compareEnabled}
        />
      ) : null}
    </ScrollView>
  );
}

function FilterButton({
  icon,
  label,
  onPress,
  options,
  emphasized = false,
  selected = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  options?: AnalyticsDropdownOption[];
  emphasized?: boolean;
  selected?: boolean;
}) {
  const buttonRef = useRef<View>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number }>();
  const menuWidth = Math.min(240, windowWidth - 24);
  const estimatedMenuHeight = 48 + (options?.length ?? 0) * 44;
  const menuLeft = anchor ? Math.max(12, Math.min(anchor.x, windowWidth - menuWidth - 12)) : 12;
  const menuTop = anchor ? Math.max(12, Math.min(anchor.y, windowHeight - estimatedMenuHeight - 12)) : 12;

  const openMenu = () => {
    if (!options?.length) {
      onPress();
      return;
    }
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y: y + height + 6, width });
    });
  };

  return (
    <>
      <Pressable
        ref={buttonRef}
        accessibilityRole="button"
        accessibilityLabel={`${label}, dropdown`}
        accessibilityState={{ expanded: Boolean(anchor) }}
        onPress={openMenu}
        style={({ pressed }) => [
          styles.filterButton,
          emphasized && styles.filterButtonEmphasized,
          selected && styles.filterButtonSelected,
          pressed && styles.pressed,
        ]}>
        <Ionicons name={icon} size={14} color={emphasized || selected ? colors.text : colors.textSecondary} />
        <StudioText weight="medium" size={12} numberOfLines={1}>{label}</StudioText>
        <Ionicons name={anchor ? 'chevron-up' : 'chevron-down'} size={11} color={colors.textMuted} />
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setAnchor(undefined)}
        statusBarTranslucent
        transparent
        visible={Boolean(anchor)}>
        <Pressable accessibilityLabel="Close dropdown" onPress={() => setAnchor(undefined)} style={styles.dropdownBackdrop}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.dropdownMenu, { left: menuLeft, top: menuTop, width: menuWidth }]}>
            <StudioText tone="muted" weight="semibold" size={9} style={styles.dropdownTitle}>{label.toUpperCase()}</StudioText>
            {options?.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: option.selected }}
                onPress={() => {
                  option.onSelect();
                  setAnchor(undefined);
                }}
                style={({ pressed }) => [
                  styles.dropdownOption,
                  option.selected && styles.dropdownOptionSelected,
                  pressed && styles.pressed,
                ]}>
                <StudioText weight={option.selected ? 'semibold' : 'medium'} size={13}>{option.label}</StudioText>
                {option.selected ? <Ionicons name="checkmark" size={16} color={colors.blue} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function AnalyticsMetricCard({
  label,
  value,
  delta,
  direction,
}: {
  label: string;
  value: string;
  delta?: string;
  direction?: 'positive' | 'negative' | 'neutral';
}) {
  const displayDelta = normalizeAnalyticsDelta(delta);
  const deltaColor = metricTrendColor(displayDelta, direction);

  return (
    <Card style={styles.metricCard}>
      <StudioText tone="muted" weight="medium" size={9} numberOfLines={1}>{label.toUpperCase()}</StudioText>
      <StudioText weight="semibold" size={23} numberOfLines={1} adjustsFontSizeToFit>{value}</StudioText>
      {displayDelta ? <StudioText weight="medium" size={10} style={{ color: deltaColor }}>{displayDelta}</StudioText> : null}
    </Card>
  );
}

function normalizeAnalyticsDelta(delta?: string): string | undefined {
  if (!delta) return undefined;
  const percentage = Number(delta.replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(percentage) && Math.abs(percentage) >= 10_000) return 'New vs previous period';
  return delta;
}

export function AnalyticsLegend({
  items,
}: {
  items: { label: string; color: string; dashed?: boolean }[];
}) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: item.color }, item.dashed && styles.legendLineDashed]} />
          <StudioText tone="muted" size={10}>{item.label}</StudioText>
        </View>
      ))}
    </View>
  );
}

export function AnalyticsChartCard({
  title,
  value,
  summary,
  values,
  comparisonValues,
  color = colors.blue,
  labels,
  pointTimes,
  yAxisLabels,
  showComparison = true,
  emptyMessage,
}: {
  title: string;
  value?: string;
  summary?: string;
  values: number[];
  comparisonValues?: number[];
  color?: string;
  labels: string[];
  pointTimes?: string[];
  yAxisLabels?: string[];
  showComparison?: boolean;
  emptyMessage?: string;
}) {
  const hasValues = values.length > 0;
  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.flex}>
          <StudioText weight="semibold" size={15}>{title}</StudioText>
          {summary ? <StudioText tone="muted" size={10}>{summary}</StudioText> : null}
        </View>
        <StudioText tone="blue" weight="semibold" size={11}>Explore ›</StudioText>
      </View>
      {value ? <StudioText weight="semibold" size={24}>{value}</StudioText> : null}
      {hasValues ? (
        <>
          <LineChart
            values={values}
            comparisonValues={showComparison ? comparisonValues : undefined}
            labels={labels}
            pointLabels={pointTimes?.map(formatChartPointTime)}
            formatValue={(pointValue) => formatAnalyticsPointValue(pointValue, value)}
            yAxisLabels={yAxisLabels}
            color={color}
            height={154}
            fillArea={false}
            showLastDot={false}
          />
          <AnalyticsLegend items={[
            { label: showComparison && comparisonValues ? 'Total (current)' : 'Total', color },
            ...(showComparison && comparisonValues ? [{ label: 'Previous period', color: colors.textMuted, dashed: true }] : []),
          ]} />
        </>
      ) : (
        <View style={styles.chartEmpty}>
          <Ionicons name="analytics-outline" size={24} color={colors.textFaint} />
          <StudioText tone="muted" size={12}>{emptyMessage ?? 'No data for selected period.'}</StudioText>
        </View>
      )}
    </Card>
  );
}

function formatChartPointTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

function formatAnalyticsPointValue(pointValue: number, displayValue?: string) {
  if (displayValue?.includes('%')) return `${pointValue.toFixed(2)}%`;
  if (displayValue?.startsWith('R$')) return `R$ ${formatExactNumber(pointValue)}`;
  if (/\bmin\b/i.test(displayValue ?? '')) return `${formatExactNumber(pointValue)} min`;
  if (/\bms\b/i.test(displayValue ?? '')) return `${formatExactNumber(pointValue)} ms`;
  return formatExactNumber(pointValue);
}

function formatExactNumber(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

export function AnalyticsDataStatus({
  live = false,
  text,
  label,
}: {
  live?: boolean;
  text: string;
  label?: string;
}) {
  return (
    <View style={styles.statusCard}>
      <View style={[styles.statusDot, { backgroundColor: live ? colors.green : colors.yellow }]} />
      <StudioText tone="secondary" size={10} style={styles.flex}>{text}</StudioText>
      <StudioText weight="semibold" size={9} style={{ color: live ? colors.green : colors.yellow }}>
        {label ?? (live ? 'OFFICIAL' : 'SAMPLE')}
      </StudioText>
    </View>
  );
}

export function AnalyticsEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <Card style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={25} color={colors.blue} />
      </View>
      <StudioText weight="semibold" size={18}>{title}</StudioText>
      <StudioText tone="muted" size={12} lineHeight={18} style={styles.emptyCopy}>{description}</StudioText>
      {action ? (
        <View style={styles.emptyAction}>
          <StudioText tone="blue" weight="semibold" size={12}>{action}</StudioText>
        </View>
      ) : null}
    </Card>
  );
}

export function AnalyticsLoadingSkeleton() {
  const reduceMotion = useReducedMotion();
  const pulseOpacity = useSharedValue(0.52);

  useEffect(() => {
    if (reduceMotion) {
      pulseOpacity.value = 0.72;
      return;
    }

    pulseOpacity.value = 0.52;
    const segment = { duration: 500, easing: Easing.inOut(Easing.ease) };
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, segment),
        withTiming(0.52, segment),
        withTiming(1, segment),
        withTiming(0.52, segment),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(pulseOpacity);
  }, [pulseOpacity, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  return (
    <Animated.View
      accessibilityLabel="Loading official Roblox analytics"
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.loadingStack, pulseStyle]}>
      <SkeletonSectionHeader />
      <View style={styles.loadingMetricGrid}>
        {Array.from({ length: 4 }).map((_, index) => <SkeletonMetricCard key={index} />)}
      </View>
      <SkeletonChartCard tall />
      <SkeletonSectionHeader />
      <SkeletonChartCard />
      <SkeletonSectionHeader />
      <SkeletonChartCard />
    </Animated.View>
  );
}

function SkeletonSectionHeader() {
  return (
    <View style={styles.loadingSectionHeader}>
      <View style={[styles.ghostBlock, styles.loadingSectionTitle]} />
      <View style={[styles.ghostAccent, styles.loadingSectionAction]} />
    </View>
  );
}

function SkeletonMetricCard() {
  return (
    <View style={styles.loadingMetric}>
      <View style={[styles.ghostMuted, styles.loadingMetricLabel]} />
      <View style={[styles.ghostBlock, styles.loadingMetricValue]} />
      <View style={[styles.ghostAccent, styles.loadingMetricDelta]} />
    </View>
  );
}

function SkeletonChartCard({ tall = false }: { tall?: boolean }) {
  return (
    <View style={[styles.loadingChart, tall && styles.loadingChartTall]}>
      <View style={[styles.ghostBlock, styles.loadingChartTitle]} />
      <View style={[styles.ghostBlock, styles.loadingChartValue]} />
      <View style={styles.loadingColumns}>
        {[18, 31, 44, 57, 70, 83, 96].map((height, index) => (
          <View
            key={height}
            style={[
              index >= 5 ? styles.ghostAccent : styles.ghostMuted,
              styles.loadingColumn,
              { height },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function AnalyticsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card style={styles.errorState}>
      <View style={styles.errorIcon}>
        <Ionicons name="cloud-offline-outline" size={24} color={colors.red} />
      </View>
      <StudioText weight="semibold" size={17}>Analytics unavailable</StudioText>
      <StudioText tone="muted" size={12} lineHeight={18} style={styles.emptyCopy}>{message}</StudioText>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry analytics" onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <StudioText weight="semibold" size={12}>Retry</StudioText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  filterRow: { gap: 8, paddingRight: 18 },
  filterButton: {
    height: 38,
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
  },
  filterButtonEmphasized: { backgroundColor: colors.surfaceSoft, borderColor: colors.borderStrong },
  filterButtonSelected: { backgroundColor: colors.blueSoft, borderColor: colors.blueBorder },
  dropdownBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.08)' },
  dropdownMenu: {
    position: 'absolute',
    padding: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.modalSurface,
    shadowColor: colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  dropdownTitle: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: 5 },
  dropdownOption: { minHeight: 42, paddingHorizontal: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dropdownOptionSelected: { backgroundColor: colors.selectedSurface },
  metricCard: { flex: 1, minWidth: 0, height: 94, padding: 11, gap: 5, borderRadius: 9 },
  chartCard: { padding: 14, gap: 9, borderRadius: 10 },
  chartHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 13, height: 2, borderRadius: 1 },
  legendLineDashed: { opacity: 0.65 },
  chartEmpty: { height: 116, alignItems: 'center', justifyContent: 'center', gap: 8 },
  statusCard: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundRaised,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { minHeight: 230, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 9 },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { textAlign: 'center' },
  emptyAction: { height: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radii.sm, backgroundColor: colors.blueSoft, marginTop: 3 },
  loadingStack: { gap: 14 },
  ghostBlock: { backgroundColor: colors.skeleton },
  ghostMuted: { backgroundColor: colors.skeletonMuted },
  ghostAccent: { backgroundColor: colors.skeletonAccent },
  loadingSectionHeader: { height: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loadingSectionTitle: { width: 108, height: 13, borderRadius: 6 },
  loadingSectionAction: { width: 43, height: 8, borderRadius: 4 },
  loadingMetricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  loadingMetric: { width: '48%', height: 104, padding: 12, gap: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  loadingMetricLabel: { width: 72, height: 8, borderRadius: 4 },
  loadingMetricValue: { width: 102, height: 22, borderRadius: 7 },
  loadingMetricDelta: { width: 58, height: 7, borderRadius: 4 },
  loadingChart: { height: 174, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  loadingChartTall: { height: 190 },
  loadingChartTitle: { width: 102, height: 10, borderRadius: 5 },
  loadingChartValue: { width: 126, height: 18, marginTop: 12, borderRadius: 7 },
  loadingColumns: { position: 'absolute', left: 14, right: 14, bottom: 27, height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  loadingColumn: { flex: 1, borderRadius: 5 },
  errorState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, borderRadius: radii.md },
  errorIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.redSoft },
  retryButton: { minWidth: 92, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.blue },
});
