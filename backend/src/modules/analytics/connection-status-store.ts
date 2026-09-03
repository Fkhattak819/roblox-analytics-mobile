import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { AnalyticsSectionId } from "../../../../contracts/src/analytics.js";

export type AnalyticsConnectionStatus = Readonly<{
  status: "active" | "error";
  universeId: string;
  lastAttemptAt: string;
  lastSyncedAt?: string;
  lastSection?: AnalyticsSectionId;
}>;

export interface AnalyticsConnectionStatusStore {
  get(ownerSub: string, universeId: string): Promise<AnalyticsConnectionStatus | null>;
  put(ownerSub: string, status: AnalyticsConnectionStatus): Promise<void>;
}

export class DynamoDbAnalyticsConnectionStatusStore implements AnalyticsConnectionStatusStore {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string,
  ) {}

  async get(ownerSub: string, universeId: string): Promise<AnalyticsConnectionStatus | null> {
    const result = await this.client.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall(key(ownerSub, universeId)),
      ConsistentRead: true,
    }));
    if (!result.Item) return null;
    const record = unmarshall(result.Item) as Record<string, unknown>;
    if (record.type !== "analytics-connection-status") return null;
    return {
      status: record.status === "active" ? "active" : "error",
      universeId,
      lastAttemptAt: String(record.lastAttemptAt),
      ...(typeof record.lastSyncedAt === "string" ? { lastSyncedAt: record.lastSyncedAt } : {}),
      ...(typeof record.lastSection === "string" ? { lastSection: record.lastSection as AnalyticsSectionId } : {}),
    };
  }

  async put(ownerSub: string, status: AnalyticsConnectionStatus): Promise<void> {
    await this.client.send(new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        ...key(ownerSub, status.universeId),
        type: "analytics-connection-status",
        ...status,
      }, { removeUndefinedValues: true }),
    }));
  }
}

function key(ownerSub: string, universeId: string) {
  return { PK: `TENANT#${ownerSub}`, SK: `CONNECTION#ANALYTICS#${universeId}` };
}
