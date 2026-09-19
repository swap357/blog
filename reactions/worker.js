// SPDX-License-Identifier: MIT
const articlePath = /^\/writing\/(?:[a-z0-9][a-z0-9-]*\/)+$/;
const reactionKey = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handle(request, env, fetchArticle = fetch) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').includes(origin);
  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
    ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
  const json = (body, status = 200) => Response.json(body, { status, headers });
  if (url.pathname !== '/api/useful') return json({ error: 'Not found' }, 404);
  if (origin && !allowed) return json({ error: 'Origin not allowed' }, 403);
  if (request.method === 'OPTIONS') {
    if (!allowed) return json({ error: 'Origin required' }, 403);
    return new Response(null, { status: 204, headers: {
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type, X-Reaction-Key',
      'Access-Control-Max-Age': '86400',
    } });
  }
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
  const article = url.searchParams.get('article') || '';
  const voter = request.headers.get('X-Reaction-Key') || '';
  if (article.length > 180 || !articlePath.test(article)) return json({ error: 'Invalid article' }, 400);
  if (voter && !reactionKey.test(voter)) return json({ error: 'Invalid reaction key' }, 400);

  try {
    const limiter = request.method === 'POST' ? env.WRITE_LIMIT : env.READ_LIMIT;
    const { success } = await limiter.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
    if (!success) {
      headers['Retry-After'] = '60';
      return json({ error: 'Please wait a minute before trying again' }, 429);
    }
    if (request.method === 'POST') {
      if (!allowed || !voter) return json({ error: 'Origin and reaction key required' }, 403);
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
        return json({ error: 'JSON required' }, 415);
      }
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'Body required' }, 400);
      const decoder = new TextDecoder();
      let text = '', bytes = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 128) {
          await reader.cancel();
          return json({ error: 'Body too large' }, 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      let body;
      try { body = JSON.parse(text + decoder.decode()); }
      catch { return json({ error: 'Invalid JSON' }, 400); }
      if (typeof body?.useful !== 'boolean') return json({ error: 'Expected useful boolean' }, 400);
      if (body.useful) {
        const page = await fetchArticle(env.SITE_ORIGIN + article, {
          method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000),
        });
        if (page.status !== 200 || !page.headers.get('Content-Type')?.includes('text/html')) {
          return json({ error: 'Article not found' }, 404);
        }
        await env.DB.prepare('INSERT OR IGNORE INTO reactions (article, voter) VALUES (?, ?)')
          .bind(article, voter).run();
      } else {
        await env.DB.prepare('DELETE FROM reactions WHERE article = ? AND voter = ?')
          .bind(article, voter).run();
      }
    }
    const result = await env.DB.prepare(
      'SELECT COUNT(*) AS count, COALESCE(MAX(voter = ?), 0) AS useful FROM reactions WHERE article = ?'
    ).bind(voter, article).first();
    return json({ count: result.count, useful: Boolean(result.useful) });
  } catch {
    return json({ error: 'Reactions are temporarily unavailable' }, 503);
  }
}

export default { fetch: (request, env) => handle(request, env) };
