import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { loadConfig } from "../config.js";
import { SecretsManagerAnalyticsApiKeyProvider } from "../modules/analytics/analytics-credentials.js";
import { DynamoDbAnalyticsConnectionStatusStore } from "../modules/analytics/connection-status-store.js";
import { DynamoDbAnalyticsSnapshotStore } from "../modules/analytics/dynamodb-snapshot-store.js";
import { RobloxAnalyticsQueryClient } from "../modules/analytics/roblox-analytics-query.js";
import {
  AnalyticsSnapshotSyncService,
  isSyncableAnalyticsSection,
} from "../modules/analytics/snapshot-sync.js";
import { parseAnalyticsSyncMessage } from "../modules/analytics/sync-jobs.js";

type SqsEvent = Readonly<{
  Records?: Array<Readonly<{ messageId?: string; body?: string }>>;
}>;

type SqsBatchResponse = Readonly<{
  batchItemFailures: Array<Readonly<{ itemIdentifier: string }>>;
}>;

let runtime: ReturnType<typeof createRuntime> | undefined;

export async function handler(event: SqsEvent): Promise<SqsBatchResponse> {
  const failures: Array<{ itemIdentifier: string }> = [];
  for (const record of event.Records ?? []) {
    const itemIdentifier = record.messageId ?? "unknown";
    try {
      await processRecord(record.body);
    } catch {
      failures.push({ itemIdentifier });
    }
  }
  return { batchItemFailures: failures };
}

async function processRecord(body: string | undefined): Promise<void> {
  const config = loadConfig();
  const message = parseAnalyticsSyncMessage(JSON.parse(body ?? ""));
  if (!config.analyticsUniverseIds.includes(message.universeId)) {
    throw new Error("Analytics universe is not allowed");
  }
  if (!isSyncableAnalyticsSection(message.section)) {
    throw new Error("Analytics section is not syncable");
  }
  const dependencies = runtime ??= createRuntime(config);
  const attemptedAt = new Date().toISOString();
  try {
    const apiKey = await dependencies.apiKeyProvider.getApiKey();
    const snapshot = await dependencies.syncService.sync({
      apiKey,
      ownerSub: message.ownerSub,
      universeId: message.universeId,
      section: message.section,
      range: message.range,
    });
    await dependencies.statusStore.put(message.ownerSub, {
      status: "active",
      universeId: message.universeId,
      lastAttemptAt: attemptedAt,
      lastSyncedAt: snapshot.asOf,
      lastSection: message.section,
    });
  } catch (error) {
    await dependencies.statusStore.put(message.ownerSub, {
      status: "error",
      universeId: message.universeId,
      lastAttemptAt: attemptedAt,
      lastSection: message.section,
    });
    throw error;
  }
}

function createRuntime(config: ReturnType<typeof loadConfig>) {
  if (!config.tableName || !config.robloxAnalyticsSecretArn) {
    throw new Error("Analytics worker is not configured");
  }
  const store = new DynamoDbAnalyticsSnapshotStore(new DynamoDBClient({}), config.tableName);
  const statusStore = new DynamoDbAnalyticsConnectionStatusStore(new DynamoDBClient({}), config.tableName);
  return {
    apiKeyProvider: new SecretsManagerAnalyticsApiKeyProvider(
      new SecretsManagerClient({}),
      config.robloxAnalyticsSecretArn,
    ),
    syncService: new AnalyticsSnapshotSyncService(
      new RobloxAnalyticsQueryClient(),
      store,
    ),
    statusStore,
  };
}
