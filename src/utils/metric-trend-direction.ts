import type { AnalyticsDirection } from '@/domain/analytics';

export type MetricTrendDirection = 'positive' | 'negative' | 'neutral';

export function metricTrendDirection(change?: string, direction?: AnalyticsDirection): MetricTrendDirection {
  if (direction === 'positive') return 'positive';
  if (direction === 'negative') return 'negative';

  const normalized = change?.trim() ?? '';
  if (/^(?:↑|\+)/.test(normalized)) return 'positive';
  if (/^(?:↓|-)/.test(normalized)) return 'negative';
  return 'neutral';
}
