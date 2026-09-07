import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

export type LoginAction = 'start' | 'callback' | 'exchange';
export interface LoginLimiter {
  consume(address: string, action: LoginAction): Promise<{ allowed: boolean; retryAfter: number }>;
}
const limits: Record<LoginAction, number> = { start: 10, callback: 30, exchange: 30 };

export class DynamoLoginLimiter implements LoginLimiter {
  constructor(private readonly client: Pick<DynamoDBClient, 'send'>,
    private readonly table: string, private readonly now = Date.now) {}

  async consume(address: string, action: LoginAction) {
    if (!isIP(address)) throw new Error('Client address unavailable');
    // Canonical IPv6 spelling prevents alternate forms creating separate buckets.
    const normalized = isIP(address) === 6 ? new URL(`http://[${address}]`).hostname : address;
    const second = Math.floor(this.now() / 1000);
    const window = Math.floor(second / 60);
    const retryAfter = 60 - second % 60;
    const digest = createHash('sha256').update(normalized).digest('hex');
    try {
      await this.client.send(new UpdateItemCommand({
        TableName: this.table,
        Key: marshall({ PK: `LIMIT#${action}#${window}#${digest}`, SK: 'LIMIT' }),
        UpdateExpression: 'SET #ttl = :ttl ADD #count :one',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
        ExpressionAttributeNames: { '#ttl': 'ttl', '#count': 'count' },
        ExpressionAttributeValues: marshall({ ':ttl': (window + 2) * 60, ':one': 1, ':limit': limits[action] }),
      }), { abortSignal: AbortSignal.timeout(1000) });
      return { allowed: true, retryAfter };
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        return { allowed: false, retryAfter };
      }
      throw new Error('Login limiter unavailable');
    }
  }
}

export function loginAction(method: string, path: string): LoginAction | undefined {
  if (method === 'GET' && path === '/v2/auth/roblox/start') return 'start';
  if (method === 'GET' && path === '/v1/auth/roblox/callback') return 'callback';
  if (method === 'POST' && path === '/v2/auth/session/exchange') return 'exchange';
  return undefined;
}
