import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { StudioText } from '@/src/components/ui';
import { markOnboardingComplete } from '@/src/state/onboarding-storage';

const palette = {
  canvas: '#0B0D12',
  surface: '#11141A',
  surfaceRaised: '#181C24',
  subtle: '#222735',
  border: '#2A303B',
  borderStrong: '#333946',
  accent: '#5C80FF',
  accentText: '#89A0FF',
  primary: '#FFFFFF',
  secondary: '#8C929E',
  success: '#43D17D',
  successMuted: '#11271A',
  warning: '#F0B35D',
} as const;

const FRAME_WIDTH = 393;
const CONTENT_LEFT = 26;
const CONTENT_WIDTH = 340;
const WELCOME_PATH_LENGTH = 321.257;
const AnimatedPath = Animated.createAnimatedComponent(Path);

type OnboardingStep = 0 | 1 | 2 | 3 | 4;

export default function OnboardingScreen() {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set(['most-words-win']));

  const finish = async () => {
    try {
      await markOnboardingComplete();
    } finally {
      router.replace('/(tabs)');
    }
  };

  const goForward = () => {
    setStep((current) => Math.min(current + 1, 4) as OnboardingStep);
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0) as OnboardingStep);
  };

  const toggleExperience = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.viewport}>
      <View style={styles.canvas}>
        {Platform.OS === 'web' ? <WebSystemChrome /> : null}
        <Progress step={step} />
        {step > 0 && step < 4 ? <BackButton onPress={goBack} /> : null}

        {step === 0 ? (
          <WelcomeStep onPrimary={goForward} onSample={() => void finish()} />
        ) : null}
        {step === 1 ? (
          <IdentityStep onPrimary={goForward} onSample={() => void finish()} />
        ) : null}
        {step === 2 ? (
          <AnalyticsAccessStep onPrimary={goForward} onSample={() => void finish()} />
        ) : null}
        {step === 3 ? (
          <ChooseExperiencesStep
            selectedIds={selectedIds}
            onContinue={goForward}
            onSelectAll={() => setSelectedIds(new Set(['most-words-win', 'fling-squishies']))}
            onToggle={toggleExperience}
          />
        ) : null}
        {step === 4 ? (
          <ReadyStep
            selectedCount={selectedIds.size}
            onOpen={() => void finish()}
            onReview={() => setStep(1)}
          />
        ) : null}

        {Platform.OS === 'web' ? <View style={styles.homeIndicator} /> : null}
      </View>
    </View>
  );
}

function WebSystemChrome() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.dynamicIsland} />
      <StudioText weight="semibold" size={12} lineHeight={16} style={styles.statusTime}>9:41</StudioText>
      <StudioText weight="medium" size={11} lineHeight={15} style={styles.statusIcons}>{'●  ◒  ▰'}</StudioText>
    </View>
  );
}

function Progress({ step }: { step: OnboardingStep }) {
  return (
    <View accessibilityLabel={`Onboarding step ${step + 1} of 5`} style={styles.progress}>
      {[0, 1, 2, 3, 4].map((index) => (
        <View
          key={index}
          style={[styles.progressSegment, index <= step ? styles.progressSegmentActive : null]}
        />
      ))}
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.backHitArea, pressed ? styles.pressed : null]}>
      <Svg width={12} height={20} viewBox="0 0 12 20">
        <Path d="M10 2L2 10L10 18" fill="none" stroke={palette.primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} />
      </Svg>
    </Pressable>
  );
}

function RobloxMark({ top }: { top: number }) {
  return (
    <View style={[styles.robloxMark, { top }]}>
      <Svg width={66} height={66} viewBox="0 0 66 66">
        <Path
          clipRule="evenodd"
          d="M11 0L66 14L52 66L0 52L11 0ZM26 22L45 27L40 45L21 40L26 22Z"
          fill={palette.primary}
          fillRule="evenodd"
        />
      </Svg>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  primary,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  primary: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary ? styles.actionPrimary : styles.actionSecondary,
        disabled ? styles.actionDisabled : null,
        pressed && !disabled ? styles.actionPressed : null,
      ]}>
      <StudioText weight="semibold" size={14} style={styles.actionLabel}>{label}</StudioText>
    </Pressable>
  );
}

function Actions({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  disabled = false,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <View style={styles.primaryActionPosition}>
        <ActionButton disabled={disabled} label={primaryLabel} onPress={onPrimary} primary />
      </View>
      <View style={styles.secondaryActionPosition}>
        <ActionButton label={secondaryLabel} onPress={onSecondary} primary={false} />
      </View>
    </>
  );
}

function WelcomeStep({ onPrimary, onSample }: { onPrimary: () => void; onSample: () => void }) {
  return (
    <>
      <RobloxMark top={112} />
      <StudioText weight="semibold" size={11} lineHeight={15} style={[styles.eyebrow, { top: 202 }]}>ROBLOX CREATOR ANALYTICS</StudioText>
      <StudioText weight="bold" size={30} lineHeight={36} style={[styles.heading, { top: 226 }]}>See your Roblox{`\n`}business clearly</StudioText>
      <StudioText size={15} lineHeight={22} style={[styles.bodyCopy, { top: 306 }]}>Player growth, retention, and revenue—together{`\n`}in one focused mobile workspace.</StudioText>
      <AnalyticsPreview />
      <Actions
        onPrimary={onPrimary}
        onSecondary={onSample}
        primaryLabel="Get started"
        secondaryLabel="Explore sample data"
      />
    </>
  );
}

function AnalyticsPreview() {
  return (
    <View style={styles.analyticsPreview}>
      <StudioText weight="semibold" size={10} style={styles.previewEyebrow}>SAMPLE INSIGHT</StudioText>
      <StudioText weight="semibold" size={16} style={styles.previewTitle}>Player activity is climbing</StudioText>
      <View style={styles.previewMetric}>
        <StudioText weight="bold" size={22} style={styles.metricValue}>12.8K DAU</StudioText>
        <StudioText weight="semibold" size={12} style={styles.metricChange}>↑ 6.2%</StudioText>
      </View>
      <AnimatedTrendChart />
    </View>
  );
}

function AnimatedTrendChart() {
  const reduceMotion = useReducedMotion();
  const timeline = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      timeline.value = 1;
      return undefined;
    }

    timeline.value = 0;
    timeline.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false,
    );

    return () => cancelAnimation(timeline);
  }, [reduceMotion, timeline]);

  const animatedPathProps = useAnimatedProps(() => {
    if (reduceMotion) return { strokeDashoffset: 0 };
    const segment = Math.min(timeline.value / 0.325, 1);
    const easeOut = 1 - Math.pow(1 - segment, 3);
    return { strokeDashoffset: WELCOME_PATH_LENGTH * (1 - easeOut) };
  });

  const animatedDotStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 1, transform: [{ scale: 1 }] };
    const value = timeline.value;
    const opacitySegment = Math.min(value / 0.275, 1);
    const opacity = 1 - Math.pow(1 - opacitySegment, 3);
    let scale = 0.8;

    if (value >= 0.275 && value < 0.45) {
      const part = (value - 0.275) / 0.175;
      const springLike = 1 - Math.pow(1 - part, 3);
      scale = 0.8 + (1.25 - 0.8) * springLike;
    } else if (value >= 0.45 && value < 0.625) {
      const part = (value - 0.45) / 0.175;
      const easeOut = 1 - Math.pow(1 - part, 3);
      scale = 1.25 + (1 - 1.25) * easeOut;
    } else if (value >= 0.625) {
      const part = (value - 0.625) / 0.375;
      const easeInOut = part < 0.5
        ? 2 * part * part
        : 1 - Math.pow(-2 * part + 2, 2) / 2;
      scale = 1 + 0.1 * easeInOut;
    }

    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={styles.previewChart}>
      {[18, 44, 70, 96].map((top) => <View key={top} style={[styles.chartGrid, { top }]} />)}
      <Svg height={112} width={308} viewBox="0 0 308 112">
        <G transform="translate(2 14)">
          <AnimatedPath
            animatedProps={animatedPathProps}
            d="M1.5002 81.5004C21.5002 78.5004 29.5002 69.5004 47.5002 71.5004C69.5002 74.5004 77.5002 57.5004 98.5002 59.5004C121.5 61.5004 130.5 42.5004 152.5 45.5004C178.5 49.5004 182.5 30.5004 209.5 33.5004C234.5 36.5004 244.5 15.5004 266.5 20.5004C282.5 23.5004 293.5 6.50039 305.5 1.50039"
            fill="none"
            stroke={palette.accentText}
            strokeDasharray={[WELCOME_PATH_LENGTH, WELCOME_PATH_LENGTH]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        </G>
      </Svg>
      <Animated.View style={[styles.chartDot, animatedDotStyle]} />
    </View>
  );
}

function IdentityStep({ onPrimary, onSample }: { onPrimary: () => void; onSample: () => void }) {
  return (
    <>
      <RobloxMark top={112} />
      <StudioText weight="semibold" size={11} lineHeight={15} style={[styles.eyebrow, { top: 202 }]}>SECURE ROBLOX SIGN-IN</StudioText>
      <StudioText weight="bold" size={29} lineHeight={35} style={[styles.heading, { top: 226 }]}>Connect your Roblox{`\n`}identity</StudioText>
      <StudioText size={15} lineHeight={22} style={[styles.bodyCopy, { top: 302 }]}>Sign in through Roblox to identify your account.{`\n`}Experience access comes from your analytics{`\n`}key.</StudioText>

      <View style={styles.permissionsCard}>
        <StudioText weight="semibold" size={14} lineHeight={19} style={styles.permissionsTitle}>What roblox-analytics-mobile receives</StudioText>
        <PermissionLine symbol="✓" title="Roblox profile" top={51} value="openid + profile" />
        <PermissionLine symbol="✓" title="Account identity" top={91} value="user ID + public profile" />
        <PermissionLine muted symbol="—" title="Never requested" top={131} value=".ROBLOSECURITY cookie" />
      </View>

      <StatusRow
        badge="CONNECTED"
        badgeTone="success"
        detail="OAuth + PKCE · profile only"
        dotColor={palette.success}
        title="Roblox identity"
        top={580}
      />
      <Actions
        onPrimary={onPrimary}
        onSecondary={onSample}
        primaryLabel="Continue with Roblox"
        secondaryLabel="Explore sample data"
      />
    </>
  );
}

function PermissionLine({
  symbol,
  title,
  top,
  value,
  muted = false,
}: {
  symbol: string;
  title: string;
  top: number;
  value: string;
  muted?: boolean;
}) {
  return (
    <>
      <StudioText weight="semibold" size={14} lineHeight={19} style={[styles.permissionSymbol, { top, color: muted ? palette.secondary : palette.success }]}>{symbol}</StudioText>
      <StudioText weight="semibold" size={13} lineHeight={18} style={[styles.permissionName, { top }]}>{title}</StudioText>
      <StudioText size={11} lineHeight={15} style={[styles.permissionValue, { top }]}>{value}</StudioText>
    </>
  );
}

function AnalyticsAccessStep({ onPrimary, onSample }: { onPrimary: () => void; onSample: () => void }) {
  return (
    <>
      <SecureAnalyticsVisual />
      <StudioText weight="semibold" size={11} lineHeight={15} style={[styles.eyebrow, { top: 256 }]}>ROBLOX OPEN CLOUD</StudioText>
      <StudioText weight="bold" size={29} lineHeight={35} style={[styles.heading, { top: 280 }]}>Add read-only analytics</StudioText>
      <StudioText size={15} lineHeight={22} style={[styles.bodyCopy, { top: 328 }]}>Create a key in Roblox Creator Hub, choose its{`\n`}universes, then add it here. It stays encrypted on{`\n`}the backend.</StudioText>

      <StatusRow
        badge="READ ONLY"
        badgeTone="accent"
        detail="universe.analytics:read"
        dotColor={palette.accentText}
        title="Analytics access"
        top={420}
      />

      <View style={styles.boundariesCard}>
        <BoundaryLine symbol="✓" text="Read-only aggregate metrics" top={17} />
        <BoundaryLine symbol="✓" text="Only universes selected for this key" top={57} />
        <BoundaryLine muted symbol="—" text="No raw per-player event store" top={97} />
      </View>

      <Actions
        onPrimary={onPrimary}
        onSecondary={onSample}
        primaryLabel="Set up analytics key"
        secondaryLabel="Explore sample data"
      />
    </>
  );
}

function SecureAnalyticsVisual() {
  return (
    <View style={styles.secureVisual}>
      {[30, 55, 80].map((top) => <View key={top} style={[styles.secureGrid, { top }]} />)}
      <Svg height={86} width={210} style={styles.secureLine} viewBox="0 0 210 86">
        <Path d="M2 73C26 69 31 57 54 61C78 65 84 42 108 47C131 51 142 29 164 34C185 39 194 18 208 13" fill="none" stroke={palette.accentText} strokeLinecap="round" strokeWidth={3} />
      </Svg>
      <View style={styles.encryptedKey}>
        <StudioText weight="bold" size={20} lineHeight={27} style={styles.encryptedDots}>•••</StudioText>
        <StudioText weight="semibold" size={9} lineHeight={12} style={styles.encryptedRead}>READ</StudioText>
      </View>
    </View>
  );
}

function BoundaryLine({ symbol, text, top, muted = false }: { symbol: string; text: string; top: number; muted?: boolean }) {
  return (
    <>
      <StudioText weight="semibold" size={14} lineHeight={19} style={[styles.boundarySymbol, { top, color: muted ? palette.secondary : palette.success }]}>{symbol}</StudioText>
      <StudioText size={13} lineHeight={18} style={[styles.boundaryText, { top }]}>{text}</StudioText>
    </>
  );
}

function ChooseExperiencesStep({
  selectedIds,
  onContinue,
  onSelectAll,
  onToggle,
}: {
  selectedIds: Set<string>;
  onContinue: () => void;
  onSelectAll: () => void;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <StudioText weight="semibold" size={11} lineHeight={15} style={[styles.eyebrow, { top: 118 }]}>AUTHORIZED BY YOUR KEY</StudioText>
      <StudioText weight="bold" size={29} lineHeight={35} style={[styles.heading, { top: 142 }]}>Choose experiences</StudioText>
      <StudioText size={15} lineHeight={22} style={[styles.bodyCopy, { top: 190 }]}>Select from the experiences authorized by your{`\n`}analytics key. You can change this later.</StudioText>

      <View style={styles.eligiblePill}>
        <StudioText weight="semibold" size={11} lineHeight={15} style={styles.eligibleText}>2 authorized experiences</StudioText>
      </View>

      <ExperienceCard
        id="most-words-win"
        meta="12.8K DAU · Authorized"
        name="Most Words Win!"
        onToggle={onToggle}
        selected={selectedIds.has('most-words-win')}
        top={296}
      />
      <ExperienceCard
        id="fling-squishies"
        meta="28.6% D1 · Authorized"
        name="Fling Squishies"
        onToggle={onToggle}
        selected={selectedIds.has('fling-squishies')}
        top={408}
      />

      <View style={styles.portfolioNote}>
        <StudioText weight="semibold" size={14} lineHeight={19} style={styles.portfolioTitle}>Portfolio view</StudioText>
        <StudioText size={12} lineHeight={18} style={styles.portfolioCopy}>Switch between authorized experiences without{`\n`}reconnecting.</StudioText>
        <View style={styles.portfolioTrack}><View style={styles.portfolioFill} /></View>
      </View>

      <Actions
        disabled={selectedIds.size === 0}
        onPrimary={onContinue}
        onSecondary={onSelectAll}
        primaryLabel={`Continue with ${selectedIds.size}`}
        secondaryLabel="Select all"
      />
    </>
  );
}

function ExperienceCard({
  id,
  meta,
  name,
  onToggle,
  selected,
  top,
}: {
  id: string;
  meta: string;
  name: string;
  onToggle: (id: string) => void;
  selected: boolean;
  top: number;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => onToggle(id)}
      style={({ pressed }) => [
        styles.experienceCard,
        { top },
        selected ? styles.experienceSelected : null,
        pressed ? styles.pressed : null,
      ]}>
      <ExperienceArt />
      <View style={styles.experienceCopy}>
        <StudioText weight="semibold" size={14} style={styles.experienceName}>{name}</StudioText>
        <StudioText size={11} style={styles.experienceMeta}>{meta}</StudioText>
      </View>
      <View style={[styles.selection, selected ? styles.selectionActive : null]}>
        {selected ? <StudioText weight="semibold" size={13} style={styles.selectionCheck}>✓</StudioText> : null}
      </View>
    </Pressable>
  );
}

function ExperienceArt() {
  return (
    <Svg height={70} width={70} viewBox="0 0 70 70">
      <Defs><ClipPath id="experience-art-clip"><Rect height={70} rx={12} width={70} /></ClipPath></Defs>
      <G clipPath="url(#experience-art-clip)">
        <Rect fill={palette.subtle} height={70} rx={12} width={70} />
        <Rect fill={palette.accent} height={42} width={70} />
        <Rect fill={palette.success} height={28} width={70} y={42} />
        <Rect fill={palette.surface} height={32} rx={3} width={18} x={10} y={24} />
        <Circle cx={55} cy={16} fill={palette.warning} r={7} />
      </G>
    </Svg>
  );
}

function ReadyStep({ selectedCount, onOpen, onReview }: { selectedCount: number; onOpen: () => void; onReview: () => void }) {
  return (
    <>
      <RobloxMark top={104} />
      <View style={styles.readyCheck}><StudioText weight="semibold" size={14} lineHeight={19} style={styles.readyCheckText}>✓</StudioText></View>
      <StudioText weight="semibold" size={11} lineHeight={15} style={[styles.eyebrow, styles.readyEyebrow]}>SETUP COMPLETE</StudioText>
      <StudioText weight="bold" size={24} lineHeight={30} style={[styles.heading, { top: 214 }]}>Your creator pulse is ready</StudioText>
      <StudioText size={14} lineHeight={20} style={[styles.bodyCopy, { top: 258 }]}>Review your connections, then open the roblox-analytics-mobile{`\n`}workspace.</StudioText>

      <StatusRow badge="CONNECTED" badgeTone="success" detail="fkhattak819 · connected" dotColor={palette.success} title="Roblox identity" top={316} />
      <StatusRow badge="READ ONLY" badgeTone="accent" detail={`${selectedCount} ${selectedCount === 1 ? 'universe' : 'universes'} · read only`} dotColor={palette.accentText} title="Analytics access" top={400} />
      <StatusRow badge="OPTIONAL" badgeTone="warning" detail="Available in Sales · optional" dotColor={palette.warning} title="Live sale alerts" top={484} />

      <View style={styles.workspacePreview}>
        <StudioText weight="semibold" size={11} lineHeight={15} style={styles.workspacePreviewTitle}>Sample workspace preview</StudioText>
        <PreviewMetric label="DAU" left={13} value="12.8K" />
        <PreviewMetric label="D1" left={118} value="28.6%" />
        <PreviewMetric label="Revenue" left={223} value="R$ 4.8K" />
      </View>

      <Actions onPrimary={onOpen} onSecondary={onReview} primaryLabel="Open roblox-analytics-mobile" secondaryLabel="Review setup" />
    </>
  );
}

function StatusRow({
  badge,
  badgeTone,
  detail,
  dotColor,
  title,
  top,
}: {
  badge: string;
  badgeTone: 'success' | 'accent' | 'warning';
  detail: string;
  dotColor: string;
  title: string;
  top: number;
}) {
  const badgePalette = {
    success: { backgroundColor: palette.successMuted, color: palette.success },
    accent: { backgroundColor: palette.subtle, color: palette.accentText },
    warning: { backgroundColor: palette.subtle, color: palette.warning },
  }[badgeTone];

  return (
    <View style={[styles.statusRow, { top }]}>
      <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
      <View style={styles.statusCopy}>
        <StudioText weight="semibold" size={14} style={styles.statusTitle}>{title}</StudioText>
        <StudioText size={11} style={styles.statusDetail}>{detail}</StudioText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: badgePalette.backgroundColor }]}>
        <StudioText weight="semibold" size={9} style={{ color: badgePalette.color }}>{badge}</StudioText>
      </View>
    </View>
  );
}

function PreviewMetric({ label, left, value }: { label: string; left: number; value: string }) {
  return (
    <View style={[styles.previewMetricColumn, { left }]}>
      <StudioText weight="bold" size={17} lineHeight={23} style={styles.previewMetricValue}>{value}</StudioText>
      <StudioText size={10} lineHeight={14} style={styles.previewMetricLabel}>{label}</StudioText>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: palette.canvas,
  },
  canvas: {
    width: '100%',
    maxWidth: FRAME_WIDTH,
    height: '100%',
    minHeight: 852,
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
    borderRadius: Platform.OS === 'web' ? 44 : 0,
    backgroundColor: palette.canvas,
  },
  pressed: { opacity: 0.7 },
  dynamicIsland: {
    position: 'absolute',
    top: 10,
    left: 134.5,
    width: 124,
    height: 36,
    borderRadius: 999,
    backgroundColor: palette.canvas,
  },
  statusTime: { position: 'absolute', top: 18, left: 25, color: palette.primary },
  statusIcons: { position: 'absolute', top: 18, left: 311, color: palette.primary },
  progress: {
    position: 'absolute',
    top: 62,
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressSegment: { width: 60, height: 4, borderRadius: 999, backgroundColor: palette.subtle },
  progressSegmentActive: { backgroundColor: palette.accent },
  backHitArea: {
    position: 'absolute',
    zIndex: 5,
    top: 80,
    left: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robloxMark: { position: 'absolute', left: 160, width: 72, height: 72, padding: 3 },
  eyebrow: { position: 'absolute', left: CONTENT_LEFT, color: palette.accentText },
  readyEyebrow: { top: 190, color: palette.success },
  heading: { position: 'absolute', left: CONTENT_LEFT, width: CONTENT_WIDTH, color: palette.primary },
  bodyCopy: { position: 'absolute', left: CONTENT_LEFT, width: CONTENT_WIDTH, color: palette.secondary },
  analyticsPreview: {
    position: 'absolute',
    top: 382,
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 230,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  previewEyebrow: { position: 'absolute', top: 16, left: 16, color: palette.accentText },
  previewTitle: { position: 'absolute', top: 42, left: 16, color: palette.primary },
  previewMetric: { position: 'absolute', top: 70, left: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metricValue: { color: palette.primary },
  metricChange: { marginTop: 1, color: palette.success },
  previewChart: { position: 'absolute', top: 101, left: 16, width: 308, height: 112, overflow: 'hidden' },
  chartGrid: { position: 'absolute', left: 0, width: 308, height: 1, backgroundColor: palette.border },
  chartDot: { position: 'absolute', top: 9, left: 301, width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accentText },
  primaryActionPosition: { position: 'absolute', top: 706, left: CONTENT_LEFT, width: CONTENT_WIDTH, height: 52 },
  secondaryActionPosition: { position: 'absolute', top: 770, left: CONTENT_LEFT, width: CONTENT_WIDTH, height: 52 },
  actionButton: { width: '100%', height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  actionPrimary: { backgroundColor: palette.accent },
  actionSecondary: { borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.surface },
  actionDisabled: { backgroundColor: palette.subtle },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  actionLabel: { color: palette.primary },
  permissionsCard: {
    position: 'absolute',
    top: 382,
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 182,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  permissionsTitle: { position: 'absolute', top: 15, left: 15, color: palette.primary },
  permissionSymbol: { position: 'absolute', left: 15 },
  permissionName: { position: 'absolute', left: 43, color: palette.primary },
  permissionValue: { position: 'absolute', left: 183, color: palette.secondary },
  statusRow: {
    position: 'absolute',
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 72,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  statusDot: { position: 'absolute', top: 31, left: 14, width: 10, height: 10, borderRadius: 5 },
  statusCopy: { position: 'absolute', top: 13, left: 36, width: 174, height: 44 },
  statusTitle: { color: palette.primary },
  statusDetail: { marginTop: 4, color: palette.secondary },
  statusBadge: { position: 'absolute', top: 23, left: 222, minHeight: 24, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  secureVisual: {
    position: 'absolute',
    top: 120,
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 118,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    backgroundColor: palette.subtle,
  },
  secureGrid: { position: 'absolute', left: 103, width: 210, height: 1, backgroundColor: palette.border },
  secureLine: { position: 'absolute', top: 16, left: 103 },
  encryptedKey: {
    position: 'absolute',
    top: 24,
    left: 19,
    width: 64,
    height: 68,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.accentText,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  encryptedDots: { position: 'absolute', top: 11, left: 14, color: palette.accentText },
  encryptedRead: { position: 'absolute', top: 38, left: 13, color: palette.secondary },
  boundariesCard: {
    position: 'absolute',
    top: 508,
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 150,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  boundarySymbol: { position: 'absolute', left: 15 },
  boundaryText: { position: 'absolute', left: 43, color: palette.primary },
  eligiblePill: {
    position: 'absolute',
    top: 248,
    left: CONTENT_LEFT,
    width: 180,
    height: 34,
    justifyContent: 'center',
    paddingLeft: 12,
    borderRadius: 999,
    backgroundColor: palette.subtle,
  },
  eligibleText: { color: palette.accentText },
  experienceCard: {
    position: 'absolute',
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 98,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  experienceSelected: { borderWidth: 2, borderColor: palette.accentText, padding: 13 },
  experienceCopy: { width: 190, height: 46, overflow: 'hidden', justifyContent: 'center', gap: 5 },
  experienceName: { color: palette.primary },
  experienceMeta: { color: palette.secondary },
  selection: { width: 24, height: 24, borderWidth: 1, borderColor: palette.border, borderRadius: 999, backgroundColor: palette.subtle },
  selectionActive: { borderColor: palette.accentText, backgroundColor: palette.accent },
  selectionCheck: { position: 'absolute', top: 2, left: 4, color: palette.primary },
  portfolioNote: {
    position: 'absolute',
    top: 526,
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 132,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  portfolioTitle: { position: 'absolute', top: 15, left: 15, color: palette.primary },
  portfolioCopy: { position: 'absolute', top: 41, left: 15, width: 300, color: palette.secondary },
  portfolioTrack: { position: 'absolute', top: 91, left: 15, width: 308, height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: palette.subtle },
  portfolioFill: { width: 186, height: 8, borderRadius: 999, backgroundColor: palette.accentText },
  readyCheck: {
    position: 'absolute',
    top: 146,
    left: 208,
    width: 30,
    height: 30,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: palette.canvas,
    borderRadius: 999,
    backgroundColor: palette.success,
  },
  readyCheckText: { position: 'absolute', top: 2, left: 6, color: palette.primary },
  workspacePreview: {
    position: 'absolute',
    top: 576,
    left: CONTENT_LEFT,
    width: CONTENT_WIDTH,
    height: 102,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: palette.surfaceRaised,
  },
  workspacePreviewTitle: { position: 'absolute', top: 11, left: 13, color: palette.accentText },
  previewMetricColumn: { position: 'absolute', top: 37, width: 96 },
  previewMetricValue: { color: palette.primary },
  previewMetricLabel: { marginTop: 3, color: palette.secondary },
  homeIndicator: { position: 'absolute', top: 837, left: 129.5, width: 134, height: 5, borderRadius: 999, backgroundColor: palette.primary },
});
