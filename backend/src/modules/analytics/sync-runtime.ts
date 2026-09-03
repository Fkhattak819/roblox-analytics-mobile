import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";
import type { Config } from "../../config.js";
import { DynamoDbAnalyticsSyncGate, SqsAnalyticsSyncQueue } from "./aws-sync-jobs.js";
import { AnalyticsSyncJobService } from "./sync-jobs.js";

export function createAwsAnalyticsSyncJobService(config: Config) {
  if (!config.tableName || !config.syncQueueUrl) return undefined;
  return new AnalyticsSyncJobService(
    new DynamoDbAnalyticsSyncGate(new DynamoDBClient({}), config.tableName),
    new SqsAnalyticsSyncQueue(new SQSClient({}), config.syncQueueUrl),
  );
}
