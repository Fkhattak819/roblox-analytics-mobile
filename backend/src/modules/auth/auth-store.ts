import { createHash } from "node:crypto";

export type RobloxUserProfile = Readonly<{
  sub: string;
  name?: string;
  nickname?: string;
  preferredUsername?: string;
  profileUrl?: string;
  pictureUrl?: string;
}>;

export type OAuthStateRecord = Readonly<{
  codeVerifier: string;
  expiresAt: number;
}>;

export type OAuthExchangeRecord = Readonly<{
  user: RobloxUserProfile;
  expiresAt: number;
}>;

export type AppSessionRecord = Readonly<{
  user: RobloxUserProfile;
  expiresAt: number;
}>;

export interface AuthStore {
  putOAuthState(state: string, record: OAuthStateRecord): Promise<void>;
  consumeOAuthState(state: string): Promise<OAuthStateRecord | null>;
  putOAuthExchange(code: string, record: OAuthExchangeRecord): Promise<void>;
  consumeOAuthExchange(code: string): Promise<OAuthExchangeRecord | null>;
  putSession(token: string, record: AppSessionRecord): Promise<void>;
  getSession(token: string): Promise<AppSessionRecord | null>;
  deleteSession(token: string): Promise<void>;
}

export function digestOpaqueValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

