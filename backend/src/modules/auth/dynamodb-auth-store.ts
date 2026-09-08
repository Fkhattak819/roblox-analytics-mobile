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
  clientChallenge?: string;
  clientState?: string;
  user?: RobloxUserProfile;
  authorizedUniverseIds?: string[];
  authGeneration?: string;
  sessionEpoch?: string;
};

export class DynamoDbAuthStore implements AuthStore {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string,
  ) {}

  async getAuthGeneration(userId: string): Promise<string> {
    const result = await this.client.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ PK: `AUTH#GENERATION#${digestOpaqueValue(userId)}`, SK: "AUTH" }),
      ConsistentRead: true,
    }));
    if (!result.Item) return "initial";
    const record = unmarshall(result.Item);
    if (typeof record.generation !== "string" || !record.generation) throw new Error("Invalid auth generation record");
    return record.generation;
  }

  async setAuthGeneration(userId: string, generation: string): Promise<void> {
    await this.client.send(new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({ PK: `AUTH#GENERATION#${digestOpaqueValue(userId)}`, SK: "AUTH", generation }),
    }));
  }

  async putOAuthState(state: string, record: OAuthStateRecord): Promise<void> {
    await this.put("STATE", state, {
      type: "oauth-state",
      sessionEpoch: record.sessionEpoch,
      expiresAt: record.expiresAt,
      codeVerifier: record.codeVerifier,
      clientChallenge: record.clientChallenge,
      clientState: record.clientState,
    });
  }

  async consumeOAuthState(state: string): Promise<OAuthStateRecord | null> {
    const record = await this.consume("STATE", state);
    if (record?.type !== "oauth-state" || !record.codeVerifier || !record.clientChallenge || !record.clientState || !record.sessionEpoch) return null;
    return isCurrent({ codeVerifier: record.codeVerifier, clientChallenge: record.clientChallenge,
      clientState: record.clientState, sessionEpoch: record.sessionEpoch, expiresAt: record.expiresAt });
  }

  async putOAuthExchange(code: string, record: OAuthExchangeRecord): Promise<void> {
    await this.put("EXCHANGE", code, {
      type: "oauth-exchange",
      clientChallenge: record.clientChallenge,
      authGeneration: record.authGeneration,
      sessionEpoch: record.sessionEpoch,
      expiresAt: record.expiresAt,
      user: record.user,
      authorizedUniverseIds: record.authorizedUniverseIds,
    });
  }

  async consumeOAuthExchange(code: string, clientChallenge: string): Promise<OAuthExchangeRecord | null> {
    try {
      // Proof, expiry, and deletion are one operation; no read/delete race exists.
      const result = await this.client.send(new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall(this.key("EXCHANGE", code)),
        ConditionExpression: "#challenge = :challenge AND #expires > :now AND #type = :type",
        ExpressionAttributeNames: { "#challenge": "clientChallenge", "#expires": "expiresAt", "#type": "type" },
        ExpressionAttributeValues: marshall({ ":challenge": clientChallenge, ":now": Date.now(), ":type": "oauth-exchange" }),
        ReturnValues: "ALL_OLD",
      }));
      const record = result.Attributes ? unmarshall(result.Attributes) as StoredRecord : null;
      if (record?.type !== "oauth-exchange" || !record.user || !validUniverseIds(record.authorizedUniverseIds)
        || record.clientChallenge !== clientChallenge
        || !record.authGeneration || !record.sessionEpoch) return null;
      return isCurrent({ user: record.user, authorizedUniverseIds: record.authorizedUniverseIds,
        clientChallenge, authGeneration: record.authGeneration,
        sessionEpoch: record.sessionEpoch, expiresAt: record.expiresAt });
    } catch (error) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") return null;
      throw error;
    }
  }

  async putSession(token: string, record: AppSessionRecord): Promise<void> {
    await this.put("SESSION", token, {
      type: "app-session",
      authGeneration: record.authGeneration,
      sessionEpoch: record.sessionEpoch,
      expiresAt: record.expiresAt,
      user: record.user,
      authorizedUniverseIds: record.authorizedUniverseIds,
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
    if (record.type !== "app-session" || !record.user || !validUniverseIds(record.authorizedUniverseIds)
      || !record.authGeneration || !record.sessionEpoch) return null;
    return isCurrent({ user: record.user, authorizedUniverseIds: record.authorizedUniverseIds,
      authGeneration: record.authGeneration,
      sessionEpoch: record.sessionEpoch, expiresAt: record.expiresAt });
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

function validUniverseIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 1_000
    && value.every((id) => typeof id === 'string' && /^\d{1,20}$/.test(id));
}
