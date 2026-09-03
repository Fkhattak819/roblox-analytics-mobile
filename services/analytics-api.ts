import {
  analyticsSectionIds,
  parseAnalyticsSnapshot,
  type AnalyticsDateRange,
  type AnalyticsSectionId,
  type AnalyticsSnapshot,
} from '@/domain/analytics';
import { appEnvironment, type AppEnvironment } from '@/services/backend-api';

export type AnalyticsTransport = 'offline' | 'aws';

export type AnalyticsLoadResult = Readonly<{
  snapshot: AnalyticsSnapshot;
  transport: AnalyticsTransport;
}>;

type LoadAnalyticsOptions = Readonly<{
  universeId: string;
  section: AnalyticsSectionId;
  range: AnalyticsDateRange;
  sampleSnapshot: AnalyticsSnapshot;
  sessionToken?: string | null;
  signal?: AbortSignal;
  environment?: AppEnvironment;
  fetchImpl?: typeof fetch;
}>;

type RequestAnalyticsSyncOptions = Readonly<{
  universeId: string;
  section: AnalyticsSectionId;
  range: AnalyticsDateRange;
  sessionToken: string;
  signal?: AbortSignal;
  environment?: AppEnvironment;
  fetchImpl?: typeof fetch;
}>;

export type AnalyticsSyncRequestResult = Readonly<{
  status: 'queued' | 'already_queued';
  jobId?: string;
  retryAfterSeconds: number;
}>;

export class AnalyticsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AnalyticsApiError';
  }
}

export async function loadAnalyticsSnapshot({
  universeId,
  section,
  range,
  sampleSnapshot,
  sessionToken,
  signal,
  environment = appEnvironment,
  fetchImpl = fetch,
}: LoadAnalyticsOptions): Promise<AnalyticsLoadResult> {
  if (environment.dataMode === 'sample') {
    // Sample Mode is deliberately offline and must never create a network request.
    return { snapshot: parseAnalyticsSnapshot(sampleSnapshot), transport: 'offline' };
  }

  if (!environment.apiBaseUrl) throw new AnalyticsApiError('The backend URL is not configured', 0, 'backend_not_configured');
  if (!sessionToken) throw new AnalyticsApiError('Connect Roblox to load official analytics.', 401, 'missing_session');
  if (!/^\d+$/.test(universeId)) throw new AnalyticsApiError('The selected experience is not connected to Roblox analytics.', 400, 'invalid_universe');
  if (!(analyticsSectionIds as readonly string[]).includes(section)) throw new AnalyticsApiError('Unsupported analytics section.', 400, 'invalid_section');

  const baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const url = new URL(`${baseUrl}/v1/analytics/${encodeURIComponent(section)}`);
  url.searchParams.set('universeId', universeId);
  url.searchParams.set('range', range);
  const response = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${sessionToken}`,
    },
    signal,
  });

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const candidate = payload && typeof payload === 'object' ? payload as Record<string, unknown> : undefined;
    const message = typeof candidate?.message === 'string'
      ? candidate.message
      : `Analytics request failed with HTTP ${response.status}`;
    throw new AnalyticsApiError(message, response.status, typeof candidate?.error === 'string' ? candidate.error : undefined);
  }

  return { snapshot: parseAnalyticsSnapshot(payload), transport: 'aws' };
}

export async function requestAnalyticsSync({
  universeId,
  section,
  range,
  sessionToken,
  signal,
  environment = appEnvironment,
  fetchImpl = fetch,
}: RequestAnalyticsSyncOptions): Promise<AnalyticsSyncRequestResult> {
  if (!environment.apiBaseUrl) throw new AnalyticsApiError('The backend URL is not configured', 0, 'backend_not_configured');
  const response = await fetchImpl(`${environment.apiBaseUrl.replace(/\/+$/, '')}/v1/sync-jobs`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${sessionToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ universeId, section, range }),
    signal,
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const candidate = payload && typeof payload === 'object' ? payload as Record<string, unknown> : undefined;
    throw new AnalyticsApiError(
      typeof candidate?.message === 'string' ? candidate.message : `Sync request failed with HTTP ${response.status}`,
      response.status,
      typeof candidate?.error === 'string' ? candidate.error : undefined,
    );
  }
  if (!payload || typeof payload !== 'object') throw new AnalyticsApiError('The sync response was malformed.', 502, 'invalid_sync_response');
  const candidate = payload as Record<string, unknown>;
  if (
    (candidate.status !== 'queued' && candidate.status !== 'already_queued')
    || typeof candidate.retryAfterSeconds !== 'number'
  ) throw new AnalyticsApiError('The sync response was malformed.', 502, 'invalid_sync_response');
  return {
    status: candidate.status,
    ...(typeof candidate.jobId === 'string' ? { jobId: candidate.jobId } : {}),
    retryAfterSeconds: candidate.retryAfterSeconds,
  };
}
