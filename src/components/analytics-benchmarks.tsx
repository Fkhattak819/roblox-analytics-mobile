import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { RobloxBenchmark } from '@/src/data/roblox-benchmarks';
import { Card, StudioText } from '@/src/components/ui';
import { colors } from '@/src/theme/tokens';

export function AnalyticsBenchmarkCarousel({
  benchmarks,
}: {
  benchmarks: readonly RobloxBenchmark[];
}) {
  return (
    <ScrollView
      horizontal
      decelerationRate="fast"
      snapToInterval={318}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}>
      {benchmarks.map((benchmark) => <AnalyticsBenchmarkCard key={benchmark.id} benchmark={benchmark} />)}
    </ScrollView>
  );
}

export function AnalyticsBenchmarkCard({ benchmark }: { benchmark: RobloxBenchmark }) {
  const markerPosition = Math.max(1.5, Math.min(98, benchmark.percentile));
  const percentileLabel = ordinal(benchmark.percentile);
  const changeColor = benchmark.direction === 'positive' ? colors.green : colors.textSecondary;
  const changeBackground = benchmark.direction === 'positive' ? '#173827' : '#343740';

  return (
    <Card
      accessibilityLabel={`${benchmark.title}. ${benchmark.value}. ${benchmark.change}. ${percentileLabel} percentile. Median ${benchmark.median}. 90th percentile ${benchmark.topDecile}.`}
      style={styles.card}>
      <View style={styles.titleRow}>
        <StudioText tone="secondary" weight="semibold" size={14} numberOfLines={2} style={styles.title}>
          {benchmark.title}
        </StudioText>
        <Ionicons name="information-circle-outline" size={20} color={colors.text} />
      </View>

      <View style={styles.valueRow}>
        <StudioText weight="bold" size={25}>{benchmark.value}</StudioText>
        <View style={[styles.changePill, { backgroundColor: changeBackground }]}>
          <StudioText weight="medium" size={13} style={{ color: changeColor }}>{benchmark.change}</StudioText>
        </View>
      </View>

      <View style={styles.scale}>
        <StudioText weight="semibold" size={13} style={[styles.percentile, { left: `${markerPosition}%` }]}>
          {percentileLabel}
        </StudioText>
        <View style={styles.trackRow}>
          <View style={[styles.trackSegment, { flex: 5 }]} />
          <View style={[styles.trackSegment, { flex: 4 }]} />
          <View style={[styles.trackSegment, { flex: 1 }]} />
        </View>
        <View style={[styles.trackFill, { width: `${benchmark.percentile}%`, backgroundColor: benchmark.accent }]} />
        <View style={[styles.markerHalo, { left: `${markerPosition}%` }]}>
          <View style={styles.marker} />
        </View>
        <BenchmarkCallout left="50%" label="50th" value={benchmark.median} />
        <BenchmarkCallout left="90%" label="90th" value={benchmark.topDecile} />
      </View>
    </Card>
  );
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function BenchmarkCallout({ left, label, value }: { left: `${number}%`; label: string; value: string }) {
  return (
    <View style={[styles.callout, { left }]}>
      <View style={styles.calloutPointer} />
      <StudioText tone="secondary" weight="semibold" size={13}>{label}</StudioText>
      <StudioText tone="secondary" weight="semibold" size={13}>{value}</StudioText>
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: { gap: 10, paddingRight: 18 },
  card: { width: 308, height: 212, padding: 15, borderRadius: 13, backgroundColor: '#111216', borderColor: '#34363D' },
  titleRow: { minHeight: 39, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  scale: { height: 102, marginTop: 7 },
  percentile: { position: 'absolute', top: 0, width: 58, marginLeft: -27, textAlign: 'center' },
  trackRow: { position: 'absolute', left: 0, right: 0, top: 28, height: 8, flexDirection: 'row', gap: 6 },
  trackSegment: { height: 8, borderRadius: 5, backgroundColor: '#5A5B63' },
  trackFill: { position: 'absolute', left: 0, top: 28, height: 8, borderRadius: 5 },
  markerHalo: { position: 'absolute', top: 21, width: 22, height: 22, marginLeft: -11, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  marker: { width: 16, height: 16, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#BFC2C8' },
  callout: { position: 'absolute', top: 55, width: 76, minHeight: 43, marginLeft: -38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191A1F' },
  calloutPointer: { position: 'absolute', top: -5, width: 10, height: 10, transform: [{ rotate: '45deg' }], backgroundColor: '#191A1F' },
});
