import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  digestOpaqueValue,
  type AppSessionRecord,
  type AuthStore,
  type OAuthExchangeRecord,
  type OAuthStateRecord,
  type RobloxUserProfile,
} from "./auth-store.js";

type StoredRecord = {
  PK: string;
  SK: "AUTH";
  type: "oauth-state" | "oauth-exchange" | "app-session";
  expiresAt: number;
  ttl: number;
  codeVerifier?: string;
  user?: RobloxUserProfile;
};

export class DynamoDbAuthStore implements AuthStore {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string,
  ) {}

  async putOAuthState(state: string, record: OAuthStateRecord): Promise<void> {
    await this.put("STATE", state, {
      type: "oauth-state",
      expiresAt: record.expiresAt,
      codeVerifier: record.codeVerifier,
    });
  }

  async consumeOAuthState(state: string): Promise<OAuthStateRecord | null> {
    const record = await this.consume("STATE", state);
    if (record?.type !== "oauth-state" || !record.codeVerifier) return null;
    return isCurrent({ codeVerifier: record.codeVerifier, expiresAt: record.expiresAt });
  }

  async putOAuthExchange(code: string, record: OAuthExchangeRecord): Promise<void> {
    await this.put("EXCHANGE", code, {
      type: "oauth-exchange",
      expiresAt: record.expiresAt,
      user: record.user,
    });
  }

  async consumeOAuthExchange(code: string): Promise<OAuthExchangeRecord | null> {
    const record = await this.consume("EXCHANGE", code);
    if (record?.type !== "oauth-exchange" || !record.user) return null;
    return isCurrent({ user: record.user, expiresAt: record.expiresAt });
  }

  async putSession(token: string, record: AppSessionRecord): Promise<void> {
    await this.put("SESSION", token, {
      type: "app-session",
      expiresAt: record.expiresAt,
      user: record.user,
    });
  }

  async getSession(token: string): Promise<AppSessionRecord | null> {
    const result = await this.client.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall(this.key("SESSION", token)),
      ConsistentRead: true,
    }));
    if (!result.Item) return null;
    const record = unmarshall(result.Item) as StoredRecord;
    if (record.type !== "app-session" || !record.user) return null;
    return isCurrent({ user: record.user, expiresAt: record.expiresAt });
  }

  async deleteSession(token: string): Promise<void> {
    await this.client.send(new DeleteItemCommand({
      TableName: this.tableName,
      Key: marshall(this.key("SESSION", token)),
    }));
  }

  private async put(
    kind: "STATE" | "EXCHANGE" | "SESSION",
    opaqueValue: string,
    record: Omit<StoredRecord, "PK" | "SK" | "ttl">,
  ): Promise<void> {
    const item: StoredRecord = {
      ...this.key(kind, opaqueValue),
      ...record,
      ttl: Math.floor(record.expiresAt / 1000),
    };
    await this.client.send(new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
    }));
  }

  private async consume(
    kind: "STATE" | "EXCHANGE",
    opaqueValue: string,
  ): Promise<StoredRecord | null> {
    const result = await this.client.send(new DeleteItemCommand({
      TableName: this.tableName,
      Key: marshall(this.key(kind, opaqueValue)),
      ReturnValues: "ALL_OLD",
    }));
    return result.Attributes ? (unmarshall(result.Attributes) as StoredRecord) : null;
  }

  private key(kind: "STATE" | "EXCHANGE" | "SESSION", opaqueValue: string) {
    return {
      PK: `AUTH#${kind}#${digestOpaqueValue(opaqueValue)}`,
      SK: "AUTH" as const,
    };
  }
}

function isCurrent<T extends { expiresAt: number }>(record: T): T | null {
  return Number.isFinite(record.expiresAt) && record.expiresAt > Date.now() ? record : null;
}

