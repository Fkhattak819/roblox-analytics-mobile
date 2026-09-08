import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'node:crypto';
import { oauthAuthorizationKey as authorizationKey, AnalyticsAccessDenied } from '../analytics/authorization.js';
import type { RobloxOAuthCredentialsProvider } from './oauth-credentials.js';
import {
  RobloxOAuthApi,
  type RefreshedRobloxOAuthAuthorization,
} from './roblox-oauth-api.js';
import { digestOpaqueValue } from './auth-store.js';

const ACCESS_REFRESH_SKEW_MS = 60_000;
const REFRESH_LEASE_MS = 20_000;

type StoredAuthorization = Readonly<{
  encryptedTokens: Uint8Array;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  universeIds: string[];
  version: number;
  refreshLeaseId?: string;
  refreshLeaseExpiresAt?: number;
}>;

type PlaintextTokens = Readonly<{ accessToken: string; refreshToken: string }>;

export interface RobloxAuthorizationVault {
  saveAuthorization(userSub: string, authorization: RefreshedRobloxOAuthAuthorization): Promise<string | undefined>;
  deleteAuthorization(userSub: string): Promise<string | undefined>;
}

export class InMemoryRobloxAuthorizationVault implements RobloxAuthorizationVault {
  readonly #authorizations = new Map<string, RefreshedRobloxOAuthAuthorization>();

  async saveAuthorization(userSub: string, authorization: RefreshedRobloxOAuthAuthorization) {
    const key = digestOpaqueValue(userSub);
    const previous = this.#authorizations.get(key);
    this.#authorizations.set(key, authorization);
    return previous?.refreshToken;
  }

  async deleteAuthorization(userSub: string) {
    const key = digestOpaqueValue(userSub);
    const previous = this.#authorizations.get(key);
    this.#authorizations.delete(key);
    return previous?.refreshToken;
  }
}

export class DynamoKmsRobloxAuthorizationVault implements RobloxAuthorizationVault {
  constructor(
    private readonly dynamo: DynamoDBClient,
    private readonly kms: KMSClient,
    private readonly tableName: string,
    private readonly keyId: string,
    private readonly credentialProvider: RobloxOAuthCredentialsProvider,
    private readonly robloxApi = new RobloxOAuthApi(),
    private readonly now: () => number = Date.now,
    private readonly sleep: (milliseconds: number) => Promise<void> =
      (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ) {}

  async saveAuthorization(userSub: string, authorization: RefreshedRobloxOAuthAuthorization) {
    const encryptedTokens = await this.encrypt(userSub, authorization);
    const result = await this.dynamo.send(new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall(authorizationKey(userSub)),
      UpdateExpression: 'SET #type = :type, encryptedTokens = :tokens, accessExpiresAt = :accessExpires, '
        + 'refreshExpiresAt = :refreshExpires, universeIds = :universes, updatedAt = :updatedAt '
        + 'ADD #version :one REMOVE refreshLeaseId, refreshLeaseExpiresAt',
      ExpressionAttributeNames: { '#type': 'type', '#version': 'version' },
      ExpressionAttributeValues: marshall({
        ':type': 'roblox-oauth-authorization',
        ':tokens': encryptedTokens,
        ':accessExpires': authorization.accessExpiresAt,
        ':refreshExpires': authorization.refreshExpiresAt,
        ':universes': authorization.universeIds,
        ':updatedAt': new Date(this.now()).toISOString(),
        ':one': 1,
      }),
      ReturnValues: 'ALL_OLD',
    }));
    const previous = parseStoredAuthorization(result.Attributes ? unmarshall(result.Attributes) : undefined);
    if (!previous) return undefined;
    return (await this.decrypt(userSub, previous.encryptedTokens)).refreshToken;
  }

  async deleteAuthorization(userSub: string) {
    const result = await this.dynamo.send(new DeleteItemCommand({
      TableName: this.tableName,
      Key: marshall(authorizationKey(userSub)),
      ReturnValues: 'ALL_OLD',
    }));
    const previous = parseStoredAuthorization(result.Attributes ? unmarshall(result.Attributes) : undefined);
    if (!previous) return undefined;
    return (await this.decrypt(userSub, previous.encryptedTokens)).refreshToken;
  }

  async getAccessToken(userSub: string, universeId: string): Promise<string> {
    assertIdentity(userSub, universeId);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const record = await this.get(userSub);
      requireAuthorized(record, universeId, this.now());
      const tokens = await this.decrypt(userSub, record.encryptedTokens);
      if (record.accessExpiresAt > this.now() + ACCESS_REFRESH_SKEW_MS) return tokens.accessToken;

      const leaseId = randomUUID();
      if (!await this.acquireRefreshLease(userSub, record.version, leaseId)) {
        await this.sleep(200 * (attempt + 1));
        continue;
      }

      try {
        const credentials = await this.credentialProvider.getCredentials();
        const refreshed = await this.robloxApi.refreshAuthorization({
          refreshToken: tokens.refreshToken,
          credentials,
        });
        const encryptedTokens = await this.encrypt(userSub, refreshed);
        await this.completeRefresh(userSub, record.version, leaseId, refreshed, encryptedTokens);
        if (!refreshed.universeIds.includes(universeId)) throw new AnalyticsAccessDenied();
        return refreshed.accessToken;
      } catch (error) {
        await this.releaseRefreshLease(userSub, leaseId);
        throw error;
      }
    }
    throw new Error('Roblox authorization refresh is already in progress');
  }

  private async get(userSub: string): Promise<StoredAuthorization | null> {
    const result = await this.dynamo.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall(authorizationKey(userSub)),
      ConsistentRead: true,
    }));
    return parseStoredAuthorization(result.Item ? unmarshall(result.Item) : undefined);
  }

  private async acquireRefreshLease(userSub: string, version: number, leaseId: string) {
    try {
      await this.dynamo.send(new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall(authorizationKey(userSub)),
        UpdateExpression: 'SET refreshLeaseId = :lease, refreshLeaseExpiresAt = :leaseExpires',
        ConditionExpression: '#type = :type AND #version = :version '
          + 'AND (attribute_not_exists(refreshLeaseExpiresAt) OR refreshLeaseExpiresAt < :now)',
        ExpressionAttributeNames: { '#type': 'type', '#version': 'version' },
        ExpressionAttributeValues: marshall({
          ':type': 'roblox-oauth-authorization',
          ':version': version,
          ':lease': leaseId,
          ':leaseExpires': this.now() + REFRESH_LEASE_MS,
          ':now': this.now(),
        }),
      }));
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') return false;
      throw error;
    }
  }

  private async completeRefresh(
    userSub: string,
    version: number,
    leaseId: string,
    authorization: RefreshedRobloxOAuthAuthorization,
    encryptedTokens: Uint8Array,
  ) {
    await this.dynamo.send(new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall(authorizationKey(userSub)),
      UpdateExpression: 'SET encryptedTokens = :tokens, accessExpiresAt = :accessExpires, '
        + 'refreshExpiresAt = :refreshExpires, universeIds = :universes, updatedAt = :updatedAt '
        + 'ADD #version :one REMOVE refreshLeaseId, refreshLeaseExpiresAt',
      ConditionExpression: '#type = :type AND #version = :version AND refreshLeaseId = :lease',
      ExpressionAttributeNames: { '#type': 'type', '#version': 'version' },
      ExpressionAttributeValues: marshall({
        ':type': 'roblox-oauth-authorization',
        ':version': version,
        ':lease': leaseId,
        ':tokens': encryptedTokens,
        ':accessExpires': authorization.accessExpiresAt,
        ':refreshExpires': authorization.refreshExpiresAt,
        ':universes': authorization.universeIds,
        ':updatedAt': new Date(this.now()).toISOString(),
        ':one': 1,
      }),
    }));
  }

  private async releaseRefreshLease(userSub: string, leaseId: string) {
    try {
      await this.dynamo.send(new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall(authorizationKey(userSub)),
        UpdateExpression: 'REMOVE refreshLeaseId, refreshLeaseExpiresAt',
        ConditionExpression: 'refreshLeaseId = :lease',
        ExpressionAttributeValues: marshall({ ':lease': leaseId }),
      }));
    } catch (error) {
      if (!(error instanceof Error && error.name === 'ConditionalCheckFailedException')) throw error;
    }
  }

  private async encrypt(userSub: string, tokens: PlaintextTokens): Promise<Uint8Array> {
    validateTokens(tokens);
    const plaintext: PlaintextTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    const result = await this.kms.send(new EncryptCommand({
      KeyId: this.keyId,
      Plaintext: Buffer.from(JSON.stringify(plaintext), 'utf8'),
      EncryptionContext: encryptionContext(userSub),
    }));
    if (!result.CiphertextBlob) throw new Error('KMS did not return encrypted token material');
    return result.CiphertextBlob;
  }

  private async decrypt(userSub: string, ciphertext: Uint8Array): Promise<PlaintextTokens> {
    const result = await this.kms.send(new DecryptCommand({
      KeyId: this.keyId,
      CiphertextBlob: ciphertext,
      EncryptionContext: encryptionContext(userSub),
    }));
    if (!result.Plaintext) throw new Error('KMS did not return token material');
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(result.Plaintext).toString('utf8'));
    } catch {
      throw new Error('Stored Roblox authorization is invalid');
    }
    validateTokens(parsed);
    return parsed;
  }
}

function encryptionContext(userSub: string) {
  return {
    project: 'roblox-analytics-mobile',
    purpose: 'roblox-delegated-oauth',
    subject: digestOpaqueValue(userSub),
  };
}

function parseStoredAuthorization(value: Record<string, unknown> | undefined): StoredAuthorization | null {
  if (!value || value.type !== 'roblox-oauth-authorization'
    || !(value.encryptedTokens instanceof Uint8Array)
    || !Number.isFinite(value.accessExpiresAt) || !Number.isFinite(value.refreshExpiresAt)
    || !Number.isInteger(value.version) || Number(value.version) < 1
    || !Array.isArray(value.universeIds) || value.universeIds.length > 1_000
    || value.universeIds.some((id) => typeof id !== 'string' || !/^\d{1,20}$/.test(id))) return null;
  return {
    encryptedTokens: value.encryptedTokens,
    accessExpiresAt: Number(value.accessExpiresAt),
    refreshExpiresAt: Number(value.refreshExpiresAt),
    universeIds: [...new Set(value.universeIds as string[])],
    version: Number(value.version),
    ...(typeof value.refreshLeaseId === 'string' ? { refreshLeaseId: value.refreshLeaseId } : {}),
    ...(Number.isFinite(value.refreshLeaseExpiresAt)
      ? { refreshLeaseExpiresAt: Number(value.refreshLeaseExpiresAt) } : {}),
  };
}

function requireAuthorized(record: StoredAuthorization | null, universeId: string, now: number): asserts record is StoredAuthorization {
  if (!record || record.refreshExpiresAt <= now || !record.universeIds.includes(universeId)) {
    throw new AnalyticsAccessDenied();
  }
}

function assertIdentity(userSub: string, universeId: string) {
  if (!/^\d{1,20}$/.test(userSub) || !/^\d{1,20}$/.test(universeId)) throw new AnalyticsAccessDenied();
}

function validateTokens(value: unknown): asserts value is PlaintextTokens {
  if (!value || typeof value !== 'object') throw new Error('Roblox token material is invalid');
  const tokens = value as Record<string, unknown>;
  if (typeof tokens.accessToken !== 'string' || !tokens.accessToken || tokens.accessToken.length > 8_192
    || typeof tokens.refreshToken !== 'string' || !tokens.refreshToken || tokens.refreshToken.length > 8_192) {
    throw new Error('Roblox token material is invalid');
  }
}
