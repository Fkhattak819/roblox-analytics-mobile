import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { AnalyticsSnapshot } from '../../../../contracts/src/analytics.js';
import {
  type AnalyticsSnapshotKey,
  type AnalyticsSnapshotStore,
  validateSnapshotKey,
  validateSnapshotMatchesKey,
} from './snapshot-store.js';

type StoredSnapshot = Readonly<{
  PK: string;
  SK: string;
  type: 'analytics-snapshot';
  updatedAt: string;
  snapshot: AnalyticsSnapshot;
}>;

export class DynamoDbAnalyticsSnapshotStore implements AnalyticsSnapshotStore {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string,
  ) {}

  async getSnapshot(key: AnalyticsSnapshotKey): Promise<AnalyticsSnapshot | null> {
    validateSnapshotKey(key);
    const result = await this.client.send(new GetItemCommand({
      TableName: this.tableName,
      Key: marshall(dynamoKey(key)),
      ConsistentRead: true,
    }));
    if (!result.Item) return null;
    const record = unmarshall(result.Item) as StoredSnapshot;
    if (record.type !== 'analytics-snapshot') return null;
    return validateSnapshotMatchesKey(key, record.snapshot);
  }

  async putSnapshot(key: AnalyticsSnapshotKey, snapshot: AnalyticsSnapshot): Promise<void> {
    const parsed = validateSnapshotMatchesKey(key, snapshot);
    const record: StoredSnapshot = {
      ...dynamoKey(key),
      type: 'analytics-snapshot',
      updatedAt: new Date().toISOString(),
      snapshot: parsed,
    };
    await this.client.send(new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(record, { removeUndefinedValues: true }),
      ConditionExpression: 'attribute_not_exists(PK) OR #snapshot.#asOf <= :asOf',
      ExpressionAttributeNames: {
        '#snapshot': 'snapshot',
        '#asOf': 'asOf',
      },
      ExpressionAttributeValues: marshall({ ':asOf': parsed.asOf ?? record.updatedAt }),
    }));
  }
}

function dynamoKey(key: AnalyticsSnapshotKey) {
  return {
    PK: `TENANT#${key.ownerSub}`,
    SK: `ANALYTICS#${key.universeId}#${key.section}#${key.range}`,
  };
}
