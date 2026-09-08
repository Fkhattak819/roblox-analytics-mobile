export type AnalyticsGranularity =
  | "OneMinute"
  | "HalfHour"
  | "OneHour"
  | "OneDay"
  | "OneWeek"
  | "OneMonth"
  | "None";

export type AnalyticsFilter = Readonly<{
  dimension: string;
  values: Array<string | number>;
  operation:
    | "In"
    | "NotIn"
    | "GreaterThan"
    | "GreaterThanOrEqual"
    | "LessThan"
    | "LessThanOrEqual"
    | "Match";
}>;

export type MetricQuery = Readonly<{
  metric: string;
  granularity: AnalyticsGranularity;
  startTime: string;
  endTime: string;
  breakdown?: string[];
  filter?: AnalyticsFilter[];
  limit?: number;
}>;

export type DimensionValuesQuery = Readonly<{
  metric: string;
  dimensions: string[];
  startTime: string;
  endTime: string;
  filter?: AnalyticsFilter[];
  granularity?: AnalyticsGranularity;
  limit?: number;
}>;

export type AnalyticsDataPoint = Readonly<{
  time?: string;
  value: number;
  stringValues?: string[];
  status?: string;
}>;
export type AnalyticsSeries = Readonly<{
  breakdowns: Array<{ dimension: string; value: string; displayValue?: string }>;
  dataPoints: AnalyticsDataPoint[];
}>;
export type AnalyticsDimensionValues = Readonly<{
  dimension: string;
  values: Array<{ value: string; displayValue?: string }>;
}>;

export type AnalyticsOperation<T = unknown> = Readonly<{
  path: string;
  done: boolean;
  metadata?: { createdTime?: string };
  response?: T;
  error?: { code?: string | number; message?: string };
}>;

export type RobloxAnalyticsCredential = string | Readonly<{
  type: 'oauth';
  accessToken: string;
}>;

export class RobloxAnalyticsQueryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

type QueryClientOptions = Readonly<{
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  maxPolls?: number;
  baseUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

const DEFAULT_BASE_URL = "https://apis.roblox.com/analytics-query-api";

export class RobloxAnalyticsQueryClient {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly maxPolls: number;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly signal?: AbortSignal;

  constructor(options: QueryClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.maxPolls = options.maxPolls ?? 8;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.signal = options.signal;
  }

  queryMetric(credential: RobloxAnalyticsCredential, universeId: string, query: MetricQuery) {
    return this.run<Readonly<{ values: AnalyticsSeries[] }>>(credential, universeId, "metrics", query);
  }

  queryDimensionValues(credential: RobloxAnalyticsCredential, universeId: string, query: DimensionValuesQuery) {
    return this.run<Readonly<{ values: AnalyticsDimensionValues[] }>>(credential, universeId, "dimension-values", query);
  }

  private async run<T>(
    credential: RobloxAnalyticsCredential,
    universeId: string,
    kind: "metrics" | "dimension-values",
    body: MetricQuery | DimensionValuesQuery,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const signal = this.signal ? AbortSignal.any([this.signal, controller.signal]) : controller.signal;
      return await this.runWithinDeadline<T>(credential, universeId, kind, body, signal);
    } finally {
      clearTimeout(timer);
    }
  }

  private async runWithinDeadline<T>(
    credential: RobloxAnalyticsCredential, universeId: string, kind: "metrics" | "dimension-values",
    body: MetricQuery | DimensionValuesQuery, signal: AbortSignal,
  ): Promise<T> {
    assertCredential(credential);
    assertUniverseId(universeId);
    assertDateWindow(body.startTime, body.endTime);

    const endpoint = `${this.baseUrl}/v1/universes/${universeId}/${kind}`;
    let operation = await this.request<T>(endpoint, credential, {
      method: "POST",
      body: JSON.stringify(body),
    }, signal);

    for (let poll = 0; !operation.done && poll < this.maxPolls; poll += 1) {
      const operationUrl = this.operationUrl(operation.path, universeId, kind);
      await bounded(() => this.sleep(Math.min(5_000, 250 * 2 ** poll)), signal);
      operation = await this.request<T>(operationUrl, credential, { method: "GET" }, signal);
    }

    if (!operation.done) {
      throw new RobloxAnalyticsQueryError("Roblox analytics operation did not complete in time", 202, true);
    }
    if (operation.error) {
      throw new RobloxAnalyticsQueryError("Roblox analytics operation failed", 502, false);
    }
    if (operation.response === undefined) {
      throw new RobloxAnalyticsQueryError("Roblox analytics response was missing", 502, false);
    }
    return operation.response;
  }

  private async request<T>(
    url: string,
    credential: RobloxAnalyticsCredential,
    init: { method: "GET" | "POST"; body?: string },
    signal: AbortSignal,
  ): Promise<AnalyticsOperation<T>> {
    const response = await bounded(() => this.fetchImpl(url, {
      ...init,
      signal,
      redirect: "error",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(typeof credential === 'string'
          ? { 'x-api-key': credential }
          : { authorization: `Bearer ${credential.accessToken}` }),
      },
    }), signal);

    if (!response.ok && response.status !== 202) {
      throw new RobloxAnalyticsQueryError(
        `Roblox analytics request failed with HTTP ${response.status}`,
        response.status,
        [429, 500, 503, 504].includes(response.status),
      );
    }

    const payload: unknown = await bounded(() => response.json(), signal);
    if (!payload || typeof payload !== "object") {
      throw new RobloxAnalyticsQueryError("Roblox analytics returned malformed JSON", 502, false);
    }
    return payload as AnalyticsOperation<T>;
  }

  private operationUrl(path: string, universeId: string, kind: "metrics" | "dimension-values") {
    const expectedPrefix = `v1/universes/${universeId}/operations/${kind}/`;
    if (typeof path !== 'string' || !path.startsWith(expectedPrefix) ||
        !/^[A-Za-z0-9_-]+$/.test(path.slice(expectedPrefix.length))) {
      throw new RobloxAnalyticsQueryError("Roblox returned an unexpected operation path", 502, false);
    }
    return `${this.baseUrl}/${path}`;
  }
}

function bounded<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new RobloxAnalyticsQueryError('Roblox analytics deadline exceeded', 504, false));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw new RobloxAnalyticsQueryError('Roblox analytics deadline exceeded', 504, false);
      return work();
    }).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function assertCredential(credential: RobloxAnalyticsCredential) {
  const value = typeof credential === 'string' ? credential : credential.accessToken;
  if (value.trim().length < 10) throw new Error("A Roblox analytics credential is required");
}

function assertUniverseId(universeId: string) {
  if (!/^\d+$/.test(universeId)) throw new Error("universeId must contain only digits");
}

function assertDateWindow(startTime: string, endTime: string) {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new Error("Analytics queries require a valid inclusive start and exclusive end time");
  }
}
