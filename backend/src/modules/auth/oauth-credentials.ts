import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export type RobloxOAuthCredentials = Readonly<{
  clientId: string;
  clientSecret: string;
}>;

export interface RobloxOAuthCredentialsProvider {
  getCredentials(): Promise<RobloxOAuthCredentials>;
}

export class StaticOAuthCredentialsProvider implements RobloxOAuthCredentialsProvider {
  constructor(private readonly credentials?: RobloxOAuthCredentials) {}

  async getCredentials(): Promise<RobloxOAuthCredentials> {
    if (!this.credentials?.clientId || !this.credentials.clientSecret) {
      throw new OAuthConfigurationError();
    }
    return this.credentials;
  }
}

export class SecretsManagerOAuthCredentialsProvider implements RobloxOAuthCredentialsProvider {
  #cached?: { credentials: RobloxOAuthCredentials; expiresAt: number };

  constructor(
    private readonly client: SecretsManagerClient,
    private readonly secretId: string,
  ) {}

  async getCredentials(): Promise<RobloxOAuthCredentials> {
    if (this.#cached && this.#cached.expiresAt > Date.now()) {
      return this.#cached.credentials;
    }

    const result = await this.client.send(new GetSecretValueCommand({ SecretId: this.secretId }));
    if (!result.SecretString) throw new OAuthConfigurationError();

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.SecretString);
    } catch {
      throw new OAuthConfigurationError();
    }

    if (!isCredentialObject(parsed)) throw new OAuthConfigurationError();
    const credentials = {
      clientId: parsed.clientId.trim(),
      clientSecret: parsed.clientSecret,
    };
    if (
      !credentials.clientId
      || credentials.clientId === "replace-after-registration"
      || !credentials.clientSecret
    ) {
      throw new OAuthConfigurationError();
    }

    this.#cached = { credentials, expiresAt: Date.now() + 5 * 60_000 };
    return credentials;
  }
}

export class OAuthConfigurationError extends Error {
  constructor() {
    super("Roblox OAuth is not configured");
    this.name = "OAuthConfigurationError";
  }
}

function isCredentialObject(value: unknown): value is { clientId: string; clientSecret: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.clientId === "string" && typeof candidate.clientSecret === "string";
}
