/* ============================================================
   自定义图库：把你自己的图片（和视频）接进藏品库。

   来源可以有好几个，两种：
     · 文件夹 —— 本机目录。用浏览器的 File System Access API，
       目录句柄按来源存在 IndexedDB 里，下次打开新标签页直接复用。
       图片始终留在你自己的硬盘上，扩展不复制、不上传，只在显示时读一次。
     · 网址   —— 一个在线图库。可以是目录索引页、普通网页、
       一份 JSON 清单、一行一个网址的纯文本，或者干脆就是一张图。
       这一类要先拿到那个域名的访问权限。

   每个来源各自带一套筛选：包含 / 排除（通配符或正则）、允许的格式、最小边长。
   ============================================================ */
import * as S from './store.js';

/* 图片：前 7 种浏览器直接认；svg 补上宽高再显示；tif/tiff、heic/heif、jxl 浏览器解得了就直接用，
   解不了交给 vendor/ 里的解码工人（见下面 rasterBitmap） */
export const IMG_EXTS = S.IMG_EXTS;
const SVG_RE = /\.svg$/i, TIFF_RE = /\.tiff?$/i;
/* 视频：Chrome 自己放得了的几种。mov 能不能放看里面的编码 ——
   H.264 与（Mac 上的）HEVC 都行，ProRes 不行；放不了的扫描时就跳过了，不会进库。 */
export const VIDEO_EXTS = S.VIDEO_EXTS;
export const EXTS = IMG_EXTS.concat(VIDEO_EXTS);
const EXT_RE = new RegExp('\\.(' + EXTS.join('|') + ')$', 'i');
export const isVideoName = (n) => S.isVideoURL(n);
export const MAX_FILES = 800;          // 一个来源最多收录这么多张
const SKIP_DIR = /^(\.|__MACOSX|node_modules|thumbs?$|\.thumbnails)/i;
const S1 = (v) => String(v ?? '').trim();

/* ---------------- 筛选 ----------------
   inc 留下什么、exc 踢掉什么。rx 关着时按通配符理解：
   写了 * 或 ? 就当通配符，什么都没写就当「包含这几个字」——
   多数人想的是后者，不该逼人学正则。
   ---------------------------------------- */
export const DEF_FILTER = () => ({ inc: '', exc: '', rx: false, ext: EXTS.slice(), minPx: 200 });

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* 一条模式 → 一个正则；写错了就把错误抛出去，界面照实说 */
export function toRe(pat, rx) {
  const p = S1(pat);
  if (!p) return null;
  if (rx) return new RegExp(p, 'i');
  if (/[*?]/.test(p)) return new RegExp('^' + p.split(/([*?])/).map(x =>
    x === '*' ? '.*' : x === '?' ? '.' : escRe(x)).join('') + '$', 'i');
  return new RegExp(escRe(p), 'i');    // 没有通配符就当子串
}
/* 把一套筛选编译成一个可以反复调用的函数。第二个返回值是错误说明。 */
export function compile(f) {
  f = { ...DEF_FILTER(), ...(f || {}) };
  const ext = (Array.isArray(f.ext) && f.ext.length ? f.ext : EXTS).map(x => S1(x).toLowerCase().replace(/^\./, ''));
  let inc = null, exc = null, err = '';
  try { inc = toRe(f.inc, f.rx); } catch (e) { err = 'inc: ' + S1(e.message).slice(0, 60); }
  try { exc = toRe(f.exc, f.rx); } catch (e) { err = (err ? err + ' · ' : '') + 'exc: ' + S1(e.message).slice(0, 60); }
  const test = (name, path) => {
    const n = S1(name);
    const e = (n.match(/\.([a-z0-9]+)$/i) || [])[1];
    if (!e || !ext.includes(e.toLowerCase())) return false;
    const stem = n.replace(/\.[^.]+$/, '');
    /* 匹配对象：文件名（带后缀）或去掉后缀的名字，哪个match上都算 ——
       写 *.png 的人想的是带后缀，写 ^IMG_\d{4}$ 的人想的是不带，两种都要能用。
       模式里带斜杠就换成整条路径来比，好按目录筛。 */
    /* 只认正斜杠 —— 反斜杠在正则里满地都是（\d、\.），不能拿它当「这是路径」的信号 */
    const targets = (pat) => S1(pat).includes('/') ? [S1(path || n)] : [n, stem];
    if (inc && !targets(f.inc).some(t => inc.test(t))) return false;
    if (exc && targets(f.exc).some(t => exc.test(t))) return false;
    return true;
  };
  return { test, err, minPx: Math.max(0, Math.round(Number(f.minPx) || 0)) };
}

/* ---------------- 目录句柄的存取（按来源分开） ---------------- */
const DB = 'corridor-fs', STORE = 'handles';
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export async function putHandle(id, h) {
  const d = await db();
  await new Promise((res, rej) => {
    const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(h, id || 'root');
    t.oncomplete = res; t.onerror = () => rej(t.error);
  });
}
export async function getHandle(id = 'root') {
  try {
    const d = await db();
    return await new Promise((res, rej) => {
      const q = d.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error);
    });
  } catch { return null; }
}
export async function delHandle(id = 'root') {
  try {
    const d = await db();
    await new Promise(res => { const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).delete(id); t.oncomplete = res; });
  } catch { }
}
export async function clearHandle() {           // 全清（「移除图库」时用）
  try {
    const d = await db();
    await new Promise(res => { const t = d.transaction(STORE, 'readwrite'); t.objectStore(STORE).clear(); t.oncomplete = res; });
  } catch { }
}
/* 权限：'granted' 可直接读，'prompt' 需要用户点一下，'denied' 只能重选 */
export async function permState(h, ask = false) {
  if (!h) return 'none';
  try {
    const opt = { mode: 'read' };
    let p = await h.queryPermission(opt);
    if (p !== 'granted' && ask) p = await h.requestPermission(opt);
    return p;
  } catch { return 'denied'; }
}

/* ---------------- 选择文件夹 ---------------- */
export function supported() { return typeof globalThis.showDirectoryPicker === 'function'; }
export async function pickFolder(id) {
  const h = await globalThis.showDirectoryPicker({ id: 'corridor-lib', mode: 'read' });
  await putHandle(id || 'root', h);
  return h;
}

/* ---------------- 网址那一类 ---------------- */
export const originOf = (u) => { try { return new URL(S1(u)).origin + '/*'; } catch { return ''; } };
export async function hasHost(u) {
  const o = originOf(u); if (!o) return false;
  if (!globalThis.chrome?.permissions) return true;
  try { return await chrome.permissions.contains({ origins: [o] }); } catch { return false; }
}
export async function askHost(u) {              // 必须在用户点击里调用
  const o = originOf(u); if (!o) return false;
  if (!globalThis.chrome?.permissions) return true;
  try { return await chrome.permissions.request({ origins: [o] }); } catch { return false; }
}

/* 从一个网址里把图片地址捞出来。认四种东西：
     · JSON  —— 数组（字符串或 {url|src|href|image}）或 {images|data|items|urls:[…]}
     · HTML  —— <img src|data-src|srcset> 与 <a href>；目录索引页正好就是后者
     · 纯文本 —— 一行一个网址
     · 图片本身 —— 那就只有它一张
   相对地址一律拿这个页面的地址去解析。 */
export function pickFromJSON(j) {
  const arr = Array.isArray(j) ? j
    : (j && (j.images || j.data || j.items || j.urls || j.list || j.result)) || [];
  if (!Array.isArray(arr)) return [];
  return arr.map(x => typeof x === 'string' ? { u: x }
    : (x && typeof x === 'object' ? { u: S1(x.url || x.src || x.href || x.image || x.link), t: S1(x.title || x.name || x.caption) } : null))
    .filter(x => x && x.u);
}
export function pickFromHTML(html, baseUrl) {
  const out = [];
  const seen = new Set();
  const add = (raw, t) => {
    const u = S1(raw); if (!u || /^(data|javascript|mailto):/i.test(u)) return;
    let abs = '';
    try { abs = new URL(u, baseUrl).toString(); } catch { return; }
    abs = abs.split('#')[0];
    if (seen.has(abs)) return;
    seen.add(abs);
    out.push({ u: abs, t: S1(t) });
  };
  let doc = null;
  try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch { }
  if (doc) {
    for (const im of doc.querySelectorAll('img')) {
      const ss = S1(im.getAttribute('srcset'));
      /* srcset 挑最大的那一档 */
      if (ss) {
        const best = ss.split(',').map(x => x.trim().split(/\s+/))
          .map(([u, d]) => ({ u, w: parseInt(d) || 0 })).sort((a, b) => b.w - a.w)[0];
        if (best) add(best.u, im.getAttribute('alt'));
      }
      add(im.getAttribute('src') || im.getAttribute('data-src') || im.getAttribute('data-original'), im.getAttribute('alt'));
    }
    /* 页面里直接嵌着的视频：<video src> 或它里面的 <source src> */
    for (const v of doc.querySelectorAll('video[src], video source[src]')) {
      const s = v.getAttribute('src');
      if (EXT_RE.test((s || '').split('?')[0])) add(s, (v.closest('video') || v).getAttribute('title'));
    }
    for (const a of doc.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      if (EXT_RE.test((h || '').split('?')[0])) add(h, a.textContent);
    }
  } else {
    /* DOMParser 用不了（后台环境）就退回粗粒度的正则 */
    const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    let m; while ((m = re.exec(html))) add(m[1], '');
  }
  return out;
}
export function pickFromText(txt, baseUrl) {
  return S1(txt).split(/[\r\n]+/).map(l => S1(l)).filter(l => l && !l.startsWith('#'))
    .map(l => { try { return { u: new URL(l, baseUrl).toString() }; } catch { return null; } })
    .filter(Boolean);
}

export async function listURL(url, signal) {
  const u = S1(url);
  if (!/^https?:\/\//i.test(u)) return { ok: false, err: '网址要以 http:// 或 https:// 开头', items: [] };
  let r;
  try { r = await fetch(u, { credentials: 'omit', signal }); }
  catch (e) { return { ok: false, err: '取不到这个网址 · ' + S1(e.message).slice(0, 60), items: [] }; }
  if (!r.ok) return { ok: false, err: `HTTP ${r.status}`, items: [] };
  const ct = S1(r.headers.get('content-type')).toLowerCase();
  if (ct.startsWith('image/') || ct.startsWith('video/')) { try { r.body?.cancel(); } catch { } return { ok: true, items: [{ u, t: '' }] }; }
  const body = await r.text();
  let items = [];
  if (ct.includes('json') || /^\s*[[{]/.test(body)) {
    try { items = pickFromJSON(JSON.parse(body)); } catch { items = []; }
  }
  if (!items.length && (ct.includes('html') || ct.includes('xml') || /<[a-z!]/i.test(body))) items = pickFromHTML(body, u);
  if (!items.length) items = pickFromText(body, u);
  /* 只留看着像图片的 */
  items = items.filter(x => EXT_RE.test(x.u.split('?')[0]));
  return { ok: true, items };
}

/* ---------------- 扫描：文件夹 ---------------- */
async function* walk(dir, prefix = '', depth = 0) {
  if (depth > 4) return;
  for await (const [name, h] of dir.entries()) {
    if (h.kind === 'directory') {
      if (SKIP_DIR.test(name)) continue;
      yield* walk(h, prefix + name + '/', depth + 1);
    } else if (EXT_RE.test(name) && !name.startsWith('.')) {
      yield { path: prefix + name, name, dir: prefix.replace(/\/$/, ''), handle: h };
    }
  }
}

const cleanTitle = (n) => n.replace(EXT_RE, '').replace(/[_]+/g, ' ')
  .replace(/^\d{1,4}[\s.\-–]+/, '').replace(/\s{2,}/g, ' ').trim();

/* ---------------- 视频：取一帧 ----------------
   src 可以是本机的 File，也可以是网址来源里的一个地址。
   开一个不挂到页面上的 <video>，读到尺寸与时长后跳到开头 10%（最多 3 秒）那一帧：
   很多片子第一帧是黑的，取稍后一点才看得出这段在拍什么。
   网址那一类要带 crossOrigin —— 已经给过这个域名的权限，画布不会被「污染」。
   放不了的（编码不认、文件坏了）超时或出错就抛出去，由调用方跳过。 */
function once(el, ok, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { off(); rej(new Error('timeout')); }, ms);
    const good = () => { off(); res(); };
    const bad = () => { off(); rej(new Error('video error')); };
    const off = () => { clearTimeout(t); el.removeEventListener(ok, good); el.removeEventListener('error', bad); };
    el.addEventListener(ok, good); el.addEventListener('error', bad);
  });
}
export async function grabFrame(src, ms = 12000) {
  if (typeof document === 'undefined') throw new Error('no document');
  const v = document.createElement('video');
  const own = typeof src !== 'string';
  const url = own ? URL.createObjectURL(src) : src;
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  if (!own) v.crossOrigin = 'anonymous';
  try {
    const meta = once(v, 'loadeddata', ms);
    v.src = url;
    await meta;
    const W = v.videoWidth, H = v.videoHeight;
    if (!W || !H) throw new Error('no picture');         // 只有声音的 mp4
    const dur = Number.isFinite(v.duration) ? v.duration : 0;
    const t = dur > 1 ? Math.min(dur * 0.1, 3) : 0;
    if (t > 0) { const sk = once(v, 'seeked', ms); v.currentTime = t; await sk; }
    const bmp = await createImageBitmap(v);
    return { bmp, dur: +dur.toFixed(2) };
  } finally {
    v.removeAttribute('src'); try { v.load(); } catch { }
    if (own) URL.revokeObjectURL(url);
  }
}
/* 展墙以外的几种看法（瀑布流、环形长廊、胶卷、藏品库的缩略图）放的是静帧：
   取出那一帧，缩到最长边 1280 以内存成 JPEG。本机视频的静帧只放在内存里，不写进缓存库。 */
export async function videoPoster(src, px = 1280) {
  const { bmp } = await grabFrame(src);
  const k = Math.min(1, px / Math.max(bmp.width, bmp.height));
  const c = new OffscreenCanvas(Math.max(1, Math.round(bmp.width * k)), Math.max(1, Math.round(bmp.height * k)));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c.convertToBlob({ type: 'image/jpeg', quality: .84 });
}
/* 时长写成 0:42 / 1:02:05 */
export function fmtDur(s) {
  s = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
}

/* 从图片本身算出比例、主色色卡与占位图，和内置作品用同一套呈现 */
async function analyse(file, name = '') {
  if (SVG_RE.test(name) || /svg/i.test(file.type || '')) {
    const n = await normalizeSvg(file);
    const a = await analyseBmp(await S.bitmapOf(n.blob));
    /* 尺寸记 svg 自己声明的那个（图标会被「最小边长」挡掉），比例跟着走 */
    return { ...a, w: n.w, h: n.h, ar: +(n.w / n.h).toFixed(4) };
  }
  if (!kindOf(name)) return analyseBmp(await createImageBitmap(file));
  const r = await rasterBitmap(file, name);
  /* 尺寸记原图的（超大的 TIFF 画布上缩过） */
  return { ...(await analyseBmp(r.bmp)), w: r.w, h: r.h, ar: +(r.w / r.h).toFixed(4) };
}

/* ---------------- svg ----------------
   只写了 viewBox、没写宽高（或者写的是 100%、210mm）的 svg，放进 <img> 没有固有尺寸，
   展墙上的画框就量不准。这里读出它声明的尺寸，把宽高按长边至少 1600 写回根节点；
   原来的尺寸记在 data-corridor-w/h 上，再转一次也不会越放越大。
   svg 放在 <img> 里本来就不跑脚本、不取外部资源，这里只是改两个属性。 */
export async function normalizeSvg(blob) {
  const txt = await blob.text();
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('bad svg');
  const px = (v) => { const m = /^\s*([\d.]+)\s*(px)?\s*$/i.exec(v || ''); return m ? parseFloat(m[1]) : 0; };
  let w = parseFloat(root.getAttribute('data-corridor-w')) || px(root.getAttribute('width'));
  let h = parseFloat(root.getAttribute('data-corridor-h')) || px(root.getAttribute('height'));
  const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
    if (!w && !h) { w = vb[2]; h = vb[3]; }
    else if (!w) w = h * vb[2] / vb[3];
    else if (!h) h = w * vb[3] / vb[2];
  }
  if (!(w > 0 && h > 0)) throw new Error('svg without size');
  const k = Math.max(1, 1600 / Math.max(w, h));
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${w} ${h}`);
  root.setAttribute('width', String(Math.round(w * k)));
  root.setAttribute('height', String(Math.round(h * k)));
  root.setAttribute('data-corridor-w', String(Math.round(w)));
  root.setAttribute('data-corridor-h', String(Math.round(h)));
  const out = new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' });
  return { blob: out, w: Math.round(w), h: Math.round(h) };
}

/* ---------------- TIFF / HEIC / JPEG XL ----------------
   先让浏览器自己解（Safari 认 TIFF 和 HEIC；Chrome 打开开关后认 JPEG XL），解不了再交给解码工人：
   vendor/decode-worker.js 在后台线程里解，页面不卡；HEIC、JPEG XL 的 wasm 第一次遇到时才去取。
   工人闲一分钟就收掉，把内存还回去。画布最长边限在 8192：再大的扫描件，屏幕上也看不出区别。 */
const MAXPX = 8192;
const kindOf = (name) => TIFF_RE.test(name) ? 'tiff' : /\.(heic|heif)$/i.test(name) ? 'heic' : /\.jxl$/i.test(name) ? 'jxl' : '';
const native = {};                              // heic / jxl：这个浏览器自己解不解得了（试过一次就记住）
let worker = null, wseq = 0, wIdle = 0;
const waits = new Map();
function dropWorker(err) {
  for (const w of waits.values()) w.rej(err || new Error('decoder stopped'));
  waits.clear();
  try { worker?.terminate(); } catch { }
  worker = null;
}
/* 一次最多解两张：iPhone 一张照片解开就是四五十 MB，藏品库一屏几十张一起解会把内存吃光 */
let inflight = 0;
const queue = [];
async function workerDecode(kind, buf) {
  if (inflight >= 2) await new Promise(r => queue.push(r));
  inflight++;
  try { return await decodeOnce(kind, buf); }
  finally { inflight--; queue.shift()?.(); }
}
function decodeOnce(kind, buf) {
  if (!worker) {
    worker = new Worker(new URL('./vendor/decode-worker.js', import.meta.url));
    worker.onmessage = (e) => {
      const w = waits.get(e.data?.id); if (!w) return;
      waits.delete(e.data.id); clearTimeout(w.t);
      e.data.ok ? w.res(e.data) : w.rej(new Error(e.data.err || 'decode failed'));
      if (!waits.size) { clearTimeout(wIdle); wIdle = setTimeout(() => { if (!waits.size) dropWorker(); }, 60000); }
    };
    worker.onerror = (e) => { e.preventDefault?.(); dropWorker(new Error('decoder failed to start')); };
  }
  clearTimeout(wIdle);
  return new Promise((res, rej) => {
    const id = ++wseq;
    /* 一张图一分钟还没解完，多半是文件有问题：这一张算失败，别让后面的一直等 */
    const t = setTimeout(() => { if (waits.delete(id)) rej(new Error('decode timeout')); }, 60000);
    waits.set(id, { res, rej, t });
    worker.postMessage({ id, kind, buf }, [buf]);
  });
}
/* → { bmp, w, h, native }：w / h 是原图尺寸，native 表示浏览器自己就能显示 */
async function rasterBitmap(blob, name) {
  const kind = kindOf(name);
  if (kind !== 'tiff' && native[kind] !== false) {
    try {
      const bmp = await createImageBitmap(blob);
      if (kind) native[kind] = true;
      return { bmp, w: bmp.width, h: bmp.height, native: true };
    } catch (e) { if (!kind) throw e; native[kind] = false; }
  }
  let r;
  try { r = await workerDecode(kind, await blob.arrayBuffer()); }
  catch (e) {
    if (kind === 'tiff') throw e;
    /* 浏览器和解码器都打不开：记下来，卡片上照实说 */
    throw Object.assign(new Error('unsupported'), { code: 'unsupported', ext: (/\.([a-z0-9]+)$/i.exec(name)?.[1] || kind).toLowerCase(), cause: e });
  }
  const img = new ImageData(new Uint8ClampedArray(r.data.buffer, r.data.byteOffset, r.width * r.height * 4), r.width, r.height);
  const k = Math.min(1, MAXPX / Math.max(r.width, r.height));
  const bmp = k < 1
    ? await createImageBitmap(img, { resizeWidth: Math.round(r.width * k), resizeHeight: Math.round(r.height * k), resizeQuality: 'high' })
    : await createImageBitmap(img);
  return { bmp, w: r.width, h: r.height, native: false };
}
/* 给 <img> 用的版本：svg 补宽高；浏览器自己显示得了的原样返回；其余编码成 JPEG（带透明的用 PNG） */
export async function displayBlob(blob, name) {
  if (SVG_RE.test(name)) return (await normalizeSvg(blob)).blob;
  if (!kindOf(name)) return blob;
  const { bmp, native: ok } = await rasterBitmap(blob, name);
  if (ok) { bmp.close(); return blob; }
  const c = new OffscreenCanvas(bmp.width, bmp.height), g = c.getContext('2d');
  g.drawImage(bmp, 0, 0); bmp.close();
  /* 抽样看一眼有没有半透明像素，有就存 PNG，没有存 JPEG —— 省下好几倍体积 */
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let alpha = false;
  for (let i = 3, step = Math.max(4, Math.floor(d.length / 4 / 20000) * 4); i < d.length; i += step) if (d[i] < 255) { alpha = true; break; }
  return c.convertToBlob(alpha ? { type: 'image/png' } : { type: 'image/jpeg', quality: .92 });
}
/* 视频取一帧来算，再补上时长 */
async function analyseVideo(src) {
  const { bmp, dur } = await grabFrame(src);
  const a = await analyseBmp(bmp);
  return { ...a, dur };
}
async function analyseBmp(bmp) {
  const W = bmp.width, H = bmp.height, ar = W / H;
  const N = 64, c = new OffscreenCanvas(N, N), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0, N, N);
  const px = g.getImageData(0, 0, N, N).data;
  const bins = new Map(); let lum = 0, sat = 0;
  for (let i = 0; i < px.length; i += 4) {
    const R = px[i], G = px[i + 1], B = px[i + 2];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    lum += (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
    sat += mx ? (mx - mn) / mx : 0;
    const k = (R >> 4 << 8) | (G >> 4 << 4) | (B >> 4);
    const e = bins.get(k) || [0, 0, 0, 0];
    e[0] += R; e[1] += G; e[2] += B; e[3]++; bins.set(k, e);
  }
  const n = px.length / 4;
  const top = [...bins.values()].sort((a, b) => b[3] - a[3]).slice(0, 6);
  const hx = (v) => Math.round(v).toString(16).padStart(2, '0');
  const palette = top.map(e => '#' + hx(e[0] / e[3]) + hx(e[1] / e[3]) + hx(e[2] / e[3]));
  const vivid = top.findIndex(e => {
    const R = e[0] / e[3], G = e[1] / e[3], B = e[2] / e[3], mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    return mx && (mx - mn) / mx > .22;
  });
  const q = new OffscreenCanvas(20, Math.max(1, Math.round(20 / ar)));
  q.getContext('2d').drawImage(bmp, 0, 0, q.width, q.height);
  const blob = await q.convertToBlob({ type: 'image/jpeg', quality: .55 });
  const lqip = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsDataURL(blob); });
  bmp.close();
  return {
    w: W, h: H, ar: +ar.toFixed(4), dur: 0,
    vis: { accent: palette[vivid >= 0 ? vivid : 0] || '#8a8375', lum: +(lum / n).toFixed(3), sat: +(sat / n).toFixed(3),
           palette, weights: top.map(e => +(e[3] / n).toFixed(3)), lqip }
  };
}

function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }

/* 远端页面给的 alt / title 是别人写的字，进库之前先去掉尖括号与控制字符。
   界面那一层当然会转义，这只是不让脏东西进到存储里。 */
export const cleanText = (v, n = 200) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  .replace(/[<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim().slice(0, n);

/* 一张图 → 一件作品。文件夹与网址两类共用这一份。 */
function mkWork(sid, { key, name, folder, title }, a, src) {
  const t = cleanText(S1(title) || cleanTitle(name), 200);
  return {
    id: 'lb-' + hash(sid + '|' + key), local: true, sid, path: key,
    title: { zh: t, en: t },
    artist: { zh: cleanText(folder, 120), en: cleanText(folder, 120) },
    life: '', year: '', ys: 0,
    medium: a.video ? { zh: '视频', en: 'Video' } : { zh: '', en: '' },
    dims: `${a.w} × ${a.h}` + (a.video && a.dur ? ` · ${fmtDur(a.dur)}` : ''),
    museum: { zh: '', en: '' }, place: { zh: '', en: '' },
    movement: '', region: '', tags: [], mature: false,
    format: a.ar > 2 ? 'wide' : a.ar < .8 ? 'tall' : 'std',
    note: { zh: '', en: '' }, look: { zh: '', en: '' },
    img: { base: src, name, full: src, w: a.w, h: a.h, ar: a.ar, sizes: [0] },
    src: { file: key, page: '', licence: '' },
    vis: a.vis,
    /* 视频：dur 是秒数，0 = 读不出来（直播流之类），轮换时退回按间隔 */
    ...(a.video ? { video: true, dur: a.dur || 0 } : {})
  };
}

/* 本机图片的地址：local:<来源 id>|<相对路径>。
   老版本存的是 local:<路径>（只有一个文件夹），读的时候当成 root 那一档。 */
export const localURL = (sid, path) => 'local:' + (sid || 'root') + '|' + path;
export function splitLocal(u) {
  const s = String(u || '').replace(/^local:/, '');
  const i = s.indexOf('|');
  return i < 0 ? { sid: 'root', path: s } : { sid: s.slice(0, i), path: s.slice(i + 1) };
}

/* 扫一个文件夹来源 */
export async function scanDir(src, onProgress, signal) {
  const sid = src.id;
  const h = await getHandle(sid);
  if (!h) return { ok: false, err: 'nohandle', works: [] };
  if (await permState(h) !== 'granted') return { ok: false, err: 'noperm', works: [] };
  const f = compile(src.f);
  if (f.err) return { ok: false, err: f.err, works: [] };

  const found = [];
  for await (const x of walk(h)) {
    if (!f.test(x.name, x.path)) continue;
    found.push(x);
    if (found.length >= MAX_FILES) break;
  }
  found.sort((a, b) => a.path.localeCompare(b.path, 'zh'));
  const works = [], skip = {};
  for (let i = 0; i < found.length; i++) {
    if (signal?.aborted) break;
    const x = found[i];
    try {
      const file = await x.handle.getFile();
      const vid = isVideoName(x.name);
      /* 图片整张读进内存，所以卡在 64 MB（TIFF 扫描件常常更大，放宽到 200 MB）；
         视频是边放边从硬盘读，不设上限 */
      const cap = TIFF_RE.test(x.name) ? 200 : 64;
      if (!file.size || (!vid && file.size > cap * 1048576)) continue;
      const a = vid ? { ...(await analyseVideo(file)), video: true } : await analyse(file, x.name);
      if (a.w < f.minPx || a.h < f.minPx) continue;
      works.push(mkWork(sid, { key: x.path, name: x.name, folder: x.dir.split('/').filter(Boolean).pop() || '' },
                        a, localURL(sid, x.path)));
    } catch (e) {
      /* 单张读不了就跳过；浏览器不认的格式（HEIC、JPEG XL）记个数，卡片上照实说 */
      if (e?.code === 'unsupported') skip[e.ext] = (skip[e.ext] || 0) + 1;
    }
    onProgress?.(i + 1, found.length);
  }
  return { ok: true, works, seen: found.length, skip };
}

/* 扫一个网址来源 */
export async function scanURL(src, onProgress, signal) {
  const sid = src.id;
  const f = compile(src.f);
  if (f.err) return { ok: false, err: f.err, works: [] };
  if (!(await hasHost(src.url))) return { ok: false, err: 'noperm', works: [] };

  const got = await listURL(src.url, signal);
  if (!got.ok) return { ok: false, err: got.err, works: [] };
  let items = got.items.filter(x => {
    let name = '';
    try { name = decodeURIComponent(new URL(x.u).pathname.split('/').pop() || ''); } catch { name = x.u.split('/').pop() || ''; }
    return f.test(name, x.u);
  });
  items = items.slice(0, MAX_FILES);
  const host = (() => { try { return new URL(src.url).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  const works = [], skip = {};
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) break;
    const it = items[i];
    let name = '';
    try { name = decodeURIComponent(new URL(it.u).pathname.split('/').pop() || ''); } catch { name = it.u.split('/').pop() || ''; }
    try {
      let a;
      if (isVideoName(name) || isVideoName(it.u)) {
        /* 网址来源的视频不下载整段：只读开头取一帧，放的时候也是直接串流 */
        a = { ...(await analyseVideo(it.u)), video: true };
      } else {
        const { blob } = await S.fetchImage(it.u, { id: 'lb-' + hash(sid + '|' + it.u) });
        if (!blob.size || blob.size > 64 * 1048576) continue;
        /* tiff / heic / jxl 在 fetchImage 里已经转成浏览器认得的图了，这里按转完的样子算 */
        a = await analyse(blob, S.needsConvert(name) && !SVG_RE.test(name) ? '' : name);
      }
      if (a.w < f.minPx || a.h < f.minPx) continue;
      works.push(mkWork(sid, { key: it.u, name, folder: S1(src.name) || host, title: it.t }, a, it.u));
    } catch (e) {
      if (e?.code === 'unsupported') skip[e.ext] = (skip[e.ext] || 0) + 1;
    }
    onProgress?.(i + 1, items.length);
  }
  return { ok: true, works, seen: items.length, skip };
}

export const scanSrc = (src, onProgress, signal) =>
  src && src.kind === 'url' ? scanURL(src, onProgress, signal) : scanDir(src, onProgress, signal);

/* 老接口：还有别处按「一个文件夹」在调 */
export async function scan(h, onProgress) {
  await putHandle('root', h);
  const r = await scanDir({ id: 'root', kind: 'dir', f: DEF_FILTER() }, onProgress);
  return r.works;
}

/* ---------------- 显示时按需读取原图 ---------------- */
const cache = new Map();
export async function readFile(u) {
  const { sid, path } = splitLocal(u);
  if (cache.has(sid + '|' + path)) return cache.get(sid + '|' + path);
  const root = await getHandle(sid); if (!root) throw new Error('no folder');
  if (await permState(root) !== 'granted') throw new Error('no permission');
  let dir = root;
  const parts = path.split('/');
  const name = parts.pop();
  for (const p of parts) dir = await dir.getDirectoryHandle(p);
  const file = await (await dir.getFileHandle(name)).getFile();
  if (cache.size > 24) cache.delete(cache.keys().next().value);
  cache.set(sid + '|' + path, file);
  return file;
}
