export type HomeMode = 'sample' | 'connected';
export type HomeSource = 'sample_data' | 'roblox_open_cloud';
export type HomeFreshness = 'fixture' | 'fresh' | 'stale' | 'syncing';

export type HomeSnapshot = Readonly<{
  mode: HomeMode;
  source: HomeSource;
  freshness: HomeFreshness;
  asOf?: string;
  portfolio: Readonly<{
    revenueRobux: number;
    dailyActiveUsers: number;
    forwardD1Retention: number;
    averagePlaytimeMinutes: number;
  }>;
  message: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function boundedNumber(
  value: unknown,
  field: string,
  minimum: number,
  maximum = Number.POSITIVE_INFINITY,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid backend response: ${field} must be a number`);
  }
  if (value < minimum || value > maximum) {
    throw new Error(`Invalid backend response: ${field} is outside its allowed range`);
  }
  return value;
}

function isHomeMode(value: unknown): value is HomeMode {
  return value === 'sample' || value === 'connected';
}

function isHomeSource(value: unknown): value is HomeSource {
  return value === 'sample_data' || value === 'roblox_open_cloud';
}

function isHomeFreshness(value: unknown): value is HomeFreshness {
  return value === 'fixture' || value === 'fresh' || value === 'stale' || value === 'syncing';
}

export function parseHomeSnapshot(value: unknown): HomeSnapshot {
  if (!isRecord(value) || !isRecord(value.portfolio)) {
    throw new Error('Invalid backend response: home snapshot is malformed');
  }
  if (!isHomeMode(value.mode) || !isHomeSource(value.source) || !isHomeFreshness(value.freshness)) {
    throw new Error('Invalid backend response: unsupported home snapshot metadata');
  }
  if (value.mode === 'sample' && (value.source !== 'sample_data' || value.freshness !== 'fixture')) {
    throw new Error('Invalid backend response: sample data must be labeled as a fixture');
  }
  if (value.mode === 'connected' && value.source !== 'roblox_open_cloud') {
    throw new Error('Invalid backend response: connected data must come from Roblox Open Cloud');
  }
  if (
    value.asOf !== undefined &&
    (typeof value.asOf !== 'string' || Number.isNaN(Date.parse(value.asOf)))
  ) {
    throw new Error('Invalid backend response: asOf must be an ISO-8601 string');
  }
  if (typeof value.message !== 'string') {
    throw new Error('Invalid backend response: message must be text');
  }

  return {
    mode: value.mode,
    source: value.source,
    freshness: value.freshness,
    ...(value.asOf === undefined ? {} : { asOf: value.asOf }),
    portfolio: {
      revenueRobux: boundedNumber(value.portfolio.revenueRobux, 'revenueRobux', 0),
      dailyActiveUsers: boundedNumber(value.portfolio.dailyActiveUsers, 'dailyActiveUsers', 0),
      forwardD1Retention: boundedNumber(
        value.portfolio.forwardD1Retention,
        'forwardD1Retention',
        0,
        100,
      ),
      averagePlaytimeMinutes: boundedNumber(
        value.portfolio.averagePlaytimeMinutes,
        'averagePlaytimeMinutes',
        0,
      ),
    },
    message: value.message,
  };
}

export const sampleHomeFixture: HomeSnapshot = {
  mode: 'sample',
  source: 'sample_data',
  freshness: 'fixture',
  portfolio: {
    revenueRobux: 18420,
    dailyActiveUsers: 12840,
    forwardD1Retention: 31.4,
    averagePlaytimeMinutes: 18.7,
  },
  message: 'Sample Data — connect Roblox to load your experiences.',
};
