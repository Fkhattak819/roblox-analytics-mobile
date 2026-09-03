import { randomUUID } from "node:crypto";
import {
  analyticsSectionIds,
  type AnalyticsDateRange,
  type AnalyticsSectionId,
} from "../../../../contracts/src/analytics.js";

export type AnalyticsSyncMessage = Readonly<{
  version: 1;
  jobId: string;
  ownerSub: string;
  universeId: string;
  section: AnalyticsSectionId;
  range: AnalyticsDateRange;
  requestedAt: string;
}>;

export interface AnalyticsSyncGate {
  tryAcquire(message: AnalyticsSyncMessage, cooldownSeconds: number): Promise<boolean>;
}

export interface AnalyticsSyncQueue {
  enqueue(message: AnalyticsSyncMessage): Promise<void>;
}

export type AnalyticsSyncRequest = Pick<
  AnalyticsSyncMessage,
  "ownerSub" | "universeId" | "section" | "range"
>;

export class AnalyticsSyncJobService {
  constructor(
    private readonly gate: AnalyticsSyncGate,
    private readonly queue: AnalyticsSyncQueue,
    private readonly now: () => Date = () => new Date(),
    private readonly cooldownSeconds = 60,
  ) {}

  async request(input: AnalyticsSyncRequest) {
    const requestedAt = this.now();
    const message: AnalyticsSyncMessage = {
      version: 1,
      jobId: randomUUID(),
      ...input,
      requestedAt: requestedAt.toISOString(),
    };
    const acquired = await this.gate.tryAcquire(message, this.cooldownSeconds);
    if (!acquired) {
      return { status: "already_queued" as const, retryAfterSeconds: this.cooldownSeconds };
    }
    await this.queue.enqueue(message);
    return {
      status: "queued" as const,
      jobId: message.jobId,
      retryAfterSeconds: this.cooldownSeconds,
    };
  }
}

export function parseAnalyticsSyncMessage(value: unknown): AnalyticsSyncMessage {
  if (!value || typeof value !== "object") throw new Error("Malformed analytics sync job");
  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== 1
    || typeof candidate.jobId !== "string"
    || typeof candidate.ownerSub !== "string"
    || typeof candidate.universeId !== "string"
    || !/^\d+$/.test(candidate.universeId)
    || typeof candidate.section !== "string"
    || !(analyticsSectionIds as readonly string[]).includes(candidate.section)
    || (candidate.range !== "24H" && candidate.range !== "7D" && candidate.range !== "28D" && candidate.range !== "56D" && candidate.range !== "90D")
    || typeof candidate.requestedAt !== "string"
    || !Number.isFinite(Date.parse(candidate.requestedAt))
  ) throw new Error("Malformed analytics sync job");
  return candidate as unknown as AnalyticsSyncMessage;
}
