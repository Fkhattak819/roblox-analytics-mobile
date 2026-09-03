export type RobloxBenchmark = Readonly<{
  id: string;
  title: string;
  value: string;
  change: string;
  direction: 'positive' | 'negative' | 'neutral';
  percentile: number;
  median: string;
  topDecile: string;
  accent: string;
}>;

/**
 * Most Words Win benchmark values captured from the owner's Roblox Creator
 * Dashboard. These are intentionally separate from Open Cloud snapshots because
 * Roblox does not expose the benchmark comparison through the supported query API.
 */
export const mostWordsWinBenchmarks: readonly RobloxBenchmark[] = [
  { id: 'average-playtime', title: 'Average playtime (7 day average)', value: '7.3 min', change: '↑ 66.4%', direction: 'positive', percentile: 30, median: '9.2 min', topDecile: '18.5 min', accent: '#D7CD32' },
  { id: 'd1-retention', title: 'Day 1 retention (7 day average)', value: '7.34%', change: '↑ 157.1%', direction: 'positive', percentile: 49, median: '6.07%', topDecile: '11.45%', accent: '#8CC95E' },
  { id: 'd7-retention', title: 'Day 7 retention (7 day average)', value: '0.00%', change: '↓ 0.0%', direction: 'neutral', percentile: 3, median: '0.52%', topDecile: '2.03%', accent: '#F06C75' },
  { id: 'payer-cvr', title: 'Payer conversion rate (7 day average)', value: '0.00%', change: '↓ 100.0%', direction: 'neutral', percentile: 0, median: '0.45%', topDecile: '3.49%', accent: '#F06C75' },
  { id: 'arppu', title: 'Average revenue per paying user (7 day average)', value: 'R$ 0', change: '↓ 100.0%', direction: 'neutral', percentile: 0, median: 'R$ 27.2', topDecile: 'R$ 109.1', accent: '#F06C75' },
  { id: 'play-through-rate', title: 'Play through rate (7 day moving average)', value: '0.00%', change: '↓ 100.0%', direction: 'neutral', percentile: 60, median: '1.96%', topDecile: '4.42%', accent: '#85C965' },
];
