import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as ce from "aws-cdk-lib/aws-ce";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDirectory, "../../backend");
const resourcePrefix = "roblox-analytics-mobile-dev";

export class RobloxAnalyticsMobileStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add("Project", "roblox-analytics-mobile");
    cdk.Tags.of(this).add("Environment", "dev");
    cdk.Tags.of(this).add("ManagedBy", "aws-cdk");

    const budgetAlertEmail = new cdk.CfnParameter(this, "BudgetAlertEmail", {
      type: "String",
      description: "Email address for AWS budget and cost anomaly alerts",
      allowedPattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      constraintDescription: "Enter a valid email address",
    });

    new budgets.CfnBudget(this, "MonthlyCostBudget", {
      budget: {
        budgetName: "roblox-analytics-mobile-monthly-10-usd",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: 10, unit: "USD" },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold: 50,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            { address: budgetAlertEmail.valueAsString, subscriptionType: "EMAIL" },
          ],
        },
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "ACTUAL",
            threshold: 80,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            { address: budgetAlertEmail.valueAsString, subscriptionType: "EMAIL" },
          ],
        },
        {
          notification: {
            comparisonOperator: "GREATER_THAN",
            notificationType: "FORECASTED",
            threshold: 100,
            thresholdType: "PERCENTAGE",
          },
          subscribers: [
            { address: budgetAlertEmail.valueAsString, subscriptionType: "EMAIL" },
          ],
        },
      ],
    });

    const anomalyMonitor = new ce.CfnAnomalyMonitor(this, "AccountCostAnomalyMonitor", {
      monitorName: "roblox-analytics-mobile-account-monitor",
      monitorType: "CUSTOM",
      monitorSpecification: cdk.Fn.sub(
        '{"Dimensions":{"Key":"LINKED_ACCOUNT","Values":["${AWS::AccountId}"]}}',
      ),
    });

    new ce.CfnAnomalySubscription(this, "AccountCostAnomalySubscription", {
      subscriptionName: "roblox-analytics-mobile-daily-cost-anomalies",
      frequency: "DAILY",
      monitorArnList: [anomalyMonitor.attrMonitorArn],
      subscribers: [
        { address: budgetAlertEmail.valueAsString, type: "EMAIL" },
      ],
      thresholdExpression: JSON.stringify({
        Dimensions: {
          Key: "ANOMALY_TOTAL_IMPACT_ABSOLUTE",
          MatchOptions: ["GREATER_THAN_OR_EQUAL"],
          Values: ["2"],
        },
      }),
    });

    const applicationTable = new dynamodb.Table(this, "ApplicationTable", {
      tableName: `${resourcePrefix}-app`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      encryption: dynamodb.TableEncryption.DEFAULT,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const deadLetterQueue = new sqs.Queue(this, "SyncDeadLetterQueue", {
      queueName: `${resourcePrefix}-sync-dlq`,
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      retentionPeriod: cdk.Duration.days(14),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const syncQueue = new sqs.Queue(this, "SyncQueue", {
      queueName: `${resourcePrefix}-sync`,
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      retentionPeriod: cdk.Duration.days(4),
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const historyBucket = new s3.Bucket(this, "HistoryBucket", {
      bucketName: `${resourcePrefix}-history-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      lifecycleRules: [
        {
          id: "expire-dev-history",
          enabled: true,
          expiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const functionName = `${resourcePrefix}-api`;
    const apiLogGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiFunction = new lambda.Function(this, "ApiFunction", {
      functionName,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "dist/lambda/api-handler.handler",
      code: lambda.Code.fromAsset(backendRoot, {
        exclude: ["src/**", "tests/**", "tsconfig.json", "README.md", ".env*", ".gitignore"],
      }),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      logGroup: apiLogGroup,
      environment: {
        APP_ENV: "dev",
        TABLE_NAME: applicationTable.tableName,
        SYNC_QUEUE_URL: syncQueue.queueUrl,
        HISTORY_BUCKET_NAME: historyBucket.bucketName,
      },
    });

    const apiIntegration = new integrations.HttpLambdaIntegration(
      "ApiIntegration",
      apiFunction,
    );

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: `${resourcePrefix}-http-api`,
      description: "Credential-free dev API for roblox-analytics-mobile",
      defaultIntegration: apiIntegration,
    });

    const defaultStage = httpApi.defaultStage;
    if (!defaultStage) throw new Error("HTTP API default stage was not created");
    const cfnStage = defaultStage.node.defaultChild as apigatewayv2.CfnStage;
    cfnStage.defaultRouteSettings = {
      throttlingBurstLimit: 10,
      throttlingRateLimit: 5,
    };

    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
      description: "Base URL for the development API",
    });
    new cdk.CfnOutput(this, "ApplicationTableName", {
      value: applicationTable.tableName,
    });
    new cdk.CfnOutput(this, "SyncQueueUrl", {
      value: syncQueue.queueUrl,
    });
    new cdk.CfnOutput(this, "HistoryBucketName", {
      value: historyBucket.bucketName,
    });
  }
}
