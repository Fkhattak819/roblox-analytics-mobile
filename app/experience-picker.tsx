import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge, Card, IconButton, PageHeader, Screen, StudioText } from '@/src/components/ui';
import { experiences } from '@/src/data/sample-data';
import { useApp } from '@/src/state/app-context';
import { colors, fonts, radii, spacing } from '@/src/theme/tokens';

const displayNames: Record<string, string> = {
  'most-words-win': 'Most Words Win!',
  'fling-squishies': 'Fling Squishies and People',
  'wiggles-park': "Wiggle’s Park",
};

export default function ExperiencePickerScreen() {
  const { selectedExperienceId, setSelectedExperienceId } = useApp();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = useMemo(() => experiences.filter((experience) =>
    `${displayNames[experience.id] ?? experience.name} ${experience.creator}`.toLocaleLowerCase().includes(normalizedQuery)), [normalizedQuery]);

  const choose = (id: string | null) => {
    setSelectedExperienceId(id);
    router.back();
  };

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <PageHeader
        title="Choose experience"
        subtitle="Portfolio scope"
        right={<IconButton icon="close" accessibilityLabel="Close experience picker" onPress={() => router.back()} />}
      />

      <View style={styles.contextRow}>
        <Badge label="SAMPLE DATA" tone="blue" />
        <StudioText tone="muted" size={12}>Changes only what this read-only preview displays.</StudioText>
      </View>

      <View style={styles.searchField}>
        <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search experiences"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <Pressable accessibilityLabel="Clear search" hitSlop={9} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {!normalizedQuery ? (
        <Card onPress={() => choose(null)} accessibilityLabel="Show all experiences" style={styles.pickerCard}>
          <View style={styles.allIcon}>
            <Ionicons name="grid" size={20} color={colors.blue} />
          </View>
          <View style={styles.itemText}>
            <StudioText weight="semibold" size={15}>All experiences</StudioText>
            <StudioText tone="muted" size={12}>5 connected games · portfolio view</StudioText>
          </View>
          {!selectedExperienceId ? <Ionicons name="checkmark-circle" size={22} color={colors.blue} /> : null}
        </Card>
      ) : null}

      <View style={styles.list}>
        {filtered.map((experience) => {
          const selected = experience.id === selectedExperienceId;
          return (
            <Card
              key={experience.id}
              onPress={() => choose(experience.id)}
              accessibilityLabel={`Choose ${displayNames[experience.id] ?? experience.name}`}
              style={[styles.pickerCard, selected && styles.selectedCard]}>
              <Image source={experience.image} style={styles.gameImage} contentFit="cover" />
              <View style={styles.itemText}>
                <StudioText weight="semibold" size={15} numberOfLines={1}>{displayNames[experience.id] ?? experience.name}</StudioText>
                <StudioText tone="muted" size={12} numberOfLines={1}>{experience.creator}</StudioText>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.blue} /> : <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />}
            </Card>
          );
        })}
      </View>

      {!filtered.length ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={24} color={colors.textMuted} />
          <StudioText weight="semibold">No matching experiences</StudioText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: spacing.lg, paddingTop: 3 },
  contextRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  searchField: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, paddingVertical: 0, color: colors.text, fontFamily: fonts.regular, fontSize: 14 },
  list: { gap: 9 },
  pickerCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  selectedCard: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  allIcon: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  gameImage: { width: 46, height: 46, borderRadius: 10 },
  itemText: { flex: 1, gap: 2 },
  emptyState: { alignItems: 'center', gap: 9, paddingVertical: spacing.xxl },
});
