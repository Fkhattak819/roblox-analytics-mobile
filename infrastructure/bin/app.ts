#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { RobloxAnalyticsMobileStack } from "../lib/roblox-analytics-mobile-stack.js";

const app = new cdk.App();

new RobloxAnalyticsMobileStack(app, "RobloxAnalyticsMobileDev", {
  stackName: "roblox-analytics-mobile-dev",
  description: "Credential-free development backend for roblox-analytics-mobile",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-2",
  },
});
