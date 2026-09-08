import test from "node:test";
import assert from "node:assert/strict";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { RobloxAnalyticsMobileStack } from "../lib/roblox-analytics-mobile-stack.js";

test("development stack keeps OAuth state bounded and secrets server-side", () => {
  const app = new cdk.App();
  const stack = new RobloxAnalyticsMobileStack(app, "TestStack", {
    env: { account: "111111111111", region: "us-east-2" },
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  template.resourceCountIs("AWS::Lambda::Function", 2);
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::S3::Bucket", 1);
  template.resourceCountIs("AWS::SecretsManager::Secret", 2);
  template.resourceCountIs("AWS::KMS::Key", 0);
  template.resourceCountIs("AWS::IAM::Policy", 2);
  template.resourceCountIs('AWS::Lambda::EventSourceMapping', 1);
  template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
    BatchSize: 1, FunctionResponseTypes: ['ReportBatchItemFailures'], ScalingConfig: { MaximumConcurrency: 2 },
  });
  const policies = Object.values(template.findResources('AWS::IAM::Policy'));
  for (const policy of policies) {
    const statements = policy.Properties.PolicyDocument.Statement;
    assert.ok(statements.some((statement: { Effect: string; Condition?: Record<string, unknown> }) =>
      statement.Effect === 'Deny' && JSON.stringify(statement.Condition).includes('ACCESS#*')));
  }
  template.resourceCountIs("AWS::Budgets::Budget", 1);
  template.resourceCountIs("AWS::CE::AnomalyMonitor", 1);
  template.resourceCountIs("AWS::CE::AnomalySubscription", 1);
  template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
  template.resourceCountIs('AWS::Logs::MetricFilter', 1);
  template.resourceCountIs('AWS::SNS::Topic', 1);
  template.resourceCountIs('AWS::SNS::Subscription', 1);
  template.hasResourceProperties('AWS::SNS::Subscription', {
    Protocol: 'email',
    Endpoint: { Ref: 'BudgetAlertEmail' },
  });
  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: { Statement: Match.arrayWith([Match.objectLike({
      Action: 'dynamodb:UpdateItem',
      Condition: { 'ForAllValues:StringLike': { 'dynamodb:LeadingKeys': ['LIMIT#*'] } },
    })]) },
  });
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    Namespace: 'StudioPulse/Security', MetricName: 'AuthFailures',
    Threshold: 5, Period: 300, EvaluationPeriods: 1,
    TreatMissingData: 'notBreaching', AlarmActions: Match.anyValue(),
  });
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    MetricName: 'Errors', Threshold: 3, Period: 300, EvaluationPeriods: 1,
    TreatMissingData: 'notBreaching', AlarmActions: Match.anyValue(),
  });

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: "roblox-analytics-mobile-dev-api",
    Handler: "index.handler",
    Runtime: "nodejs22.x",
    Environment: {
      Variables: Match.objectLike({
        APP_ENV: "dev",
        APP_OAUTH_CALLBACK_URI: "robloxanalyticsmobile://oauth/callback",
        ROBLOX_OAUTH_SCOPES: "openid profile",
      }),
    },
  });

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: "roblox-analytics-mobile/dev/roblox-oauth",
    GenerateSecretString: Match.objectLike({
      GenerateStringKey: "clientSecret",
      SecretStringTemplate: '{"clientId":"replace-after-registration"}',
    }),
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "roblox-analytics-mobile-dev-app",
    DeletionProtectionEnabled: true,
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: true,
      RecoveryPeriodInDays: 35,
    },
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  template.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
    DefaultRouteSettings: {
      ThrottlingBurstLimit: 10,
      ThrottlingRateLimit: 5,
    },
  });

  template.hasResourceProperties("AWS::Budgets::Budget", {
    Budget: {
      BudgetLimit: { Amount: 10, Unit: "USD" },
      BudgetName: "roblox-analytics-mobile-monthly-10-usd",
      BudgetType: "COST",
      TimeUnit: "MONTHLY",
    },
  });

  assert.doesNotThrow(() => template.toJSON());
  template.hasResourceProperties('AWS::S3::Bucket', {
    VersioningConfiguration: { Status: 'Enabled' },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true, BlockPublicPolicy: true,
      IgnorePublicAcls: true, RestrictPublicBuckets: true,
    },
    LifecycleConfiguration: { Rules: Match.arrayWith([Match.objectLike({
      ExpirationInDays: 30, NoncurrentVersionExpiration: { NoncurrentDays: 30 },
    })]) },
  });
  const resources = template.toJSON().Resources;
  const worker = Object.values(resources).find((resource: any) =>
    resource.Type === 'AWS::Lambda::Function' && resource.Properties.FunctionName.endsWith('-analytics-worker')) as any;
  const queue = Object.values(resources).find((resource: any) =>
    resource.Type === 'AWS::SQS::Queue' && resource.Properties.QueueName.endsWith('-sync')) as any;
  assert.ok(queue.Properties.VisibilityTimeout >= 6 * worker.Properties.Timeout);
  for (const resource of Object.values(resources) as any[]) {
    if (['AWS::DynamoDB::Table', 'AWS::S3::Bucket', 'AWS::SecretsManager::Secret'].includes(resource.Type)) {
      assert.equal(resource.DeletionPolicy, 'Retain');
      assert.equal(resource.UpdateReplacePolicy, 'Retain');
    }
  }
});
