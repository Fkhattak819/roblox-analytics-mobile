import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { Config } from '../../config.js';
import { DynamoDbAnalyticsSnapshotStore } from './dynamodb-snapshot-store.js';
import { DynamoDbAnalyticsConnectionStatusStore } from './connection-status-store.js';
import { InMemoryAnalyticsSnapshotStore } from './snapshot-store.js';

export function createLocalAnalyticsSnapshotStore() {
  return new InMemoryAnalyticsSnapshotStore();
}

export function createAwsAnalyticsSnapshotStore(config: Config) {
  if (!config.tableName) return undefined;
  return new DynamoDbAnalyticsSnapshotStore(new DynamoDBClient({}), config.tableName);
}

export function createAwsAnalyticsConnectionStatusStore(config: Config) {
  if (!config.tableName) return undefined;
  return new DynamoDbAnalyticsConnectionStatusStore(new DynamoDBClient({}), config.tableName);
}
