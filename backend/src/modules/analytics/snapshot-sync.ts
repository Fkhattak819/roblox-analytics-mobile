import type {
  AnalyticsChart,
  AnalyticsDateRange,
  AnalyticsDirection,
  AnalyticsMetric,
  AnalyticsSectionId,
  AnalyticsSnapshot,
} from '../../../../contracts/src/analytics.js';
import {
  RobloxAnalyticsQueryClient,
  RobloxAnalyticsQueryError,
  type AnalyticsGranularity,
  type AnalyticsSeries as RobloxAnalyticsSeries,
} from './roblox-analytics-query.js';
import type { AnalyticsSnapshotStore } from './snapshot-store.js';

type MetricFormat = 'count' | 'percent' | 'minutes' | 'hours' | 'robux' | 'bytes';
type MetricAggregation = 'latest' | 'average' | 'sum';
type MetricPlan = Readonly<{
  id: string;
  robloxMetric: string;
  label: string;
  format: MetricFormat;
  aggregation: MetricAggregation;
  goodWhen: 'up' | 'down' | 'neutral';
  summaryGranularity?: AnalyticsGranularity;
}>;

const sectionMetricPlans: Partial<Record<AnalyticsSectionId, readonly MetricPlan[]>> = {
  overview: [
    metric('daily-active-users', 'DailyActiveUsers', 'Daily active users', 'count', 'latest'),
    metric('average-playtime', 'AveragePlayTimeMinutesPerDAU', 'Average playtime', 'minutes', 'latest'),
    metric('forward-d1-retention', 'ForwardD1Retention', 'Day 1 retention', 'percent', 'latest'),
    metric('daily-revenue', 'DailyRevenue', 'Daily revenue', 'robux', 'latest'),
  ],
  engagement: [
    metric('daily-active-users', 'DailyActiveUsers', 'Daily active users', 'count', 'latest'),
    metric('average-playtime', 'AveragePlayTimeMinutesPerDAU', 'Average playtime', 'minutes', 'latest'),
    metric('total-playtime', 'TotalPlayTimeHours', 'Total playtime', 'hours', 'sum'),
    metric('average-session-time', 'AverageSessionLengthMinutes', 'Average session time', 'minutes', 'latest'),
    metric('monthly-active-users', 'MonthlyActiveUsers', 'Monthly active users', 'count', 'latest'),
    metric('sessions', 'Visits', 'Sessions', 'count', 'sum'),
  ],
  retention: [
    metric('forward-d1-retention', 'ForwardD1Retention', 'Day 1 retention', 'percent', 'latest'),
    metric('forward-d7-retention', 'ForwardD7Retention', 'Day 7 retention', 'percent', 'latest'),
    metric('forward-d30-retention', 'ForwardD30Retention', 'Day 30 retention', 'percent', 'latest'),
    metric('dau-mau-stickiness', 'DauMauStickiness', 'Stickiness (DAU/MAU)', 'percent', 'latest'),
  ],
  monetization: [
    metric('daily-revenue', 'DailyRevenue', 'Daily Robux spent', 'robux', 'average'),
    metric('paying-users', 'PayingUsers', 'Paying users', 'count', 'latest'),
    metric('payer-cvr', 'PayingUsersCVR', 'Payer conversion rate', 'percent', 'latest'),
    metric('arppu', 'AverageRevenuePerPayingUser', 'ARPPU', 'robux', 'latest'),
    metric('arpdau', 'AverageRevenuePerUser', 'ARPDAU', 'robux', 'latest'),
  ],
  acquisition: [
    metric('impressions', 'UniqueUsersWithImpressions', 'Users with impressions', 'count', 'latest', 'up', 'None'),
    metric('clicks', 'UniqueUsersWithClicks', 'Users with clicks', 'count', 'latest', 'up', 'None'),
    metric('users-with-plays', 'UniqueUsersWithPlaySessions', 'Users with plays', 'count', 'latest', 'up', 'None'),
    metric('qualified-plays', 'QualifiedUniqueUsersWithPlaySessions', 'Qualified users with plays', 'count', 'latest', 'up', 'None'),
  ],
  performance: [
    metric('peak-ccu', 'PeakConcurrentPlayers', 'Peak concurrent players', 'count', 'latest'),
    metric('client-crash-rate', 'ClientCrashRate15m', 'Client crash rate', 'percent', 'latest', 'down'),
    metric('client-fps-p10', 'ClientFpsP10', 'Client FPS P10', 'count', 'latest'),
    metric('client-memory', 'ClientMemoryUsageAvg', 'Client memory usage', 'bytes', 'latest', 'down'),
    metric('oom-exits', 'OomUnexpectedExits', 'OOM exits', 'count', 'sum', 'down'),
    metric('server-cpu', 'CpuTimeAvg', 'Server CPU time', 'count', 'latest', 'down'),
  ],
  economy: [
    metric('wallet-balance', 'EconomyAverageWalletBalance', 'Average wallet balance', 'count', 'latest'),
    metric('transaction-amount', 'EconomyTransactionAmount', 'Transaction amount', 'count', 'sum'),
    metric('transaction-count', 'EconomyTransactionCount', 'Transactions', 'count', 'sum'),
  ],
  thumbnails: [
    metric('thumbnail-impressions', 'ThumbnailImpressions', 'Thumbnail impressions', 'count', 'sum'),
    metric('thumbnail-qualified-plays', 'ThumbnailQualifiedPlays', 'Thumbnail qualified plays', 'count', 'sum'),
    metric('thumbnail-qualified-ptr', 'ThumbnailQualifiedPTR', 'Thumbnail qualified PTR', 'percent', 'latest'),
  ],
  advertising: [
    metric('ad-impressions', 'AdsPublisherReportingTotalImpressions', 'Ad impressions', 'count', 'sum'),
    metric('ad-revenue', 'AdsPublisherReportingTotalRevenueRobux', 'Ad revenue', 'robux', 'sum'),
  ],
  matchmaking: [
    metric('estimated-ping', 'MatchmakingSignalsEstimatePingAvg', 'Estimated ping', 'count', 'latest', 'down'),
    metric('occupancy', 'MatchmakingSignalsOccupancyRatioAvg', 'Occupancy ratio', 'percent', 'latest'),
  ],
  'data-stores': [
    metric('data-store-requests', 'DataStoreRequests', 'Data Store requests', 'count', 'sum'),
    metric('data-store-storage', 'DataStoreStorageUsageBytes', 'Storage usage', 'bytes', 'latest'),
  ],
  'memory-stores': [
    metric('memory-store-requests', 'MemoryStoreRequests', 'Memory Store requests', 'count', 'sum'),
    metric('memory-store-usage', 'MemoryStoreMemoryUsageBytes', 'Memory usage', 'bytes', 'latest'),
  ],
  'speech-to-text': [
    metric('speech-to-text-usage', 'SpeechToTextTranscriptionUsage', 'Transcription usage', 'count', 'sum'),
  ],
  'text-to-speech': [
    metric('text-to-speech-successes', 'TextToSpeechRawAudioSuccesses', 'Audio successes', 'count', 'sum'),
    metric('text-to-speech-errors', 'TextToSpeechRawAudioErrors', 'Audio errors', 'count', 'sum', 'down'),
  ],
  safety: [
    metric('abuse-reports', 'TotalAbuseReports', 'Abuse reports', 'count', 'sum', 'down'),
    metric('unique-reporters', 'UniqueAbuseReportSubmittersPer1000PlaytimeHours', 'Unique reporters per 1K hours', 'count', 'latest', 'down'),
  ],
};

export const syncableAnalyticsSectionIds = Object.freeze(
  Object.keys(sectionMetricPlans) as AnalyticsSectionId[],
);

export function isSyncableAnalyticsSection(value: AnalyticsSectionId): boolean {
  return syncableAnalyticsSectionIds.includes(value);
}

type SyncOptions = Readonly<{
  apiKey: string;
  ownerSub: string;
  universeId: string;
  section: AnalyticsSectionId;
  range: AnalyticsDateRange;
  now?: Date;
}>;

export class AnalyticsSnapshotSyncService {
  constructor(
    private readonly queryClient: RobloxAnalyticsQueryClient,
    private readonly store: AnalyticsSnapshotStore,
    private readonly sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ) {}

  async sync(options: SyncOptions): Promise<AnalyticsSnapshot> {
    const plans = sectionMetricPlans[options.section];
    if (!plans?.length) {
      throw new Error(`Analytics section ${options.section} requires a section-specific dimension configuration`);
    }
    const window = queryWindow(options.range, options.now ?? new Date());
    const granularity = granularityFor(options.range);

    const projected = await Promise.all(plans.map(async (plan) => {
      const [current, previous] = await Promise.all([
        this.queryWithRetry(options, plan, granularity, window.currentStart, window.currentEnd),
        this.queryWithRetry(options, plan, granularity, window.previousStart, window.previousEnd),
      ]);
      const [currentSummary, previousSummary] = plan.summaryGranularity
        ? await Promise.all([
            this.queryWithRetry(options, plan, plan.summaryGranularity, window.currentStart, window.currentEnd),
            this.queryWithRetry(options, plan, plan.summaryGranularity, window.previousStart, window.previousEnd),
          ])
        : [current, previous];
      return projectMetric(plan, current, previous, currentSummary, previousSummary);
    }));

    const metrics = projected.flatMap((item) => item.metric ? [item.metric] : []);
    const charts = projected.flatMap((item) => item.chart ? [item.chart] : []);
    const asOf = window.currentEnd;
    const snapshot: AnalyticsSnapshot = {
      mode: 'connected',
      source: 'roblox_open_cloud',
      freshness: 'fresh',
      universeId: options.universeId,
      section: options.section,
      range: options.range,
      asOf,
      metrics,
      charts,
      breakdowns: [],
      ...(metrics.length === 0 ? {
        emptyState: {
          title: 'No data for this period',
          description: 'Roblox returned no metric points for the selected date range. Nothing has been estimated.',
        },
      } : {}),
      message: `Official Roblox analytics · updated ${asOf}`,
    };

    await this.store.putSnapshot({
      ownerSub: options.ownerSub,
      universeId: options.universeId,
      section: options.section,
      range: options.range,
    }, snapshot);
    return snapshot;
  }

  private async queryWithRetry(
    options: SyncOptions,
    plan: MetricPlan,
    granularity: AnalyticsGranularity,
    startTime: string,
    endTime: string,
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.queryClient.queryMetric(options.apiKey, options.universeId, {
          metric: plan.robloxMetric,
          granularity,
          startTime,
          endTime,
        });
      } catch (error) {
        if (!(error instanceof RobloxAnalyticsQueryError) || !error.retryable || attempt === 2) throw error;
        await this.sleep(250 * 2 ** attempt);
      }
    }
    throw new Error('Unreachable analytics retry state');
  }
}

function metric(
  id: string,
  robloxMetric: string,
  label: string,
  format: MetricFormat,
  aggregation: MetricAggregation,
  goodWhen: 'up' | 'down' | 'neutral' = 'up',
  summaryGranularity?: AnalyticsGranularity,
): MetricPlan {
  return { id, robloxMetric, label, format, aggregation, goodWhen, summaryGranularity };
}

function projectMetric(
  plan: MetricPlan,
  currentSeries: Readonly<{ values: RobloxAnalyticsSeries[] }>,
  previousSeries: Readonly<{ values: RobloxAnalyticsSeries[] }>,
  currentSummarySeries: Readonly<{ values: RobloxAnalyticsSeries[] }>,
  previousSummarySeries: Readonly<{ values: RobloxAnalyticsSeries[] }>,
): { metric?: AnalyticsMetric; chart?: AnalyticsChart } {
  const currentPoints = pointsFrom(currentSeries);
  const previousPoints = pointsFrom(previousSeries);
  if (!currentPoints.length) return {};
  const currentSummaryValues = numericValuesFrom(currentSummarySeries);
  const previousSummaryValues = numericValuesFrom(previousSummarySeries);
  const currentValue = aggregate(currentSummaryValues, plan.aggregation);
  const previousValue = previousSummaryValues.length
    ? aggregate(previousSummaryValues, plan.aggregation)
    : undefined;
  const change = previousValue === undefined || previousValue === 0
    ? undefined
    : ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  const direction = sentiment(change, plan.goodWhen);
  const metricResult: AnalyticsMetric = {
    id: plan.id,
    label: plan.label,
    displayValue: formatMetric(currentValue, plan.format),
    rawValue: currentValue,
    ...(change === undefined ? {} : { change: `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}%`, direction }),
  };
  const chart: AnalyticsChart = {
    id: plan.id,
    title: plan.label,
    displayValue: metricResult.displayValue,
    summary: previousPoints.length ? 'Current vs previous period' : 'Current period',
    yAxisLabels: yAxisLabels([...currentPoints, ...previousPoints].map((point) => point.value), plan.format),
    series: [
      { id: 'current', label: 'Current', points: currentPoints },
      ...(previousPoints.length ? [{ id: 'previous', label: 'Previous period', points: previousPoints }] : []),
    ],
  };
  return { metric: metricResult, chart };
}

function pointsFrom(response: Readonly<{ values: RobloxAnalyticsSeries[] }>) {
  return (response.values[0]?.dataPoints ?? []).flatMap((point) =>
    point.time && Number.isFinite(point.value) ? [{ time: point.time, value: point.value }] : []);
}

function numericValuesFrom(response: Readonly<{ values: RobloxAnalyticsSeries[] }>): number[] {
  return (response.values[0]?.dataPoints ?? []).flatMap((point) =>
    Number.isFinite(point.value) ? [point.value] : []);
}

function aggregate(values: number[], method: MetricAggregation): number {
  if (method === 'latest') return values[values.length - 1] ?? 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return method === 'average' ? total / Math.max(1, values.length) : total;
}

function sentiment(change: number | undefined, goodWhen: 'up' | 'down' | 'neutral'): AnalyticsDirection {
  if (change === undefined || change === 0 || goodWhen === 'neutral') return 'neutral';
  return (change > 0) === (goodWhen === 'up') ? 'positive' : 'negative';
}

function formatMetric(value: number, format: MetricFormat): string {
  if (format === 'percent') return `${value.toFixed(2)}%`;
  if (format === 'minutes') return `${value.toFixed(1)} min`;
  if (format === 'hours') return `${value.toFixed(1)} hr`;
  if (format === 'robux') return `R$ ${compact(value)}`;
  if (format === 'bytes') return formatBytes(value);
  return compact(value);
}

function formatBytes(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} GB`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${Math.round(value)} B`;
}

function compact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(value) >= 1_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 1_000 ? 1 : Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function yAxisLabels(values: number[], format: MetricFormat): string[] {
  const maximum = Math.max(0, ...values);
  return [maximum, maximum / 2, 0].map((value) => formatMetric(value, format));
}

function granularityFor(range: AnalyticsDateRange): AnalyticsGranularity {
  return range === '24H' ? 'HalfHour' : 'OneDay';
}

function queryWindow(range: AnalyticsDateRange, now: Date) {
  if (!Number.isFinite(now.getTime())) throw new Error('Analytics sync requires a valid clock');
  const duration = {
    '24H': 24 * 60 * 60 * 1_000,
    '7D': 7 * 24 * 60 * 60 * 1_000,
    '28D': 28 * 24 * 60 * 60 * 1_000,
    '56D': 56 * 24 * 60 * 60 * 1_000,
    '90D': 90 * 24 * 60 * 60 * 1_000,
  }[range];
  const currentEnd = now.toISOString();
  const currentStartDate = new Date(now.getTime() - duration);
  const previousEnd = currentStartDate.toISOString();
  const previousStart = new Date(currentStartDate.getTime() - duration).toISOString();
  return { currentStart: currentStartDate.toISOString(), currentEnd, previousStart, previousEnd };
}
