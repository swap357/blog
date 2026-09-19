import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handle } from './worker.js';

const origin = 'https://autoscaler.sh';
const article = '/writing/thinking-machines/';
const voter = '12345678-1234-4234-8234-123456789abc';
const another = '87654321-1234-4234-8234-123456789abc';

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('./migrations/0001_reactions.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const env = {
    SITE_ORIGIN: origin, ALLOWED_ORIGINS: origin,
    READ_LIMIT: { limit: async () => ({ success: true }) },
    WRITE_LIMIT: { limit: async () => ({ success: true }) },
    DB: { prepare: sql => ({ bind: (...args) => ({
      run: async () => db.prepare(sql).run(...args),
      first: async () => db.prepare(sql).get(...args),
    }) }) },
  };
  const pages = [];
  const fetchArticle = async url => {
    pages.push(url);
    return new Response(null, { headers: { 'Content-Type': 'text/html' } });
  };
  const send = (method = 'GET', body, extra = {}) => {
    const { path = article, key = voter, source = origin, ...options } = extra;
    const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' };
    if (key) headers['X-Reaction-Key'] = key;
    if (source) headers.Origin = source;
    const request = new Request(`${origin}/api/useful?article=${encodeURIComponent(path)}`, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...options,
    });
    return handle(request, env, fetchArticle);
  };
  return { db, env, send, pages };
}

test('shared counts, concurrent duplicate requests, and undo are idempotent', async t => {
  const { send, pages } = fixture(t);
  assert.deepEqual(await (await send()).json(), { count: 0, useful: false });
  const repeated = await Promise.all(Array.from({ length: 12 }, () => send('POST', { useful: true })));
  assert.ok(repeated.every(response => response.status === 200));
  assert.deepEqual(await (await send()).json(), { count: 1, useful: true });
  await send('POST', { useful: true }, { key: another });
  assert.deepEqual(await (await send('GET', undefined, { key: '' })).json(), { count: 2, useful: false });
  await send('POST', { useful: false });
  await send('POST', { useful: false });
  assert.deepEqual(await (await send()).json(), { count: 1, useful: false });
  assert.deepEqual(await (await send('GET', undefined, { key: another })).json(), { count: 1, useful: true });
  assert.ok(pages.every(url => url === origin + article));
});

test('votes on different articles remain independent', async t => {
  const { send } = fixture(t);
  await send('POST', { useful: true });
  const next = { path: '/writing/another-note/' };
  assert.deepEqual(await (await send('GET', undefined, next)).json(), { count: 0, useful: false });
  await send('POST', { useful: true }, next);
  assert.deepEqual(await (await send('GET', undefined, next)).json(), { count: 1, useful: true });
});

test('invalid input and foreign origins cannot create votes', async t => {
  const { send, db } = fixture(t);
  for (const [body, options, status] of [
    [{ useful: true }, { source: 'https://other.example' }, 403],
    [{ useful: true }, { source: '' }, 403],
    [{ useful: true }, { key: '' }, 403],
    [{ useful: true }, { key: 'not-a-key' }, 400],
    [{ useful: true }, { path: '/writing/../../about/' }, 400],
    [{ useful: true }, { path: '/writing/' }, 400],
    [{ useful: true }, { path: "'; DROP TABLE reactions;--" }, 400],
    [{ useful: 'true' }, {}, 400],
    [null, {}, 400],
    [{ useful: true, padding: 'a'.repeat(200) }, {}, 413],
  ]) assert.equal((await send('POST', body, options)).status, status);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM reactions').get().count, 0);
});

test('CORS, malformed JSON and method restrictions', async t => {
  const { send } = fixture(t);
  const preflight = await send('OPTIONS');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal((await send('OPTIONS', undefined, { source: '' })).status, 403);
  const foreign = await send('GET', undefined, { source: 'https://other.example' });
  assert.equal(foreign.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await send('GET', undefined, { source: '' })).status, 200);
  assert.equal((await send('PUT', { useful: true })).status, 405);
  assert.equal((await send('POST', undefined, { body: '{' })).status, 400);
  assert.equal((await send('POST', { useful: true }, { headers: { Origin: origin, 'X-Reaction-Key': voter } })).status, 415);
});

test('rate limits and upstream failures leave the database unchanged', async t => {
  const { send, env, db } = fixture(t);
  env.WRITE_LIMIT.limit = async () => ({ success: false });
  const limited = await send('POST', { useful: true });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '60');
  env.WRITE_LIMIT.limit = async () => ({ success: true });
  const request = () => new Request(`${origin}/api/useful?article=${article}`, {
    method: 'POST', headers: { Origin: origin, 'X-Reaction-Key': voter, 'Content-Type': 'application/json' },
    body: '{"useful":true}',
  });
  assert.equal((await handle(request(), env, async () => new Response(null, { status: 404 }))).status, 404);
  assert.equal((await handle(request(), env, async () => { throw new Error('offline'); })).status, 503);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM reactions').get().count, 0);
});
