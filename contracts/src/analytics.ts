export const analyticsSectionIds = [
  'overview',
  'engagement',
  'retention',
  'acquisition',
  'monetization',
  'audience',
  'performance',
  'economy',
  'funnels',
  'explore',
  'custom-events',
  'thumbnails',
  'advertising',
  'matchmaking',
  'data-stores',
  'memory-stores',
  'speech-to-text',
  'text-to-speech',
  'safety',
] as const;

export type AnalyticsSectionId = (typeof analyticsSectionIds)[number];
export type AnalyticsDateRange = '24H' | '7D' | '28D' | '56D' | '90D';
export type AnalyticsSource = 'sample_data' | 'roblox_open_cloud';
export type AnalyticsFreshness = 'fixture' | 'fresh' | 'stale' | 'syncing';
export type AnalyticsDirection = 'positive' | 'negative' | 'neutral';

export type AnalyticsMetric = Readonly<{
  id: string;
  label: string;
  displayValue: string;
  rawValue?: number | null;
  change?: string;
  direction?: AnalyticsDirection;
}>;

export type AnalyticsPoint = Readonly<{
  time: string;
  value: number;
}>;

export type AnalyticsSeries = Readonly<{
  id: string;
  label: string;
  points: AnalyticsPoint[];
}>;

export type AnalyticsChart = Readonly<{
  id: string;
  title: string;
  displayValue?: string;
  summary?: string;
  yAxisLabels?: string[];
  series: AnalyticsSeries[];
}>;

export type AnalyticsBreakdownItem = Readonly<{
  id: string;
  label: string;
  displayValue: string;
  rawValue: number;
}>;

export type AnalyticsBreakdown = Readonly<{
  id: string;
  title: string;
  subtitle?: string;
  items: AnalyticsBreakdownItem[];
}>;

export type AnalyticsEmptyState = Readonly<{
  title: string;
  description: string;
  action?: string;
}>;

export type AnalyticsSnapshot = Readonly<{
  mode: 'sample' | 'connected';
  source: AnalyticsSource;
  freshness: AnalyticsFreshness;
  universeId: string;
  section: AnalyticsSectionId;
  range: AnalyticsDateRange;
  asOf?: string;
  metrics: AnalyticsMetric[];
  charts: AnalyticsChart[];
  breakdowns: AnalyticsBreakdown[];
  emptyState?: AnalyticsEmptyState;
  message: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requiredString(value: unknown, field: string, maximum = 240): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new Error(`Invalid analytics snapshot: ${field} must be text`);
  }
  return value;
}

function optionalString(value: unknown, field: string, maximum = 240): string | undefined {
  if (value === undefined) return undefined;
  return requiredString(value, field, maximum);
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid analytics snapshot: ${field} must be a finite number`);
  }
  return value;
}

function boundedArray(value: unknown, field: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new Error(`Invalid analytics snapshot: ${field} must be an array with at most ${maximum} items`);
  }
  return value;
}

function isSection(value: unknown): value is AnalyticsSectionId {
  return typeof value === 'string' && (analyticsSectionIds as readonly string[]).includes(value);
}

function isRange(value: unknown): value is AnalyticsDateRange {
  return value === '24H' || value === '7D' || value === '28D' || value === '56D' || value === '90D';
}

function parseMetric(value: unknown, index: number): AnalyticsMetric {
  if (!isRecord(value)) throw new Error(`Invalid analytics snapshot: metrics[${index}] is malformed`);
  const rawValue = value.rawValue === null ? null : value.rawValue === undefined
    ? undefined
    : finiteNumber(value.rawValue, `metrics[${index}].rawValue`);
  const direction = value.direction;
  if (direction !== undefined && direction !== 'positive' && direction !== 'negative' && direction !== 'neutral') {
    throw new Error(`Invalid analytics snapshot: metrics[${index}].direction is unsupported`);
  }
  return {
    id: requiredString(value.id, `metrics[${index}].id`, 80),
    label: requiredString(value.label, `metrics[${index}].label`, 120),
    displayValue: requiredString(value.displayValue, `metrics[${index}].displayValue`, 80),
    ...(rawValue === undefined ? {} : { rawValue }),
    ...(value.change === undefined ? {} : { change: requiredString(value.change, `metrics[${index}].change`, 80) }),
    ...(direction === undefined ? {} : { direction }),
  };
}

function parseChart(value: unknown, index: number): AnalyticsChart {
  if (!isRecord(value)) throw new Error(`Invalid analytics snapshot: charts[${index}] is malformed`);
  const series = boundedArray(value.series, `charts[${index}].series`, 8).map((candidate, seriesIndex) => {
    if (!isRecord(candidate)) throw new Error(`Invalid analytics snapshot: charts[${index}].series[${seriesIndex}] is malformed`);
    const points = boundedArray(candidate.points, `charts[${index}].series[${seriesIndex}].points`, 400).map((point, pointIndex) => {
      if (!isRecord(point)) throw new Error(`Invalid analytics snapshot: chart point ${pointIndex} is malformed`);
      const time = requiredString(point.time, `charts[${index}].series[${seriesIndex}].points[${pointIndex}].time`, 80);
      if (!Number.isFinite(Date.parse(time))) throw new Error('Invalid analytics snapshot: chart point time must be ISO-8601');
      return { time, value: finiteNumber(point.value, `charts[${index}].series[${seriesIndex}].points[${pointIndex}].value`) };
    });
    return {
      id: requiredString(candidate.id, `charts[${index}].series[${seriesIndex}].id`, 80),
      label: requiredString(candidate.label, `charts[${index}].series[${seriesIndex}].label`, 120),
      points,
    };
  });
  const yAxisLabels = value.yAxisLabels === undefined
    ? undefined
    : boundedArray(value.yAxisLabels, `charts[${index}].yAxisLabels`, 8).map((label, labelIndex) =>
        requiredString(label, `charts[${index}].yAxisLabels[${labelIndex}]`, 40));
  return {
    id: requiredString(value.id, `charts[${index}].id`, 80),
    title: requiredString(value.title, `charts[${index}].title`, 120),
    ...(value.displayValue === undefined ? {} : { displayValue: requiredString(value.displayValue, `charts[${index}].displayValue`, 80) }),
    ...(value.summary === undefined ? {} : { summary: requiredString(value.summary, `charts[${index}].summary`, 240) }),
    ...(yAxisLabels === undefined ? {} : { yAxisLabels }),
    series,
  };
}

function parseBreakdown(value: unknown, index: number): AnalyticsBreakdown {
  if (!isRecord(value)) throw new Error(`Invalid analytics snapshot: breakdowns[${index}] is malformed`);
  const items = boundedArray(value.items, `breakdowns[${index}].items`, 100).map((candidate, itemIndex) => {
    if (!isRecord(candidate)) throw new Error(`Invalid analytics snapshot: breakdown item ${itemIndex} is malformed`);
    return {
      id: requiredString(candidate.id, `breakdowns[${index}].items[${itemIndex}].id`, 80),
      label: requiredString(candidate.label, `breakdowns[${index}].items[${itemIndex}].label`, 160),
      displayValue: requiredString(candidate.displayValue, `breakdowns[${index}].items[${itemIndex}].displayValue`, 80),
      rawValue: finiteNumber(candidate.rawValue, `breakdowns[${index}].items[${itemIndex}].rawValue`),
    };
  });
  return {
    id: requiredString(value.id, `breakdowns[${index}].id`, 80),
    title: requiredString(value.title, `breakdowns[${index}].title`, 120),
    ...(value.subtitle === undefined ? {} : { subtitle: requiredString(value.subtitle, `breakdowns[${index}].subtitle`, 240) }),
    items,
  };
}

export function parseAnalyticsSnapshot(value: unknown): AnalyticsSnapshot {
  if (!isRecord(value)) throw new Error('Invalid analytics snapshot: payload is malformed');
  if (value.mode !== 'sample' && value.mode !== 'connected') throw new Error('Invalid analytics snapshot: mode is unsupported');
  if (value.source !== 'sample_data' && value.source !== 'roblox_open_cloud') throw new Error('Invalid analytics snapshot: source is unsupported');
  if (value.freshness !== 'fixture' && value.freshness !== 'fresh' && value.freshness !== 'stale' && value.freshness !== 'syncing') {
    throw new Error('Invalid analytics snapshot: freshness is unsupported');
  }
  if (value.mode === 'sample' && (value.source !== 'sample_data' || value.freshness !== 'fixture')) {
    throw new Error('Invalid analytics snapshot: sample data must be labeled as a fixture');
  }
  if (value.mode === 'connected' && value.source !== 'roblox_open_cloud') {
    throw new Error('Invalid analytics snapshot: connected data must come from Roblox Open Cloud');
  }
  const universeId = requiredString(value.universeId, 'universeId', 24);
  if (!/^\d+$/.test(universeId)) throw new Error('Invalid analytics snapshot: universeId must contain only digits');
  if (!isSection(value.section)) throw new Error('Invalid analytics snapshot: section is unsupported');
  if (!isRange(value.range)) throw new Error('Invalid analytics snapshot: range is unsupported');
  const asOf = optionalString(value.asOf, 'asOf', 80);
  if (asOf && !Number.isFinite(Date.parse(asOf))) throw new Error('Invalid analytics snapshot: asOf must be ISO-8601');
  if (value.mode === 'connected' && !asOf) throw new Error('Invalid analytics snapshot: connected data requires asOf');

  const emptyState = value.emptyState === undefined ? undefined : (() => {
    if (!isRecord(value.emptyState)) throw new Error('Invalid analytics snapshot: emptyState is malformed');
    return {
      title: requiredString(value.emptyState.title, 'emptyState.title', 120),
      description: requiredString(value.emptyState.description, 'emptyState.description', 500),
      ...(value.emptyState.action === undefined ? {} : { action: requiredString(value.emptyState.action, 'emptyState.action', 120) }),
    };
  })();

  return {
    mode: value.mode,
    source: value.source,
    freshness: value.freshness,
    universeId,
    section: value.section,
    range: value.range,
    ...(asOf === undefined ? {} : { asOf }),
    metrics: boundedArray(value.metrics, 'metrics', 64).map(parseMetric),
    charts: boundedArray(value.charts, 'charts', 24).map(parseChart),
    breakdowns: boundedArray(value.breakdowns, 'breakdowns', 24).map(parseBreakdown),
    ...(emptyState === undefined ? {} : { emptyState }),
    message: requiredString(value.message, 'message', 500),
  };
}
