// 文字庫 API：GET /api/presets 讀取全部；PUT /api/presets/<代碼> 存檔（需密碼）
// 資料存在 KV 的 "presets" 這個鍵；KV 還沒有資料時，以 public/presets.json 當初始內容。

const KEY = 'presets';
const ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

async function readAll(env, request) {
  const stored = await env.PRESETS.get(KEY, 'json');
  if (stored) return stored;
  const seed = await env.ASSETS.fetch(new URL('/presets.json', request.url));
  return seed.ok ? seed.json() : {};
}

function samePassword(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !b) return false;
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

const HEX = /^[0-9a-fA-F]{3,8}$/;
function clean(cfg) {
  if (!cfg || typeof cfg !== 'object') return null;
  const t = Array.isArray(cfg.t) ? cfg.t.map(String) : String(cfg.t ?? '');
  const text = Array.isArray(t) ? t.join('\n') : t;
  if (!text.trim() || text.length > 2000) return null;
  const out = { t };
  if (HEX.test(cfg.c)) out.c = cfg.c;
  if (HEX.test(cfg.hc)) out.hc = cfg.hc;
  if (HEX.test(cfg.bg)) out.bg = cfg.bg;
  const num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : undefined);
  out.s = num(cfg.s, 6, 240);
  out.w = num(cfg.w, 100, 900);
  out.lh = num(cfg.lh, 0.5, 4);
  out.ls = num(cfg.ls, -1, 2);
  out.p = num(cfg.p, 0, 100);
  if (cfg.a === 'left' || cfg.a === 'right') out.a = cfg.a;
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.replace(/\/+$/, '').split('/'); // ['', 'api', 'presets', id?]

    if (parts[1] !== 'api') return env.ASSETS.fetch(request);

    if (parts[2] === 'auth' && request.method === 'POST') {
      if (!env.EDIT_PASSWORD) return json({ error: 'no-password-set' }, 503);
      return samePassword(request.headers.get('x-password'), env.EDIT_PASSWORD)
        ? json({ ok: true })
        : json({ error: 'wrong-password' }, 401);
    }

    if (parts[2] !== 'presets') return json({ error: 'not-found' }, 404);

    if (request.method === 'GET' && !parts[3]) return json(await readAll(env, request));

    if (request.method === 'PUT' && parts[3]) {
      if (!env.EDIT_PASSWORD) return json({ error: 'no-password-set' }, 503);
      if (!samePassword(request.headers.get('x-password'), env.EDIT_PASSWORD)) return json({ error: 'wrong-password' }, 401);
      const id = decodeURIComponent(parts[3]);
      if (!ID_RE.test(id)) return json({ error: 'bad-id' }, 400);
      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
      const cfg = clean(body);
      if (!cfg) return json({ error: 'bad-config' }, 400);
      const all = await readAll(env, request);
      all[id] = cfg;
      await env.PRESETS.put(KEY, JSON.stringify(all));
      return json({ ok: true, id, count: Object.keys(all).length });
    }

    return json({ error: 'method-not-allowed' }, 405);
  },
};
