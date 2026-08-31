export const ANALYTICS_SCOPE = "universe.analytics:read";

export type AnalyticsConnectionInput = {
  apiKey: string;
  universeIds: string[];
};

export type AnalyticsConnectionPreview = {
  status: "not_configured" | "invalid_request";
  scope: typeof ANALYTICS_SCOPE;
  universeIds: string[];
  fingerprint?: string;
  message: string;
};

export function validateConnectionInput(input: unknown):
  | { ok: true; value: AnalyticsConnectionInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "JSON body required" };
  const body = input as Record<string, unknown>;
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const universeIds = Array.isArray(body.universeIds)
    ? body.universeIds.filter((id): id is string => typeof id === "string" && /^\d+$/.test(id))
    : [];

  if (apiKey.length < 10) return { ok: false, error: "apiKey must be provided" };
  if (universeIds.length === 0) return { ok: false, error: "At least one universeId is required" };
  if (universeIds.length > 100) return { ok: false, error: "Too many universeIds" };
  return { ok: true, value: { apiKey, universeIds } };
}

export function fingerprintSecret(secret: string): string {
  return `...${secret.slice(-4)}`;
}
