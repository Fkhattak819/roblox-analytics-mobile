import { analyticsSectionIds, type AnalyticsSectionId, type AnalyticsDateRange } from '../../../../contracts/src/analytics.js';
import { AuthServiceError } from '../auth/auth-service.js';
import type { AppRequest, AppResponse, RouteDependencies } from '../../router.js';
import { AnalyticsAccessDenied } from './authorization.js';
import { isSyncableAnalyticsSection } from './snapshot-sync.js';

export async function analyticsRoute(request: AppRequest, deps: RouteDependencies): Promise<AppResponse | undefined> {
  const match = /^\/v1\/analytics\/([a-z-]+)$/.exec(request.path);
  const sync = request.method === 'POST' && request.path === '/v1/sync-jobs';
  const connections = request.method === 'GET' && request.path === '/v1/connections';
  if (!connections && !sync && !(match && request.method === 'GET')) return undefined;
  const respond = (statusCode: number, body: unknown): AppResponse => ({ statusCode, body,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  if (!deps.authService || !deps.analyticsAuthorizer) return respond(503, { error: 'analytics_not_configured' });
  try {
    const session = await deps.authService.getSession(request.headers?.authorization);
    const input = sync ? request.body : request.query;
    const params = input && typeof input === 'object' ? input as Record<string, unknown> : {};
    const universeId = params.universeId;
    if (connections) {
      if (typeof universeId !== 'string' || !/^\d{1,20}$/.test(universeId)) return respond(400, { error: 'invalid_analytics_request' });
      await deps.analyticsAuthorizer.requireAccess(session.user.sub, universeId);
      if (!deps.analyticsConnectionStatusStore) return respond(503, { error: 'analytics_not_configured' });
      const stored = await deps.analyticsConnectionStatusStore.get(session.user.sub, universeId);
      await deps.analyticsAuthorizer.requireAccess(session.user.sub, universeId);
      return respond(200, {
        identity: { status: 'connected', username: session.user.preferredUsername ?? session.user.name ?? session.user.sub },
        analytics: { status: stored?.status ?? 'pending', scope: 'universe.analytics:read', universeId,
          ...(stored?.lastAttemptAt ? { lastAttemptAt: stored.lastAttemptAt } : {}),
          ...(stored?.lastSyncedAt ? { lastSyncedAt: stored.lastSyncedAt } : {}) },
      });
    }
    const section = sync ? params.section : match?.[1];
    const range = params.range;
    if (typeof universeId !== 'string' || !/^\d{1,20}$/.test(universeId)
      || typeof section !== 'string' || !(analyticsSectionIds as readonly string[]).includes(section)
      || typeof range !== 'string' || !['24H', '7D', '28D', '56D', '90D'].includes(range)) {
      return respond(400, { error: 'invalid_analytics_request' });
    }
    const key = { ownerSub: session.user.sub, universeId, section: section as AnalyticsSectionId, range: range as AnalyticsDateRange };
    await deps.analyticsAuthorizer.requireAccess(key.ownerSub, universeId);
    if (sync) {
      if (!deps.analyticsSyncJobService) return respond(503, { error: 'analytics_not_configured' });
      if (!isSyncableAnalyticsSection(key.section)) return respond(422, { error: 'analytics_section_not_syncable' });
      const result = await deps.analyticsSyncJobService.request(key);
      return { ...respond(202, result), headers: { ...respond(202, result).headers, 'retry-after': String(result.retryAfterSeconds) } };
    }
    if (!deps.analyticsSnapshotStore) return respond(503, { error: 'analytics_not_configured' });
    const snapshot = await deps.analyticsSnapshotStore.getSnapshot(key);
    await deps.analyticsAuthorizer.requireAccess(key.ownerSub, universeId);
    return snapshot ? respond(200, snapshot) : respond(404, { error: 'analytics_snapshot_not_found' });
  } catch (error) {
    if (error instanceof AnalyticsAccessDenied) return respond(403, { error: 'analytics_access_denied' });
    if (error instanceof AuthServiceError) return respond(error.statusCode, { error: error.code });
    return respond(503, { error: 'analytics_unavailable' });
  }
}
