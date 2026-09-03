import type {
  AnalyticsDateRange,
  AnalyticsSectionId,
  AnalyticsSnapshot,
} from '../../../../contracts/src/analytics.js';
import { analyticsSectionIds, parseAnalyticsSnapshot } from '../../../../contracts/src/analytics.js';

export type AnalyticsSnapshotKey = Readonly<{
  ownerSub: string;
  universeId: string;
  section: AnalyticsSectionId;
  range: AnalyticsDateRange;
}>;

export interface AnalyticsSnapshotStore {
  getSnapshot(key: AnalyticsSnapshotKey): Promise<AnalyticsSnapshot | null>;
  putSnapshot(key: AnalyticsSnapshotKey, snapshot: AnalyticsSnapshot): Promise<void>;
}

export class InMemoryAnalyticsSnapshotStore implements AnalyticsSnapshotStore {
  readonly #snapshots = new Map<string, AnalyticsSnapshot>();

  async getSnapshot(key: AnalyticsSnapshotKey): Promise<AnalyticsSnapshot | null> {
    validateKey(key);
    return this.#snapshots.get(storageKey(key)) ?? null;
  }

  async putSnapshot(key: AnalyticsSnapshotKey, snapshot: AnalyticsSnapshot): Promise<void> {
    validateKey(key);
    const parsed = validateSnapshotMatchesKey(key, snapshot);
    this.#snapshots.set(storageKey(key), parsed);
  }
}

export function validateSnapshotMatchesKey(
  key: AnalyticsSnapshotKey,
  snapshot: AnalyticsSnapshot,
): AnalyticsSnapshot {
  validateKey(key);
  const parsed = parseAnalyticsSnapshot(snapshot);
  if (
    parsed.universeId !== key.universeId
    || parsed.section !== key.section
    || parsed.range !== key.range
  ) {
    throw new Error('Analytics snapshot metadata does not match its tenant-scoped key');
  }
  if (parsed.mode !== 'connected' || parsed.source !== 'roblox_open_cloud') {
    throw new Error('Only connected Roblox Open Cloud snapshots may be persisted');
  }
  return parsed;
}

export function validateSnapshotKey(key: AnalyticsSnapshotKey): AnalyticsSnapshotKey {
  validateKey(key);
  return key;
}

function validateKey(key: AnalyticsSnapshotKey): void {
  if (!/^\d+$/.test(key.ownerSub)) throw new Error('Analytics snapshot owner must be a Roblox user ID');
  if (!/^\d+$/.test(key.universeId)) throw new Error('Analytics snapshot universe must contain only digits');
  if (!(analyticsSectionIds as readonly string[]).includes(key.section)) throw new Error('Analytics snapshot section is unsupported');
  if (key.range !== '24H' && key.range !== '7D' && key.range !== '28D' && key.range !== '56D' && key.range !== '90D') {
    throw new Error('Analytics snapshot range is unsupported');
  }
}

function storageKey(key: AnalyticsSnapshotKey): string {
  return `${key.ownerSub}:${key.universeId}:${key.section}:${key.range}`;
}
