import React, { useCallback, useId, useMemo, useState } from 'react';
import { type GestureResponderEvent, StyleSheet, useColorScheme, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { StudioText } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme/tokens';

type RuntimeDynamicColor = {
  dynamic?: { light?: string | null; dark?: string | null };
};

function resolveSvgColor(value: string, scheme: 'light' | 'dark' | 'unspecified' | null | undefined) {
  const dynamic = (value as unknown as RuntimeDynamicColor)?.dynamic;
  return dynamic?.[scheme === 'dark' ? 'dark' : 'light'] ?? value;
}

function pointsFor(values: number[], width: number, height: number, inset = 8, domain = values) {
  const max = Math.max(...domain);
  const min = Math.min(...domain);
  const range = max - min || 1;
  return values.map((value, index) => ({
    x: inset + (index / Math.max(1, values.length - 1)) * (width - inset * 2),
    y: inset + (1 - (value - min) / range) * (height - inset * 2),
  }));
}

function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

export function LineChart({
  values,
  color = colors.blue,
  height = 150,
  labels,
  showLastDot = true,
  comparisonValues,
  selectedIndex,
  fillArea = true,
  dashedGrid = false,
  yAxisLabels,
  pointLabels,
  formatValue,
  seriesLabel = 'Current',
  comparisonLabel = 'Previous period',
}: {
  values: number[];
  color?: string;
  height?: number;
  labels?: string[];
  showLastDot?: boolean;
  comparisonValues?: number[];
  selectedIndex?: number;
  fillArea?: boolean;
  dashedGrid?: boolean;
  yAxisLabels?: string[];
  pointLabels?: string[];
  formatValue?: (value: number) => string;
  seriesLabel?: string;
  comparisonLabel?: string;
}) {
  const colorScheme = useColorScheme();
  const chartId = useId().replace(/:/g, '');
  const [width, setWidth] = useState(330);
  const [touchIndex, setTouchIndex] = useState<number>();
  const chartHeight = labels ? height - 24 : height;
  const yAxisWidth = yAxisLabels?.length ? 32 : 0;
  const plotWidth = Math.max(1, width - yAxisWidth);
  const comparisonDomain = useMemo(
    () => comparisonValues?.length ? [...values, ...comparisonValues] : values,
    [comparisonValues, values],
  );
  const points = useMemo(
    () => pointsFor(values, plotWidth, chartHeight, 9, comparisonDomain).map((point) => ({ ...point, x: point.x + yAxisWidth })),
    [chartHeight, comparisonDomain, plotWidth, values, yAxisWidth],
  );
  const linePath = useMemo(() => smoothPath(points), [points]);
  const comparisonPath = useMemo(
    () => comparisonValues ? smoothPath(pointsFor(comparisonValues, plotWidth, chartHeight, 9, comparisonDomain).map((point) => ({ ...point, x: point.x + yAxisWidth }))) : '',
    [chartHeight, comparisonDomain, comparisonValues, plotWidth, yAxisWidth],
  );
  const areaPath = points.length ? `${linePath} L ${points.at(-1)?.x} ${chartHeight} L ${points[0].x} ${chartHeight} Z` : '';
  // DynamicColorIOS values are native color objects at runtime, so gradient
  // identifiers must not be derived from the color value.
  const gradientId = `line-fill-${chartId}`;
  const lineColor = resolveSvgColor(color, colorScheme);
  const borderColor = resolveSvgColor(colors.border, colorScheme);
  const faintColor = resolveSvgColor(colors.textFaint, colorScheme);
  const mutedColor = resolveSvgColor(colors.textMuted, colorScheme);
  const surfaceColor = resolveSvgColor(colors.surface, colorScheme);
  const last = points.at(-1);
  const activeIndex = touchIndex ?? selectedIndex;
  const selected = activeIndex === undefined || points.length === 0
    ? undefined
    : points[Math.max(0, Math.min(points.length - 1, Math.round(activeIndex)))];
  const selectedPointIndex = selected ? points.indexOf(selected) : undefined;
  const interactive = Boolean(pointLabels?.length && values.length);
  const tooltipWidth = 146;
  const tooltipLeft = selected
    ? Math.max(0, Math.min(width - tooltipWidth, selected.x - tooltipWidth / 2))
    : 0;
  const tooltipTop = selected
    ? Math.max(2, Math.min(chartHeight - 68, selected.y < 66 ? selected.y + 12 : selected.y - 62))
    : 0;
  const displayValue = useCallback(
    (chartValue: number) => formatValue?.(chartValue) ?? (Number.isInteger(chartValue) ? chartValue.toLocaleString('en-US') : chartValue.toLocaleString('en-US', { maximumFractionDigits: 2 })),
    [formatValue],
  );
  const selectTouchPoint = useCallback((event: GestureResponderEvent) => {
    if (!interactive || values.length === 0) return;
    const plotStart = yAxisWidth + 9;
    const plotEnd = Math.max(plotStart, yAxisWidth + plotWidth - 9);
    const x = Math.max(plotStart, Math.min(plotEnd, event.nativeEvent.locationX));
    const ratio = plotEnd === plotStart ? 0 : (x - plotStart) / (plotEnd - plotStart);
    setTouchIndex(Math.round(ratio * Math.max(0, values.length - 1)));
  }, [interactive, plotWidth, values.length, yAxisWidth]);
  const moveAccessibleSelection = useCallback((direction: -1 | 1) => {
    if (!interactive || values.length === 0) return;
    setTouchIndex((current) => Math.max(0, Math.min(values.length - 1, (current ?? 0) + direction)));
  }, [interactive, values.length]);

  return (
    <View
      accessibilityActions={interactive ? [{ name: 'increment', label: 'Next data point' }, { name: 'decrement', label: 'Previous data point' }] : undefined}
      accessibilityHint={interactive ? 'Drag across the chart or swipe up and down with VoiceOver to inspect exact values.' : undefined}
      accessibilityLabel={interactive && selectedPointIndex !== undefined
        ? `${pointLabels?.[selectedPointIndex] ?? `Point ${selectedPointIndex + 1}`}, ${seriesLabel} ${displayValue(values[selectedPointIndex])}`
        : undefined}
      accessibilityRole={interactive ? 'adjustable' : undefined}
      onAccessibilityAction={interactive ? (event) => moveAccessibleSelection(event.nativeEvent.actionName === 'decrement' ? -1 : 1) : undefined}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onTouchMove={interactive ? selectTouchPoint : undefined}
      onTouchStart={interactive ? selectTouchPoint : undefined}
      style={{ height }}>
      <Svg pointerEvents="none" width="100%" height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.28} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((part) => (
          <Line
            key={part}
            x1={yAxisWidth}
            y1={chartHeight * part}
            x2={width}
            y2={chartHeight * part}
            stroke={borderColor}
            strokeWidth="1"
            strokeDasharray={dashedGrid ? '3 5' : undefined}
          />
        ))}
        {yAxisLabels?.map((label, index) => {
          const y = 10 + (index / Math.max(1, yAxisLabels.length - 1)) * (chartHeight - 18);
          return (
            <SvgText
              key={`${label}-${index}`}
              x="0"
              y={y}
              fill={faintColor}
              fontFamily={fonts.medium}
              fontSize="8">
              {label}
            </SvgText>
          );
        })}
        {fillArea ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
        {selected ? (
          <Line
            x1={selected.x}
            y1={0}
            x2={selected.x}
            y2={chartHeight}
            stroke={lineColor}
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity={0.48}
          />
        ) : null}
        {comparisonPath ? <Path d={comparisonPath} fill="none" stroke={mutedColor} strokeWidth="1.5" strokeDasharray="5 5" opacity={0.85} /> : null}
        <Path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {selected ? <Circle cx={selected.x} cy={selected.y} r="4.2" fill={surfaceColor} stroke={lineColor} strokeWidth="2.2" /> : null}
        {showLastDot && last ? (
          <>
            <Circle cx={last.x} cy={last.y} r="5" fill={surfaceColor} stroke={lineColor} strokeWidth="2.5" />
            <Circle cx={last.x} cy={last.y} r="1.8" fill={lineColor} />
          </>
        ) : null}
        {labels?.map((label, index) => {
          const x = yAxisWidth + 9 + (index / Math.max(1, labels.length - 1)) * (plotWidth - 18);
          return (
            <SvgText
              key={`${label}-${index}`}
              x={x}
              y={height - 2}
              fill={mutedColor}
              fontFamily={fonts.medium}
              fontSize="10"
              textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}>
              {label}
            </SvgText>
          );
        })}
      </Svg>
      {interactive && selected && selectedPointIndex !== undefined ? (
        <View pointerEvents="none" style={[styles.chartTooltip, { left: tooltipLeft, top: tooltipTop, width: tooltipWidth }]}>
          <StudioText tone="secondary" weight="medium" size={9} numberOfLines={1}>
            {pointLabels?.[selectedPointIndex] ?? `Point ${selectedPointIndex + 1}`}
          </StudioText>
          <View style={styles.tooltipValueRow}>
            <View style={[styles.tooltipDot, { backgroundColor: color }]} />
            <StudioText weight="semibold" size={11} numberOfLines={1}>{seriesLabel}</StudioText>
            <StudioText weight="semibold" size={11} style={styles.tooltipValue}>{displayValue(values[selectedPointIndex])}</StudioText>
          </View>
          {comparisonValues?.[selectedPointIndex] !== undefined ? (
            <View style={styles.tooltipValueRow}>
              <View style={[styles.tooltipDot, { backgroundColor: colors.textMuted }]} />
              <StudioText tone="secondary" size={10} numberOfLines={1}>{comparisonLabel}</StudioText>
              <StudioText tone="secondary" weight="semibold" size={10} style={styles.tooltipValue}>{displayValue(comparisonValues[selectedPointIndex])}</StudioText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function Sparkline({
  values,
  color = colors.green,
  height = 34,
  width = 92,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  const colorScheme = useColorScheme();
  const points = pointsFor(values, width, height, 3);
  return (
    <Svg width={width} height={height}>
      <Path d={smoothPath(points)} fill="none" stroke={resolveSvgColor(color, colorScheme)} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function HorizontalBars({
  items,
}: {
  items: { label: string; value: number; display: string; color?: string }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <View style={styles.bars}>
      {items.map((item) => (
        <View key={item.label} style={styles.barItem}>
          <View style={styles.barLabels}>
            <StudioText tone="secondary" size={13}>{item.label}</StudioText>
            <StudioText weight="semibold" size={13}>{item.display}</StudioText>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { backgroundColor: item.color ?? colors.blue, width: `${(item.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ColumnChart({ values, color = colors.blue, height = 120 }: { values: number[]; color?: string; height?: number }) {
  const colorScheme = useColorScheme();
  const barColor = resolveSvgColor(color, colorScheme);
  const max = Math.max(...values, 1);
  const width = 320;
  const gap = 6;
  const columnWidth = (width - gap * (values.length - 1)) / values.length;
  return (
    <View style={styles.columnWrap}>
      <Svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {values.map((value, index) => {
          const barHeight = Math.max(4, (value / max) * (height - 8));
          return (
            <Rect
              key={`${value}-${index}`}
              x={index * (columnWidth + gap)}
              y={height - barHeight}
              width={columnWidth}
              height={barHeight}
              rx="4"
              fill={barColor}
              opacity={0.45 + (index / values.length) * 0.5}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartTooltip: {
    position: 'absolute',
    zIndex: 5,
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 9,
    backgroundColor: colors.modalSurface,
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  tooltipValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tooltipDot: { width: 6, height: 6, borderRadius: 3 },
  tooltipValue: { marginLeft: 'auto' },
  bars: { gap: 14 },
  barItem: { gap: 7 },
  barLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barTrack: { height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  columnWrap: { overflow: 'hidden' },
});
