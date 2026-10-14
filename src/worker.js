// 文字庫 API
//   GET /api/presets/<代碼>  讀取單筆（公開，Notion 嵌入用）
//   GET /api/presets         讀取全部（需查看密碼 EDIT_PASSWORD，標頭 x-password）
//   PUT /api/presets/<代碼>  存檔：新代碼不需密碼；覆蓋已存在的代碼需要密碼
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
const num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : undefined);
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);
const pick = (v, list) => (list.includes(v) ? v : undefined);
const EVENT = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

function safeHref(v) {
  if (typeof v !== 'string') return undefined;
  const h = v.trim();
  if (h.length > 2000) return undefined;
  return /^(https?:\/\/|tel:|mailto:)/i.test(h) ? h : undefined;
}

// 按鈕設定
function cleanButton(cfg) {
  const label = str(cfg.label, 80);
  const href = safeHref(cfg.href);
  if (!label || !href) return null;
  const out = {
    kind: 'button', label, href,
    sub: str(cfg.sub, 120),
    done: str(cfg.done, 40),
    target: pick(cfg.target, ['_top']),
    variant: pick(cfg.variant, ['outline', 'soft']),
    effect: pick(cfg.effect, ['glow', 'pulse', 'shake', 'shine', 'bounce']),
    r: num(cfg.r, 0, 999),
    fs: num(cfg.fs, 10, 40),
    w: num(cfg.w, 100, 900),
    full: cfg.full === true ? true : undefined,
    a: pick(cfg.a, ['left', 'right']),
    utm: cfg.utm === true ? true : undefined,
    camp: typeof cfg.camp === 'string' && /^[A-Za-z0-9_.-]{1,60}$/.test(cfg.camp) ? cfg.camp : undefined,
    trk: cfg.trk === true ? true : undefined,
    ev: EVENT.test(cfg.ev || '') ? cfg.ev : undefined,
    mev: EVENT.test(cfg.mev || '') ? cfg.mev : undefined,
    lev: EVENT.test(cfg.lev || '') ? cfg.lev : undefined,
  };
  if (HEX.test(cfg.bg)) out.bg = cfg.bg;
  if (HEX.test(cfg.fg)) out.fg = cfg.fg;
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

function clean(cfg) {
  if (!cfg || typeof cfg !== 'object') return null;
  if (cfg.kind === 'button') return cleanButton(cfg);
  const t = Array.isArray(cfg.t) ? cfg.t.map(String) : String(cfg.t ?? '');
  const text = Array.isArray(t) ? t.join('\n') : t;
  if (!text.trim() || text.length > 2000) return null;
  const out = { t };
  if (HEX.test(cfg.c)) out.c = cfg.c;
  if (HEX.test(cfg.hc)) out.hc = cfg.hc;
  if (HEX.test(cfg.bg)) out.bg = cfg.bg;
  out.s = num(cfg.s, 6, 240);
  out.w = num(cfg.w, 100, 900);
  out.lh = num(cfg.lh, 0.5, 4);
  out.ls = num(cfg.ls, -1, 2);
  out.p = num(cfg.p, 0, 100);
  if (cfg.a === 'left' || cfg.a === 'right') out.a = cfg.a;
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

// 追蹤 ID：在 Cloudflare「設定 → 變數和密碼」以一般變數設定 GA4_ID / META_PIXEL_ID / LINE_TAG_ID
function trackingIds(env) {
  const t = {};
  if (/^G-[A-Z0-9]{4,20}$/.test(env.GA4_ID || '')) t.ga = env.GA4_ID;
  if (/^[0-9]{6,20}$/.test(env.META_PIXEL_ID || '')) t.meta = env.META_PIXEL_ID;
  if (/^[0-9a-f-]{8,64}$/i.test(env.LINE_TAG_ID || '')) t.line = env.LINE_TAG_ID;
  return t;
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

    if (parts[2] === 'config' && request.method === 'GET') return json({ track: trackingIds(env) });

    if (parts[2] !== 'presets') return json({ error: 'not-found' }, 404);

    if (request.method === 'GET' && parts[3]) {
      const all = await readAll(env);
      const id = decodeURIComponent(parts[3]);
      if (!Object.prototype.hasOwnProperty.call(all, id)) return json({ error: 'not-found' }, 404);
      const item = all[id];
      return json(item.kind === 'button' && item.trk ? { ...item, _track: trackingIds(env) } : item);
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
      // 覆蓋已存在的代碼需要密碼；新增不用
      if (Object.prototype.hasOwnProperty.call(all, id)) {
        if (!env.EDIT_PASSWORD) return json({ error: 'no-password-set' }, 503);
        if (!samePassword(request.headers.get('x-password'), env.EDIT_PASSWORD)) return json({ error: 'overwrite-needs-password' }, 401);
      }
      all[id] = cfg;
      await env.PRESETS.put(KEY, JSON.stringify(all));
      return json({ ok: true, id, count: Object.keys(all).length });
    }

    return json({ error: 'method-not-allowed' }, 405);
  },
};
