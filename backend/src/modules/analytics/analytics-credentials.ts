import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export interface AnalyticsApiKeyProvider {
  getApiKey(): Promise<string>;
}

export class StaticAnalyticsApiKeyProvider implements AnalyticsApiKeyProvider {
  constructor(private readonly apiKey?: string) {}

  async getApiKey(): Promise<string> {
    return validateApiKey(this.apiKey);
  }
}

export class SecretsManagerAnalyticsApiKeyProvider implements AnalyticsApiKeyProvider {
  #cached?: { apiKey: string; expiresAt: number };

  constructor(
    private readonly client: SecretsManagerClient,
    private readonly secretId: string,
  ) {}

  async getApiKey(): Promise<string> {
    if (this.#cached && this.#cached.expiresAt > Date.now()) return this.#cached.apiKey;

    const result = await this.client.send(new GetSecretValueCommand({ SecretId: this.secretId }));
    if (!result.SecretString) throw new AnalyticsConfigurationError();

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.SecretString);
    } catch {
      throw new AnalyticsConfigurationError();
    }
    const apiKey = parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>).apiKey
      : undefined;
    const validated = validateApiKey(apiKey);
    this.#cached = { apiKey: validated, expiresAt: Date.now() + 5 * 60_000 };
    return validated;
  }
}

export class AnalyticsConfigurationError extends Error {
  constructor() {
    super("Roblox analytics is not configured");
    this.name = "AnalyticsConfigurationError";
  }
}

function validateApiKey(value: unknown): string {
  if (typeof value !== "string") throw new AnalyticsConfigurationError();
  const apiKey = value.trim();
  if (apiKey.length < 10 || apiKey === "replace-after-creation") {
    throw new AnalyticsConfigurationError();
  }
  return apiKey;
}
