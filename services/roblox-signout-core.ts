export type SignOutResult = Readonly<{
  remoteSessionRevoked: boolean;
  warning?: string;
}>;

type SignOutAppSessionOptions = Readonly<{
  apiBaseUrl?: string;
  sessionToken: string | null;
  fetchImpl: typeof fetch;
  clearSessionToken: () => Promise<void>;
}>;

/**
 * Revokes the backend app session when possible and always removes the local
 * session token. A network failure must never prevent someone from signing out
 * of the device in front of them.
 */
export async function signOutAppSession({
  apiBaseUrl,
  sessionToken,
  fetchImpl,
  clearSessionToken,
}: SignOutAppSessionOptions): Promise<SignOutResult> {
  let remoteSessionRevoked = !sessionToken;
  let warning: string | undefined;

  try {
    if (sessionToken && apiBaseUrl) {
      const response = await fetchImpl(`${apiBaseUrl.replace(/\/$/, '')}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${sessionToken}`,
        },
      });

      // An expired or previously revoked session is already signed out remotely.
      remoteSessionRevoked = response.ok || response.status === 401;
      if (!remoteSessionRevoked) {
        warning = `The backend session could not be revoked (HTTP ${response.status}).`;
      }
    } else if (sessionToken) {
      warning = 'The backend URL is not configured, so only this device was signed out.';
    }
  } catch {
    warning = 'The backend could not be reached, so only this device was signed out.';
  } finally {
    await clearSessionToken();
  }

  return warning ? { remoteSessionRevoked, warning } : { remoteSessionRevoked };
}
