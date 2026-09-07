import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export class AnalyticsAccessDenied extends Error {
  constructor() { super('Analytics access denied'); }
}
export interface AnalyticsAuthorizer {
  requireAccess(ownerSub: string, universeId: string): Promise<void>;
}
export function accessKey(ownerSub: string, universeId: string) {
  if (!/^\d{1,20}$/.test(ownerSub) || !/^\d{1,20}$/.test(universeId)) throw new AnalyticsAccessDenied();
  return { PK: `ACCESS#${ownerSub}`, SK: `UNIVERSE#${universeId}` };
}
// Only an operator-controlled provisioning path may write grants. A Roblox
// identity or deployment-wide universe allowlist alone never grants access.
export class DynamoAnalyticsAuthorizer implements AnalyticsAuthorizer {
  constructor(private readonly client: Pick<DynamoDBClient, 'send'>, private readonly table: string) {}
  async requireAccess(ownerSub: string, universeId: string) {
    const result = await this.client.send(new GetItemCommand({
      TableName: this.table, Key: marshall(accessKey(ownerSub, universeId)), ConsistentRead: true,
    }));
    if (!result.Item) throw new AnalyticsAccessDenied();
    const grant = unmarshall(result.Item);
    if (grant.type !== 'analytics-access' || grant.enabled !== true) throw new AnalyticsAccessDenied();
  }
}

export function accessCondition(table: string, ownerSub: string, universeId: string) {
  return { TableName: table, Key: marshall(accessKey(ownerSub, universeId)),
    ConditionExpression: '#type = :type AND #enabled = :enabled',
    ExpressionAttributeNames: { '#type': 'type', '#enabled': 'enabled' },
    ExpressionAttributeValues: marshall({ ':type': 'analytics-access', ':enabled': true }) };
}
