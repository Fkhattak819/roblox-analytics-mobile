import test from "node:test";
import assert from "node:assert/strict";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { RobloxAnalyticsMobileStack } from "../lib/roblox-analytics-mobile-stack.js";

test("development stack stays small, bounded, and credential-free", () => {
  const app = new cdk.App();
  const stack = new RobloxAnalyticsMobileStack(app, "TestStack", {
    env: { account: "111111111111", region: "us-east-2" },
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
  template.resourceCountIs("AWS::Lambda::Function", 1);
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::S3::Bucket", 1);
  template.resourceCountIs("AWS::KMS::Key", 0);
  template.resourceCountIs("AWS::IAM::Policy", 0);
  template.resourceCountIs("AWS::Budgets::Budget", 1);
  template.resourceCountIs("AWS::CE::AnomalyMonitor", 1);
  template.resourceCountIs("AWS::CE::AnomalySubscription", 1);

  template.hasResourceProperties("AWS::Lambda::Function", {
    FunctionName: "roblox-analytics-mobile-dev-api",
    Handler: "dist/backend/src/lambda/api-handler.handler",
    Runtime: "nodejs22.x",
    Environment: {
      Variables: Match.objectLike({ APP_ENV: "dev" }),
    },
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
