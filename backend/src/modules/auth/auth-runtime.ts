import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { Config } from "../../config.js";
import { AuthService } from "./auth-service.js";
import { DynamoDbAuthStore } from "./dynamodb-auth-store.js";
import { InMemoryAuthStore } from "./in-memory-auth-store.js";
import {
  SecretsManagerOAuthCredentialsProvider,
  StaticOAuthCredentialsProvider,
} from "./oauth-credentials.js";

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
  if (!config.tableName || !config.robloxOAuthSecretArn) return undefined;
  return new AuthService(
    config,
    new DynamoDbAuthStore(new DynamoDBClient({}), config.tableName),
    new SecretsManagerOAuthCredentialsProvider(
      new SecretsManagerClient({}),
      config.robloxOAuthSecretArn,
    ),
  );
}

