import { loginAction } from './login-limiter.js';

// Only primitive routing facts enter this serializer, never requests or errors.
export function securityEvent(method: string, path: string, status: number): string | undefined {
  const action = loginAction(method, path)
    ?? (method === 'POST' && path === '/v1/auth/logout' ? 'logout' : undefined)
    ?? (method === 'POST' && path === '/v1/auth/logout-all' ? 'logout_all' : undefined)
    ?? (method === 'GET' && path === '/v1/auth/session' ? 'session' : undefined);
  if (!action || !Number.isInteger(status) || status < 100 || status > 599) return undefined;
  return JSON.stringify({ event: 'auth_result', action, status,
    outcome: status >= 500 ? 'failure' : status === 429 ? 'limited' : status >= 400 ? 'denied' : 'success' });
}
