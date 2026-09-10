import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Card, ExperienceHeader, PageHeader, Screen, StudioText } from '@/src/components/ui';
import { creatorHubUrl, creatorToolGroups, creatorTools, nativeCreatorSection } from '@/src/data/creator-tools';
import { useApp } from '@/src/state/app-context';
import { colors } from '@/src/theme/tokens';

export default function CreatorToolsScreen() {
  const { group: initialGroup } = useLocalSearchParams<{ group?: string }>();
  const [group, setGroup] = useState(creatorToolGroups.includes(initialGroup ?? '') ? initialGroup! : 'All');
  const [query, setQuery] = useState('');
  const { selectedWorkspaceExperience: experience } = useApp();
  const visible = creatorTools.filter((item) => (group === 'All' || item.group === group) && `${item.title} ${item.group}`.toLowerCase().includes(query.trim().toLowerCase()));
  const openWeb = async (path: string) => {
    const url = creatorHubUrl(experience.universeId, path);
    if (!url) { Alert.alert('Choose a Roblox experience', 'This sample experience has no Roblox universe linked. Select Most Words Win or a connected experience.'); return; }
    try { await WebBrowser.openBrowserAsync(url); } catch { Alert.alert('Could not open Creator Hub', 'Please try again when your browser is available.'); }
  };
  return <Screen contentContainerStyle={styles.screen}>
    <PageHeader title="Creator tools" subtitle="Your experience, from creation to growth" back />
    <ExperienceHeader image={experience.image} name={experience.name} creator={experience.creator} onPress={() => router.push('/experience-picker')} />
    <View style={styles.search}>
      <Ionicons name="search" size={19} color={colors.textMuted} />
      <TextInput accessibilityLabel="Search creator tools" placeholder="Search tools, analytics, settings…" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} style={styles.input} clearButtonMode="while-editing" autoCorrect={false} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {['All', ...creatorToolGroups].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: group === item }} onPress={() => setGroup(item)} style={[styles.chip, group === item && styles.selected]}><StudioText size={12} tone={group === item ? 'blue' : 'secondary'} weight="semibold">{item}</StudioText></Pressable>)}
    </ScrollView>
    <StudioText size={12} tone="muted">{visible.length} {visible.length === 1 ? 'tool' : 'tools'} · ↗ opens Roblox Creator Hub</StudioText>
    {creatorToolGroups.map((category) => {
      const items = visible.filter((item) => item.group === category);
      return items.length ? <View key={category} style={styles.group}>
        <StudioText size={20} weight="bold">{category}</StudioText>
        <Card style={styles.list}>{items.map((item, index) => {
          const section = item.group === 'Configure' ? undefined : nativeCreatorSection(item.path);
          return <View key={`${item.group}-${item.path}`} style={[styles.row, index > 0 && styles.divider]}>
            <Pressable accessibilityRole="button" onPress={() => item.path === 'overview' ? router.navigate('/(tabs)') : section ? router.push({ pathname: '/analytics/[section]', params: { section } }) : void openWeb(item.path)} style={styles.main}>
              <StudioText size={14} weight="medium">{item.title}</StudioText>
              <StudioText size={11} tone="muted">{section || item.path === 'overview' ? 'View in StudioPulse' : 'Open in Creator Hub'}</StudioText>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel={`Open ${item.title} in Roblox Creator Hub`} onPress={() => void openWeb(item.path)} style={styles.external}><Ionicons name="open-outline" size={17} color={colors.blue} /></Pressable>
          </View>;
        })}</Card>
      </View> : null;
    })}
    {!visible.length ? <Card><StudioText weight="semibold">No tools found</StudioText><StudioText tone="muted" size={13}>Try another search or select All.</StudioText></Card> : null}
  </Screen>;
}
const styles = StyleSheet.create({
  screen: { gap: 18, paddingTop: 8, paddingBottom: 40 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, minHeight: 48 },
  input: { flex: 1, minHeight: 48, color: colors.text, fontSize: 14 },
  chips: { gap: 8 }, chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 10 }, selected: { backgroundColor: colors.blueSoft },
  group: { gap: 12 }, list: { padding: 0, gap: 0 }, row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, padding: 16, gap: 4, minHeight: 68 }, external: { padding: 16, minWidth: 48, minHeight: 48 }, divider: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
});
