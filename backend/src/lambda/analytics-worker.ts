import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { KMSClient } from '@aws-sdk/client-kms';
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { isAnalyticsUniverseAllowed, loadConfig } from "../config.js";
import { DynamoDbAnalyticsConnectionStatusStore } from "../modules/analytics/connection-status-store.js";
import { DynamoDbAnalyticsSnapshotStore } from "../modules/analytics/dynamodb-snapshot-store.js";
import { RobloxAnalyticsQueryClient } from "../modules/analytics/roblox-analytics-query.js";
import {
  AnalyticsSnapshotSyncService,
  isSyncableAnalyticsSection,
} from "../modules/analytics/snapshot-sync.js";
import { parseAnalyticsSyncMessage } from "../modules/analytics/sync-jobs.js";
import { DynamoAnalyticsAuthorizer } from '../modules/analytics/authorization.js';
import type { AnalyticsAuthorizer } from '../modules/analytics/authorization.js';
import type { AnalyticsConnectionStatusStore } from '../modules/analytics/connection-status-store.js';
import { WorkBudget, budgetClient } from '../modules/analytics/work-budget.js';
import { SecretsManagerOAuthCredentialsProvider } from '../modules/auth/oauth-credentials.js';
import { DynamoKmsRobloxAuthorizationVault } from '../modules/auth/roblox-authorization-vault.js';

type SqsEvent = Readonly<{
  Records?: Array<Readonly<{ messageId?: string; body?: string }>>;
}>;

type SqsBatchResponse = Readonly<{
  batchItemFailures: Array<Readonly<{ itemIdentifier: string }>>;
}>;

const dynamoClient = new DynamoDBClient({ maxAttempts: 1 });
const secretsClient = new SecretsManagerClient({ maxAttempts: 1 });
const kmsClient = new KMSClient({ maxAttempts: 1 });

export async function handler(event: SqsEvent, context?: { getRemainingTimeInMillis(): number }): Promise<SqsBatchResponse> {
  const budget = new WorkBudget(Math.min(110_000, (context?.getRemainingTimeInMillis() ?? 120_000) - 2_000));
  try {
    return await processBatch(event, budget);
  } finally { budget.close(); }
}

async function processBatch(event: SqsEvent, budget: WorkBudget): Promise<SqsBatchResponse> {
  const failures: Array<{ itemIdentifier: string }> = [];
  for (const record of event.Records ?? []) {
    const itemIdentifier = record.messageId ?? "unknown";
    try {
      await budget.run(() => processRecord(record.body, budget));
    } catch {
      failures.push({ itemIdentifier });
    }
  }
  return { batchItemFailures: failures };
}

async function processRecord(body: string | undefined, budget: WorkBudget): Promise<void> {
  const config = loadConfig();
  await processAnalyticsMessage(body, config, createRuntime(config, budget));
}

export type WorkerDependencies = {
  authorizer: AnalyticsAuthorizer;
  accessTokenProvider: { getAccessToken(ownerSub: string, universeId: string): Promise<string> };
  syncService: Pick<AnalyticsSnapshotSyncService, 'sync'>;
  statusStore: AnalyticsConnectionStatusStore;
};

export async function processAnalyticsMessage(body: string | undefined, config: ReturnType<typeof loadConfig>, dependencies: WorkerDependencies): Promise<void> {
  const message = parseAnalyticsSyncMessage(JSON.parse(body ?? ""));
  if (!isAnalyticsUniverseAllowed(config, message.universeId)) {
    throw new Error("Analytics universe is not allowed");
  }
  if (!isSyncableAnalyticsSection(message.section)) {
    throw new Error("Analytics section is not syncable");
  }
  await dependencies.authorizer.requireAccess(message.ownerSub, message.universeId);
  const attemptedAt = new Date().toISOString();
  try {
    const accessToken = await dependencies.accessTokenProvider.getAccessToken(
      message.ownerSub,
      message.universeId,
    );
    await dependencies.authorizer.requireAccess(message.ownerSub, message.universeId);
    const snapshot = await dependencies.syncService.sync({
      credential: { type: 'oauth', accessToken },
      ownerSub: message.ownerSub,
      universeId: message.universeId,
      section: message.section,
      range: message.range,
    });
    await dependencies.authorizer.requireAccess(message.ownerSub, message.universeId);
    await dependencies.statusStore.put(message.ownerSub, {
      status: "active",
      universeId: message.universeId,
      lastAttemptAt: attemptedAt,
      lastSyncedAt: snapshot.asOf,
      lastSection: message.section,
    });
  } catch (error) {
    await dependencies.authorizer.requireAccess(message.ownerSub, message.universeId);
    await dependencies.statusStore.put(message.ownerSub, {
      status: "error",
      universeId: message.universeId,
      lastAttemptAt: attemptedAt,
      lastSection: message.section,
    });
    throw error;
  }
}

function createRuntime(config: ReturnType<typeof loadConfig>, budget: WorkBudget) {
  if (!config.tableName || !config.robloxOAuthSecretArn || !config.robloxOAuthTokenKeyArn) {
    throw new Error("Analytics worker is not configured");
  }
  const client = budgetClient(dynamoClient, budget);
  const store = new DynamoDbAnalyticsSnapshotStore(client, config.tableName);
  const statusStore = new DynamoDbAnalyticsConnectionStatusStore(client, config.tableName);
  const credentials = new SecretsManagerOAuthCredentialsProvider(
    budgetClient(secretsClient, budget),
    config.robloxOAuthSecretArn,
  );
  const authorizationVault = new DynamoKmsRobloxAuthorizationVault(
    client,
    budgetClient(kmsClient, budget),
    config.tableName,
    config.robloxOAuthTokenKeyArn,
    credentials,
  );
  return {
    authorizer: new DynamoAnalyticsAuthorizer(client, config.tableName),
    accessTokenProvider: authorizationVault,
    syncService: new AnalyticsSnapshotSyncService(
      new RobloxAnalyticsQueryClient({ signal: budget.signal }),
      store,
    ),
    statusStore,
  };
}
