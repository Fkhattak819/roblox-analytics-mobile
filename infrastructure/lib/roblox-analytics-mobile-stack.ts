import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as ce from "aws-cdk-lib/aws-ce";
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDirectory, "../../backend");
const rootLockFile = path.resolve(currentDirectory, "../../package-lock.json");
const resourcePrefix = "roblox-analytics-mobile-dev";

export class RobloxAnalyticsMobileStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add("Project", "roblox-analytics-mobile");
    cdk.Tags.of(this).add("Environment", "dev");
    cdk.Tags.of(this).add("ManagedBy", "aws-cdk");

    const budgetAlertEmail = new cdk.CfnParameter(this, "BudgetAlertEmail", {
      type: "String",
      description: "Email address for AWS budget, cost anomaly, security, and runtime alerts",
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

    const securityAlarmTopic = new sns.Topic(this, 'SecurityAlarmTopic', {
      topicName: `${resourcePrefix}-security-alerts`,
      displayName: 'StudioPulse security alerts',
      enforceSSL: true,
    });
    securityAlarmTopic.addSubscription(
      new subscriptions.EmailSubscription(budgetAlertEmail.valueAsString),
    );

    const applicationTable = new dynamodb.Table(this, "ApplicationTable", {
      tableName: `${resourcePrefix}-app`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      encryption: dynamodb.TableEncryption.DEFAULT,
      timeToLiveAttribute: "ttl",
      deletionProtection: true,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
        recoveryPeriodInDays: 35,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const oauthRedirectUri = new cdk.CfnParameter(this, "RobloxOAuthRedirectUri", {
      type: "String",
      default:
        "https://bqrr070bkf.execute-api.us-east-2.amazonaws.com/v1/auth/roblox/callback",
      allowedPattern: "^https://[^\\s]{1,240}$",
      description: "Exact HTTPS callback registered on the Roblox OAuth application",
    });

    const oauthCredentials = new secretsmanager.Secret(this, "RobloxOAuthCredentials", {
      secretName: "roblox-analytics-mobile/dev/roblox-oauth",
      description: "Roblox OAuth client ID and client secret for the development backend",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ clientId: "replace-after-registration" }),
        generateStringKey: "clientSecret",
        excludePunctuation: true,
        passwordLength: 64,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const analyticsCredentials = new secretsmanager.Secret(this, "RobloxAnalyticsCredentials", {
      secretName: "roblox-analytics-mobile/dev/roblox-analytics-v1",
      description: "Legacy retained rollback secret; no runtime role can read it after OAuth delegation rollout",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ status: "replace-after-creation" }),
        generateStringKey: "setupNonce",
        excludePunctuation: true,
        passwordLength: 32,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const oauthTokenKey = new kms.Key(this, 'RobloxOAuthTokenKey', {
      alias: 'alias/roblox-analytics-mobile-dev-oauth-tokens',
      description: 'Application encryption for delegated Roblox OAuth tokens',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pendingWindow: cdk.Duration.days(30),
    });
    const grantOAuthTokenCrypt = (fn: lambda.IFunction) => fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['kms:Encrypt', 'kms:Decrypt'],
      resources: [oauthTokenKey.keyArn],
      conditions: {
        StringEquals: {
          'kms:EncryptionContext:project': 'roblox-analytics-mobile',
          'kms:EncryptionContext:purpose': 'roblox-delegated-oauth',
        },
      },
    }));

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
      visibilityTimeout: cdk.Duration.seconds(720),
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
      versioned: true,
      lifecycleRules: [
        {
          id: "expire-dev-history",
          enabled: true,
          expiration: cdk.Duration.days(30),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const functionName = `${resourcePrefix}-api`;
    const sessionEpoch = new cdk.CfnParameter(this, "SessionEpoch", {
      type: "String", default: "1", allowedPattern: "^[A-Za-z0-9_-]{1,128}$",
      description: "Change to a never-used value before serving restored auth data, invalidating all old sessions and exchanges",
    });
    const apiLogGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiFunction = new lambdaNodejs.NodejsFunction(this, "ApiFunction", {
      functionName,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(backendRoot, "src/lambda/api-handler.ts"),
      handler: "handler",
      depsLockFilePath: rootLockFile,
      bundling: {
        externalModules: [],
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      logGroup: apiLogGroup,
      environment: {
        APP_ENV: "dev",
        SESSION_EPOCH: sessionEpoch.valueAsString,
        APP_OAUTH_CALLBACK_URI: "robloxanalyticsmobile://oauth/callback",
        ROBLOX_OAUTH_REDIRECT_URI: oauthRedirectUri.valueAsString,
        ROBLOX_OAUTH_SCOPES: "openid profile universe.analytics:read",
        ROBLOX_OAUTH_SECRET_ARN: oauthCredentials.secretArn,
        ROBLOX_OAUTH_TOKEN_KEY_ARN: oauthTokenKey.keyArn,
        TABLE_NAME: applicationTable.tableName,
        SYNC_QUEUE_URL: syncQueue.queueUrl,
        ANALYTICS_UNIVERSE_IDS: '10009166512',
        HISTORY_BUCKET_NAME: historyBucket.bucketName,
      },
    });
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"],
      resources: [applicationTable.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['AUTH#*', 'TENANT#*'] } },
    }));
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:UpdateItem'],
      resources: [applicationTable.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['AUTH#OAUTH#*'] } },
    }));
    oauthCredentials.grantRead(apiFunction);
    grantOAuthTokenCrypt(apiFunction);
    syncQueue.grantSendMessages(apiFunction);
    const failureFilter = new logs.MetricFilter(this, 'AuthFailureMetric', {
      logGroup: apiLogGroup,
      filterPattern: logs.FilterPattern.all(
        logs.FilterPattern.stringValue('$.event', '=', 'auth_result'),
        logs.FilterPattern.stringValue('$.outcome', '=', 'failure'),
      ),
      metricNamespace: 'StudioPulse/Security', metricName: 'AuthFailures',
      metricValue: '1', defaultValue: 0,
    });
    const authFailureAlarm = new cloudwatch.Alarm(this, 'AuthFailureAlarm', {
      metric: failureFilter.metric({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
      threshold: 5, evaluationPeriods: 1, treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    const apiRuntimeFailureAlarm = new cloudwatch.Alarm(this, 'ApiRuntimeFailureAlarm', {
      metric: apiFunction.metricErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) }),
      threshold: 3, evaluationPeriods: 1, treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    const securityAlarmAction = new cloudwatchActions.SnsAction(securityAlarmTopic);
    authFailureAlarm.addAlarmAction(securityAlarmAction);
    apiRuntimeFailureAlarm.addAlarmAction(securityAlarmAction);
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:UpdateItem'],
      resources: [applicationTable.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['LIMIT#*'] } },
    }));

    const workerName = `${resourcePrefix}-analytics-worker`;
    const workerLogGroup = new logs.LogGroup(this, "AnalyticsWorkerLogGroup", {
      logGroupName: `/aws/lambda/${workerName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const analyticsWorker = new lambdaNodejs.NodejsFunction(this, "AnalyticsWorker", {
      functionName: workerName,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(backendRoot, "src/lambda/analytics-worker.ts"),
      handler: "handler",
      depsLockFilePath: rootLockFile,
      bundling: {
        externalModules: [],
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(120),
      memorySize: 256,
      logGroup: workerLogGroup,
      environment: {
        APP_ENV: "dev",
        TABLE_NAME: applicationTable.tableName,
        ROBLOX_OAUTH_SECRET_ARN: oauthCredentials.secretArn,
        ROBLOX_OAUTH_TOKEN_KEY_ARN: oauthTokenKey.keyArn,
        ANALYTICS_UNIVERSE_IDS: "10009166512",
      },
    });
    analyticsWorker.addEventSource(new lambdaEventSources.SqsEventSource(syncQueue, {
      batchSize: 1,
      reportBatchItemFailures: true,
      maxConcurrency: 2,
    }));
    analyticsWorker.addToRolePolicy(new iam.PolicyStatement({
      actions: ["dynamodb:PutItem"],
      resources: [applicationTable.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['TENANT#*'] } },
    }));
    analyticsWorker.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:ConditionCheckItem'],
      resources: [applicationTable.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['AUTH#OAUTH#*'] } },
    }));
    for (const fn of [apiFunction, analyticsWorker]) {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['dynamodb:GetItem'], resources: [applicationTable.tableArn],
        conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['ACCESS#*'] } },
      }));
      fn.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:BatchWriteItem'],
        resources: [applicationTable.tableArn],
        conditions: { 'ForAnyValue:StringLike': { 'dynamodb:LeadingKeys': ['ACCESS#*'] } },
      }));
    }
    analyticsWorker.addToRolePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:ConditionCheckItem'], resources: [applicationTable.tableArn],
      conditions: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['ACCESS#*'] } },
    }));
    oauthCredentials.grantRead(analyticsWorker);
    grantOAuthTokenCrypt(analyticsWorker);

    const apiIntegration = new integrations.HttpLambdaIntegration(
      "ApiIntegration",
      apiFunction,
    );

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: `${resourcePrefix}-http-api`,
      description: "Development API for roblox-analytics-mobile",
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
    new cdk.CfnOutput(this, "RobloxOAuthCallbackUrl", {
      value: oauthRedirectUri.valueAsString,
    });
    new cdk.CfnOutput(this, "RobloxOAuthSecretName", {
      value: oauthCredentials.secretName,
    });
    new cdk.CfnOutput(this, "SyncQueueUrl", {
      value: syncQueue.queueUrl,
    });
    new cdk.CfnOutput(this, "RobloxAnalyticsSecretName", {
      value: analyticsCredentials.secretName,
      description: 'Legacy retained rollback secret; unused by the deployed runtime',
    });
    new cdk.CfnOutput(this, "HistoryBucketName", {
      value: historyBucket.bucketName,
    });
  }
}
