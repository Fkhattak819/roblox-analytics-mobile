import React, { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { StudioText } from '@/src/components/ui';
import { appEnvironment } from '@/services/backend-api';
import { useApp } from '@/src/state/app-context';
import { colors } from '@/src/theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const palette = {
  canvas: colors.background,
  surface: colors.surface,
  raised: colors.surfaceRaised,
  subtle: colors.surfaceSoft,
  border: colors.border,
  borderStrong: colors.borderStrong,
  accent: colors.blue,
  accentLine: colors.blue,
  text: colors.text,
  secondary: colors.textMuted,
  success: colors.green,
  warning: colors.yellow,
  onAccent: colors.white,
} as const;

const SALES_PATH = 'M1.5002 81.5004C21.5002 78.5004 29.5002 69.5004 47.5002 71.5004C69.5002 74.5004 77.5002 57.5004 98.5002 59.5004C121.5 61.5004 130.5 42.5004 152.5 45.5004C178.5 49.5004 182.5 30.5004 209.5 33.5004C234.5 36.5004 244.5 15.5004 266.5 20.5004C282.5 23.5004 293.5 6.50039 305.5 1.50039';

// Figma's authored spring-shaped linear easing samples for the dot's 550–900 ms segment.
const DOT_SPRING_SAMPLES = [
  0, 0.0188, 0.0679, 0.1374, 0.2195, 0.308, 0.3978, 0.4856, 0.5686, 0.6452,
  0.7142, 0.7753, 0.8283, 0.8735, 0.9113, 0.9423, 0.9671, 0.9866, 1.0014, 1.0123,
  1.0198, 1.0247, 1.0274, 1.0283, 1.0281, 1.0268, 1.025, 1.0227, 1.0202, 1.0177,
  1.0152, 1.0128, 1.0106, 1.0085, 1.0068, 1.0052, 1.0039, 1.0028, 1.0018, 1.0011,
  1.0005, 1, 0.9997, 0.9995, 0.9993, 0.9992, 0.9992, 0.9992, 0.9992, 0.9993,
  0.9993,
] as const;

function easeOut(value: number) {
  'worklet';
  return 1 - (1 - value) * (1 - value);
}

function easeInOut(value: number) {
  'worklet';
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function springSample(value: number) {
  'worklet';
  const bounded = Math.max(0, Math.min(1, value));
  const scaled = bounded * (DOT_SPRING_SAMPLES.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(DOT_SPRING_SAMPLES.length - 1, lower + 1);
  const amount = scaled - lower;
  return DOT_SPRING_SAMPLES[lower] + (DOT_SPRING_SAMPLES[upper] - DOT_SPRING_SAMPLES[lower]) * amount;
}

function AnimatedSalesChart() {
  const reduceMotion = useReducedMotion();
  const timeline = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      timeline.value = 1;
      return;
    }

    timeline.value = 0;
    timeline.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        withTiming(0, { duration: 1 }),
      ),
      -1,
      false,
    );

    return () => cancelAnimation(timeline);
  }, [reduceMotion, timeline]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: reduceMotion
      ? 0
      : interpolate(timeline.value, [0, 0.325, 1], [1000, 0, 0], Extrapolation.CLAMP),
  }));

  const dotStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ scale: 1 }] };

    const time = timeline.value;
    const opacity = interpolate(time, [0, 0.275, 1], [0, 1, 1], Extrapolation.CLAMP);
    let scale = 0.8;

    if (time > 0.275 && time <= 0.45) {
      const local = (time - 0.275) / 0.175;
      scale = 0.8 + 0.45 * springSample(local);
    } else if (time > 0.45 && time <= 0.625) {
      const local = (time - 0.45) / 0.175;
      scale = 1.25 + (1 - 1.25) * easeOut(local);
    } else if (time > 0.625) {
      const local = (time - 0.625) / 0.375;
      scale = 1 + 0.1 * easeInOut(local);
    }

    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={styles.chart} accessibilityLabel="Animated sample revenue trend">
      <Svg width="308" height="112" viewBox="0 0 308 112">
        {[18, 44, 70, 96].map((y) => (
          <Line key={y} x1="0" y1={y} x2="308" y2={y} stroke={palette.border} strokeWidth="1" />
        ))}
        <AnimatedPath
          animatedProps={lineProps}
          d={SALES_PATH}
          fill="none"
          stroke={palette.accentLine}
          strokeDasharray={[1000, 1000]}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          transform="translate(2 14) scale(0.9902 0.9638)"
        />
      </Svg>
      <Animated.View style={[styles.chartDot, dotStyle]} />
    </View>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'accent' | 'warning' | 'success' }) {
  return (
    <View style={[styles.statusPill, tone === 'success' && styles.statusPillConnected]}>
      <StudioText
        weight="semibold"
        size={9}
        lineHeight={12}
        style={tone === 'success' ? styles.connectedPillText : tone === 'warning' ? styles.warningPillText : styles.accentPillText}>
        {label}
      </StudioText>
    </View>
  );
}

export default function LiveSalesSetupScreen() {
  const { liveSalesAlertsEnabled, setLiveSalesAlertsEnabled } = useApp();
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/sales');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, Platform.OS === 'web' && styles.webContent]}
        showsVerticalScrollIndicator={false}>
        <Pressable accessibilityLabel="Go back" hitSlop={14} onPress={leave} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Svg width="12" height="20" viewBox="0 0 12 20">
            <Path d="M10 2L2 10L10 18" fill="none" stroke={palette.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />
          </Svg>
        </Pressable>

        <StudioText weight="semibold" size={11} lineHeight={15} style={styles.eyebrow}>OPTIONAL INTEGRATION</StudioText>
        <StudioText weight="bold" size={29} lineHeight={35} style={styles.title}>Add live sale alerts</StudioText>
        <StudioText size={15} lineHeight={22} style={styles.description}>
          Aggregate revenue is already available. Exact buyer-level alerts require an optional signed server receipt event.
        </StudioText>

        {!isConnectedMode ? <View style={styles.previewCard}>
          <StudioText weight="semibold" size={10} lineHeight={13} style={styles.previewEyebrow}>SAMPLE INSIGHT</StudioText>
          <StudioText weight="semibold" size={16} lineHeight={20} style={styles.previewTitle}>Monetization at a glance</StudioText>
          <View style={styles.metricRow}>
            <StudioText weight="bold" size={24} lineHeight={31}>R$ 4.8K</StudioText>
            <StudioText weight="semibold" size={12} lineHeight={15} style={styles.metricChange}>↑ 4.7%</StudioText>
          </View>
          <StudioText size={12} lineHeight={15} style={styles.metricNote}>Payer CVR 1.8% · ARPPU R$ 273</StudioText>
          <AnimatedSalesChart />
        </View> : null}

        <View style={styles.options}>
          <View style={[styles.optionCard, styles.optionCardActive]}>
            <View style={styles.activeRadio}><View style={styles.activeRadioDot} /></View>
            <StudioText weight="semibold" size={13} lineHeight={18} style={styles.optionTitle}>Aggregate sales analytics</StudioText>
            <StudioText size={11} lineHeight={16} style={styles.optionSubtitle}>Revenue, conversion, and payer metrics</StudioText>
            <StatusPill label="ACTIVE" tone="accent" />
          </View>

          <View style={[styles.optionCard, !isConnectedMode && liveSalesAlertsEnabled && styles.optionCardActive]}>
            <View style={[styles.inactiveRadio, !isConnectedMode && liveSalesAlertsEnabled && styles.activeRadio]}>
              {!isConnectedMode && liveSalesAlertsEnabled ? <View style={styles.activeRadioDot} /> : null}
            </View>
            <StudioText weight="semibold" size={13} lineHeight={18} style={styles.optionTitle}>Real-time sale alerts</StudioText>
            <StudioText size={11} lineHeight={16} style={styles.optionSubtitle}>Signed server receipt events</StudioText>
            <StatusPill
              label={!isConnectedMode && liveSalesAlertsEnabled ? 'CONNECTED' : isConnectedMode ? 'NOT CONFIGURED' : 'OPTIONAL'}
              tone={!isConnectedMode && liveSalesAlertsEnabled ? 'success' : 'warning'}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isConnectedMode}
          onPress={() => setLiveSalesAlertsEnabled(true)}
          style={({ pressed }) => [styles.primaryButton, isConnectedMode && styles.primaryButtonDisabled, pressed && !isConnectedMode && styles.primaryButtonPressed]}>
          <StudioText weight="semibold" size={14} lineHeight={18} style={styles.primaryButtonLabel}>
            {isConnectedMode ? 'Server integration required' : liveSalesAlertsEnabled ? 'Live alerts connected' : 'Set up live alerts'}
          </StudioText>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={leave} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
          <StudioText weight="semibold" size={14} lineHeight={18}>{isConnectedMode ? 'Done' : 'Not now'}</StudioText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingTop: 33, paddingHorizontal: 26, paddingBottom: 30, minHeight: 793 },
  webContent: { paddingTop: 92, minHeight: 852 },
  pressed: { opacity: 0.66 },
  backButton: { width: 12, height: 20, marginLeft: -6 },
  eyebrow: { color: palette.accentLine, marginTop: 4 },
  title: { marginTop: 9 },
  description: { color: palette.secondary, marginTop: 13, width: 340 },
  previewCard: {
    width: 340,
    height: 230,
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.raised,
  },
  previewEyebrow: { position: 'absolute', left: 16, top: 16, color: palette.accentLine },
  previewTitle: { position: 'absolute', left: 16, top: 42 },
  metricRow: { position: 'absolute', left: 16, top: 68, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metricChange: { color: palette.success, marginTop: 6 },
  metricNote: { position: 'absolute', left: 16, top: 108, color: palette.secondary },
  chart: { position: 'absolute', left: 16, top: 130, width: 308, height: 112, overflow: 'hidden' },
  chartDot: { position: 'absolute', left: 301, top: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accentLine },
  options: { gap: 10, marginTop: 18 },
  optionCard: {
    width: 340,
    height: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.raised,
  },
  optionCardActive: { borderWidth: 2, borderColor: palette.accentLine },
  activeRadio: {
    position: 'absolute',
    left: 12,
    top: 25,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: palette.accentLine,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.onAccent },
  inactiveRadio: {
    position: 'absolute',
    left: 13,
    top: 26,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.subtle,
  },
  optionTitle: { position: 'absolute', left: 48, top: 13 },
  optionSubtitle: { position: 'absolute', left: 48, top: 36, color: palette.secondary },
  statusPill: {
    position: 'absolute',
    right: 14,
    top: 12,
    minWidth: 62,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.subtle,
  },
  statusPillConnected: { backgroundColor: colors.greenSoft },
  accentPillText: { color: palette.accentLine },
  warningPillText: { color: palette.warning },
  connectedPillText: { color: palette.success },
  primaryButton: {
    width: 340,
    height: 52,
    marginTop: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
  },
  primaryButtonLabel: { color: palette.onAccent },
  primaryButtonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  primaryButtonDisabled: { backgroundColor: palette.subtle },
  secondaryButton: {
    width: 340,
    height: 52,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
});
