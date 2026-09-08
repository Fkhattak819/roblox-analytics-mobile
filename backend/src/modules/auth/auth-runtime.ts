import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { KMSClient } from '@aws-sdk/client-kms';
import type { Config } from "../../config.js";
import { AuthService } from "./auth-service.js";
import { DynamoDbAuthStore } from "./dynamodb-auth-store.js";
import { InMemoryAuthStore } from "./in-memory-auth-store.js";
import {
  SecretsManagerOAuthCredentialsProvider,
  StaticOAuthCredentialsProvider,
} from "./oauth-credentials.js";
import { DynamoKmsRobloxAuthorizationVault } from './roblox-authorization-vault.js';

export function createLocalAuthService(config: Config): AuthService {
  return new AuthService(
    config,
    new InMemoryAuthStore(),
    new StaticOAuthCredentialsProvider(
      config.robloxOAuthClientId && config.robloxOAuthClientSecret
        ? {
            clientId: config.robloxOAuthClientId,
            clientSecret: config.robloxOAuthClientSecret,
          }
        : undefined,
    ),
  );
}

export function createAwsAuthService(config: Config): AuthService | undefined {
  if (!config.tableName || !config.robloxOAuthSecretArn || !config.robloxOAuthTokenKeyArn) return undefined;
  const dynamo = new DynamoDBClient({});
  const credentials = new SecretsManagerOAuthCredentialsProvider(
    new SecretsManagerClient({}),
    config.robloxOAuthSecretArn,
  );
  return new AuthService(
    config,
    new DynamoDbAuthStore(dynamo, config.tableName),
    credentials,
    undefined,
    new DynamoKmsRobloxAuthorizationVault(
      dynamo,
      new KMSClient({}),
      config.tableName,
      config.robloxOAuthTokenKeyArn,
      credentials,
    ),
  );
}
