import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { marshall } from "@aws-sdk/util-dynamodb";
import type {
  AnalyticsSyncGate,
  AnalyticsSyncMessage,
  AnalyticsSyncQueue,
} from "./sync-jobs.js";

export class DynamoDbAnalyticsSyncGate implements AnalyticsSyncGate {
  constructor(
    private readonly client: DynamoDBClient,
    private readonly tableName: string,
  ) {}

  async tryAcquire(message: AnalyticsSyncMessage, cooldownSeconds: number): Promise<boolean> {
    const nowEpoch = Math.floor(Date.parse(message.requestedAt) / 1_000);
    try {
      await this.client.send(new PutItemCommand({
        TableName: this.tableName,
        Item: marshall({
          PK: `TENANT#${message.ownerSub}`,
          SK: `SYNC#${message.universeId}#${message.section}#${message.range}`,
          type: "analytics-sync-gate",
          jobId: message.jobId,
          requestedAt: message.requestedAt,
          retryAfterEpoch: nowEpoch + cooldownSeconds,
          ttl: nowEpoch + 24 * 60 * 60,
        }),
        ConditionExpression: "attribute_not_exists(PK) OR retryAfterEpoch < :now",
        ExpressionAttributeValues: marshall({ ":now": nowEpoch }),
      }));
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) return false;
      throw error;
    }
  }
}

export class SqsAnalyticsSyncQueue implements AnalyticsSyncQueue {
  constructor(
    private readonly client: SQSClient,
    private readonly queueUrl: string,
  ) {}

  async enqueue(message: AnalyticsSyncMessage): Promise<void> {
    await this.client.send(new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    }));
  }
}
