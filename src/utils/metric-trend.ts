import type { AnalyticsDirection } from '@/domain/analytics';
import { colors } from '@/src/theme/tokens';
import { metricTrendDirection } from '@/src/utils/metric-trend-direction';

export function metricTrendColor(change?: string, direction?: AnalyticsDirection): string {
  const trend = metricTrendDirection(change, direction);
  if (trend === 'positive') return colors.green;
  if (trend === 'negative') return colors.red;
  return colors.textMuted;
}
