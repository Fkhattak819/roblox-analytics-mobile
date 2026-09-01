export type HomeSnapshot = Readonly<{
  mode: 'sample';
  source: 'sample_data';
  freshness: 'fixture';
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

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid backend response: ${field} must be a number`);
  }
  return value;
}

export function parseHomeSnapshot(value: unknown): HomeSnapshot {
  if (!isRecord(value) || !isRecord(value.portfolio)) {
    throw new Error('Invalid backend response: home snapshot is malformed');
  }
  if (value.mode !== 'sample' || value.source !== 'sample_data' || value.freshness !== 'fixture') {
    throw new Error('Invalid backend response: unsupported home snapshot metadata');
  }
  if (typeof value.message !== 'string') {
    throw new Error('Invalid backend response: message must be text');
  }

  return {
    mode: value.mode,
    source: value.source,
    freshness: value.freshness,
    portfolio: {
      revenueRobux: finiteNumber(value.portfolio.revenueRobux, 'revenueRobux'),
      dailyActiveUsers: finiteNumber(value.portfolio.dailyActiveUsers, 'dailyActiveUsers'),
      forwardD1Retention: finiteNumber(
        value.portfolio.forwardD1Retention,
        'forwardD1Retention',
      ),
      averagePlaytimeMinutes: finiteNumber(
        value.portfolio.averagePlaytimeMinutes,
        'averagePlaytimeMinutes',
      ),
    },
    message: value.message,
  };
}
