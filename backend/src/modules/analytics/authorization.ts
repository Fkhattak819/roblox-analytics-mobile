import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { digestOpaqueValue } from '../auth/auth-store.js';

export class AnalyticsAccessDenied extends Error {
  constructor() { super('Analytics access denied'); }
}
export interface AnalyticsAuthorizer {
  requireAccess(ownerSub: string, universeId: string): Promise<void>;
}
export function oauthAuthorizationKey(ownerSub: string) {
  if (!/^\d{1,20}$/.test(ownerSub)) throw new AnalyticsAccessDenied();
  return { PK: `AUTH#OAUTH#${digestOpaqueValue(ownerSub)}`, SK: 'AUTH' as const };
}
export function accessKey(ownerSub: string, universeId: string) {
  if (!/^\d{1,20}$/.test(ownerSub) || !/^\d{1,20}$/.test(universeId)) throw new AnalyticsAccessDenied();
  return oauthAuthorizationKey(ownerSub);
}
// Roblox's concrete OAuth resource grant is the tenant authorization source of
// truth. Config independently chooses static-allowlist or OAuth-resource admission.
export class DynamoAnalyticsAuthorizer implements AnalyticsAuthorizer {
  constructor(private readonly client: Pick<DynamoDBClient, 'send'>, private readonly table: string) {}
  async requireAccess(ownerSub: string, universeId: string) {
    const result = await this.client.send(new GetItemCommand({
      TableName: this.table, Key: marshall(accessKey(ownerSub, universeId)), ConsistentRead: true,
    }));
    if (!result.Item) throw new AnalyticsAccessDenied();
    const grant = unmarshall(result.Item);
    if (grant.type !== 'roblox-oauth-authorization'
      || !Number.isFinite(grant.refreshExpiresAt) || grant.refreshExpiresAt <= Date.now()
      || !Array.isArray(grant.universeIds) || !grant.universeIds.includes(universeId)) {
      throw new AnalyticsAccessDenied();
    }
  }
}

export function accessCondition(table: string, ownerSub: string, universeId: string) {
  return { TableName: table, Key: marshall(accessKey(ownerSub, universeId)),
    ConditionExpression: '#type = :type AND refreshExpiresAt > :now AND contains(universeIds, :universe)',
    ExpressionAttributeNames: { '#type': 'type' },
    ExpressionAttributeValues: marshall({
      ':type': 'roblox-oauth-authorization', ':now': Date.now(), ':universe': universeId,
    }) };
}
