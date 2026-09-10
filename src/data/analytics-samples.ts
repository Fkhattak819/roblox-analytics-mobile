import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import type { AnalyticsDateRange, AnalyticsSectionId, AnalyticsSnapshot } from '@/domain/analytics';
import { colors } from '@/src/theme/tokens';
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Metric = { label: string; value: string; delta?: string; direction?: 'positive' | 'negative' | 'neutral' };
type Breakdown = { label: string; value: number; display: string; color?: string };
type Chart = {
  title: string;
  value: string;
  summary: string;
  values: number[];
  comparison?: number[];
  yAxis?: string[];
  color?: string;
  emptyMessage?: string;
};
export type SectionConfig = {
  title: string;
  subtitle: string;
  dateLabel: string;
  metrics: Metric[];
  charts: Chart[];
  breakdownTitle?: string;
  breakdownSubtitle?: string;
  breakdown?: Breakdown[];
  empty?: { icon: IconName; title: string; description: string; action?: string };
  footnote?: string;
};

const sampleTimes = [
  '2026-08-06T00:00:00Z',
  '2026-08-10T00:00:00Z',
  '2026-08-14T00:00:00Z',
  '2026-08-19T00:00:00Z',
  '2026-08-23T00:00:00Z',
  '2026-08-27T00:00:00Z',
  '2026-09-01T00:00:00Z',
] as const;
export const sectionConfigs: Record<string, SectionConfig> = {
  engagement: {
    title: 'Engagement',
    subtitle: 'Take action to boost engagement and fun.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Daily active users', value: '124' },
      { label: 'Average playtime', value: '4.1 min' },
      { label: 'Total playtime', value: '11.4 hr' },
      { label: 'Average session time', value: '2.8 min' },
    ],
    charts: [
      { title: 'Daily active users', value: '124', summary: 'Daily average over selected period', values: [84, 97, 112, 91, 104, 115, 124], comparison: [92, 90, 99, 102, 98, 104, 108], yAxis: ['150', '75', '0'] },
      { title: 'Average playtime', value: '4.1 min', summary: 'Daily average over selected period', values: [3.1, 3.4, 3.7, 3.3, 3.9, 4.3, 4.1], comparison: [3.5, 3.6, 3.8, 3.7, 3.8, 3.9, 4.0], yAxis: ['5', '2.5', '0'] },
      { title: 'Sessions', value: '145', summary: 'Daily average over selected period', values: [98, 111, 124, 103, 119, 137, 145], comparison: [105, 108, 116, 120, 117, 123, 129], yAxis: ['160', '80', '0'] },
    ],
    breakdownTitle: 'New and returning users',
    breakdownSubtitle: 'Daily active users in the latest sample',
    breakdown: [
      { label: 'New users', value: 115, display: '115', color: colors.blue },
      { label: 'Returning users', value: 9, display: '9', color: colors.cyan },
    ],
  },
  retention: {
    title: 'Retention',
    subtitle: 'Take action to get more users to return.',
    dateLabel: 'Last 56 days',
    metrics: [
      { label: 'Day 1 retention', value: '4.20%' },
      { label: 'Day 7 retention', value: '0.00%', direction: 'neutral' },
      { label: 'Day 30 retention', value: '0.00%', direction: 'neutral' },
      { label: 'Stickiness (DAU/MAU)', value: '8.02%', delta: '↓ 55.1%', direction: 'negative' },
    ],
    charts: [
      { title: 'Day 1 retention', value: '4.20%', summary: 'Daily average over selected period', values: [3.2, 4.1, 2.9, 5.8, 3.7, 7.3, 4.2], comparison: [5.1, 4.8, 4.5, 4.4, 4.2, 4.0, 3.9], yAxis: ['10%', '5%', '0%'], color: colors.purple },
      { title: 'Stickiness (DAU/MAU)', value: '8.02%', summary: 'Daily average over selected period', values: [14.2, 12.8, 10.3, 9.7, 8.9, 8.4, 8.02], comparison: [15.2, 15.1, 14.9, 14.7, 14.6, 14.4, 14.3], yAxis: ['20%', '10%', '0%'], color: colors.purple },
    ],
    breakdownTitle: 'Cohort snapshot',
    breakdownSubtitle: 'New-user cohorts visible in Creator Dashboard',
    breakdown: [
      { label: 'Aug 29 · Day 1', value: 20, display: '20.00%', color: colors.purple },
      { label: 'Aug 28 · Day 1', value: 13.04, display: '13.04%', color: '#927EE3' },
      { label: 'Aug 27 · Day 1', value: 11.11, display: '11.11%', color: '#7967BD' },
      { label: 'Aug 26 · Day 1', value: 3.85, display: '3.85%', color: '#65579B' },
    ],
    footnote: 'Roblox cohort dates are UTC. Recent cohorts show N/A until enough days have elapsed.',
  },
  acquisition: {
    title: 'Acquisition',
    subtitle: 'Take action to attract new users.',
    dateLabel: 'Last 56 days',
    metrics: [
      { label: 'New-user impressions', value: '3,049' },
      { label: 'Returning impressions', value: '119' },
      { label: 'New users with plays', value: '57' },
      { label: 'Returning users with plays', value: '9' },
    ],
    charts: [
      { title: 'Unique users with impressions', value: '3,168', summary: 'New and returning users', values: [44, 71, 95, 320, 487, 905, 1246], comparison: [38, 42, 51, 64, 72, 78, 81], yAxis: ['1.2K', '600', '0'], color: colors.cyan },
      { title: 'Unique users with plays', value: '66', summary: 'By acquisition source', values: [8, 11, 9, 17, 22, 31, 66], comparison: [7, 9, 12, 13, 14, 18, 21], yAxis: ['75', '35', '0'], color: colors.cyan },
    ],
    breakdownTitle: 'Top sources by new users with plays',
    breakdownSubtitle: 'Source ordering from Creator Dashboard',
    breakdown: [
      { label: 'Sponsored Ads', value: 2555, display: '2,555', color: colors.blue },
      { label: 'Friends', value: 450, display: '450', color: colors.cyan },
      { label: 'Other', value: 145, display: '145', color: colors.purple },
      { label: 'Home Recommendation', value: 58, display: '58', color: colors.green },
      { label: 'Search', value: 11, display: '11', color: colors.yellow },
    ],
  },
  monetization: {
    title: 'Monetization',
    subtitle: 'Net sales after Roblox and creator fees.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Daily Robux spent', value: 'R$ 2' },
      { label: 'Total Robux spent', value: 'R$ 42' },
      { label: 'Payer conversion rate', value: '0.02%' },
      { label: 'Paying users', value: '0', direction: 'neutral' },
    ],
    charts: [
      { title: 'Daily Robux spent', value: 'R$ 2', summary: 'Daily average · R$ 42 total', values: [0, 0, 0, 0, 14, 0, 28], comparison: [0, 0, 0, 0, 0, 0, 0], yAxis: ['30', '15', '0'], color: colors.green },
      { title: 'Payer conversion rate', value: '0.02%', summary: 'Daily average over selected period', values: [0, 0, 0, 0.04, 0, 0, 0.02], comparison: [0, 0, 0, 0, 0, 0, 0], yAxis: ['0.05%', '0.025%', '0%'], color: colors.green },
    ],
    breakdownTitle: 'Robux sources',
    breakdownSubtitle: 'Net Robux in the selected period',
    breakdown: [
      { label: 'Developer Products', value: 42, display: 'R$ 42', color: colors.green },
      { label: 'Unknown', value: 0, display: 'R$ 0', color: colors.textFaint },
    ],
    footnote: 'Refunds and reversals are excluded unless processed on the same day. Engagement metrics may be delayed.',
  },
  audience: {
    title: 'Demographics',
    subtitle: 'Take action on your audience demographics.',
    dateLabel: 'Most recent',
    metrics: [
      { label: 'Monthly active users', value: '3,227' },
      { label: 'United States', value: '48.2%' },
      { label: 'Female', value: '70.6%' },
      { label: 'English', value: '66.7%' },
    ],
    charts: [],
    breakdownTitle: 'Audience mix',
    breakdownSubtitle: 'Monthly active users as of Aug 31',
    breakdown: [
      { label: 'United States', value: 48.2, display: '48.2%', color: colors.blue },
      { label: 'Female', value: 70.6, display: '70.6%', color: colors.cyan },
      { label: 'Age 18–20', value: 44.1, display: '44.1%', color: colors.purple },
      { label: 'English', value: 66.7, display: '66.7%', color: colors.green },
    ],
  },
  performance: {
    title: 'Performance & Stability',
    subtitle: 'Client and server health signals.',
    dateLabel: 'Last 1 day',
    metrics: [
      { label: 'Concurrent users', value: '0', direction: 'neutral' },
      { label: 'Peak concurrent players', value: '0', direction: 'neutral' },
    ],
    charts: [],
    empty: {
      icon: 'speedometer-outline',
      title: 'Not enough recent samples',
      description: 'Roblox currently reports zero concurrent users and no recent client crash, memory, frame-rate, or CPU data for the selected period.',
      action: 'Try a longer date range',
    },
  },
  economy: {
    title: 'Economy',
    subtitle: 'Take action to grow your economy.',
    dateLabel: 'Last 28 days',
    metrics: [],
    charts: [],
    empty: {
      icon: 'cash-outline',
      title: 'Add economy events',
      description: 'Instrument economy events to unlock top sinks, top sources, and wallet-balance analytics in Roblox Creator Dashboard.',
      action: 'View Events setup',
    },
  },
  funnels: {
    title: 'Funnels',
    subtitle: 'Take action to improve your funnels.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Total users', value: '3,225' },
      { label: 'Total conversion', value: '6.08%' },
    ],
    charts: [
      { title: 'Onboarding conversion', value: '6.08%', summary: 'By user · 4-step funnel', values: [100, 74, 31, 6.08], yAxis: ['100%', '50%', '0%'], color: colors.blue },
    ],
    breakdownTitle: 'Onboarding steps',
    breakdownSubtitle: 'Completion relative to step 1',
    breakdown: [
      { label: '1. Started onboarding', value: 100, display: '100%', color: colors.blue },
      { label: '2. Started round', value: 74, display: '74%', color: '#7290FF' },
      { label: '3. Completed round', value: 31, display: '31%', color: colors.cyan },
      { label: '4. Returned next day', value: 6.08, display: '6.08%', color: colors.green },
    ],
  },
  'custom-events': {
    title: 'Custom events',
    subtitle: 'Creator-defined events available in Explore.',
    dateLabel: 'Last 28 days',
    metrics: [
      { label: 'Events discovered', value: '3' },
    ],
    charts: [],
    breakdownTitle: 'Available events',
    breakdownSubtitle: 'Observed in Roblox Explore',
    breakdown: [
      { label: 'RoundStarted', value: 100, display: 'Available', color: colors.blue },
      { label: 'RoundCompleted', value: 100, display: 'Available', color: colors.cyan },
      { label: 'ReturnedNextDay', value: 100, display: 'Available', color: colors.green },
    ],
    footnote: 'Choose aggregation, time interval, breakdown, chart type, overlays, and smoothing in Roblox Explore.',
  },
};

export function createSampleSnapshot(
  section: AnalyticsSectionId,
  config: SectionConfig,
  range: AnalyticsDateRange,
  universeId: string,
): AnalyticsSnapshot {
  return {
    mode: 'sample',
    source: 'sample_data',
    freshness: 'fixture',
    universeId,
    section,
    range,
    metrics: config.metrics.map((metric, index) => ({
      id: `${section}-metric-${index}`,
      label: metric.label,
      displayValue: metric.value,
      ...(metric.delta ? { change: metric.delta } : {}),
      ...(metric.direction ? { direction: metric.direction } : {}),
    })),
    charts: config.charts.map((chart, chartIndex) => ({
      id: `${section}-chart-${chartIndex}`,
      title: chart.title,
      displayValue: chart.value,
      summary: chart.summary,
      ...(chart.yAxis ? { yAxisLabels: chart.yAxis } : {}),
      series: [
        { id: 'current', label: 'Total', points: pointsFor(chart.values) },
        ...(chart.comparison ? [{ id: 'previous', label: 'Previous period', points: pointsFor(chart.comparison) }] : []),
      ],
    })),
    breakdowns: config.breakdown?.length ? [{
      id: `${section}-breakdown`,
      title: config.breakdownTitle ?? 'Breakdown',
      ...(config.breakdownSubtitle ? { subtitle: config.breakdownSubtitle } : {}),
      items: config.breakdown.map((item, index) => ({
        id: `${section}-breakdown-${index}`,
        label: item.label,
        displayValue: item.display,
        rawValue: item.value,
      })),
    }] : [],
    ...(config.empty ? {
      emptyState: {
        title: config.empty.title,
        description: config.empty.description,
        ...(config.empty.action ? { action: config.empty.action } : {}),
      },
    } : {}),
    message: 'Sample mode · metrics reflect the Sep 2 Creator Dashboard audit, not a live API session',
  };
}

function pointsFor(values: number[]) {
  return values.map((value, index) => ({
    time: sampleTimes[Math.min(index, sampleTimes.length - 1)],
    value,
  }));
}
