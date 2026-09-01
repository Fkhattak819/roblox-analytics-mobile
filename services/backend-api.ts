import { offlineSampleHome } from '@/data/sample-home';
import { parseHomeSnapshot, type HomeSnapshot } from '@/domain/home';

export type AppDataMode = 'sample' | 'aws_dev';
export type HomeTransport = 'offline' | 'aws';

export type AppEnvironment = Readonly<{
  dataMode: AppDataMode;
  apiBaseUrl?: string;
}>;

export type HomeLoadResult = Readonly<{
  snapshot: HomeSnapshot;
  transport: HomeTransport;
}>;

type LoadHomeOptions = Readonly<{
  signal?: AbortSignal;
  environment?: AppEnvironment;
  fetchImpl?: typeof fetch;
}>;

function normalizeBaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/$/, '') : undefined;
}

export const appEnvironment: AppEnvironment = {
  dataMode: process.env.EXPO_PUBLIC_DATA_MODE === 'aws_dev' ? 'aws_dev' : 'sample',
  apiBaseUrl: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL),
};

export async function loadHomeSnapshot({
  signal,
  environment = appEnvironment,
  fetchImpl = fetch,
}: LoadHomeOptions = {}): Promise<HomeLoadResult> {
  if (environment.dataMode === 'sample') {
    // Sample Mode is intentionally offline. Keep this return before any network setup.
    return { snapshot: offlineSampleHome, transport: 'offline' };
  }

  if (!environment.apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required in aws_dev mode');
  }

  const response = await fetchImpl(`${environment.apiBaseUrl}/v1/sample/home`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Backend request failed with HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  return { snapshot: parseHomeSnapshot(payload), transport: 'aws' };
}
