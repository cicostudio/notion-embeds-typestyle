// 文字庫 API
//   GET /api/presets/<代碼>  讀取單筆（公開，Notion 嵌入用）
//   GET /api/presets         讀取全部（需查看密碼 EDIT_PASSWORD，標頭 x-password）
//   PUT /api/presets/<代碼>  存檔（不需密碼）
// 資料存在 KV 的 "presets" 這個鍵；KV 還沒有資料時，以 src/seed.json 當初始內容。
import SEED from './seed.json';

const KEY = 'presets';
const ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

async function readAll(env) {
  const stored = await env.PRESETS.get(KEY, 'json');
  return stored || structuredClone(SEED);
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

    if (request.method === 'GET' && parts[3]) {
      const all = await readAll(env);
      const id = decodeURIComponent(parts[3]);
      return Object.prototype.hasOwnProperty.call(all, id) ? json(all[id]) : json({ error: 'not-found' }, 404);
    }

    if (request.method === 'GET') {
      if (!env.EDIT_PASSWORD) return json({ error: 'no-password-set' }, 503);
      if (!samePassword(request.headers.get('x-password'), env.EDIT_PASSWORD)) return json({ error: 'wrong-password' }, 401);
      return json(await readAll(env));
    }

    if (request.method === 'PUT' && parts[3]) {
      const id = decodeURIComponent(parts[3]);
      if (!ID_RE.test(id)) return json({ error: 'bad-id' }, 400);
      let body;
      try { body = await request.json(); } catch { return json({ error: 'bad-json' }, 400); }
      const cfg = clean(body);
      if (!cfg) return json({ error: 'bad-config' }, 400);
      const all = await readAll(env);
      all[id] = cfg;
      await env.PRESETS.put(KEY, JSON.stringify(all));
      return json({ ok: true, id, count: Object.keys(all).length });
    }

    return json({ error: 'method-not-allowed' }, 405);
  },
};
