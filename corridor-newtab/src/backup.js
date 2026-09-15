/* ============================================================
   备份与恢复 —— 把这台机器上的配置装进一个 .json，换台机器再倒回来

   为什么是 JSON 而不是 Markdown：这份东西是给机器读的。
   Markdown 好看，但没有类型 —— 数组、布尔、嵌套结构一转成表格或列表
   就会丢，倒回来还得靠猜。JSON 原样进、原样出，一个字段都不掉。

   密钥怎么办，导出时自己选：
     none   不带密钥。最安全，重装后每档再粘一次。
     enc    带，但先用口令加密（Web Crypto 的 PBKDF2 + AES-GCM，不引第三方库）。
            文件落到云盘或误发出去也不泄密；口令忘了只是密钥要重填，
            其余配置照常恢复 —— 加密的只有密钥那几个字段，不是整份文件。
     plain  明文带着。最省事，但这份 json 从此要当密码本收着。

   备份里没有的东西，都是「换台机器也没意义」的：
     · 图片缓存（几百 MB，重装后自己会重新抓）
     · 本机文件夹图库的目录句柄（浏览器不允许带走，换台机器也指不到同一个盘）
       —— 所以图库只备份网址来源，文件夹来源要重新选。
   ============================================================ */
import * as S from './store.js';

export const SCHEMA = 1;
export const APP = 'corridor-newtab';

/* 一份备份可以由这几块拼起来，各自独立勾选。
   key 是存储里的键，label 由界面按语言取。 */
export const PARTS = ['settings', 'marks', 'history', 'tr', 'packs', 'daily', 'libsrc'];

const S1 = (v) => String(v ?? '').trim();
const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

/* ---------------- 口令加密 ----------------
   PBKDF2-SHA256 派生密钥，AES-GCM 加密。盐与 IV 每次导出都重新摇，
   一起写进文件（它们不是秘密，秘密只有口令）。 */
const ITER = 250000;
const te = new TextEncoder(), td = new TextDecoder();
function b64(buf) {
  const u = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
const unb64 = (s) => Uint8Array.from(atob(String(s || '')), c => c.charCodeAt(0));
const subtle = () => globalThis.crypto?.subtle || null;

async function deriveKey(password, salt, iter = ITER) {
  const base = await subtle().importKey('raw', te.encode(String(password)), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptJSON(obj, password) {
  if (!subtle()) throw new Error('nocrypto');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await deriveKey(password, salt);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, k, te.encode(JSON.stringify(obj)));
  return { alg: 'AES-GCM', kdf: 'PBKDF2-SHA256', iter: ITER,
           salt: b64(salt), iv: b64(iv), data: b64(ct) };
}
export async function decryptJSON(box, password) {
  if (!subtle()) throw new Error('nocrypto');
  const k = await deriveKey(password, unb64(box.salt), Number(box.iter) || ITER);
  let plain;
  try {
    plain = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, k, unb64(box.data));
  } catch { throw new Error('badpass'); }        // 口令不对，或文件被改过
  try { return JSON.parse(td.decode(plain)); } catch { throw new Error('badpass'); }
}

/* ---------------- 密钥的进出 ----------------
   接口档里的密钥有两处：当前用的 key，和存过的那一串 keys。
   抽出来的形状是 { 档 id: { key, keys } } —— 按 id 对回去，
   于是「并入」时不会把 A 机器的密钥安到 B 机器的同名档上。 */
function pullSecrets(settings) {
  const out = {};
  const ai = settings?.ai;
  if (!ai) return out;
  for (const p of (ai.list || [])) {
    const key = S1(p.key), keys = (p.keys || []).map(S1).filter(Boolean);
    if (key || keys.length) out[p.id] = { key, keys };
    p.key = ''; p.keys = [];
  }
  /* ai.key 是「当前那一档」的平铺镜像 —— 光清 list 里的还不够，
     密钥会从这儿原样漏进文件。读设置时它会自动从 list 重新算出来，
     所以这里直接抹掉是安全的。 */
  ai.key = '';
  return out;
}
function pushSecrets(settings, secrets) {
  if (!secrets) return;
  for (const p of (settings?.ai?.list || [])) {
    const s = secrets[p.id];
    if (!s) continue;
    if (S1(s.key)) p.key = s.key;
    if (Array.isArray(s.keys) && s.keys.length) p.keys = [...new Set([...s.keys, ...(p.keys || [])])].slice(0, 8);
  }
}

/* ---------------- 收 ---------------- */
export async function collect(parts, { keys = 'none', password = '' } = {}) {
  const want = new Set(parts && parts.length ? parts : PARTS);
  const data = {};

  if (want.has('settings')) data.settings = clone(await S.getSettings());
  if (want.has('marks')) { data.favs = await S.getFavs(); data.gone = await S.getGone(); }
  if (want.has('history')) data.history = await S.getHistory();
  if (want.has('tr')) data.tr = await S.getTr();
  if (want.has('packs')) data.packs = await S.getPacks();
  if (want.has('daily')) {
    const d = await S.getDaily();
    data.daily = { day: d.day, at: d.at, frontier: d.frontier || [], works: d.works || [] };
  }
  if (want.has('libsrc')) {
    /* 只有网址来源带得走：本机文件夹靠的是目录句柄，换台机器就指不到了 */
    const lib = await S.getLocalLib();
    data.libsrc = (lib.srcs || []).filter(x => x && x.kind === 'url')
      .map(x => ({ id: x.id, kind: 'url', name: x.name || '', url: x.url || '',
                   on: x.on !== false, f: clone(x.f) }));
  }

  const file = {
    app: APP, kind: 'backup', schema: SCHEMA,
    appVersion: globalThis.chrome?.runtime?.getManifest?.().version || '',
    at: new Date().toISOString(),
    parts: [...want].filter(p => PARTS.includes(p)),
    keys: 'none',
    data
  };

  /* 密钥：三条路 */
  if (data.settings) {
    const secrets = pullSecrets(data.settings);          // 先一律摘出来
    if (Object.keys(secrets).length) {
      if (keys === 'plain') { file.keys = 'plain'; file.secrets = secrets; }
      else if (keys === 'enc') {
        if (!S1(password)) throw new Error('nopass');
        file.keys = 'enc'; file.secrets = await encryptJSON(secrets, password);
      }
    }
  }
  return file;
}

/* ---------------- 认 ----------------
   导入前先看清楚这份文件里有什么，再让用户点确认。 */
export function summarize(file) {
  if (!file || typeof file !== 'object') return { ok: false, why: 'notjson' };
  if (file.app !== APP || file.kind !== 'backup') return { ok: false, why: 'notours' };
  if (Number(file.schema) > SCHEMA) return { ok: false, why: 'newer' };
  const d = file.data || {};
  const rows = [];
  const n = (v) => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0);
  if (d.settings) rows.push({ k: 'settings', n: (d.settings.ai?.list || []).length });
  if (d.favs || d.gone) rows.push({ k: 'marks', n: n(d.favs) + n(d.gone) });
  if (d.history) rows.push({ k: 'history', n: n(d.history) });
  if (d.tr) rows.push({ k: 'tr', n: n(d.tr) });
  if (d.packs) rows.push({ k: 'packs', n: n(d.packs) });
  if (d.daily) rows.push({ k: 'daily', n: n(d.daily.works) });
  if (d.libsrc) rows.push({ k: 'libsrc', n: n(d.libsrc) });
  return { ok: true, rows, keys: file.keys || 'none',
           appVersion: S1(file.appVersion), at: S1(file.at),
           needPass: file.keys === 'enc' };
}

/* ---------------- 放 ----------------
   mode: 'replace' 覆盖（重装之后照原样恢复）
         'merge'   并入（只添不删：接口档、收藏、已移除、图库来源合并；
                    其余设置项以备份里的为准，备份里没有的保持原样）
   只动 parts 里点了名的那几块，文件里有、但没勾的一概不碰。 */
export async function apply(file, { parts, mode = 'replace', password = '' } = {}) {
  const sum = summarize(file);
  if (!sum.ok) throw new Error(sum.why);
  const d = file.data || {};
  const want = new Set(parts && parts.length ? parts : sum.rows.map(r => r.k));
  const done = [];

  /* 密钥先解出来，解不开就别往下走 —— 免得配置进了一半 */
  let secrets = null;
  if (file.secrets) {
    if (file.keys === 'enc') secrets = await decryptJSON(file.secrets, password);   // 口令不对会抛 badpass
    else secrets = file.secrets;
  }

  if (want.has('settings') && d.settings) {
    const incoming = clone(d.settings);
    pushSecrets(incoming, secrets);
    if (mode === 'merge') {
      /* 并入：接口档按 id 合并，本机已有的那一档留着，备份里多出来的加进来 */
      const cur = await S.getSettings();
      const byId = new Map((cur.ai?.list || []).map(p => [p.id, p]));
      for (const p of (incoming.ai?.list || [])) {
        const old = byId.get(p.id);
        byId.set(p.id, old ? { ...old, ...p, keys: [...new Set([...(p.keys || []), ...(old.keys || [])])].slice(0, 8),
                               models: [...new Set([...(p.models || []), ...(old.models || [])])].slice(0, 8) } : p);
      }
      incoming.ai = { ...(cur.ai || {}), ...(incoming.ai || {}), list: [...byId.values()].slice(0, 16) };
    }
    await S.setSettings(incoming);
    done.push('settings');
  }
  if (want.has('marks') && (d.favs || d.gone)) {
    const favs = Array.isArray(d.favs) ? d.favs : [];
    const gone = Array.isArray(d.gone) ? d.gone : [];
    const [cf, cg] = mode === 'merge' ? [await S.getFavs(), await S.getGone()] : [[], []];
    await S.setFavs([...new Set([...favs, ...cf])]);
    await S.setGone([...new Set([...gone, ...cg])]);
    done.push('marks');
  }
  if (want.has('history') && Array.isArray(d.history)) { await S.setHistory(d.history); done.push('history'); }
  if (want.has('tr') && d.tr) {
    await S.setTr(mode === 'merge' ? { ...(await S.getTr()), ...d.tr } : d.tr);
    done.push('tr');
  }
  if (want.has('packs') && d.packs) {
    const cur = mode === 'merge' ? await S.getPacks() : {};
    await S.setPacks({ ...cur, ...d.packs });
    done.push('packs');
  }
  if (want.has('daily') && d.daily) {
    const cur = await S.getDaily();
    const works = mode === 'merge'
      ? [...new Map([...(cur.works || []), ...(d.daily.works || [])].map(w => [w.id, w])).values()]
      : (d.daily.works || []);
    await S.setDaily({ day: d.daily.day || cur.day, at: d.daily.at || Date.now(),
                       frontier: d.daily.frontier || cur.frontier || [], works, fresh: 0 });
    done.push('daily');
  }
  if (want.has('libsrc') && Array.isArray(d.libsrc)) {
    const lib = await S.getLocalLib();
    const keepDirs = (lib.srcs || []).filter(x => x.kind !== 'url');       // 文件夹来源一律留着
    const oldUrls = mode === 'merge' ? (lib.srcs || []).filter(x => x.kind === 'url') : [];
    const byId = new Map([...oldUrls, ...d.libsrc].map(x => [x.id, x]));
    const srcs = [...keepDirs, ...byId.values()].slice(0, 12);
    const live = new Set(srcs.map(x => x.id));
    await S.setLocalLib({ at: Date.now(), srcs, works: (lib.works || []).filter(w => live.has(w.sid)) });
    done.push('libsrc');
  }
  return { done, mode };
}

/* 文件名：一眼看得出是哪天、带没带密钥 */
export function fileName(file) {
  const d = new Date(file?.at || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  const tag = file?.keys === 'enc' ? '-enc' : file?.keys === 'plain' ? '-with-keys' : '';
  return `corridor-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${tag}.json`;
}
