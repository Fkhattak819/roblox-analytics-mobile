import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appEnvironment } from '@/services/backend-api';
import { StudioText } from '@/src/components/ui';
import { experienceArtwork, experiences } from '@/src/data/sample-data';
import { useApp } from '@/src/state/app-context';
import { colors, fonts } from '@/src/theme/tokens';

export default function ExperiencePickerScreen() {
  const { setSelectedExperienceId } = useApp();
  const [query, setQuery] = useState('');
  const [wideArtworkFailed, setWideArtworkFailed] = useState(false);
  const normalized = query.trim().toLowerCase();
  const isConnectedMode = appEnvironment.dataMode === 'aws_dev';
  const choices = useMemo(
    () => (isConnectedMode ? experiences.slice(0, 1) : experiences.slice(0, 2))
      .filter((item) => item.name.toLowerCase().includes(normalized)),
    [isConnectedMode, normalized],
  );

  const choose = (id: string | null) => {
    setSelectedExperienceId(id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.flex}>
          <StudioText weight="semibold" size={23}>Choose experience</StudioText>
          <StudioText tone="muted" size={13}>Switch the Analytics workspace</StudioText>
        </View>
        <Pressable accessibilityLabel="Close" onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={21} color={colors.textMuted} />
        <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder="Search experiences" placeholderTextColor={colors.textMuted} style={styles.searchInput} value={query} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {(!normalized || choices.some((item) => item.id === 'most-words-win')) ? (
          <>
            <SectionLabel>SELECTED EXPERIENCE</SectionLabel>
            <Pressable onPress={() => choose('most-words-win')} style={({ pressed }) => [styles.selectedCard, pressed && styles.pressed]}>
              <Image
                accessibilityLabel="Most Words Win game thumbnail"
                source={wideArtworkFailed ? experiences[0].image : experienceArtwork.mostWordsWinWide}
                resizeMode="cover"
                fadeDuration={0}
                onError={() => setWideArtworkFailed(true)}
                style={styles.heroArtwork}
              />
              <View style={styles.selectedInfo}>
                <Image source={experiences[0].image} resizeMode="cover" fadeDuration={0} style={styles.selectedIcon} />
                <View style={styles.flex}>
                  <StudioText weight="semibold" size={16}>Most Words Win!</StudioText>
                  <StudioText tone="muted" size={11} numberOfLines={1}>
                    {isConnectedMode ? 'Universe 10009166512 · Authorized' : 'BrainNourish · Public · 1,041 CCU'}
                  </StudioText>
                </View>
                <View style={styles.checkCircle}><Ionicons name="checkmark" size={19} color={colors.white} /></View>
              </View>
            </Pressable>
            {!isConnectedMode ? <SectionLabel style={styles.yourLabel}>YOUR EXPERIENCES</SectionLabel> : null}
          </>
        ) : null}

        {!isConnectedMode ? choices.filter((item) => item.id !== 'most-words-win').map((item) => (
          <Pressable key={item.id} onPress={() => choose(item.id)} style={({ pressed }) => [styles.choiceCard, pressed && styles.pressed]}>
            <View style={styles.initialTile}><StudioText weight="semibold" size={12}>FS</StudioText></View>
            <View style={styles.flex}>
              <StudioText weight="semibold" size={15}>Fling Squishies</StudioText>
              <StudioText tone="muted" size={11}>BrainNourish group · 243 CCU</StudioText>
            </View>
            <StudioText tone="green" weight="medium" size={11}>Healthy</StudioText>
          </Pressable>
        )) : null}

        {!isConnectedMode && !normalized ? (
          <Pressable onPress={() => choose(null)} style={({ pressed }) => [styles.choiceCard, pressed && styles.pressed]}>
            <View style={styles.gridTile}><Ionicons name="grid" size={22} color={colors.textSecondary} /></View>
            <View style={styles.flex}>
              <StudioText weight="semibold" size={15}>All experiences</StudioText>
              <StudioText tone="muted" size={11}>Portfolio view · 2 experiences</StudioText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children, style }: React.PropsWithChildren<{ style?: object }>) {
  return <StudioText tone="muted" weight="semibold" size={10} style={[styles.sectionLabel, style]}>{children}</StudioText>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.modalSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#6E7480', alignSelf: 'center', marginTop: 8 },
  header: { minHeight: 68, marginTop: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  searchField: { height: 44, marginHorizontal: 18, marginTop: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.controlSurface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 14, paddingVertical: 0 },
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 32, gap: 12 },
  sectionLabel: { letterSpacing: 0.1 },
  yourLabel: { marginTop: 15 },
  selectedCard: { borderWidth: 2, borderColor: colors.blue, borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  heroArtwork: { width: '100%', height: 176, backgroundColor: colors.surfaceSoft },
  selectedInfo: { minHeight: 76, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedIcon: { width: 50, height: 50, borderRadius: 8 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4675FF', alignItems: 'center', justifyContent: 'center' },
  choiceCard: { minHeight: 72, padding: 11, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  initialTile: { width: 48, height: 48, borderRadius: 9, backgroundColor: '#713979', alignItems: 'center', justifyContent: 'center' },
  gridTile: { width: 48, height: 48, borderRadius: 9, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
});
