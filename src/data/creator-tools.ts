import type { AnalyticsSectionId } from '@/domain/analytics';
import navigation from './creator-hub-navigation.json';

export const creatorTools = navigation;
export const creatorToolGroups = [...new Set(navigation.map((item) => item.group))];
const nativeSections: Record<string, AnalyticsSectionId> = {
  'analytics/engagement': 'engagement', 'analytics/retention': 'retention',
  'analytics/acquisition': 'acquisition', 'analytics/audience': 'audience',
  'analytics/economy': 'economy', 'analytics/funnels': 'funnels',
  'monetization/overview': 'monetization', 'analytics/performance': 'performance',
  'analytics/memory-stores': 'memory-stores', 'analytics/data-stores': 'data-stores',
  'analytics/speech-to-text': 'speech-to-text', 'analytics/text-to-speech': 'text-to-speech',
  'safety/overview': 'safety',
};
export function nativeCreatorSection(path: string) { return nativeSections[path]; }
export function creatorHubUrl(universeId: string, path: string): string | undefined {
  if (!/^[1-9]\d*$/.test(universeId) || !creatorTools.some((tool) => tool.path === path)) return undefined;
  return `https://create.roblox.com/dashboard/creations/experiences/${universeId}/${path}`;
}
