import { appEnvironment, type AppEnvironment } from '@/services/backend-api';

export type ConnectionStatus = Readonly<{
  identity: Readonly<{
    status: 'connected';
    username: string;
  }>;
  analytics: Readonly<{
    status: 'pending' | 'active' | 'error';
    scope: 'universe.analytics:read';
    universeId: string;
    lastAttemptAt?: string;
    lastSyncedAt?: string;
  }>;
}>;

export async function loadConnectionStatus({
  universeId,
  sessionToken,
  signal,
  environment = appEnvironment,
  fetchImpl = fetch,
}: {
  universeId: string;
  sessionToken: string;
  signal?: AbortSignal;
  environment?: AppEnvironment;
  fetchImpl?: typeof fetch;
}): Promise<ConnectionStatus> {
  if (!environment.apiBaseUrl) throw new Error('The backend URL is not configured');
  const url = new URL(`${environment.apiBaseUrl.replace(/\/+$/, '')}/v1/connections`);
  url.searchParams.set('universeId', universeId);
  const response = await fetchImpl(url.toString(), {
    headers: { accept: 'application/json', authorization: `Bearer ${sessionToken}` },
    signal,
  });
  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok || !isConnectionStatus(payload)) {
    const candidate = payload && typeof payload === 'object' ? payload as Record<string, unknown> : undefined;
    throw new Error(typeof candidate?.message === 'string' ? candidate.message : 'Connection status could not be loaded.');
  }
  return payload;
}

function isConnectionStatus(value: unknown): value is ConnectionStatus {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const identity = candidate.identity as Record<string, unknown> | undefined;
  const analytics = candidate.analytics as Record<string, unknown> | undefined;
  return identity?.status === 'connected'
    && typeof identity.username === 'string'
    && (analytics?.status === 'pending' || analytics?.status === 'active' || analytics?.status === 'error')
    && analytics.scope === 'universe.analytics:read'
    && typeof analytics.universeId === 'string';
}
