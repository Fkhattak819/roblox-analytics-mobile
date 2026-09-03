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
  template.resourceCountIs("AWS::Lambda::EventSourceMapping", 1);
  template.resourceCountIs("AWS::Budgets::Budget", 1);
  template.resourceCountIs("AWS::CE::AnomalyMonitor", 1);
  template.resourceCountIs("AWS::CE::AnomalySubscription", 1);

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

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: "roblox-analytics-mobile-dev-analytics-worker",
    Handler: "index.handler",
    Runtime: "nodejs22.x",
    Environment: {
      Variables: Match.objectLike({
        ANALYTICS_UNIVERSE_IDS: "10009166512",
      }),
    },
  });

  template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
    BatchSize: 1,
    ScalingConfig: { MaximumConcurrency: 2 },
    FunctionResponseTypes: ["ReportBatchItemFailures"],
  });

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: "roblox-analytics-mobile/dev/roblox-oauth",
    GenerateSecretString: Match.objectLike({
      GenerateStringKey: "clientSecret",
      SecretStringTemplate: '{"clientId":"replace-after-registration"}',
    }),
  });

  template.hasResourceProperties("AWS::SecretsManager::Secret", {
    Name: "roblox-analytics-mobile/dev/roblox-analytics-v1",
    GenerateSecretString: Match.objectLike({
      GenerateStringKey: "setupNonce",
      SecretStringTemplate: '{"status":"replace-after-creation"}',
    }),
  });

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "roblox-analytics-mobile-dev-sync",
    VisibilityTimeout: 300,
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "roblox-analytics-mobile-dev-app",
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
});
