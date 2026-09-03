import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { StudioText } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme/tokens';

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
}) {
  const [width, setWidth] = useState(330);
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
  const gradientId = `line-fill-${color.replace('#', '')}`;
  const last = points.at(-1);
  const selected = selectedIndex === undefined || points.length === 0
    ? undefined
    : points[Math.max(0, Math.min(points.length - 1, Math.round(selectedIndex)))];

  return (
    <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((part) => (
          <Line
            key={part}
            x1={yAxisWidth}
            y1={chartHeight * part}
            x2={width}
            y2={chartHeight * part}
            stroke={colors.border}
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
              fill={colors.textFaint}
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
            y1={selected.y + 5}
            x2={selected.x}
            y2={chartHeight}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity={0.48}
          />
        ) : null}
        {comparisonPath ? <Path d={comparisonPath} fill="none" stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="5 5" opacity={0.85} /> : null}
        <Path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {selected ? <Circle cx={selected.x} cy={selected.y} r="4.2" fill={colors.surface} stroke={color} strokeWidth="2.2" /> : null}
        {showLastDot && last ? (
          <>
            <Circle cx={last.x} cy={last.y} r="5" fill={colors.surface} stroke={color} strokeWidth="2.5" />
            <Circle cx={last.x} cy={last.y} r="1.8" fill={color} />
          </>
        ) : null}
        {labels?.map((label, index) => {
          const x = yAxisWidth + 9 + (index / Math.max(1, labels.length - 1)) * (plotWidth - 18);
          return (
            <SvgText
              key={`${label}-${index}`}
              x={x}
              y={height - 2}
              fill={colors.textMuted}
              fontFamily={fonts.medium}
              fontSize="10"
              textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}>
              {label}
            </SvgText>
          );
        })}
      </Svg>
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
  const points = pointsFor(values, width, height, 3);
  return (
    <Svg width={width} height={height}>
      <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
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
              fill={color}
              opacity={0.45 + (index / values.length) * 0.5}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { gap: 14 },
  barItem: { gap: 7 },
  barLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barTrack: { height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  columnWrap: { overflow: 'hidden' },
});
