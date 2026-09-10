import assert from 'node:assert/strict';
import test from 'node:test';
import { SessionController } from '@/services/session-controller';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const token = 't'.repeat(43);
const metadata = () => ({ user: { sub: '123' }, authorizedUniverseIds: ['10009166512'], expiresAt: new Date(Date.now() + 60_000).toISOString() });
function setup(options: { token?: string; fetch?: typeof fetch; login?: () => Promise<ReturnType<typeof metadata> & { token: string }> } = {}) {
  let stored: string | null = options.token ?? null;
  const requests: string[] = [];
  const controller = new SessionController({
    apiBaseUrl: 'https://api.example.test',
    readToken: async () => stored,
    writeToken: async (value) => { stored = value; },
    deleteToken: async () => { stored = null; },
    login: options.login ?? (async () => ({ ...metadata(), token })),
    fetchImpl: async (url, init) => {
      requests.push(String(url));
      return options.fetch ? options.fetch(url, init) : Response.json(metadata());
    },
  });
  return { controller, requests, stored: () => stored };
}

test('concurrent sign-in calls share one browser flow across screen resets', async () => {
  const started = deferred<void>();
  const pending = deferred<ReturnType<typeof metadata> & { token: string }>();
  let calls = 0;
  const { controller, stored } = setup({ login: async () => {
    calls++;
    started.resolve();
    return pending.promise;
  } });
  const first = controller.signIn();
  assert.equal(controller.signIn(), first);
  await started.promise;
  assert.equal(controller.signIn(), first);
  assert.equal(calls, 1);
  pending.resolve({ ...metadata(), token });
  await first;
  assert.equal(controller.getSnapshot().status, 'authenticated');
  assert.equal(stored(), token);
});

test('a failed sign-in releases the shared flow for retry', async () => {
  let calls = 0;
  const { controller } = setup({ login: async () => {
    if (++calls === 1) throw new Error('cancelled');
    return { ...metadata(), token };
  } });
  await assert.rejects(controller.signIn(), /cancelled/);
  await controller.signIn();
  assert.equal(calls, 2);
  assert.equal(controller.getSnapshot().status, 'authenticated');
});

test('sample startup with no saved token is offline', async () => {
  const { controller, requests } = setup();
  await controller.restore();
  assert.equal(controller.getSnapshot().status, 'sample');
  assert.equal(requests.length, 0);
});

test('saved session must validate before exposing identity; token stays out of snapshots', async () => {
  const pending = deferred<Response>();
  const { controller } = setup({ token, fetch: async () => pending.promise });
  const restore = controller.restore();
  assert.equal(controller.getSnapshot().session, undefined);
  pending.resolve(Response.json(metadata()));
  await restore;
  assert.equal(controller.getSnapshot().status, 'authenticated');
  assert.equal(controller.getSnapshot().session?.user.sub, '123');
  assert.ok(!JSON.stringify(controller.getSnapshot()).includes(token));
});

test('revoked saved token is deleted; network outage cannot authenticate', async () => {
  const revoked = setup({ token, fetch: async () => new Response(null, { status: 401 }) });
  await revoked.controller.restore();
  assert.equal(revoked.stored(), null);
  assert.equal(revoked.controller.getSnapshot().status, 'signed_out');
  const offline = setup({ token, fetch: async () => { throw new Error('offline'); } });
  await offline.controller.restore();
  assert.equal(offline.controller.getSnapshot().status, 'unavailable');
  assert.equal(offline.controller.getSnapshot().session, undefined);
  assert.equal(offline.stored(), token);
});

test('sign-out removes local token and account state even when revocation is offline', async () => {
  const { controller, stored } = setup({ fetch: async () => { throw new Error('offline'); } });
  await controller.signIn();
  const revision = controller.getSnapshot().revision;
  assert.equal(await controller.signOut(), 'local_only');
  assert.equal(stored(), null);
  assert.equal(controller.getSnapshot().session, undefined);
  assert.ok(controller.getSnapshot().revision > revision);
});

test('all-session sign-out does not misreport a 401 as account-wide revocation', async () => {
  const { controller, requests, stored } = setup({ fetch: async () => new Response(null, { status: 401 }) });
  await controller.signIn();
  assert.equal(await controller.signOut(true), 'local_only');
  assert.equal(stored(), null);
  assert.match(requests[0]!, /\/v1\/auth\/logout-all$/);
});

test('a delayed login cannot resurrect a signed-out account', async () => {
  const pending = deferred<ReturnType<typeof metadata> & { token: string }>();
  const started = deferred<void>();
  const { controller, stored } = setup({ login: async () => { started.resolve(); return pending.promise; } });
  const signIn = controller.signIn();
  const rejection = assert.rejects(signIn, /session changed/i);
  await started.promise;
  await controller.signOut();
  pending.resolve({ ...metadata(), token });
  await rejection;
  assert.equal(stored(), null);
  assert.equal(controller.getSnapshot().status, 'signed_out');
});

test('a delayed restore cannot overwrite an explicit offline sample selection', async () => {
  const pending = deferred<Response>();
  const started = deferred<void>();
  const { controller, stored } = setup({ token, fetch: async () => { started.resolve(); return pending.promise; } });
  const restore = controller.restore();
  await started.promise;
  await controller.useSample();
  pending.resolve(Response.json(metadata()));
  await restore;
  assert.equal(stored(), null);
  assert.equal(controller.getSnapshot().status, 'sample');
});

test('account switch hides old identity and rejects delayed authenticated response bodies', async () => {
  const body = deferred<unknown>();
  const started = deferred<void>();
  const { controller } = setup({ fetch: async () => {
    started.resolve();
    return { ok: true, status: 200, json: async () => body.promise } as Response;
  } });
  await controller.signIn();
  const read = controller.authenticatedRead('/v1/home', (value) => value);
  const rejection = assert.rejects(read, /session changed/i);
  await started.promise;
  await controller.useSample();
  body.resolve({ oldAccountData: true });
  await rejection;
});

test('401 on authenticated data clears the identity and stored token', async () => {
  const { controller, stored } = setup({ fetch: async () => new Response(null, { status: 401 }) });
  await controller.signIn();
  await assert.rejects(controller.authenticatedRead('/v1/home', (value) => value), /session expired/i);
  assert.equal(stored(), null);
  assert.equal(controller.getSnapshot().session, undefined);
});

test('sample selection never creates a network request', async () => {
  const { controller, requests, stored } = setup();
  await controller.signIn();
  await controller.useSample();
  assert.equal(stored(), null);
  assert.equal(requests.length, 0);
});

test('sign-out waits for an in-flight keychain write and removes its late token', async () => {
  const writing = deferred<void>();
  const release = deferred<void>();
  let stored: string | null = null;
  const controller = new SessionController({
    apiBaseUrl: 'https://api.example.test',
    fetchImpl: async () => new Response(null, { status: 204 }),
    readToken: async () => stored,
    writeToken: async (value) => { writing.resolve(); await release.promise; stored = value; },
    deleteToken: async () => { stored = null; },
    login: async () => ({ ...metadata(), token }),
  });
  const login = controller.signIn();
  const rejected = assert.rejects(login, /session changed/i);
  await writing.promise;
  const logout = controller.signOut();
  release.resolve();
  await Promise.all([logout, rejected]);
  assert.equal(stored, null);
  assert.equal(controller.getSnapshot().status, 'signed_out');
});

test('keychain deletion failure hides identity and does not claim successful logout', async () => {
  let failDelete = false;
  const controller = new SessionController({
    apiBaseUrl: 'https://api.example.test',
    fetchImpl: async () => new Response(null, { status: 204 }),
    readToken: async () => token,
    writeToken: async () => {},
    deleteToken: async () => { if (failDelete) throw new Error('keychain unavailable'); },
    login: async () => ({ ...metadata(), token }),
  });
  await controller.signIn();
  failDelete = true;
  await assert.rejects(controller.signOut(), /Secure storage could not be cleared/);
  assert.equal(controller.getSnapshot().status, 'unavailable');
  assert.equal(controller.getSnapshot().session, undefined);
});
