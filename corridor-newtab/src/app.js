/* ============================================================
   长廊 Corridor — 新标签页主程序
   ============================================================ */
import { STR, MOVEMENTS, REGIONS, TAGS, HUES, FRAMES, LINERS, WALLS, WALLGROUPS, TEXTURES, TEXGROUPS, COUNTRIES,
         t, label, lx, enDate, applyPack, dropPack, hasPack, packCount, packTotal } from './i18n.js';
import * as S from './store.js';
import * as MODES from './modes.js';
import * as LOCAL from './local.js';
import * as AI from './ai.js';
import * as LG from './langs.js';
import * as TR from './translate.js';
import * as DG from './diag.js';
import * as NET from './localnet.js';
import * as BK from './backup.js';
import * as TN from './tone.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const SIZE_LADDER = [120, 250, 330, 500, 960, 1280, 1920, 3840];
const rt = (p) => (globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL(p) : p);
const stageW = () => document.getElementById('stage')?.clientWidth || innerWidth;
const MODE_KEYS = ['wall', 'carousel', 'film', 'immersive', 'masonry'];
/* 静止时可以单独隐掉的部件，以及它在哪几种呈现模式里真的存在 */
const HIDE_PARTS = [
  { k: 'chrome',  m: MODE_KEYS },
  { k: 'clock',   m: MODE_KEYS },
  { k: 'counter', m: MODE_KEYS },
  { k: 'title',   m: MODE_KEYS },
  { k: 'artist',  m: MODE_KEYS },
  { k: 'meta',    m: ['immersive', 'wall', 'carousel', 'film', 'masonry'] },
  { k: 'museum',  m: ['immersive', 'wall', 'carousel', 'film'] },
  { k: 'look',    m: ['immersive', 'carousel', 'film'] },
  { k: 'palette', m: ['immersive'] }
];
const HIDE_KEYS = HIDE_PARTS.map(x => x.k);
const MAX_DAILY = 150;
/* 界面用哪一个语言位置：母语（native）· 外语（foreign）· 跟系统在两者间挑（auto）。
   回来的是一对码：[界面语言, 另一种] —— 墙签翻面翻的就是这两面。 */
function resolveLang(set) {
  const a = S1(set?.loc?.a) || 'zh', b = S1(set?.loc?.b) || (a === 'en' ? 'zh' : 'en');
  const v = set?.lang;
  if (v === 'native') return [a, b];
  if (v === 'foreign') return [b, a];
  const g = LG.guess();                                   // 跟系统：系统语言更接近哪一个就用哪一个
  const near = (c) => (c === g ? 2 : (String(c).split('-')[0] === String(g).split('-')[0] ? 1 : 0));
  return near(b) > near(a) ? [b, a] : [a, b];
}

const A = {                       // 应用状态
  cat: [], byId: new Map(), set: null, favs: [], hist: [], gone: [],
  /* 备份面板的临时状态：勾了哪几块、密钥怎么带、选中的那份文件 —— 都不进设置 */
  bk: { parts: { settings: true, marks: true, history: false, tr: false, packs: false, daily: false, libsrc: true },
        keys: 'none', pass: '', file: null, sum: null, mode: 'replace', pass2: '', msg: '' },
  list: [], idx: 0, cur: null, seed: 1,
  timer: null, tick: null, paused: false, layer: 'A',
  lang: 'zh', other: 'en', objUrls: new Set(), libTab: 'all', libQ: '', busy: false,
  dtab: 'show', hover: null, lastDl: null, painted: null, daily: 0, fresh: 0, lib: 0, libName: '',
  aiEye: false, aiAbort: null, aiPrev: null, aiReport: null,
  /* 分组折叠状态：提示词与 Chrome 页脚默认收着，别一开就是一屏文本 */
  fold: { aiprompt: true, chrome: true }, dq: '', labFlip: false,
  tr: {}, trAbort: null, trStat: null, diag: null, langNew: '',
  pbAbort: null, pbRows: null, pbOpen: false,
  libSrcs: [], libOpen: '', libAbort: null
};
const T = (k, v) => t(A.lang, k, v);
const dt = (v) => A.lang === 'zh' ? String(v ?? '') : enDate(v);   // 年代/生卒/尺寸的中文限定词
const sep = () => LG.isCJK(A.lang) ? '，' : ', ';

/* ---------------- 工具 ---------------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
function shuffled(arr, seed) { const r = mulberry(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function fmtBytes(n) { if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(0) + ' KB'; if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB'; return (n / 1073741824).toFixed(2) + ' GB'; }
/* 主色可能是三位简写，也可能压根没有（外来的作品记录）——一律先规整成六位 */
function hexToHsl(raw) {
  let hex = String(raw || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) hex = '#' + hex.slice(1).replace(/./g, c => c + c);
  if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = '#8a8375';
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, s, l];
}
function hslToHex(h, sa, l) {
  const c = (1 - Math.abs(2 * l - 1)) * sa, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const r = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor((h % 360) / 60)];
  return '#' + r.map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
/* 把作品主色调整到界面可读的明度与饱和度。
   浅色面板要的是同一个色相的深版，不然亮色主色压在白底上什么都看不清 */
function uiAccent(hex, light) {
  let [h, sa, l] = hexToHsl(hex);
  if (sa < 0.12) return light ? '#8a6a12' : '#c9a227';
  return light
    ? hslToHex(h, Math.min(0.88, Math.max(sa, 0.52)), Math.min(0.40, Math.max(l, 0.27)))
    : hslToHex(h, Math.min(0.82, Math.max(sa, 0.46)), Math.min(0.70, Math.max(l, 0.54)));
}
function hueKeyOf(hex) {
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.16 || l < 0.07 || l > 0.94) return 'neutral';
  for (const H of HUES) { if (!H.h) continue; const [a, b] = H.h; if (a > b ? (h >= a || h < b) : (h >= a && h < b)) return H.key; }
  return 'neutral';
}
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 2100); }
/* 事后反悔的那几秒：不拦一道确认，改成做完给一条能点回去的提示。
   期间再移除一幅，上一条就作数了 —— 撤销只管最近这一步。 */
function undoBar(msg, label, fn, ms = 6000) {
  const bar = $('#undobar'), txt = $('#undoTxt'), btn = $('#undoBtn');
  if (!bar) return;
  clearTimeout(undoBar._t);
  txt.textContent = msg; btn.textContent = label;
  bar.hidden = false;
  requestAnimationFrame(() => bar.classList.add('on'));
  btn.onclick = async () => { undoBarHide(); try { await fn(); } catch { } };
  undoBar._t = setTimeout(undoBarHide, ms);
}
function undoBarHide() {
  const bar = $('#undobar');
  if (!bar) return;
  clearTimeout(undoBar._t);
  bar.classList.remove('on');
  setTimeout(() => { if (!bar.classList.contains('on')) bar.hidden = true; }, 320);
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S1 = (v) => String(v ?? '').trim();
/* 作品文本按这个顺序找：当前语言 → 另一面 → 英文 → 中文。
   第三种语言还没译到的字段，就先拿英文顶着，不会开天窗。 */
function pickL(o, lg) {
  if (o == null) return '';
  if (typeof o !== 'object') return String(o);
  return S1(o[lg]) || S1(o[lg === A.lang ? A.other : A.lang]) || S1(o.en) || S1(o.zh) || '';
}
const tx = (o) => pickL(o, A.lang);
/* 年代 / 生卒这类夹着中文限定词的短语：有译文就用译文，
   没有就退回英文写法（enDate 把「约 1503 年」这类换成 c. 1503） */
const dtw = (w, k) => S1(w?.tr?.[A.lang]?.[k]) || (A.lang === 'zh' ? S1(w?.[k]) : enDate(w?.[k]));

/* ---------------- 图片地址 ---------------- */
function pickSize(w, targetPx) {
  const avail = w.img.sizes;
  for (const s of avail) if (s >= targetPx) return s;
  return avail[avail.length - 1];
}
function imgUrl(w, px) { return w.local ? w.img.base : `${w.img.base}/${px}px-${w.img.name}`; }
/* 沉浸式画面适配：横幅接近屏幕比例时铺满，否则完整显示 + 模糊底 */
function fitMode(w) {
  if (w.format === 'scroll' && A.set.scrollPan) return 'cover';
  if (A.set.fit === 'cover') return 'cover';
  if (A.set.fit === 'contain') return 'contain';
  const r = w.img.ar / (stageW() / innerHeight);
  const k = Math.max(r, 1 / r);
  return k <= 1.22 ? 'cover' : 'contain';
}
function targetWidthFor(w, mode) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (w.format === 'scroll') return 3840;          // 手卷需要最大分辨率
  const q = A.set.quality;
  if (q === 'saver') return 1280;
  if (q === 'high') return 1920;
  if (q === 'max') return 3840;
  let need;
  const vw = stageW() * dpr, vh = innerHeight * dpr;
  if (mode === 'wall') need = Math.min(stageW() * 0.62, 1440) * dpr;
  else if (fitMode(w) === 'contain') need = Math.min(vw * 0.9, vh * 0.82 * w.img.ar);
  else need = w.img.ar >= vw / vh ? vh * w.img.ar : vw;   // cover
  return Math.min(Math.max(need, 960), 3840);
}

/* ---------------- 播放列表 ---------------- */
/* forPlay=true 时才应用办公模式：它只负责「轮换时跳过」，不负责「藏起来不让看」 */
function passFilters(w, f, forPlay = true) {
  if (w._gone) return false;
  if (forPlay && A.set.workSafe && w.mature) return false;
  if (f.movements.length && !f.movements.includes(w.movement)) return false;
  if (f.regions.length && !f.regions.includes(w.region)) return false;
  if (f.tags.length && !f.tags.some(x => w.tags.includes(x))) return false;
  if (f.artists.length && !f.artists.includes(w.artist.en)) return false;
  if (f.hues.length && !f.hues.includes(w._hue)) return false;
  if (f.countries?.length && !f.countries.includes(w._country)) return false;
  if (f.eraMin != null && w.ys < f.eraMin) return false;
  if (f.eraMax != null && w.ys > f.eraMax) return false;
  if (f.q) { const q = f.q.toLowerCase(); if (!w._search.includes(q)) return false; }
  return true;
}
function buildList() {
  const f = A.set.filters;
  let pool = A.cat;
  if (A.set.scope === 'fav') pool = A.cat.filter(w => !w._gone && A.favs.includes(w.id));
  else if (A.set.scope === 'lib') pool = A.cat.filter(w => !w._gone && w.local);
  else if (A.set.scope === 'daily') pool = A.cat.filter(w => !w._gone && w.daily);
  else if (A.set.scope === 'filter') pool = A.cat.filter(w => passFilters(w, f));
  else pool = A.cat.filter(w => !w._gone && !(A.set.workSafe && w.mature));
  if (!pool.length) pool = A.cat.filter(w => !w._gone && !(A.set.workSafe && w.mature));
  if (!pool.length) pool = A.cat.filter(w => !w._gone);
  if (!pool.length) pool = A.cat;
  A.list = A.set.order === 'shuffle' ? shuffled(pool, A.seed) : pool.slice().sort((a, b) => a.ys - b.ys);
  return A.list;
}
const listSig = () => hashStr(JSON.stringify([A.set.scope, A.set.order, A.set.workSafe, A.set.filters, A.favs.length, A.gone.length, A.list.length]));

/* ---------------- 渲染 ---------------- */
function revoke(u) { if (u && u.startsWith('blob:')) { URL.revokeObjectURL(u); A.objUrls.delete(u); } }

const swapT = new WeakMap();
/* 换作品时信息块淡出→改字→淡入，避免文字硬跳 */
function fadeSwap(el, fn) {
  if (!el) return fn();
  clearTimeout(swapT.get(el));
  el.classList.add('txswap');
  swapT.set(el, setTimeout(() => { fn(); el.classList.remove('txswap'); }, 150));
}
function paintMeta(w) {
  A.cur = w;
  document.documentElement.style.setProperty('--accent', uiAccent(w.vis.accent));
  document.documentElement.style.setProperty('--accent-lt', uiAccent(w.vis.accent, true));
  document.documentElement.style.setProperty('--accent-raw', w.vis.accent);
  fadeSwap($('#card'), () => paintCard(w));
  fadeSwap($('#label'), () => paintLabel(w));
  updateFavBtn();
  paintCounter();
}
const paintCounter = () => {
  const el = $('#counter');
  if (el) el.innerHTML = `<b>${String(A.idx + 1).padStart(2, '0')}</b> / ${String(A.list.length).padStart(2, '0')}`;
};
/* 播放列表长度变了（放回作品之后）：把游标重新对到当前这一幅上，
   顺手把「第几 / 共几」刷新 —— 不然计数器会停在改变之前那个数上。 */
function resyncIdx() {
  const i = A.cur ? A.list.findIndex(x => x.id === A.cur.id) : -1;
  A.idx = i >= 0 ? i : Math.min(A.idx, Math.max(0, A.list.length - 1));
  paintCounter();
}
/* 环形长廊的展签：焦点作品正下方那一小块铭牌 */
function capHTML(w) {
  const alt = pickL(w.title, A.other);
  const en = alt && alt !== tx(w.title) ? `<em>${esc(alt)}</em>` : '';
  const mov = label(MOVEMENTS, w.movement, A.lang);
  const eyebrow = [mov, dtw(w, 'year')].filter(Boolean).join(' · ');
  const where = [tx(w.museum), tx(w.place)].filter(Boolean).join(sep());
  const look = tx(w.look) || (w.daily ? T('dailyNote') : '');
  /* 收藏地并进作者那一行 —— 竖幅作品下方本来就没多少地方 */
  return `<div class="cc-rule"></div>
    ${eyebrow ? `<div class="cc-eyebrow">${esc(eyebrow)}</div>` : ''}
    <h2>${esc(tx(w.title))}${en}</h2>
    <div class="cc-who"><b>${esc(tx(w.artist))}</b>${w.life ? `<span class="cc-life"> ${esc(dtw(w, 'life'))}</span>` : ''}${
      where ? `<i class="cc-at">${esc(where)}</i>` : ''}</div>
    ${look ? `<div class="cc-look">${esc(look)}</div>` : ''}`;
}

/* 供环形长廊回调：只换当前作品，不重绘整个模式 */
async function setIndex(i) {
  A.idx = ((i % A.list.length) + A.list.length) % A.list.length;
  const w = A.list[A.idx]; if (!w) return;
  paintMeta(w);
  await S.setCursor({ idx: A.idx, at: Date.now(), sig: listSig() });
  S.pushHistory(w.id).then(h => A.hist = h);
  resetProgress(); prefetchAhead();
}

async function show(w, dir = 1) {
  if (!w) return;
  paintMeta(w);

  const mode = A.set.mode;
  if (mode === 'masonry' || mode === 'carousel' || mode === 'film') {
    if (A.painted !== mode) { await MODES.paintMode(mode); A.painted = mode; }
    else if (mode === 'carousel') MODES.syncCarousel(A.idx);
    $('#boot').classList.add('gone');
    S.pushHistory(w.id).then(h => A.hist = h);
    resetProgress(); prefetchAhead();
    return;
  }
  A.painted = null; MODES.stopLoops();

  const px = pickSize(w, targetWidthFor(w, mode));
  const url = imgUrl(w, px);

  // 先用 LQIP 占位，避免空白
  let src = w.vis.lqip, cached = false;
  try {
    const r = await S.fetchImage(url, { id: w.id });
    src = URL.createObjectURL(r.blob); A.objUrls.add(src); cached = r.fromCache;
  } catch (e) {
    // 离线且未缓存：退回更小尺寸 / LQIP
    for (const alt of w.img.sizes.filter(s => s < px).reverse()) {
      const b = await S.cacheGet(imgUrl(w, alt));
      if (b) { src = URL.createObjectURL(b); A.objUrls.add(src); cached = true; break; }
    }
  }

  if (mode === 'wall') await paintWall(w, src);
  else await paintImmersive(w, src, dir);

  $('#boot').classList.add('gone');
  S.pushHistory(w.id).then(h => A.hist = h);
  resetProgress();
  prefetchAhead();
  if (!cached) S.cacheTrim(A.set.cacheLimitMB * 1048576);
}

function paintImmersive(w, src, dir) {
  return new Promise(res => {
    const next = A.layer === 'A' ? 'B' : 'A';
    const el = $('#lay' + next), img = $('img', el), old = $('#lay' + A.layer);
    const fit = fitMode(w);
    const scrolling = w.format === 'scroll' && A.set.scrollPan;
    el.classList.toggle('contain', fit === 'contain' && !scrolling);
    el.classList.toggle('scrolling', scrolling);
    $('.imm-bg', el).style.backgroundImage = (fit === 'contain' || scrolling) ? `url("${src}")` : 'none';
    const oldSrc = $('img', old).src;
    const r = mulberry(hashStr(w.id))();
    el.style.setProperty('--kx1', (-0.8 + r * 0.5).toFixed(2) + '%');
    el.style.setProperty('--ky1', (-0.6 + r * 0.4).toFixed(2) + '%');
    el.style.setProperty('--kx2', (0.5 + r * 0.7).toFixed(2) + '%');
    el.style.setProperty('--ky2', (0.4 + r * 0.6).toFixed(2) + '%');
    const isScroll = w.format === 'scroll' && A.set.scrollPan;
    img.classList.toggle('scroll', isScroll);
    if (isScroll) {
      const vw = stageW();
      const bandH = Math.max(140, Math.min(innerHeight * 0.60, (vw * 2.6) / w.img.ar));
      const iw = bandH * w.img.ar;
      img.style.height = bandH + 'px';
      img.style.top = Math.round((innerHeight - bandH) / 2 - innerHeight * 0.06) + 'px';
      img.style.setProperty('--imgw', iw + 'px');
      img.style.setProperty('--dur', Math.max(45, Math.min(240, (iw - vw) / 22)) + 's');
    } else {
      img.style.removeProperty('height'); img.style.removeProperty('top');
      img.style.removeProperty('--imgw'); img.style.removeProperty('--dur');
    }
    const done = () => {
      el.classList.add('on'); old.classList.remove('on'); A.layer = next;
      setTimeout(() => { if ($('img', old).src !== img.src) revoke(oldSrc); }, 1300);
      res();
    };
    img.onload = done; img.onerror = done;
    img.src = src;
  });
}

function paintWall(w, src) {
  return new Promise(res => {
    const wall = $('#wall'), img = $('#wallImg');
    const oldSrc = img.src;
    wall.classList.add('fading');
    setTimeout(() => {
      img.classList.toggle('scrollimg', w.format === 'scroll');
      img.onload = img.onerror = () => { wall.classList.remove('fading'); revoke(oldSrc); res(); };
      img.src = src;
    }, 380);
  });
}

function paintCard(w) {
  $('#cbMov').textContent = label(MOVEMENTS, w.movement, A.lang);
  $('#cbYear').textContent = '· ' + dtw(w, 'year');
  $('#cbTitle').textContent = tx(w.title);
  const alt = pickL(w.title, A.other);
  $('#cbTitleEn').textContent = alt && alt !== tx(w.title) ? alt : '';
  $('#cbArtist').textContent = tx(w.artist);
  $('#cbLife').textContent = w.life ? '· ' + dtw(w, 'life') : '';
  $('#cbWhere').textContent = [tx(w.museum), tx(w.place)].filter(Boolean).join(' · ');
  const hasLook = !!tx(w.look);
  $('#lookLab').textContent = hasLook ? T('look') : (w.daily ? T('dailyBadge') : '');
  $('#lookTxt').textContent = hasLook ? tx(w.look) : (w.daily ? T('dailyNote') : '');
  $('#lookLab').parentElement.style.display = (hasLook || w.daily) ? '' : 'none';
  const p = $('#palette'); p.innerHTML = ''; p.title = T('paletteHint');
  w.vis.palette.slice(0, 6).forEach(hex => {
    const b = document.createElement('button');
    b.className = 'sw'; b.style.background = hex; b.dataset.hex = hex.toUpperCase();
    b.title = T('copy') + ' ' + hex.toUpperCase();
    b.onclick = () => { navigator.clipboard?.writeText(hex.toUpperCase()); toast(T('copied') + ' ' + hex.toUpperCase()); };
    p.appendChild(b);
  });
}

/* 翻面那一面：挑一个跟正面不一样的写法。
   某件作品还没译到外语时，正面回落到哪一种，背面就往下顺一位 ——
   翻过去两面一模一样是最扫兴的。 */
function pickAlt(o, lg, not) {
  if (o == null) return '';
  if (typeof o !== 'object') return String(o);
  for (const v of [o[lg], o.en, o.zh, o[A.lang]]) { const t = S1(v); if (t && t !== not) return t; }
  return pickL(o, lg);
}

/* 墙签：点一下翻面，母语 ⇄ 外语。真展签当然不会翻，但这是新标签页 */
function paintLabel(w) {
  const L = $('#label');
  const lg = A.labFlip ? A.other : A.lang;   // 翻过面就看另一种语言
  const g = A.labFlip ? (o) => pickAlt(o, lg, pickL(o, A.lang)) : (o) => pickL(o, lg);
  const d = (v) => (LG.isCJK(lg) ? String(v ?? '') : enDate(String(v ?? '')));
  const dw = (k) => S1(w?.tr?.[lg]?.[k]) || d(w?.[k]);
  L.classList.toggle('flip', !!A.labFlip);
  L.dir = LG.dirOf(lg);
  $('.lb-artist', L).textContent = g(w.artist) + (w.life ? '  ' + dw('life') : '');
  const title = g(w.title);
  $('.lb-title', L).textContent = title;
  const alt = pickAlt(w.title, A.labFlip ? A.lang : A.other, title);   // 底下那行永远挂另一种写法
  const la = $('.lb-title-alt', L);
  la.textContent = alt && alt !== title ? alt : '';
  la.style.display = la.textContent ? '' : 'none';
  $('.lb-meta', L).textContent = [dw('year'), g(w.medium), d(w.dims)].filter(Boolean).join(' · ');
  $('.lb-mu', L).textContent = [g(w.museum), g(w.place)].filter(Boolean).join(LG.isCJK(lg) ? '，' : ', ');
}

function updateFavBtn() {
  const on = A.favs.includes(A.cur?.id);
  $('#btnFav').classList.toggle('on', on);
  $('#btnFav').dataset.tip = on ? T('unfav') : T('fav');
}

/* ---------------- 去除与放回 ----------------
   收藏的反面。移除只写一份 id 名单（store.js 的 gone），作品本身分毫未动：
   轮换里不再出现，藏品库里也不列，设置里随时放回来。
   不拦一道确认 —— 换成做完给五秒撤销，手滑不会真丢东西。 */
function markGone(id, on) {
  const w = A.byId.get(id);
  if (w) w._gone = !!on;
}
async function hideCurrent() {
  const w = A.cur;
  if (!w) return;
  if (A.cat.filter(x => !x._gone).length <= 1) { toast(T('hideLast')); return; }
  const title = tx(w.title);
  A.gone = await S.addGone(w.id);
  markGone(w.id, true);
  buildList(); applyTips();
  /* 先把撤销条亮出来，再换画 —— 等 show() 跑完才冒出来会慢上一拍，看着像没反应 */
  undoBar(T('hidden', { t: title }), T('undo'), async () => {
    A.gone = await S.unGone(w.id);
    markGone(w.id, false);
    buildList(); resyncIdx(); applyTips();
    if (drawerOpen()) renderDrawer();
    await jumpTo(w.id);
    toast(T('hideBack'));
  });
  /* 站在被移除那一幅的位置上，往后翻一幅；播放列表已经没有它了，
     所以直接按当前游标取，取不到就回到头一幅 */
  A.idx = Math.min(A.idx, Math.max(0, A.list.length - 1));
  await show(A.list[A.idx] || A.list[0]);
  await S.setCursor({ idx: A.idx, at: Date.now(), sig: listSig() });
  if (drawerOpen()) renderDrawer();
}
/* 设置面板里逐幅放回 */
async function unhide(id) {
  A.gone = await S.unGone(id);
  markGone(id, false);
  buildList(); resyncIdx(); applyTips();
  await S.setCursor({ idx: A.idx, at: Date.now(), sig: listSig() });
  return A.gone;
}

/* 预取后续作品，供离线使用 */
async function prefetchAhead(n = 3) {
  for (let i = 1; i <= n; i++) {
    const w = A.list[(A.idx + i) % A.list.length]; if (!w || w.local) continue;   // 本机图片无须预取
    const url = imgUrl(w, pickSize(w, targetWidthFor(w, A.set.mode)));
    if (await S.cacheHas(url)) continue;
    try { await S.fetchImage(url, { id: w.id }); } catch {}
    await new Promise(r => setTimeout(r, 220));
  }
}

/* ---------------- 导航 ---------------- */
async function go(delta) {
  if (!A.list.length) return;
  if (MODES.modeGo(A.set.mode, delta)) return;
  if (A.busy) return;
  A.busy = true;
  A.idx = (A.idx + delta % A.list.length + A.list.length) % A.list.length;
  await S.setCursor({ idx: A.idx, at: Date.now(), sig: listSig() });
  await show(A.list[A.idx], Math.sign(delta) || 1);
  A.busy = false;
}
/* 能完整看一幅作品的模式；瀑布流 / 环形长廊里点开一幅要落到展墙 */
const viewMode = () => ['immersive', 'wall'].includes(A.set.mode) ? A.set.mode : 'wall';
async function jumpTo(id, toMode) {
  /* 画夹里的作品直接来自 daily 存储，可能是后台刚落地、本页目录还没合并进来的；
     以前这里 byId 取不到就直接 return，界面上看着就是「点了没反应，还停在上一幅」。*/
  let w = A.byId.get(id);
  if (!w) { await reloadDaily(true); w = A.byId.get(id); }
  if (!w) return;
  if (toMode && A.set.mode !== toMode) {
    /* 只切模式，不走 applySetting —— 它会拿旧游标先渲染一遍，白闪一次旧画 */
    A.set = await S.setSettings({ mode: toMode });
    document.body.dataset.mode = A.set.mode;
    applyRoom(); applyTips(); startTimer(); armIdle();
    A.painted = null; MODES.stopLoops();
  }
  const i = A.list.findIndex(x => x.id === id);
  if (i < 0) A.list = [w, ...A.list.filter(x => x.id !== id)], A.idx = 0;   // 不在播放范围内 → 临时插到最前
  else A.idx = i;
  await S.setCursor({ idx: A.idx, at: Date.now(), sig: listSig() });
  await show(A.list[A.idx]);
}

/* ---------------- 自动轮换 ---------------- */
function resetProgress() {
  const bar = $('#progress i');
  bar.style.transition = 'none'; bar.style.width = '0';
  void bar.offsetWidth;
  const live = !['masonry', 'carousel', 'film'].includes(A.set.mode);
  if (live && A.set.intervalMs > 0 && !A.paused) {
    bar.style.transition = `width ${A.set.intervalMs}ms linear`;
    bar.style.width = '100%';
  } else bar.style.transition = 'width .3s';
}
function startTimer() {
  clearInterval(A.timer); A.timer = null;
  const still = !['masonry', 'carousel', 'film'].includes(A.set.mode);
  if (still && A.set.intervalMs > 0 && !A.paused) A.timer = setInterval(() => go(1), A.set.intervalMs);
  $('#btnPlay').innerHTML = `<svg><use href="#i-${A.paused ? 'play' : 'pause'}"></use></svg>`;
  $('#btnPlay').dataset.tip = A.paused ? T('play') : T('pause');
  $('#btnPlay').style.display = (A.set.intervalMs > 0 || ['masonry', 'carousel'].includes(A.set.mode)) ? '' : 'none';
  resetProgress();
}

/* 展厅：画框、墙色、纹理、浅色墙的界面反色 */
function frameDef(k) { return FRAMES.find(f => f.k === k) || FRAMES[0]; }
function linerFor(frame, style) { return (!style || style === 'auto') ? frameDef(frame).liner : style; }
/* 石材与金属自带本色：木头是木头色、黄铜是黄铜色，不该被墙漆染 */
const texDef = (k) => TEXTURES.find(x => x.k === k) || TEXTURES[0];
const texBase = (k) => texDef(k).base || '';
function wallBase(s) {
  const own = texBase(s.tex || 'none');
  if (own) return own;
  if (s.wall === 'custom') return TN.normHex(s.wallCustom, '#8a4b36');
  const w = WALLS.find(x => x.k === s.wall);
  return w ? w.c : WALLS[0].c;
}
/* 最终墙色 = 本色 → 拧饱和度 → 拧色温 */
const wallHexOf = (s) => TN.tone(wallBase(s), (s.wallSat ?? 100) / 100, (s.wallTemp ?? 0) / 100);

/* 墙色一律由 JS 算出来写进 --wall。自定义色板、饱和度、色温、自带本色的材质，
   四件事在这一处收口，CSS 里就不必再为每种颜色写一条规则。 */
function tintWall(s) {
  const b = document.body, hex = wallHexOf(s);
  b.style.setProperty('--wall', hex);
  b.dataset.walllight = TN.isLight(hex) ? '1' : '0';
  b.dataset.texown = texBase(s.tex || 'none') ? '1' : '0';
  return hex;
}

const LAMP_N = '#fff6e2', LAMP_W = '#ffd79b', LAMP_C = '#e6efff';
/* 射灯：几盏、多亮、偏哪边、冷还是暖。
   角度不只是挪光斑 —— 画框投影的方向、贴图受光的那一侧都跟着它走，
   否则灯明明在右边、影子却还朝右，一眼就假。 */
function applyLight(lamp) {
  const b = document.body;
  const l = Object.assign({ bright: 100, angle: -18, warm: 0, n: 1 }, lamp || {});
  const n = Math.max(0, Math.min(4, Math.round(l.n) || 0));
  const k = Math.max(0, Math.min(2, Number(l.bright) / 100));
  const w = Math.max(-1, Math.min(1, Number(l.warm) / 100));
  const ang = Math.max(-60, Math.min(60, Number(l.angle) || 0));
  const light = b.dataset.walllight === '1';
  const col = w >= 0 ? TN.mix(LAMP_N, LAMP_W, w) : TN.mix(LAMP_N, LAMP_C, -w);
  const el = $('#spot');
  const cx = 50 + ang * 0.42;
  if (el) {
    if (!n || k <= 0) el.style.backgroundImage = 'none';
    else {
      const a0 = (light ? .34 : .22) * k, a1 = (light ? .10 : .07) * k;
      const span = 100 / n, wid = Math.min(58, 42 + 22 / n);
      const parts = [];
      for (let i = 0; i < n; i++) {
        const x = span * (i + .5) + ang * 0.42;
        parts.push(`radial-gradient(${wid}% 44% at ${x.toFixed(1)}% 42%,` +
          `${TN.rgba(col, a0)},${TN.rgba(col, a1)} 44%,transparent 72%)`);
      }
      el.style.backgroundImage = parts.join(',');
    }
  }
  b.style.setProperty('--lx', cx.toFixed(1) + '%');
  b.style.setProperty('--lightk', (n ? k : 0).toFixed(2));
  /* 纹理只在光扫得到的地方才立体 —— 背光处该平下去，这是「像不像」的一大半。
     不打灯时遮罩全开，否则整面墙会莫名其妙变平。 */
  const lit = n > 0 && k > 0, kk = Math.min(1, k);
  b.style.setProperty('--tm1', lit ? (1 - .30 * kk).toFixed(2) : '1');
  b.style.setProperty('--tm2', lit ? (1 - .58 * kk).toFixed(2) : '1');
  /* 投影朝光的反面。灯在左（角度为负）影子就往右 */
  const sh = -Math.sin(ang * Math.PI / 180) * 22;
  b.style.setProperty('--shx', sh.toFixed(1) + 'px');
  /* 贴图是照左上角来光烘出来的。灯挪到右边就把它镜像过去，受光面才对得上 */
  b.dataset.texflip = ang > 8 ? '1' : '0';
}

function applyRoom() {
  const b = document.body, s = A.set;
  b.dataset.frame = s.frame || 'laurel';
  b.dataset.liner = linerFor(s.frame, s.matStyle);
  b.style.setProperty('--ms', s.matScale || 1);
  b.dataset.wall = s.wall || 'charcoal';
  b.dataset.tex = s.tex || 'none';
  tintWall(s);
  applyLight(s.lamp);
  b.dataset.clock = s.clock || 'off';
  const hp = s.hideParts || {};
  for (const k of HIDE_KEYS) b.dataset['h' + k[0].toUpperCase() + k.slice(1)] = hp[k] ? '1' : '0';
  /* 作品那一组全勾上时，连墙签、信息卡这两块「纸」也一起收掉，不然剩个空卡片 */
  const allInfo = ['title', 'artist', 'meta', 'museum'].every(k => hp[k]);
  b.dataset.hCard = allInfo ? '1' : '0';
  b.dataset.film = s.film || 'positive';
  b.dataset.filmEdge = s.filmEdge ? '1' : '0';
  b.dataset.filmRun = s.filmRun || 'glide';
}

/* ---------------- 时钟 ---------------- */
function startClock() {
  const upd = () => {
    if ((A.set?.clock || 'off') === 'off') return;
    const d = new Date();
    const loc = LG.intlOf(A.lang);
    const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false });
    /* 星期与月日交给 Intl —— 换成任何一种语言都不用我们自己排文字 */
    const date = `${d.toLocaleDateString(loc, { weekday: 'short' })} · ${d.toLocaleDateString(loc, { day: 'numeric', month: 'long' })}`;
    $('#clockbar b').textContent = time;
    $('#clockbar span').textContent = date;
    $('#cgTime').textContent = time;
    $('#cgDate').textContent = date;
  };
  upd(); clearInterval(A.tick); A.tick = setInterval(upd, 15000);
}

/* ---------------- 静止自动隐藏 ---------------- */
let idleT;
function armIdle() {
  clearTimeout(idleT); document.body.classList.remove('idle');
  if (!A.set.autohide) return;
  idleT = setTimeout(() => { if (!$$('.sheet.open').length && !drawerOpen()) document.body.classList.add('idle'); }, 3600);
}

/* ============================================================
   今日画夹
   ============================================================ */
function paintSeal() {
  const b = $('#btnDaily'); if (!b) return;
  b.style.display = A.set.dailyNew ? '' : 'none';
  b.classList.toggle('fresh', (A.fresh || 0) > 0);
  const tip = (A.fresh || 0) > 0 ? `${T('dailyNew2')} ${A.fresh}` : T('dailyOpen');
  b.dataset.tip = tip; b.setAttribute('aria-label', tip);
}
async function openReveal() {
  const st = await S.getDaily();
  const fresh = st.fresh || 0;
  /* 画夹读的是 daily 那份存储，不是 A.cat —— 去除过的得在这里也滤掉，
     不然「不再显示」在这一扇窗口上就不作数了 */
  const gone = new Set(A.gone || []);
  const all = (st.works || []).filter(w => !gone.has(w.id));
  const show = fresh > 0 ? all.slice(-Math.min(fresh, 5)) : all.slice(-Math.min(5, all.length));
  const d = new Date();
  $('#rvTitle').innerHTML = `${esc(T('dailyPortfolio'))}${fresh ? ` <em>+${fresh}</em>` : ''}`;
  $('#rvDate').textContent = d.toLocaleDateString(LG.intlOf(A.lang), { day: 'numeric', month: 'long', year: 'numeric' });
  const stage = $('#rvStage');
  stage.dataset.n = show.length || 0;
  stage.scrollTop = 0;
  if (!show.length) {
    stage.innerHTML = `<div class="rv-empty">${esc(T('dailyEmpty'))}
      <div><button class="bigbtn pri" id="rvFetch">${esc(T('dailyNow'))}</button></div></div>`;
    $('#rvFoot').textContent = '';
  } else {
    const tilt = [-6.5, 3.2, -2.4, 5.1, -4.2];
    stage.innerHTML = show.map((w, i) => `
      <figure class="rvcard" data-id="${esc(w.id)}" style="--r:${tilt[i % 5]}deg;--r0:${tilt[i % 5] * 2.4}deg">
        <span class="mat"><img alt="" src="${esc(w.vis.lqip || '')}"
          data-real="${esc(imgUrl(w, w.img.sizes.includes(500) ? 500 : w.img.sizes.at(-1)))}"></span>
        <figcaption class="cap"><b>${esc(tx(w.title))}</b>${esc(tx(w.artist))}${w.year ? ' · ' + esc(dtw(w, 'year')) : ''}</figcaption>
      </figure>`).join('');
    $$('.rvcard img', stage).forEach(async (img) => {
      try {
        const r = await S.fetchImage(img.dataset.real, {});
        const u = URL.createObjectURL(r.blob); A.objUrls.add(u); img.src = u;
      } catch { }
    });
    $$('.rvcard', stage).forEach(c => c.onclick = async () => { closeSheets(); await jumpTo(c.dataset.id, viewMode()); });
    $('#rvFoot').innerHTML = `${esc(fresh > 0 ? T('dailyNew2') : T('dailyRecent'))} <b>${show.length}</b> ·
      ${esc(T('dailyCount'))} <b>${(st.works || []).length}</b> / ${MAX_DAILY} · ${esc(T('dailyFrom'))}`;
  }
  openSheet('#revealSheet');
  if (fresh) { st.fresh = 0; await S.setDaily(st); A.fresh = 0; paintSeal(); }
  const bf = $('#rvFetch');
  if (bf) bf.onclick = async () => {
    bf.disabled = true; bf.textContent = T('caching');
    let n = 0; try { n = (await chrome.runtime.sendMessage({ type: 'daily', force: true }))?.added || 0; } catch { }
    if (n) { await reloadDaily(); await openReveal(); } else { bf.disabled = false; bf.textContent = T('dailyNow'); toast(T('dailyNoNew')); }
  };
}

/* ============================================================
   面板：藏品库
   ============================================================ */
function openSheet(id) { closeDrawer(); $$('.sheet').forEach(s => s.classList.remove('open')); $(id).classList.add('open'); armIdle(); }
function closeSheets() { $$('.sheet').forEach(s => s.classList.remove('open')); zoomStop(); }

function libSource() {
  /* 「已移除」是唯一会让作品从藏品库里消失的东西：办公模式只影响轮换，
     藏品库照旧全都列出来，移除了的才是真的不列。 */
  const live = (arr) => arr.filter(w => w && !w._gone);
  if (A.libTab === 'fav') return live(A.favs.map(id => A.byId.get(id)));
  if (A.libTab === 'hist') return live(A.hist.map(h => A.byId.get(h.id)));
  if (A.libTab === 'daily') return live(A.cat.filter(w => w.daily)).reverse();
  if (A.libTab === 'lib') return live(A.cat.filter(w => w.local));
  return live(A.cat);
}
function libFiltered() {
  const f = A.set.filters, q = A.libQ.trim().toLowerCase();
  return libSource().filter(w => {
    if (q && !w._search.includes(q)) return false;
    if (f.movements.length && !f.movements.includes(w.movement)) return false;
    if (f.regions.length && !f.regions.includes(w.region)) return false;
    if (f.tags.length && !f.tags.some(x => w.tags.includes(x))) return false;
    if (f.hues.length && !f.hues.includes(w._hue)) return false;
  if (f.countries?.length && !f.countries.includes(w._country)) return false;
    return true;
  });
}
function countBy(list, fn) { const m = new Map(); for (const w of list) for (const k of [].concat(fn(w))) m.set(k, (m.get(k) || 0) + 1); return m; }

function renderFilters() {
  const src = libSource(), f = A.set.filters, box = $('#libFilters');
  const mv = countBy(src, w => w.movement), rg = countBy(src, w => w.region),
        tg = countBy(src, w => w.tags), hu = countBy(src, w => w._hue),
        co = countBy(src, w => w._country);
  const chips = (dict, counts, sel, kind, order) => (order || [...counts.keys()])
    .filter(k => k && counts.has(k))
    .map(k => `<button class="chip${sel.includes(k) ? ' on' : ''}" data-kind="${kind}" data-k="${esc(k)}">${esc(label(dict, k, A.lang))}<span class="n">${counts.get(k)}</span></button>`).join('');
  const hueChips = HUES.filter(h => hu.has(h.key)).map(h => {
    const sample = h.key === 'neutral' ? 'linear-gradient(135deg,#111,#eee)' : `hsl(${h.h ? (h.h[0] + ((h.h[1] - h.h[0] + 360) % 360) / 2) % 360 : 0} 62% 52%)`;
    return `<button class="chip hue${f.hues.includes(h.key) ? ' on' : ''}" data-kind="hues" data-k="${h.key}"><i style="background:${sample}"></i>${esc(lx(h, A.lang))}<span class="n">${hu.get(h.key)}</span></button>`;
  }).join('');
  const coDict = Object.fromEntries([...co.keys()].map(k => [k, { zh: k, en: COUNTRIES[k] || k }]));
  const coOrder = [...co.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const group = (lab, html) => html.trim() ? `<div class="grouplab">${esc(lab)}</div><div class="chipset">${html}</div>` : '';
  box.innerHTML =
    group(T('movement'), chips(MOVEMENTS, mv, f.movements, 'movements', Object.keys(MOVEMENTS))) +
    group(T('country'), chips(coDict, co, f.countries || [], 'countries', coOrder)) +
    group(T('region'), chips(REGIONS, rg, f.regions, 'regions', Object.keys(REGIONS))) +
    group(T('subject'), chips(TAGS, tg, f.tags, 'tags', Object.keys(TAGS))) +
    group(T('hueFilter'), hueChips);
  $$('.chip', box).forEach(c => c.onclick = async () => {
    const kind = c.dataset.kind, k = c.dataset.k;
    if (!A.set.filters[kind]) A.set.filters[kind] = [];
    const arr = A.set.filters[kind];
    const i = arr.indexOf(k); i >= 0 ? arr.splice(i, 1) : arr.push(k);
    A.set = await S.setSettings({ filters: A.set.filters });
    renderFilters(); renderGrid();
  });
}

function renderGrid() {
  const list = libFiltered(), g = $('#libGrid');
  $('#libTitle').textContent = T('library') + '  ' + list.length;
  if (!list.length) { g.innerHTML = `<div class="empty" style="grid-column:1/-1">${esc(A.libTab === 'fav' ? T('emptyFav') : A.libTab === 'hist' ? T('emptyHist') : A.libTab === 'daily' ? T('dailyNone') : A.libTab === 'lib' ? T('libNone') : T('noResult'))}</div>`; return; }
  g.innerHTML = list.map(w => `
    <div class="cell${w.id === A.cur?.id ? ' cur' : ''}" data-id="${w.id}" title="${esc(tx(w.title))} — ${esc(tx(w.artist))}">
      <img class="lq" src="${esc(w.vis.lqip || '')}" alt="">
      <img class="real" data-id="${w.id}" data-src="${esc(imgUrl(w, w.img.sizes.includes(330) ? 330 : w.img.sizes[0]))}" alt="">
      ${A.favs.includes(w.id) ? '<span class="star"><svg><use href="#i-star"></use></svg></span>' : ''}
      ${A.set.workSafe && w.mature ? `<span class="skipbadge" title="${esc(T('skipTip'))}">${esc(T('skipBadge'))}</span>` : ''}
      <div class="cap"><b>${esc(tx(w.title))}</b><span>${esc([tx(w.artist), dtw(w, 'year')].filter(Boolean).join(' · '))}</span></div>
    </div>`).join('');
  $$('.cell', g).forEach(c => c.onclick = async () => { closeSheets(); await jumpTo(c.dataset.id, viewMode()); });
  lazyLoad(g);
}
const io = new IntersectionObserver(async (ents) => {
  for (const e of ents) {
    if (!e.isIntersecting) continue;
    const img = e.target; io.unobserve(img);
    const url = img.dataset.src; if (!url) continue;
    try { const r = await S.fetchImage(url, { id: img.dataset.id }); const u = URL.createObjectURL(r.blob); A.objUrls.add(u); img.src = u; img.classList.add('in'); }
    catch { img.remove(); }
  }
}, { rootMargin: '320px' });
function lazyLoad(root) { $$('img.real', root).forEach(i => io.observe(i)); }

/* ============================================================
   面板：作品详情
   ============================================================ */
function gacUrl(w) {
  return 'https://artsandculture.google.com/search?q=' + encodeURIComponent(w.title.en + ' ' + w.artist.en);
}
function renderInfo(w) {
  $('#infoHead').textContent = T('info');
  const note = tx(w.note).split('\n\n').map(p => `<p>${esc(p)}</p>`).join('');
  const M = (k, v) => v ? `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '';
  $('#infoBody').innerHTML = `
    <div class="info-hero">
      <img src="${esc(w.vis.lqip || '')}" data-hero="${esc(imgUrl(w, w.img.sizes.includes(500) ? 500 : w.img.sizes.at(-1)))}" alt="">
      <div class="info-meta">
        <h3>${esc(tx(w.title))}${(() => { const o = pickL(w.title, A.other); return o && o !== tx(w.title) ? `<em>${esc(o)}</em>` : ''; })()}</h3>
        <div class="metarow">
          ${M(T('artist'), tx(w.artist) + (w.life ? '  ' + dtw(w, 'life') : ''))}
          ${M(T('era'), dtw(w, 'year'))}
          ${M(T('movement'), label(MOVEMENTS, w.movement, A.lang))}
        </div>
        <div class="metarow">
          ${M(T('medium'), tx(w.medium))}
          ${M(T('dimensions'), dt(w.dims))}
          ${M(T('museum'), tx(w.museum) + sep() + tx(w.place))}
        </div>
      </div>
    </div>
    <div class="lookbox" style="margin:0 0 24px"><b>${esc(T('look'))}</b><span>${esc(tx(w.look))}</span></div>
    <div class="prose">${note}</div>
    <div class="srcline">
      ${esc(T('source'))}: <a href="${esc(w.src.page)}" target="_blank" rel="noopener">${esc(T('viewOnCommons'))}</a>
      · ${esc(T('licence'))}: ${esc(w.src.licence)}
      · <a href="${esc(gacUrl(w))}" target="_blank" rel="noopener">${esc(T('viewOnGac'))}</a>
      <br>${esc(w.img.w)} × ${esc(w.img.h)} px
    </div>`;
  const hero = $('#infoBody img[data-hero]');
  S.fetchImage(hero.dataset.hero).then(r => { const u = URL.createObjectURL(r.blob); A.objUrls.add(u); hero.src = u; }).catch(() => {});
}

/* ============================================================
   面板：高清查看
   ============================================================ */
const Z = { scale: 1, x: 0, y: 0, min: 1, natural: [0, 0], on: false, url: null };
function applyZ() {
  const img = $('#zoomImg');
  img.style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.scale})`;
  $('#zLvl').textContent = Math.round(Z.scale / Z.min * 100) + '%';
}
function clampZ() {
  const vw = innerWidth, vh = innerHeight, w = Z.natural[0] * Z.scale, h = Z.natural[1] * Z.scale;
  Z.x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, Z.x));
  Z.y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, Z.y));
}
function zoomFit() {
  Z.min = Math.min(innerWidth / Z.natural[0], innerHeight / Z.natural[1]);
  Z.scale = Z.min; clampZ(); applyZ();
}
function zoomAt(f, cx, cy) {
  const ns = Math.max(Z.min * 0.9, Math.min(Z.min * 14, Z.scale * f));
  const k = ns / Z.scale;
  Z.x = cx - (cx - Z.x) * k; Z.y = cy - (cy - Z.y) * k; Z.scale = ns;
  clampZ(); applyZ();
}
async function zoomOpen(w) {
  openSheet('#zoomSheet'); Z.on = true;
  $('#zoomTitle').textContent = tx(w.title) + ' — ' + tx(w.artist);
  $('#zoomSize').textContent = w.img.w + ' × ' + w.img.h;
  $('#zoomHint').textContent = T('zoomHint');
  $('#zoomHint').style.opacity = 1;
  const px = pickSize(w, Math.min(3840, Math.max(1920, innerWidth * (devicePixelRatio || 1) * 1.6)));
  const url = imgUrl(w, px);
  const img = $('#zoomImg'); img.src = w.vis.lqip;
  try {
    const r = await S.fetchImage(url, { id: w.id });
    const u = URL.createObjectURL(r.blob); A.objUrls.add(u); Z.url = u;
    await new Promise(res => { img.onload = res; img.onerror = res; img.src = u; });
  } catch { toast(T('offlineHD')); }
  Z.natural = [img.naturalWidth || w.img.w, img.naturalHeight || w.img.h];
  img.style.width = Z.natural[0] + 'px'; img.style.height = Z.natural[1] + 'px';
  zoomFit();
  setTimeout(() => $('#zoomHint').style.opacity = 0, 2600);
}
function zoomStop() { if (!Z.on) return; Z.on = false; revoke(Z.url); Z.url = null; $('#zoomImg').removeAttribute('src'); }

function download(w) {
  if (w.local) { toast(T('dlLocal')); return; }
  const yr = safeName(w.year);
  const fn = `${safeName(w.artist.en, 'Unknown')} - ${safeName(w.title.en, w.id)}${yr ? ` (${yr})` : ''}.jpg`;
  const url = imgUrl(w, w.img.sizes.at(-1));      // 阶梯内最大尺寸，最高 3840px
  if (globalThis.chrome?.downloads) chrome.downloads.download({ url, filename: EXPORT_DIR + '/' + fn, conflictAction: 'uniquify', saveAs: false });
  else window.open(url, '_blank');
  toast(T('downloaded'));
}

/* ============================================================
   面板：设置
   ============================================================ */
const INTERVALS = [
  { v: 0, k: 'intervalManual' }, { v: 60000, n: 1, u: 'min' }, { v: 300000, n: 5, u: 'min' },
  { v: 900000, n: 15, u: 'min' }, { v: 1500000, n: 25, u: 'min', tag: 'pomodoro' },
  { v: 3600000, n: 1, u: 'hour' }, { v: 21600000, n: 6, u: 'hour' }, { v: 86400000, n: 1, u: 'day' }
];
/* 秒级 + 分钟级，最后一项自定义 */
const PACES = [0, 3000, 5000, 10000, 15000, 30000, 60000, 180000, 300000, 600000, 1800000];
const paceTxt = (v) => v === 0 ? T('intervalOff')
  : v < 60000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)} ${T('sec')}`
  : `${(v / 60000).toFixed(v % 60000 ? 1 : 0)} ${T('minute')}`;
function paceSel(key, cur) {
  const known = PACES.includes(cur);
  const opts = PACES.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(paceTxt(v))}</option>`).join('')
    + `<option value="custom"${known ? '' : ' selected'}>${esc(T('custom'))}</option>`;
  const n = cur >= 60000 ? cur / 60000 : cur / 1000;
  return `<select class="sel" data-pace="${key}">${opts}</select>` +
    `<div class="pacecustom${known ? '' : ' on'}" data-pacebox="${key}">
       <input type="number" min="1" max="999" step="1" value="${Number.isFinite(n) && n > 0 ? +n.toFixed(2) : 15}" data-pacen="${key}">
       <select class="sel" data-paceu="${key}">
         <option value="1000"${cur < 60000 ? ' selected' : ''}>${esc(T('sec'))}</option>
         <option value="60000"${cur >= 60000 ? ' selected' : ''}>${esc(T('minute'))}</option>
       </select></div>`;
}
export const FILMS = [{ k: 'positive' }, { k: 'negative' }, { k: 'bw' }, { k: 'slide' }, { k: 'cine' }];

/* 纹理芯片按接近真实墙面的比例取样 */
const TEXCHIP = { level5:220, rollmatt:180, skimtrowel:200, venetian:210, marmorino:195, stucco:150,
  microcement:185, diatom:140, eggshell:200, hessian:90, linen:74, silk:110, velvet:140,
  damask:210, brocatelle:200, felt:150, blackbox:130, ledwall:96, microperf:105, projection:130,
  concrete:260, wood:270, travertine:220, brick:150, sandstone:145,
  brushed:200, brass:210, copper:195, corten:225, blacksteel:205, goldleaf:190 };
function seg(id, opts, cur) {
  return `<div class="seg" data-seg="${id}">` + opts.map(o =>
    `<button data-v="${esc(o.v)}" class="${String(o.v) === String(cur) ? 'on' : ''}">${esc(o.t)}</button>`).join('') + '</div>';
}
function toggle(id, on) { return `<button class="sw-toggle${on ? ' on' : ''}" data-tg="${id}" role="switch" aria-checked="${!!on}"></button>`; }
/* 多行文本：提示词编辑用。改完失焦才写入 */
function tarea(key, val) {
  return `<textarea class="tarea" data-tar="${key}" spellcheck="false" autocapitalize="off">${esc(val)}</textarea>`;
}
/* 补全清单里的一行；右边那个 ↻ 可以单独重来一张 */
function aiRow(r) {
  const f = (r.f || []);
  const tries = (r.tries || 1) > 1 ? ` · ${T('aiTried')} ${r.tries}` : '';
  const tip = (r.ok ? f.join(' · ') : String(r.err || '')) + tries;
  const sub = r.ok ? (r.now !== r.was ? r.was : '') : String(r.err || '').slice(0, 90);
  return `<div class="airow ${r.ok ? 'ok' : 'bad'}" data-row="${esc(r.id)}" data-box="${esc(r.box || 'daily')}"
      title="${esc(tip)}"><s></s>
    <div class="airt"><b>${esc(r.now || r.was)}</b>${sub ? `<u>${esc(sub)}</u>` : ''}</div>
    <i>${r.ok ? esc(f.length ? f.length + T('aiItems') : T('aiNoChange')) : ''}</i>
    <button class="airetry" data-retry="${esc(r.id)}" title="${esc(T('aiRetryOne'))}" aria-label="${esc(T('aiRetryOne'))}">↻</button></div>`;
}
/* 翻译清单里的一行：左边原名，右边译名 */
function trRow(r) {
  const sub = r.ok ? (r.now && r.now !== r.was ? r.now : '') : String(r.err || '').slice(0, 90);
  return `<div class="airow ${r.ok ? 'ok' : 'bad'}" title="${esc(r.ok ? (r.f || []).join(' · ') : String(r.err || ''))}"><s></s>
    <div class="airt"><b>${esc(r.was)}</b>${sub ? `<u>${esc(sub)}</u>` : ''}</div>
    <i>${esc(LG.nameOf(r.lang, A.set?.loc?.names))}</i></div>`;
}

/* 探测清单里的一行：这个模型文字行不行、识图行不行，都是真跑出来的 */
function pbRow(r, cur) {
  const cls = r.vision ? 'ok' : (r.text ? 'half' : 'bad');
  const cap = [r.text ? T('pbText') : '', r.vision ? T('pbVision') : ''].filter(Boolean).join(' · ')
    || (r.err ? '' : T('pbNone'));
  return `<div class="pbrow ${cls}${r.m === cur ? ' on' : ''}" data-usemodel="${esc(r.m)}"
      title="${esc(r.err || cap)}"><s></s>
    <b>${esc(r.m)}</b>
    <i>${esc(cap || String(r.err || '').slice(0, 40))}</i></div>`;
}

/* ---------------- 接口报错的诊断卡 ----------------
   一句「哪儿不对」，几条「照这个改」，认得出服务商时再给几个能点的模型名，
   最后把接口原话折起来放在底下 —— 想看的人能看到，不想看的人不用被它糊一脸。 */
function diagHTML(d, url) {
  if (!d) return '';
  const tips = (d.tips || []).map(k => {
    let txt = T(k, { v: d.vendor || d.host, u: url || '', h: d.host || '' });
    return `<li>${esc(txt)}</li>`;
  }).join('');
  /* 要用户去终端敲的命令：原样给出来，附一个复制按钮 —— 手抄最容易抄错 */
  const cmds = (d.cmds || []).length ? `<div class="dgcmds">${
    d.cmds.map(c => `<div class="dgcmd"><b>${esc(c.os)}</b><code>${esc(c.cmd)}</code>
      <button class="bigbtn sm" data-copycmd="${esc(c.cmd)}">${esc(T('dgCopy'))}</button></div>`).join('')
    }</div>` : '';
  const models = (d.models || []).length ? `<div class="dgmods">${
    d.models.map(m => `<button class="dgmod" data-usemodel="${esc(m)}" title="${esc(T('dgUseModel'))}">${esc(m)}</button>`).join('')
    }<i>${esc(T('dgModelNote'))}</i></div>` : '';
  return `<div class="diag" data-code="${esc(d.code)}">
    <div class="dgh"><s>!</s><b>${esc(T('dg_' + d.code))}</b></div>
    ${tips ? `<div class="dgtry">${esc(T('dgTry'))}</div><ul class="dgtips">${tips}</ul>` : ''}
    ${cmds}
    ${models}
    ${d.raw ? `<details class="dgraw"><summary>${esc(T('dgRaw'))}</summary><pre>${esc(String(d.raw).slice(0, 700))}</pre></details>` : ''}
  </div>`;
}
/* 诊断卡记在 A.diag 里，重绘时跟着一起画出来 ——
   切明暗、折分组、改别的设置都不该把它弄没了。 */
function diagCard(where) {
  const d = A.diag;
  if (!d || d.where !== where) return '';
  return diagHTML(d, d.url);
}
/* 算出诊断并挂上去；同一处已有的先撤掉 */
function showDiag(r, root, statusSel, where) {
  const ai = A.set.ai || {};
  const d = DG.diagnose({ status: r.status || 0, raw: r.raw || r.err || r.msg || '' }, ai);
  d.where = where || (statusSel === '#trStatus' ? 'tr' : 'ai');
  d.url = AI.endpoint(ai.base, AI.detectFmt(ai.base, ai.fmt));
  d.msg = S1(r.msg || r.err || '');
  A.diag = d;
  const host = $(statusSel, root);
  if (!host) return d;
  host.textContent = S1(r.msg || r.err || '');
  $$('.diag', host.parentNode).forEach(x => x.remove());
  host.insertAdjacentHTML('afterend', diagHTML(d, d.url));
  bindDiag(host.parentNode);
  return d;
}
/* 点一下推荐的模型名就填进模型框 */
function bindDiag(root) {
  $$('[data-usemodel]', root || document).forEach(b => b.onclick = async () => {
    await saveProf({ model: b.dataset.usemodel });
    A.diag = null;
    renderDrawer();
  });
  $$('[data-copycmd]', root || document).forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copycmd); toast(T('dgCopied')); } catch { }
  });
}

/* 单行输入：改完失焦或回车才写入，边打字边存会把半截地址存进去 */
function tin(key, val, ph, type = 'text') {
  return `<input class="tin" data-tin="${key}" type="${type}" value="${esc(val)}" placeholder="${esc(ph)}"
    spellcheck="false" autocomplete="off" autocapitalize="off">`;
}
const deep = (o, path) => String(path).split('.').reduce((x, k) => (x == null ? x : x[k]), o);
/* 多选：一组可以各自开关的小方块 */
function chks(id, opts, cur) {
  return `<div class="chks" data-chk="${id}">` + opts.map(o =>
    `<button data-k="${esc(o.k)}" class="${cur[o.k] ? 'on' : ''}" aria-pressed="${!!cur[o.k]}"><s></s><b>${esc(o.t)}</b>${
      o.note ? `<i>${esc(o.note)}</i>` : ''}</button>`).join('') + '</div>';
}
function row(labTxt, sub, ctrl) { return `<div class="row"><div class="lab"><b>${esc(labTxt)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>${ctrl}</div>`; }

/* ============================================================
   设置抽屉：舞台随之收窄，改动即时可见
   ============================================================ */
function openDrawer(tab) {
  if (tab) A.dtab = tab;
  document.body.classList.add('drawer-open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#btnSet').classList.add('on');
  renderDrawer(true);
  clearTimeout(idleT); document.body.classList.remove('idle');
  setTimeout(refit, 560);
}
function closeDrawer() {
  if (!document.body.classList.contains('drawer-open')) return;
  document.body.classList.remove('drawer-open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('#btnSet').classList.remove('on');
  A.hover = null; applyRoom(); armIdle();
  setTimeout(refit, 560);
}
const drawerOpen = () => document.body.classList.contains('drawer-open');

/* 统一的设置区块 */
const dsec = (t) => `<div class="dsec">${esc(t)}</div>`;
const dblock = (title, desc, ctrl) => `<div class="dblock">
  <div class="dbt">${esc(title)}</div>${desc ? `<div class="dbd">${esc(desc)}</div>` : ''}
  <div class="dbc">${ctrl}</div></div>`;
const dinline = (title, desc, ctrl) => `<div class="dblock inline">
  <div class="dbl"><div class="dbt">${esc(title)}</div>${desc ? `<div class="dbd">${esc(desc)}</div>` : ''}</div>
  ${ctrl}</div>`;
/* 芯片底色：自带本色的材质就用它自己的本色 —— 一眼看得出黄铜是黄铜、木头是木头 */
const texChip = (x, cur) => `<button class="texchip${cur === x.k ? ' on' : ''}" data-pick="tex" data-k="${x.k}">
  <u style="${x.k === 'none' ? '' : `background-image:url(/assets/tex/${x.k}.webp);background-size:${TEXCHIP[x.k] || 90}px${
    x.base ? `;background-color:${x.base}` : ''}`}"></u>
  <s>${esc(lx(x, A.lang))}</s></button>`;
/* 纹理按「展墙做法 / 织物包墙 / 数字展厅 / 石材硬装」分组 */
function texGrid(cur) {
  return TEXGROUPS.map(g => {
    const items = TEXTURES.filter(x => x.g === g.k);
    if (!items.length) return '';
    return `<div class="texglab">${esc(lx(g, A.lang))}</div>
      <div class="texgrid">${items.map(x => texChip(x, cur)).join('')}</div>`;
  }).join('');
}
const dctrl = (desc, ctrl) => `<div class="dblock">${desc ? `<div class="dbd nt">${esc(desc)}</div>` : ''}<div class="dbc">${ctrl}</div></div>`;

/* ---------------- 墙面颜色 ----------------
   色卡按「中性 / 展厅色 / 柔彩」分三排，末尾一格是自定义色板。
   名称不再做成悬停气泡（深墙上看不清，还会挡住上一排色卡），
   而是色卡下面固定的一行：指到哪读到哪，同时报出色号。 */
const wdot = (w, cur) => `<button class="wdot${cur === w.k ? ' on' : ''}" data-pick="wall" data-k="${w.k}"
  style="background:${w.c}" title="${esc(lx(w, A.lang))}" aria-label="${esc(lx(w, A.lang))}"></button>`;

function wallBlock(s) {
  const own = texBase(s.tex || 'none');
  const cust = TN.normHex(s.wallCustom, '#8a4b36');
  const rows = WALLGROUPS.map(g => {
    const items = WALLS.filter(w => w.g === g.k);
    if (!items.length) return '';
    return `<div class="wglab">${esc(lx(g, A.lang))}</div>
      <div class="dotrow">${items.map(w => wdot(w, s.wall)).join('')}</div>`;
  }).join('');
  const capName = own ? lx(texDef(s.tex), A.lang)
    : (s.wall === 'custom' ? T('wallCustom') : lx(WALLS.find(w => w.k === s.wall) || WALLS[0], A.lang));
  return `<div class="dblock"><div class="dbc">
    <div class="wallpick${own ? ' own' : ''}">
      ${rows}
      <div class="wglab">${esc(T('wallCustom'))}</div>
      <div class="dotrow wcust">
        <button class="wdot${s.wall === 'custom' ? ' on' : ''}" data-pick="wall" data-k="custom"
          style="background:${esc(cust)}" title="${esc(T('wallCustom'))}" aria-label="${esc(T('wallCustom'))}"></button>
        <label class="wpick" title="${esc(T('wallCustomDesc'))}">
          <input type="color" data-wcolor value="${esc(cust)}" aria-label="${esc(T('wallCustom'))}"></label>
        <input class="whex" type="text" data-whex value="${esc(cust.toUpperCase())}" maxlength="7"
          spellcheck="false" autocapitalize="off" aria-label="${esc(T('wallCustomDesc'))}">
      </div>
      <div class="wcap"><b id="wcapName">${esc(capName)}</b><i id="wcapHex">${esc(wallHexOf(s).toUpperCase())}</i></div>
      ${own ? `<div class="wown">${esc(T('texOwnColour'))}</div>` : ''}
    </div>
  </div></div>`;
}

const pctFmt = (v) => v + '%';
const signFmt = (v, lo, hi) => v === 0 ? '—' : (v < 0 ? lo + ' ' + Math.abs(v) : hi + ' ' + v);

function toneBlock(s) {
  const dirty = s.wallSat !== 100 || s.wallTemp !== 0;
  return `<div class="dblock"><div class="dbt">${esc(T('wallTone'))}${
      dirty ? `<button class="minilink" data-tonereset>${esc(T('toneReset'))}</button>` : ''}</div>
    <div class="dbd">${esc(T('wallToneDesc'))}</div>
    <div class="dbc">
      <div class="tonerow"><label for="wallSat">${esc(T('wallSat'))}</label>
        ${slider('wallSat', 0, 200, 5, s.wallSat, pctFmt(s.wallSat))}</div>
      <div class="tonerow"><label for="wallTemp">${esc(T('wallTemp'))}</label>
        ${slider('wallTemp', -100, 100, 5, s.wallTemp, signFmt(s.wallTemp, T('cool'), T('warm')))}</div>
    </div></div>`;
}

/* ---------------- 灯光 ---------------- */
function lightBlock(s) {
  const l = s.lamp;
  const nOpts = [0, 1, 2, 3, 4].map(v => ({ v, t: v ? v + T('lightNUnit') : T('lightOff') }));
  return `<div class="dblock"><div class="dbt">${esc(T('lightN'))}</div>
      <div class="dbd">${esc(T('lightDesc'))}</div>
      <div class="dbc">${seg('lamp.n', nOpts, l.n)}</div></div>` +
    `<div class="dblock"><div class="dbc">
      <div class="tonerow"><label for="lampBright">${esc(T('lightBright'))}</label>
        ${slider('lampBright', 0, 200, 5, l.bright, pctFmt(l.bright))}</div>
      <div class="tonerow"><label for="lampAngle">${esc(T('lightAngle'))}</label>
        ${slider('lampAngle', -60, 60, 2, l.angle, l.angle + '°')}</div>
      <div class="tonerow"><label for="lampWarm">${esc(T('lightWarm'))}</label>
        ${slider('lampWarm', -100, 100, 5, l.warm, signFmt(l.warm, T('cool'), T('warm')))}</div>
    </div>
    <div class="dbd nt">${esc(T('lightAngleDesc'))}</div></div>`;
}
const slider = (id, min, max, step, val, fmt) => {
  const f = ((val - min) / (max - min) * 100).toFixed(1);
  return `<div class="slider"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"
    style="--fill:${f}%"><b id="${id}Val">${esc(fmt)}</b></div>`;
};

/* ============================================================
   设置抽屉：五页 · 可折叠分组 · 全局搜索
   每一组都是一个 <section class="dgrp">，标题行本身是折叠开关，
   右侧显示当前值，折起来也知道设成了什么。搜索时把五页全部铺开再筛。
   ============================================================ */
const DTABS = ['show', 'room', 'play', 'lib', 'data'];
const hostOf = (u) => { try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const profName = (p) => S1(p?.name) || hostOf(p?.base) || T('aiUntitled');
/* 密钥只露头尾，中间打码 */
const maskKey = (k) => { k = S1(k); return k.length > 12 ? k.slice(0, 6) + '…' + k.slice(-4) : k; };
/* 同一个接口下存着的几把密钥 / 几个模型：点一下换用，×删掉 */
function pfChips(field, list, cur, fmt) {
  list = (list || []).filter(Boolean);
  if (list.length < 2) return `<i class="tint">${esc(T('pfKeep'))}</i>`;
  return `<div class="pfchips">${list.map(v => `<span class="pfchip${v === cur ? ' on' : ''}" data-pfpick="${field}" data-v="${esc(v)}">
    <b>${esc(fmt(v))}</b><u data-pfdrop="${field}" data-v="${esc(v)}" title="${esc(T('aiProfDel'))}">×</u></span>`).join('')}</div>`;
}

let gTab = '';                                   // 正在构建哪一页（搜索时每组要标出来源）
/* 把一段控件标上「只有这几种呈现模式用得着」，设置范围切到「当前」时按它筛 */
const mo = (modes, html) => `<div class="dmo" data-modes="${modes.join(' ')}">${html}</div>`;

function grp(k, title, body, hint, kw, sw, modes) {
  const fold = A.fold[k] === true;
  return `<section class="dgrp${fold ? ' fold' : ''}${sw ? ' hassw' : ''}" data-g="${k}" data-kw="${esc(kw || '')}"${
    modes ? ` data-modes="${modes.join(' ')}"` : ''}>
    <div class="dsec" data-fold="${k}" role="button" tabindex="0">
      <u class="dtabof">${esc(T('tab' + gTab[0].toUpperCase() + gTab.slice(1)))}</u>
      <b>${esc(title)}</b>${(hint && !sw) ? `<em>${esc(hint)}</em>` : ''}
      ${sw ? `<span class="dsw">${hint ? `<em>${esc(hint)}</em>` : ''}${sw}</span>` : ''}
      <i class="dchev"></i></div>
    <div class="dgb"><div class="dgi">${body}</div></div></section>`;
}

/* 预设下拉 ＋「自定义…」：值是个数字，带单位时按单位换算 */
function numSel(key, cur, opts, units, minV, maxV, unitTxt) {
  cur = Number(cur) || 0;
  const known = opts.some(o => Number(o.v) === cur);
  let u = 1, n = cur;
  if (units) { for (const x of units) if (cur && cur % x.v === 0 && x.v > u) u = x.v; n = Math.round(cur / u); }
  return `<select class="sel" data-nsel="${key}" data-nmin="${minV}" data-nmax="${maxV}">
      ${opts.map(o => `<option value="${o.v}"${Number(o.v) === cur ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}
      <option value="custom"${known ? '' : ' selected'}>${esc(T('custom'))}</option>
    </select>
    <div class="numbox${known ? '' : ' on'}" data-nbox="${key}">
      <input type="number" min="1" max="9999" step="1" value="${Math.max(1, n)}" data-nnum="${key}">
      ${units ? `<select class="sel" data-nunit="${key}">${units.map(x =>
        `<option value="${x.v}"${x.v === u ? ' selected' : ''}>${esc(x.t)}</option>`).join('')}</select>`
        : (unitTxt ? `<span class="numu">${esc(unitTxt)}</span>` : '')}
    </div>`;
}
/* ---------------- 语言 ----------------
   两个位置：母语、外语。中英两种任何时候都能选；别的语言得先把接口测通，
   因为界面文案与作品译文都要现场译。 */
/* 多语言解不解锁，看的是**文字那一档**实测通过没有 —— 跟识图无关 */
const langUnlocked = () => AI.roleReady(A.set, 'text');
const langName = (c) => LG.nameOf(c, A.set?.loc?.names);
/* 语言下拉：内置两种在最上面，其余按地区分组；末尾一项「自定义…」 */
function langSel(which, cur) {
  const open = langUnlocked();
  const gs = LG.GROUPS.map(g => {
    const items = LG.LANGS.filter(l => l.g === g && (open || l.g === 'built'));
    if (!items.length) return '';
    return `<optgroup label="${esc(T('langGroup_' + g))}">${items.map(l =>
      `<option value="${esc(l.c)}"${l.c === cur ? ' selected' : ''}>${esc(l.n)}${
        l.c === cur || l.n === l.e ? '' : ' · ' + esc(l.e)}</option>`).join('')}</optgroup>`;
  }).join('');
  /* 用户自己填过的语言也要留在单子里，不然一刷新就选不回来了 */
  const mine = Object.entries(A.set?.loc?.names || {}).map(([c, n]) =>
    `<option value="${esc(c)}"${c === cur ? ' selected' : ''}>${esc(n)}</option>`).join('');
  return `<select class="sel langsel" data-lang="${which}"${open ? '' : ' data-locked="1"'}>
      ${gs}${mine ? `<optgroup label="${esc(T('langCustom'))}">${mine}</optgroup>` : ''}
      ${open ? `<option value="__new">${esc(T('langCustom'))}</option>` : ''}
    </select>`;
}
/* 界面语言包译到什么程度 */
function packLine(c) {
  if (LG.isBuiltin(c)) return '';
  const n = packCount(c), m = packTotal();
  return n ? T('trPackDone', { n, m }) : T('trPackNone');
}

const SCHED_OPTS = () => [
  { v: 0, t: T('aiSchedOff') }, { v: 60, t: T('aiSched1h') }, { v: 360, t: T('aiSched6h') },
  { v: 720, t: T('aiSched12h') }, { v: 1440, t: T('aiSchedDay') }, { v: 4320, t: T('aiSched3d') }
];
const SCHED_UNITS = () => [{ v: 1, t: T('min') }, { v: 60, t: T('hour') }, { v: 1440, t: T('day') }];

/* 来源上的一个字段：src.<id>.name / .url / .f.inc / .f.exc / .f.rx / .f.minPx */
export function srcPath(key) {
  const m = String(key).match(/^src\.([^.]+)\.(.+)$/);
  return m ? { id: m[1], path: m[2] } : null;
}
/* 界面上要显示的当前值（开关和数字框都得先知道现在是什么） */
function srcVal(key) {
  const k = srcPath(key); if (!k) return undefined;
  const x = (A.libSrcs || []).find(y => y.id === k.id); if (!x) return undefined;
  return k.path.split('.').reduce((o, p) => (o == null ? o : o[p]), x);
}
async function applySrc(key, val) {
  const k = srcPath(key); if (!k) return;
  const src = (A.libSrcs || []).find(x => x.id === k.id); if (!src) return;
  const next = structuredClone(src);
  const ps = k.path.split('.');
  let o = next;
  for (let i = 0; i < ps.length - 1; i++) o = (o[ps[i]] = o[ps[i]] || {});
  const last = ps[ps.length - 1];
  if (last === 'rx') val = !!val;
  if (last === 'minPx') val = Number(val) || 0;
  o[last] = val;
  const lib = await S.getLocalLib();
  await S.setLibSource(next, lib.works.filter(w => w.sid === k.id));
  const l2 = await S.getLocalLib();
  A.libSrcs = l2.srcs; A.lib = (l2.works || []).length;
}

/* 一个来源扫一遍：进度写在它自己那张卡里，扫完只换掉它名下的作品 */
async function scanOne(src, opt = {}) {
  const line = () => $(`[data-srcstat="${CSS.escape(src.id)}"]`, $('#drawerBody')) || $('#libStatus');
  const bar = $('#libBar'), fillI = $('#libBarI');
  const say = (m) => { const e = line(); if (e) e.textContent = m; };
  bar?.classList.add('on');
  try {
    if (src.kind === 'url') {
      if (!(await LOCAL.hasHost(src.url)) && !(await LOCAL.askHost(src.url))) {
        say(T('libNeedHost')); return { ok: false };
      }
    } else {
      const h = await LOCAL.getHandle(src.id);
      if (!h) { say(T('libNeedGrant')); return { ok: false }; }
      if (await LOCAL.permState(h, true) !== 'granted') { say(T('libNeedGrant')); return { ok: false }; }
    }
    say(T('libScanning'));
    const r = await LOCAL.scanSrc(src, (i, n) => {
      if (fillI) fillI.style.width = (n ? i / n * 100 : 0).toFixed(1) + '%';
      say(`${T('libScanning')} ${i} / ${n}`);
    }, opt.signal);
    if (!r.ok) {
      await S.setLibSource({ ...src, err: r.err === 'noperm' ? T('libNeedGrant') : r.err === 'nohandle' ? T('libNeedGrant') : r.err },
                           (await S.getLocalLib()).works.filter(w => w.sid === src.id));
      say(r.err === 'noperm' || r.err === 'nohandle' ? T('libNeedGrant') : r.err);
      return r;
    }
    await S.setLibSource({ ...src, err: '' }, r.works);
    say(`${T('libDone')} ${r.works.length}`);
    return r;
  } catch (e) {
    if (e && e.name === 'AbortError') return { ok: false };
    say(String(e && e.message || e).slice(0, 90));
    return { ok: false };
  } finally { bar?.classList.remove('on'); if (fillI) fillI.style.width = '0%'; }
}

/* 刚收录的图片趁热补全，不用等下一次开新标签页 */
async function fillFresh(n) {
  const ai = AI.profOf(A.set, 'vision');
  if (!n || !ai.auto || !AI.configured(ai) || ai.forLocal === false) return;
  if (!(await AI.hasHost(ai.base))) return;
  const line = $('#libStatus');
  A.aiReport = [];
  const r = await AI.runBatch({ scope: 'local', onProgress: ({ i, n: nn, row }) => {
    if (line) line.textContent = `${T('aiRunning')} ${i} / ${nn}`;
    if (row) A.aiReport.push(row);
  } });
  if (r.done) { await reloadDaily(true); toast(`${T('aiDoneN')} ${r.done}`); }
}

function bindLib(body) {
  const st = $('#libStatus', body);
  const refresh = async () => {
    const lib = await S.getLocalLib();
    A.libSrcs = lib.srcs; A.lib = (lib.works || []).length;
    A.libName = lib.srcs.map(x => x.name || hostOf(x.url)).filter(Boolean).join(' · ');
    await reloadDaily(true);
    renderDrawer();
  };

  /* 展开 / 收起一张卡 */
  $$('[data-srcopen]', body).forEach(h => {
    const go = () => { const id = h.dataset.srcopen; A.libOpen = A.libOpen === id ? '' : id; renderDrawer(); };
    h.onclick = go;
    h.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });

  /* 加一个文件夹 */
  const ad = $('#btnLibAddDir', body);
  if (ad) ad.onclick = async () => {
    if (!LOCAL.supported()) { if (st) st.textContent = T('libUnsupported'); return; }
    try {
      const id = 'd' + Date.now().toString(36);
      const h = await LOCAL.pickFolder(id);
      const src = { id, kind: 'dir', name: h.name, f: LOCAL.DEF_FILTER() };
      await S.setLibSource(src, []);
      A.libOpen = id;
      await refresh();
      const r = await scanOne(src);
      await refresh();
      if (r && r.works) { toast(`${T('libDone')} ${r.works.length}`); await fillFresh(r.works.length); await refresh(); }
    } catch (e) { if (e && e.name !== 'AbortError' && st) st.textContent = String(e.message || e).slice(0, 90); }
  };

  /* 加一个网址 */
  const au = $('#btnLibAddUrl', body);
  if (au) au.onclick = async () => {
    const id = 'u' + Date.now().toString(36);
    await S.setLibSource({ id, kind: 'url', name: '', url: '', f: LOCAL.DEF_FILTER() }, []);
    A.libOpen = id;
    await refresh();
    setTimeout(() => $(`[data-tin="src.${id}.url"]`, $('#drawerBody'))?.focus(), 80);
  };

  /* 全部重扫 */
  const sa = $('#btnLibScanAll', body);
  if (sa) sa.onclick = async () => {
    sa.disabled = true;
    let total = 0;
    for (const src of A.libSrcs) {
      if (src.kind === 'url' && !S1(src.url)) continue;
      const r = await scanOne(src);
      if (r && r.works) total += r.works.length;
    }
    sa.disabled = false;
    await refresh();
    toast(`${T('libDone')} ${total}`);
    await fillFresh(total); await refresh();
  };

  /* 清空整个图库 */
  const ld = $('#btnLibDrop', body);
  if (ld) ld.onclick = async () => {
    await S.clearLocalLib(); await LOCAL.clearHandle();
    A.libOpen = '';
    if (A.set.scope === 'lib') await applySetting('scope', 'all');
    await refresh(); toast(T('done'));
  };

  /* 单个来源：重扫 / 重选文件夹 / 删掉 */
  $$('[data-srcscan]', body).forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const src = A.libSrcs.find(x => x.id === b.dataset.srcscan); if (!src) return;
    b.disabled = true;
    const r = await scanOne(src);
    b.disabled = false;
    await refresh();
    if (r && r.works) { toast(`${T('libDone')} ${r.works.length}`); await fillFresh(r.works.length); await refresh(); }
  });
  $$('[data-srcrepick]', body).forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const src = A.libSrcs.find(x => x.id === b.dataset.srcrepick); if (!src) return;
    try {
      const h = await LOCAL.pickFolder(src.id);
      await S.setLibSource({ ...src, name: h.name, err: '' }, []);
      await refresh();
      const r = await scanOne({ ...src, name: h.name });
      await refresh();
      if (r && r.works) toast(`${T('libDone')} ${r.works.length}`);
    } catch (e2) { if (e2 && e2.name !== 'AbortError' && st) st.textContent = String(e2.message || e2).slice(0, 90); }
  });
  $$('[data-srcdrop]', body).forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const id = b.dataset.srcdrop;
    await S.dropLibSource(id);
    await LOCAL.delHandle(id);
    if (A.libOpen === id) A.libOpen = '';
    await refresh(); toast(T('done'));
  });

  /* 格式复选 */
  $$('[data-ext] button', body).forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const id = b.closest('[data-ext]').dataset.ext, k = b.dataset.k;
    const src = A.libSrcs.find(x => x.id === id); if (!src) return;
    const had = (src.f.ext || []);
    const next = had.includes(k) ? had.filter(x => x !== k) : [...had, k];
    await S.setLibSource({ ...src, f: { ...src.f, ext: next.length ? next : LOCAL.EXTS.slice() } },
                         (await S.getLocalLib()).works.filter(w => w.sid === id));
    await refresh();
  });
}

/* ---------------- 自定义图库：一串来源 ----------------
   一个来源一张卡：名字、类型、收了多少张、上次什么时候扫的。
   点卡片展开就是这一路的筛选条件。 */
function srcCard(x) {
  const open = A.libOpen === x.id;
  const isUrl = x.kind === 'url';
  const f = x.f || {};
  const where = isUrl ? x.url : (x.name || T('libFolder'));
  const filt = [f.inc && `${T('libInc')} ${f.inc}`, f.exc && `${T('libExc')} ${f.exc}`,
                (f.ext || []).length < LOCAL.EXTS.length ? (f.ext || []).join('/') : '',
                f.rx ? T('libRx') : ''].filter(Boolean).join(' · ');
  return `<div class="srccard${open ? ' open' : ''}${x.err ? ' bad' : ''}" data-src="${esc(x.id)}">
    <div class="srchead" data-srcopen="${esc(x.id)}" role="button" tabindex="0">
      <s class="srckind">${isUrl ? '&#127760;' : '&#128193;'}</s>
      <div class="srcname"><b>${esc(x.name || (isUrl ? hostOf(x.url) : T('libFolder')))}</b>
        <u>${esc(where)}</u></div>
      <i class="srcn">${x.n || 0}</i>
      <b class="dchev"></b>
    </div>
    ${x.err ? `<div class="srcerr">${esc(x.err)}</div>` : ''}
    <div class="srcbody"><div class="srcin">
      <div class="aigrid srcgrid">
        <label>${esc(T('libName'))}</label>
        <div>${tin('src.' + x.id + '.name', x.name, isUrl ? hostOf(x.url) : T('libFolder'))}</div>
        ${isUrl ? `<label>${esc(T('libUrl'))}</label>
        <div>${tin('src.' + x.id + '.url', x.url, 'https://example.com/gallery/')}
          <i class="tint">${esc(T('libUrlTip'))}</i></div>` : ''}
        <label>${esc(T('libInc'))}</label>
        <div>${tin('src.' + x.id + '.f.inc', f.inc, f.rx ? '^IMG_\\d+' : '*.jpg')}</div>
        <label>${esc(T('libExc'))}</label>
        <div>${tin('src.' + x.id + '.f.exc', f.exc, f.rx ? '(thumb|preview)' : 'thumb')}</div>
        <label></label>
        <div class="srcrx">${toggle('src.' + x.id + '.f.rx', f.rx)}<span>${esc(T('libRxDesc'))}</span></div>
        <label>${esc(T('libExt'))}</label>
        <div><div class="chks tiny" data-ext="${esc(x.id)}">${LOCAL.EXTS.map(e =>
          `<button data-k="${e}" class="${(f.ext || []).includes(e) ? 'on' : ''}"
             aria-pressed="${(f.ext || []).includes(e)}"><s></s><b>${e}</b></button>`).join('')}</div></div>
        <label>${esc(T('libMinPx'))}</label>
        <div>${numSel('src.' + x.id + '.f.minPx', f.minPx, [0, 200, 400, 800, 1200].map(v =>
          ({ v, t: v ? String(v) : T('libNoMin') })), null, 0, 4000, 'px')}</div>
      </div>
      <div class="dbc btnrow" style="margin-top:10px">
        <button class="bigbtn sm pri" data-srcscan="${esc(x.id)}">${esc(T('libRescan'))}</button>
        ${isUrl ? '' : `<button class="bigbtn sm" data-srcrepick="${esc(x.id)}">${esc(T('libRepick'))}</button>`}
        <button class="bigbtn sm" data-srcdrop="${esc(x.id)}">${esc(T('libRemove'))}</button>
      </div>
      <div class="dbd srcstat" data-srcstat="${esc(x.id)}">${esc(x.at ? T('libLast', { n: x.n || 0 }) : '')}</div>
    </div></div>
  </div>`;
}

function libBlock() {
  const list = A.libSrcs || [];
  return `<div class="dblock"><div class="dbd">${esc(T('localDesc'))}</div>
    <div class="dbd" style="margin-top:6px">${esc(T('libTip'))}</div>
    ${list.length ? `<div class="srclist">${list.map(srcCard).join('')}</div>`
      : `<div class="dbd srcempty">${esc(T('libNone2'))}</div>`}
    <div class="dbc btnrow" style="margin-top:10px">
      <button class="bigbtn pri" id="btnLibAddDir">${esc(T('libAddDir'))}</button>
      <button class="bigbtn" id="btnLibAddUrl">${esc(T('libAddUrl'))}</button>
      ${list.length ? `<button class="bigbtn" id="btnLibScanAll">${esc(T('libScanAll'))}</button>
        <button class="bigbtn" id="btnLibDrop">${esc(T('libClearAll'))}</button>` : ''}
    </div>
    <div class="aibar" id="libBar"><i id="libBarI" style="width:0%"></i></div>
    <div class="dbd" id="libStatus" style="margin-top:8px"></div></div>`;
}

/* 探测面板：这个接口报出来的模型，挨个真跑一遍，谁能读图是测出来的 */
function probeBlock(ai, cp) {
  const rows = A.pbRows || (cp && cp.probe) || [];
  if (!A.pbOpen && !rows.length) return '';
  const done = rows.filter(r => r.vision).length;
  return `<div class="pbbox">
    <div class="pbhead"><b>${esc(T('pbTitle'))}</b>
      <em>${esc(rows.length ? T('pbSummary', { n: rows.length, v: done }) : T('pbHint'))}</em>
      ${rows.length ? `<button class="bigbtn sm" id="btnPbWipe">${esc(T('pbWipe'))}</button>` : ''}</div>
    <div class="aibar" id="pbBar"><i id="pbBarI" style="width:0%"></i></div>
    <div class="pblist" id="pbList">${rows.map(r => pbRow(r, S1(ai.model))).join('')}</div>
    <div class="dbd pbfoot">${esc(T('pbFoot'))}</div>
  </div>`;
}

/* 角色分配：文字（翻译 / 界面语言包）与识图（作品补全）各用哪一档 */
function roleBlock(ai, profs) {
  if (!ai.on || profs.length < 1) return '';
  const opt = (cur) => profs.map(p => `<option value="${esc(p.id)}"${p.id === cur ? ' selected' : ''}>${esc(profName(p))}</option>`).join('');
  const tp = AI.profOf({ ai }, 'text'), vp = AI.profOf({ ai }, 'vision');
  const badge = (p, role) => {
    const okk = role === 'text' ? p.okText : p.okVision;
    return `<i class="rbadge ${okk ? 'ok' : 'no'}">${esc(okk ? T('pbTested') : T('pbUntested'))}</i>`;
  };
  return `<div class="dblock inline">
      <div class="dbl"><div class="dbt">${esc(T('aiSplit'))}</div><div class="dbd">${esc(T('aiSplitDesc'))}</div></div>
      ${toggle('ai.split', ai.split)}
    </div>` +
    (ai.split ? `<div class="dblock"><div class="aigrid rolegrid">
      <label>${esc(T('aiRoleText'))}</label>
      <div><select class="sel" data-role="useText">${opt(tp.pid)}</select>${badge(tp, 'text')}
        <i class="tint">${esc(T('aiRoleTextDesc'))}</i></div>
      <label>${esc(T('aiRoleVision'))}</label>
      <div><select class="sel" data-role="useVision">${opt(vp.pid)}</select>${badge(vp, 'vision')}
        <i class="tint">${esc(T('aiRoleVisionDesc'))}</i></div>
    </div></div>`
    : `<div class="dblock"><div class="dbd rolesame">${esc(T('aiSplitOff', {
        p: profName(profs.find(x => x.id === ai.cur) || profs[0] || {}) }))}
      ${badge(tp, 'text')}${badge(vp, 'vision')}</div></div>`);
}

/* 语言那一组的正文：两个位置 + 界面跟谁 + 作品译文 */
function langBlock(s) {
  const open = langUnlocked();
  const a = s.loc.a, b = s.loc.b;
  const custom = ![a, b].every(LG.isBuiltin);
  const st = A.trStat || { pend: 0, done: 0 };
  return `<div class="dblock langpair">
      <div class="lpr"><label>${esc(T('langNative'))}</label>${langSel('a', a)}</div>
      <div class="lpr"><label>${esc(T('langForeign'))}</label>${langSel('b', b)}</div>
      <div class="lpr"><label>${esc(T('langUI'))}</label>${seg('lang', [
        { v: 'native', t: T('langUINative') }, { v: 'foreign', t: T('langUIForeign') }, { v: 'auto', t: T('langUIAuto') }], s.lang)}</div>
      ${A.langNew ? `<div class="lpr lpnew"><label>${esc(T('langCustom'))}</label>
        <div class="tinrow"><input class="tin" id="langNewIn" placeholder="${esc(T('langCustomTip'))}"
          spellcheck="false" autocomplete="off"><button class="bigbtn sm pri" id="langNewOk">${esc(T('apply'))}</button></div></div>` : ''}
      <div class="dbd lphint">${esc(open ? T('langFlipTip') : T('langBuiltinOnly'))}</div>
      ${open ? '' : `<div class="dbd lplock"><s>!</s><span>${esc(T('langLocked'))}</span>
        <button class="bigbtn sm" id="btnLangGoAi">${esc(T('langGoAi'))}</button></div>`}
    </div>` +
    (custom ? `<div class="dblock trbox">
      <div class="dbl"><div class="dbt">${esc(T('trOn'))}</div><div class="dbd">${esc(T('trDesc'))}</div></div>
      ${toggle('loc.tr', s.loc.tr)}
    </div>` + (s.loc.tr ? `<div class="dblock">
      <div class="aigrid trgrid">
        <label>${esc(T('trScope'))}</label>
        <div>${seg('loc.scope', [{ v: 'all', t: T('trScopeAll') }, { v: 'builtin', t: T('trScopeBuiltin') },
          { v: 'daily', t: T('trScopeDaily') }, { v: 'local', t: T('trScopeLocal') }], s.loc.scope)}</div>
        <label>${esc(T('trBatch'))}</label>
        <div>${numSel('loc.batch', s.loc.batch, [10, 25, 50, 100, 200].map(v => ({ v, t: String(v) })), null, 1, 2000, T('trWorks'))}</div>
        <label>${esc(T('trPer'))}</label>
        <div>${numSel('loc.per', s.loc.per, [1, 2, 4, 6, 8].map(v => ({ v, t: String(v) })), null, 1, 10, T('trWorks'))}</div>
      </div>
      <div class="dblock inline" style="padding:0;margin-top:4px">
        <div class="dbl"><div class="dbt">${esc(T('trPack'))}</div><div class="dbd">${esc(T('trPackDesc'))}</div></div>
        ${toggle('loc.pack', s.loc.pack)}
      </div>
      <div class="dbc btnrow" style="margin-top:10px">
        <button class="bigbtn pri" id="btnTrRun">${esc(T('trRun'))}</button>
        <button class="bigbtn" id="btnTrPack">${esc(T('trPackRun'))}</button>
        <button class="bigbtn" id="btnTrClear">${esc(T('trClear'))}</button>
      </div>
      <div class="aibar" id="trBar"><i id="trBarI" style="width:0%"></i></div>
      <div class="dbd" id="trStatus" style="margin-top:9px">${esc(
        `${T('trPending')} ${st.pend} ${T('trWorks')}` +
        [a, b].filter(c => !LG.isBuiltin(c)).map(c => ` · ${langName(c)}：${packLine(c)}`).join(''))}</div>
      ${diagCard('tr')}
      <div class="ailist" id="trList" hidden></div>
    </div>` : '') : '');
}

/* ---------------- 五页 ---------------- */
async function buildTab(tab, s) {
  gTab = tab;
  if (tab === 'show') {
    return grp('mode', T('mode'),
      `<div class="dblock"><div class="dbc"><div class="modegrid">${MODE_KEYS.map(k => `<button class="mchip${s.mode === k ? ' on' : ''}" data-seg2="mode" data-v="${k}">
        <svg><use href="#i-m-${k}"></use></svg><b>${esc(T('mode_' + k))}</b></button>`).join('')}</div></div></div>` +
      mo(['immersive'], dblock(T('fit'), T('fitDesc'),
        seg('fit', [{ v: 'smart', t: T('fitSmart') }, { v: 'cover', t: T('fitCover') }, { v: 'contain', t: T('fitContain') }], s.fit))),
      T('mode_' + s.mode), 'mode fit 模式 适配') +
    grp('lang', T('lang') + ' · ' + T('clock'), langBlock(s) +
      dblock(T('clock'), T('clockDesc'),
        seg('clock', [{ v: 'off', t: T('clockOff') }, { v: 'bar', t: T('clockBar') }, { v: 'grand', t: T('clockGrand') }], s.clock)),
      T('trStats', { a: langName(s.loc.a), b: langName(s.loc.b) }),
      'language clock locale translate 语言 时钟 母语 外语 翻译 多语言') +
    grp('motion', T('motion'),
      mo(['immersive'], dinline(T('kenburns'), '', toggle('kenburns', s.kenburns))) +
      mo(['immersive'], dinline(T('scrollPan'), '', toggle('scrollPan', s.scrollPan))) +
      dinline(T('autohide'), '', toggle('autohide', s.autohide)) +
      (s.autohide ? dctrl(T('hideWhat'), `<div class="chks" data-chk="hideParts">` +
        HIDE_PARTS.map(x => `<div class="dmo" data-modes="${x.m.join(' ')}"><button data-k="${x.k}"
          class="${s.hideParts[x.k] ? 'on' : ''}" aria-pressed="${!!s.hideParts[x.k]}"><s></s><b>${esc(T('hide_' + x.k))}</b>${
          x.m.length < MODE_KEYS.length ? `<i>${esc(x.m.map(m => T('mode_' + m)).join(' · '))}</i>` : ''}</button></div>`).join('') +
        `</div>`) : ''),
      '', 'motion animation 动效 隐藏') +
    grp('film', T('filmStyle'),
      dctrl(T('filmStyleDesc'), seg('film', FILMS.map(f => ({ v: f.k, t: T('film_' + f.k) })), s.film)) +
      dinline(T('filmEdge'), T('filmEdgeDesc'), toggle('filmEdge', s.filmEdge)) +
      dblock(T('filmRun'), '', seg('filmRun', [{ v: 'glide', t: T('filmGlide') }, { v: 'step', t: T('filmStep') }], s.filmRun)),
      T('film_' + s.film), 'film 胶卷 胶片', '', ['film']);
  }

  if (tab === 'room') {
    const fr = FRAMES.find(f => f.k === s.frame), wl = WALLS.find(w => w.k === s.wall);
    return `<div class="drawer-hint">${esc(T('roomHint'))}</div>` +
      grp('frame', T('frame'),
        `<div class="dblock"><div class="dbc"><div class="pickrow">${FRAMES.map(f => `<button class="frchip${s.frame === f.k ? ' on' : ''}" data-pick="frame" data-k="${f.k}" data-frame="${f.k}">
          <span class="fp"><span class="mat-p"><i></i></span></span><b>${esc(lx(f, A.lang))}</b></button>`).join('')}</div></div></div>`,
        lx(fr, A.lang), 'frame 画框', '', ['wall', 'carousel']) +
      grp('mat', T('mat'),
        dctrl(T('matDesc'),
          seg('matStyle', LINERS.map(l => ({ v: l.k, t: lx(l, A.lang) })), s.matStyle)) +
        dblock(T('matWidth'), T('matWidthDesc'),
          slider('matScale', 0.4, 2, 0.05, s.matScale, s.matScale.toFixed(2) + '×')),
        s.matScale.toFixed(2) + '×', 'mat 留白 卡纸', '', ['wall', 'carousel']) +
      grp('wall', T('wall') + ' · ' + T('tex'),
        wallBlock(s) + toneBlock(s) +
        `<div class="dblock"><div class="dbc">${texGrid(s.tex)}</div></div>`,
        texBase(s.tex || 'none') ? lx(texDef(s.tex), A.lang)
          : (s.wall === 'custom' ? T('wallCustom') : lx(wl || WALLS[0], A.lang)),
        'wall texture colour 墙面 纹理 颜色 色板 饱和度 色温 金属', '', ['wall', 'carousel', 'film', 'masonry']) +
      grp('light', T('light'), lightBlock(s),
        s.lamp.n ? `${s.lamp.n}${T('lightNUnit')} · ${s.lamp.bright}%` : T('lightOff'),
        'light lamp 灯光 射灯 亮度 角度 冷暖 灯数', '', ['wall', 'carousel']);
  }

  if (tab === 'play') {
    const ivOpts = INTERVALS.map(o => ({ v: o.v, t: o.k ? T(o.k) : `${o.n} ${T(o.u)}${o.tag ? ' · ' + T(o.tag) : ''}` }));
    const ivNow = ivOpts.find(o => String(o.v) === String(s.intervalMs));
    return grp('interval', T('interval'),
      dinline(T('newTab'), T('newTabDesc'), toggle('newTabAdvance', s.newTabAdvance)) +
      mo(['wall', 'immersive'], dblock(T('timed'), T('timedDesc'), `<select class="sel" data-sel="intervalMs">${ivOpts.map(o => `<option value="${o.v}"${String(o.v) === String(s.intervalMs) ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`)) +
      dblock(T('order'), '', seg('order', [{ v: 'shuffle', t: T('shuffle') }, { v: 'sequential', t: T('sequential') }], s.order)),
      ivNow ? ivNow.t : '', 'interval timer 轮换 定时') +
    grp('pace', T('carInt') + ' · ' + T('filmInt'),
      dblock(T('carInt'), T('carIntDesc'), paceSel('carouselMs', s.carouselMs)) +
      dblock(T('filmInt'), T('filmIntDesc'), paceSel('filmMs', s.filmMs)),
      '', 'pace 节奏 走带', '', ['carousel', 'film']) +
    grp('scope', T('scope'),
      dctrl('', seg('scope', [{ v: 'all', t: T('scopeAll') }, { v: 'fav', t: T('scopeFav') }, { v: 'filter', t: T('scopeFilter') }].concat(
        s.dailyNew && A.daily ? [{ v: 'daily', t: T('scopeDaily') }] : [],
        s.localLib && A.lib ? [{ v: 'lib', t: T('scopeLib') }] : []), s.scope)) +
      dinline(T('workSafe'), '', toggle('workSafe', s.workSafe)) +
      dblock(T('quality'), '', `<select class="sel" data-sel="quality">${[['auto', 'qAuto'], ['saver', 'qSaver'], ['high', 'qHigh'], ['max', 'qMax']].map(([v, k]) => `<option value="${v}"${s.quality === v ? ' selected' : ''}>${esc(T(k))}</option>`).join('')}</select>`),
      T('scope' + s.scope[0].toUpperCase() + s.scope.slice(1)), 'scope quality 范围 画质 办公');
  }

  /* ---------- 图库：每日新作 / 自定义图库 / AI 补全 ---------- */
  if (tab === 'lib') {
    const ai = s.ai || {};
    const ais = await S.getAIState();
    const aiReady = AI.configured(ai);
    const aiPerm = aiReady ? await AI.hasHost(ai.base) : true;
    const [dSt, lSt] = ai.on ? await Promise.all([S.getDaily(), S.getLocalLib()]) : [null, null];
    const aiPend = ai.on ? AI.pendingOf(dSt, lSt, ai, false).n : 0;
    const rep = (A.aiReport && A.aiReport.length) ? A.aiReport : (ais.report || []);
    const profs = ai.list || [];
    const cp = profs.find(p => p.id === ai.cur) || null;
    const cpLocal = !!(cp && NET.isLocal(cp.base));       // 本机模型这一档要多说两句
    const P = AI.promptsOf(ai);
    const prevW = A.aiPrev === 'art' ? (dSt?.works || [])[0] : A.aiPrev === 'any' ? (lSt?.works || [])[0] : null;
    const prevTx = (ai.on && A.aiPrev) ? AI.previewPrompt(ai, A.aiPrev, prevW) : null;
    const prevAll = prevTx ? `— ${T('aiPSys')} —\n${prevTx.sys}\n\n— ${T('aiPUser')} —\n${prevTx.user}` : '';
    /* 提示词编辑框：框里始终是「真正会发出去的那份」，改回默认就存空，
       以后内置文案更新了还能跟着走 */
    const ped = (k, lab, desc, val, kind) => `<div class="plab"><b>${esc(lab)}</b>
        ${S1(ai['p' + k]) ? `<em class="pcus">${esc(T('aiEdited'))}</em>` : ''}
        ${kind ? `<button class="bigbtn sm" data-ppre="${kind}">${esc(A.aiPrev === kind ? T('aiPrevHide') : T('aiPrev'))}</button>` : ''}
        <button class="bigbtn sm" data-pdef="${k}"${S1(ai['p' + k]) ? '' : ' disabled'}>${esc(T('aiReset'))}</button></div>
      ${desc ? `<div class="dbd" style="margin:-2px 0 6px">${esc(desc)}</div>` : ''}
      ${tarea('ai.p' + k, val)}
      ${kind && A.aiPrev === kind ? `<div class="aiprev">${esc(prevAll)}</div>
        <div class="dbc"><button class="bigbtn sm" id="btnAiPcopy">${esc(T('copy'))}</button></div>` : ''}`;

    return grp('daily', T('daily'),
      `<div class="dblock"><div class="dbd">${esc(T('dailyDesc'))}</div></div>` +
      dblock(T('dailyN'), T('dailyNDesc'), numSel('dailyN', s.dailyN,
        [1, 2, 3, 5, 8].map(v => ({ v, t: String(v) })), null, 1, 12, T('aiWorks'))) +
      `<div class="dblock">
        <div class="dbc btnrow">
          <button class="bigbtn pri" id="btnDailyNow"${s.dailyNew ? '' : ' disabled'}>${esc(T('dailyNow'))}</button>
          <button class="bigbtn" id="btnDailyClear">${esc(T('dailyClear'))}</button>
        </div></div>`,
      s.dailyNew ? `${A.daily} / 150` : '', 'daily commons 每日 新作', toggle('dailyNew', s.dailyNew)) +

    grp('local', T('localLib'), libBlock(),
      A.libSrcs.length ? T('libSum', { n: A.libSrcs.length, w: A.lib }) : T('libNone2'),
      'folder local url 本地 文件夹 网址 图库 筛选 正则',
      toggle('localLib', s.localLib)) +

    grp('ai', T('ai'),
      `<div class="dblock"><div class="dbd">${esc(T('aiDesc'))}</div></div>` +
      (ai.on ? `<div class="dblock">
        <div class="dbt">${esc(T('aiProfile'))}</div>
        <div class="dbc profrow">
          <select class="sel" id="aiProf">
            ${profs.length ? '' : `<option value="" selected disabled>${esc(T('aiNoProfShort'))}</option>`}
            ${profs.map(p => `<option value="${esc(p.id)}"${p.id === ai.cur ? ' selected' : ''}>${esc(profName(p))}</option>`).join('')}
            <option value="__new">${esc(T('aiProfNew'))}</option>
          </select>
          ${cp ? `<button class="bigbtn sm" id="btnProfDup">${esc(T('aiProfDup'))}</button>
                  <button class="bigbtn sm" id="btnProfDel">${esc(T('aiProfDel'))}</button>` : ''}
        </div></div>
      <div class="dblock">
        <div class="aigrid">
          ${cp ? `
          <label>${esc(T('aiProfName'))}</label>
          <div>${tin('pf.name', cp.name, hostOf(cp.base) || T('aiUntitled'))}</div>
          <label>${esc(T('aiFmt'))}</label>
          <div>${seg('pf.fmt', [{ v: 'auto', t: T('aiFmtAuto') }, { v: 'openai', t: 'OpenAI' }, { v: 'anthropic', t: 'Anthropic' }], cp.fmt)}</div>
          <label>${esc(T('aiBase'))}</label>
          <div>${tin('pf.base', cp.base, 'https://api.openai.com/v1')}<i class="tint">${esc(T('aiBaseTip'))}</i>
            ${cpLocal ? `<i class="tint">${esc(T('aiLocalNote'))}</i>` : ''}</div>
          <label>${esc(T('aiKey'))}</label>
          <div class="tinrow">${tin('pf.key', cp.key, cpLocal ? T('aiKeyLocalPh') : 'sk-…', A.aiEye ? 'text' : 'password')}
            <button class="bigbtn sm" id="btnAiEye">${esc(A.aiEye ? T('aiHide') : T('aiShow'))}</button></div>
          ${cpLocal ? `<label></label><div><i class="tint">${esc(T('aiKeyLocal'))}</i></div>` : ''}
          <label></label>
          <div>${pfChips('key', cp.keys, cp.key, maskKey)}</div>
          <label>${esc(T('aiModel'))}</label>
          <div>${tin('pf.model', cp.model, 'gpt-4o-mini')}</div>
          <label></label>
          <div>${pfChips('model', cp.models, cp.model, (x) => x)}</div>` : ''}
        </div>
        ${cp ? '' : `<div class="dbd" style="margin-top:10px">${esc(T('aiNoProf'))}</div>`}
        <div class="dbc btnrow">
          <button class="bigbtn" id="btnAiTest"${aiReady ? '' : ' disabled'}>${esc(T('aiTest'))}</button>
          <button class="bigbtn" id="btnAiProbe"${aiReady || S1(ai.base) ? '' : ' disabled'}>${esc(T('pbRun'))}</button>
          <button class="bigbtn pri" id="btnAiRun"${aiReady ? '' : ' disabled'}>${esc(T('aiRun'))}</button>
          <button class="bigbtn" id="btnAiRedo">${esc(T('aiRedo'))}</button>
          ${aiPerm ? '' : `<button class="bigbtn" id="btnAiGrant">${esc(T('aiGrant'))}</button>`}
        </div>
        ${probeBlock(ai, cp)}
        <div class="aibar" id="aiBar"><i id="aiBarI" style="width:0%"></i></div>
        <div class="dbd" id="aiStatus" style="margin-top:9px">${esc(
          (A.diag && A.diag.where === 'ai' && A.diag.msg) ? A.diag.msg
          : !aiReady ? T('aiNeedCfg')
          : !aiPerm ? T('aiPerm')
          : `${T('aiPending')} ${aiPend} ${T('aiWorks')}` + (ais.at
              ? ` · ${T('aiLast')} ${T('aiDoneN')} ${ais.done}${ais.fail ? ` · ${T('aiFailN')} ${ais.fail}` : ''}` : ''))}</div>
        ${diagCard('ai')}
        <div class="ailist" id="aiList"${rep.length ? '' : ' hidden'}>${rep.slice(-80).map(aiRow).join('')}</div>
        <div class="dbc" id="aiWipeBox"${rep.length ? '' : ' hidden'} style="margin-top:7px">
          <button class="bigbtn sm" id="btnAiWipe">${esc(T('aiWipe'))}</button></div>
      </div>` : ''),
      ai.on ? (cp ? profName(cp) : T('aiNoProfShort')) : '',
      'ai api key model endpoint 接口 密钥 模型 补全', toggle('ai.on', ai.on)) +

    (ai.on ? grp('airole', T('aiRoles'), roleBlock(ai, profs),
      ai.split ? T('aiSplitOn') : T('aiSplitNone'), 'role text vision 文字 识图 分开 角色') : '') +

    (ai.on ? grp('airun', T('aiRunOpts'),
      dinline(T('scopeDaily'), '', toggle('ai.forDaily', ai.forDaily)) +
      dinline(T('localLib'), '', toggle('ai.forLocal', ai.forLocal)) +
      dinline(T('aiAuto'), T('aiAutoDesc'), toggle('ai.auto', ai.auto)) +
      dblock(T('aiSched'), T('aiSchedDesc'), numSel('ai.sched', ai.sched, SCHED_OPTS(), SCHED_UNITS(), 15, 43200)) +
      dblock(T('aiRename'), T('aiRenameDesc'), seg('ai.rename', [
        { v: 'auto', t: T('aiRenameAuto') }, { v: 'always', t: T('aiRenameAlways') }, { v: 'never', t: T('aiRenameNever') }], ai.rename)) +
      dinline(T('aiNote'), T('aiNoteDesc'), toggle('ai.note', ai.note)) +
      dinline(T('aiOver'), T('aiOverDesc'), toggle('ai.over', ai.over)) +
      dblock(T('aiBatch'), '', numSel('ai.batch', ai.batch, [5, 10, 20, 50, 100, 200].map(v => ({ v, t: String(v) })), null, 1, 2000, T('aiWorks'))) +
      dblock(T('aiConcur'), T('aiConcurDesc'), numSel('ai.concur', ai.concur, [1, 2, 3, 4].map(v => ({ v, t: String(v) })), null, 1, 8)) +
      dblock(T('aiRetry'), T('aiRetryDesc'), numSel('ai.retry', ai.retry, [
        { v: 0, t: T('aiRetry0') }, { v: 1, t: '1 ' + T('aiTimes') }, { v: 2, t: '2 ' + T('aiTimes') },
        { v: 3, t: '3 ' + T('aiTimes') }, { v: -1, t: T('aiRetryInf') }], null, 0, 20, T('aiTimes'))),
      ai.sched ? schedTxt(ai.sched) : T('aiSchedOff'), 'schedule batch retry 定时 张数 并发 重试') : '') +

    (ai.on ? grp('aiprompt', T('aiPrompt'),
      `<div class="dblock"><div class="dbd phint">${esc(T('aiVars'))}${AI.PLACEHOLDERS.map(v => `<code>{${v}}</code>`).join(' ')}</div>
        <div class="dbd" style="margin-top:6px">${esc(T('aiVarsDesc'))}</div>
        ${ped('Sys', T('aiPSys'), '', P.sys, '')}
        ${ped('Art', T('aiPArt'), T('aiPArtDesc'), P.art, 'art')}
        ${ped('Any', T('aiPAny'), T('aiPAnyDesc'), P.any, 'any')}</div>` +
      `<div class="dblock"><div class="dbd">${esc(T('aiPrivacy'))}</div>
        <div class="dbd" style="margin-top:6px;opacity:.7">${esc(T('aiRedoDesc'))}</div></div>`,
      (S1(ai.pSys) || S1(ai.pArt) || S1(ai.pAny)) ? T('aiEdited') : T('aiDefault'),
      'prompt 提示词 模板') : '');
  }

  /* ---------- 存储 ---------- */
  if (tab === 'data') {
    const st = await S.cacheStats();
    const ver = globalThis.chrome?.runtime?.getManifest?.().version || '';
    return grp('cache', T('cache'),
      `<div class="dblock"><div class="dbt">${esc(T('cached'))} ${st.works} / ${A.cat.length} ${esc(T('works'))}</div>
        <div class="dbd">${esc(T('cacheDesc'))}</div>
        <div class="dbd" style="margin-top:6px">${esc(T('cacheSize'))}: ${fmtBytes(st.bytes)} / ${s.cacheLimitMB} MB</div>
        <div class="cachebar"><i style="width:${Math.min(100, st.bytes / (s.cacheLimitMB * 1048576) * 100).toFixed(1)}%"></i></div>
        <div class="dbc btnrow">
          <button class="bigbtn pri" id="btnCacheAll">${esc(T('cacheAll'))}</button>
          <button class="bigbtn" id="btnCacheClear">${esc(T('cacheClear'))}</button>
        </div></div>` +
      dblock(T('cacheLimit'), T('evictDesc'),
        `<select class="sel" data-sel="cacheLimitMB">${[200, 400, 600, 1000, 2000].map(v => `<option value="${v}"${s.cacheLimitMB === v ? ' selected' : ''}>${v} MB</option>`).join('')}</select>`),
      fmtBytes(st.bytes), 'cache offline 缓存 离线') +
    grp('gone', T('goneTitle'), goneBlock(),
      A.gone.length ? String(A.gone.length) : T('goneNone'),
      'gone hidden removed 移除 去除 隐藏 恢复') +
    grp('backup', T('bkTitle'), backupBlock(),
      T('bkHint'), 'backup restore export import 备份 恢复 导出 导入 迁移 json') +
    grp('export', T('exportTitle'),
      `<div class="dblock"><div class="dbd">${esc(T('exportDesc'))}</div>
        <div class="dbc btnrow">
          <button class="bigbtn pri" id="btnExport">${esc(T('exportBtn'))}</button>
          <button class="bigbtn" id="btnOpenFolder">${esc(T('openFolder'))}</button>
        </div></div>` +
      `<div class="dblock"><div class="dbt">${esc(T('cachePath'))}</div><div class="dbd">${esc(T('cachePathDesc'))}</div>
        <div class="pathbox"><code id="dbPath">${esc(dbPath())}</code><button id="btnCopyPath">${esc(T('copyPath'))}</button></div></div>`,
      '', 'export download 导出 下载 路径') +
    grp('chrome', 'Chrome',
      `<div class="dblock"><div class="hintbox"><b>${esc(T('footerTitle'))}</b><br>${esc(T('footerDesc'))}
        <ol><li>${esc(T('footerStep1'))}</li><li>${esc(T('footerStep2'))}</li></ol></div></div>`,
      '', 'chrome footer 页脚') +
    grp('about', T('about'),
      `<div class="about"><span class="an">长廊 CORRIDOR</span>
        ${esc(T('version'))} <b>${esc(ver)}</b><br>
        ${esc(T('author'))} <b>Charles Chern</b> · <b>@yearnst</b><br>
        <span class="akbd">${esc(T('kbd'))}</span>
        <span style="display:block;margin-top:8px">${esc(T('credits'))}</span>
        <span style="display:block;margin-top:6px;opacity:.8">© ${new Date().getFullYear()} Charles Chern · MIT License</span></div>`,
      'v' + ver, 'about version 关于 版本');
  }
  return '';
}
/* 备份面板上的四个按钮 */
function bindBackup(body) {
  const b = A.bk;
  const picked = () => BK.PARTS.filter(k => b.parts[k]);

  const eye = $('#btnBkEye', body);
  if (eye) eye.onclick = () => { A.bkEye = !A.bkEye; renderDrawer(); };

  const ex = $('#btnBkExport', body);
  if (ex) ex.onclick = async () => {
    const parts = picked();
    if (!parts.length) { b.msg = T('bkNothing'); renderDrawer(); return; }
    if (b.keys === 'enc' && !S1(b.pass)) { b.msg = T('bkNeedPass'); renderDrawer(); return; }
    ex.disabled = true;
    try {
      const file = await BK.collect(parts, { keys: b.keys, password: b.pass });
      const name = BK.fileName(file);
      await saveJSON(file, name);
      b.msg = T('bkExported', { f: name });
      b.pass = '';                                   // 口令用完就丢
    } catch (e) {
      b.msg = T('bkExportFail') + ' · ' + S1(e && e.message || e);
    }
    ex.disabled = false; renderDrawer();
  };

  const im = $('#btnBkImport', body), fi = $('#bkFile', body);
  if (im && fi) {
    im.onclick = () => fi.click();
    fi.onchange = async () => {
      const f = fi.files && fi.files[0];
      if (!f) return;
      try {
        const txt = await f.text();
        const json = JSON.parse(txt);
        b.file = json; b.sum = BK.summarize(json); b.msg = ''; b.pass2 = '';
        /* 文件里有什么就默认勾什么，勾选框跟着这份文件走 */
        if (b.sum.ok) for (const k of BK.PARTS) b.parts[k] = b.sum.rows.some(r => r.k === k);
      } catch {
        b.file = null; b.sum = { ok: false, why: 'notjson' };
      }
      fi.value = '';
      renderDrawer();
    };
  }

  const drop = $('#btnBkDrop', body);
  if (drop) drop.onclick = () => { b.file = null; b.sum = null; b.pass2 = ''; b.msg = ''; renderDrawer(); };

  const ap = $('#btnBkApply', body);
  if (ap) ap.onclick = async () => {
    if (!b.file || !b.sum?.ok) return;
    const parts = picked();
    if (!parts.length) { b.msg = T('bkNothing'); renderDrawer(); return; }
    if (b.sum.needPass && !S1(b.pass2)) { b.msg = T('bkNeedPass'); renderDrawer(); return; }
    ap.disabled = true;
    try {
      const r = await BK.apply(b.file, { parts, mode: b.mode, password: b.pass2 });
      b.file = null; b.sum = null; b.pass2 = '';
      await afterImport(r);
      return;
    } catch (e) {
      const m = S1(e && e.message || e);
      b.msg = m === 'badpass' ? T('bkBadPass') : (T('bkImportFail') + ' · ' + m);
    }
    ap.disabled = false; renderDrawer();
  };
}
/* 导入之后：设置、目录、播放列表全部按新的重来一遍，不用让用户自己刷新 */
async function afterImport(r) {
  A.set = await S.getSettings();
  [A.lang, A.other] = resolveLang(A.set);
  const packs = await S.getPacks();
  for (const [c, pk] of Object.entries(packs || {})) if (c === A.lang || c === A.other) applyPack(c, pk);
  A.tr = await S.getTr();
  [A.favs, A.hist, A.gone] = await Promise.all([S.getFavs(), S.getHistory(), S.getGone()]);
  document.body.dataset.mode = A.set.mode;
  document.body.dataset.kb = A.set.kenburns ? '1' : '0';
  document.body.dataset.ui = A.set.ui;
  applyRoom(); applyDir();
  await reloadDaily();
  MODES.applyPace(A.set);
  applyTips(); startClock(); startTimer();
  A.bk.msg = T('bkImported', { n: r.done.length });
  renderDrawer();
  toast(T('bkImported', { n: r.done.length }));
  try { await NET.syncOriginRules(A.set); } catch { }
  try { await chrome.runtime.sendMessage({ type: 'ai-arm' }); } catch { }
}
/* 把一个对象存成 .json。有 downloads 权限就走它（能弹「另存为」），
   没有就退回一个临时的 <a download> —— 选项页里也用得上。 */
async function saveJSON(obj, name) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  /* 先走 downloads（能弹「另存为」，备份文件值得让人自己挑地方）；
     它被策略挡下或压根没有，就退回一个临时的 <a download>，选项页里也用得上 */
  try {
    if (globalThis.chrome?.downloads) {
      const id = await chrome.downloads.download({ url, filename: name, conflictAction: 'uniquify', saveAs: true });
      trackDownload(id, url);
      return;
    }
  } catch { /* 往下退 */ }
  try {
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) { URL.revokeObjectURL(url); throw e; }
}

/* ---------------- 备份与恢复 ----------------
   上半截导出：勾要带走哪几块、密钥怎么处理；下半截导入：
   先认清这份文件里有什么，再让人选覆盖还是并入，最后才落地。 */
function backupBlock() {
  const b = A.bk;
  const partOpts = BK.PARTS.map(k => ({ k, t: T('bkP_' + k), note: T('bkPN_' + k) }));
  const sum = b.sum;
  const keyRow = `<div class="dblock">
    <div class="dbt">${esc(T('bkKeys'))}</div>
    <div class="dbd">${esc(T('bkKeysDesc'))}</div>
    <div class="dbc">${seg('bk.keys', [
      { v: 'none', t: T('bkKeysNone') }, { v: 'enc', t: T('bkKeysEnc') }, { v: 'plain', t: T('bkKeysPlain') }], b.keys)}</div>
    ${b.keys === 'enc' ? `<div class="dbc tinrow">${tin('bk.pass', b.pass, T('bkPassPh'), A.bkEye ? 'text' : 'password')}
      <button class="bigbtn sm" id="btnBkEye">${esc(A.bkEye ? T('aiHide') : T('aiShow'))}</button></div>
      <div class="dbd">${esc(T('bkEncNote'))}</div>` : ''}
    ${b.keys === 'plain' ? `<div class="bkwarn">${esc(T('bkPlainWarn'))}</div>` : ''}
  </div>`;

  const why = ['notjson', 'notours', 'newer'].includes(sum && sum.why) ? sum.why : 'notours';
  const imp = !sum ? '' : !sum.ok
    ? `<div class="bkwarn">${esc(T('bkBad_' + why))}</div>`
    : `<div class="bkcard">
        <div class="bkmeta">${esc(T('bkFrom', { v: sum.appVersion || '?', d: (sum.at || '').slice(0, 10) }))}
          · ${esc(sum.keys === 'enc' ? T('bkHasEnc') : sum.keys === 'plain' ? T('bkHasPlain') : T('bkHasNone'))}</div>
        <ul class="bklist">${sum.rows.map(r => `<li><b>${esc(T('bkP_' + r.k))}</b><i>${r.n}</i></li>`).join('')}</ul>
        ${sum.needPass ? `<div class="dbc">${tin('bk.pass2', b.pass2, T('bkPassPh'), 'password')}</div>` : ''}
        <div class="dbc">${seg('bk.mode', [{ v: 'replace', t: T('bkModeReplace') }, { v: 'merge', t: T('bkModeMerge') }], b.mode)}</div>
        <div class="dbd">${esc(b.mode === 'replace' ? T('bkModeReplaceDesc') : T('bkModeMergeDesc'))}</div>
        <div class="dbc btnrow"><button class="bigbtn pri" id="btnBkApply">${esc(T('bkApply'))}</button>
          <button class="bigbtn" id="btnBkDrop">${esc(T('bkDrop'))}</button></div>
      </div>`;

  return `<div class="dblock"><div class="dbd">${esc(T('bkDesc'))}</div></div>` +
    dctrl(T('bkPick'), chks('bk.parts', partOpts, b.parts)) +
    keyRow +
    `<div class="dblock"><div class="dbc btnrow">
      <button class="bigbtn pri" id="btnBkExport">${esc(T('bkExport'))}</button>
      <button class="bigbtn" id="btnBkImport">${esc(T('bkImport'))}</button>
      <input type="file" id="bkFile" accept="application/json,.json" hidden>
    </div>
    ${b.msg ? `<div class="dbd" style="margin-top:8px">${esc(b.msg)}</div>` : ''}
    ${imp}</div>` +
    `<div class="dblock"><div class="dbd">${esc(T('bkNotIncluded'))}</div></div>`;
}

/* ---------------- 已移除的那些 ----------------
   在设置里给它们留一个出口：右下角那个按钮点下去的东西，
   总得有个地方能找回来，否则「不可恢复」就是骗人的。 */
function goneBlock() {
  const ids = A.gone || [];
  if (!ids.length) return `<div class="dblock"><div class="dbd">${esc(T('goneEmpty'))}</div></div>`;
  const rows = ids.slice(0, 200).map(id => {
    const w = A.byId.get(id);
    const name = w ? tx(w.title) : id;
    const who = w ? [tx(w.artist), dtw(w, 'year')].filter(Boolean).join(' · ') : T('goneLost');
    return `<div class="gonerow"><b>${esc(name)}</b><i>${esc(who)}</i>
      <button class="bigbtn sm" data-ungone="${esc(id)}">${esc(T('goneBack'))}</button></div>`;
  }).join('');
  return `<div class="dblock"><div class="dbd">${esc(T('goneDesc'))}</div>
    <div class="gonelist">${rows}</div>
    ${ids.length > 200 ? `<div class="dbd" style="margin-top:6px">${esc(T('goneMore', { n: ids.length - 200 }))}</div>` : ''}
    <div class="dbc btnrow"><button class="bigbtn" id="btnGoneAll">${esc(T('goneBackAll'))}</button></div></div>`;
}

/* 「每 6 小时」这种人话 */
function schedTxt(m) {
  m = Number(m) || 0;
  if (!m) return T('aiSchedOff');
  if (m % 1440 === 0) return m === 1440 ? T('aiSchedDay') : `${T('every')} ${m / 1440} ${T('day')}`;
  if (m % 60 === 0) return m === 60 ? T('aiSched1h') : `${T('every')} ${m / 60} ${T('hour')}`;
  return `${T('every')} ${m} ${T('min')}`;
}

let dscroll = 0, dscrollTab = null, dseq = 0;
async function renderDrawer(toTop = false) {
  const my = ++dseq;                           // 两次渲染叠在一起时，旧的那次作废
  const s = A.set, tab = DTABS.includes(A.dtab) ? A.dtab : 'show';
  const q = S1(A.dq).toLowerCase();
  $('#drawerTitle').textContent = T('settings');
  $('#drawerReset').textContent = T('reset');
  const sc = $('#dscope');
  if (sc) {
    sc.title = T('dscopeTip');
    $$('button', sc).forEach(b => {
      b.textContent = T(b.dataset.v === 'cur' ? 'dscopeCur' : 'dscopeAll');
      b.classList.toggle('on', b.dataset.v === (s.dscope || 'cur'));
    });
  }
  const bt = $('#btnTheme');
  if (bt) {
    const lightNow = s.ui === 'light';
    bt.innerHTML = `<svg><use href="#i-${lightNow ? 'sun' : 'moon'}"></use></svg>`;
    bt.title = T(lightNow ? 'uiLight' : 'uiDark');
    bt.setAttribute('aria-label', bt.title);
  }
  /* 待译件数：范围一换这个数就跟着变，是「现在按下去会译多少」的实话 */
  if (s.loc?.tr) {
    const langs = [s.loc.a, s.loc.b].filter(c => !LG.isBuiltin(c));
    A.trStat = { pend: langs.length ? TR.pendingTr(trWorksOf(s.loc.scope), A.tr, langs, s.ai?.note !== false, false).length : 0 };
  } else A.trStat = null;
  const dq = $('#dq'); if (dq) { dq.placeholder = T('searchSet'); if (dq.value !== A.dq) dq.value = A.dq || ''; }
  const qx = $('#dqx'); if (qx) qx.hidden = !q;
  document.body.classList.toggle('dsearching', !!q);
  const labels = { show: T('tabShow'), room: T('tabRoom'), play: T('tabPlay'), lib: T('tabLib'), data: T('tabData') };
  $$('#dtabs button').forEach(b => { b.textContent = labels[b.dataset.dt] || ''; b.classList.toggle('on', b.dataset.dt === tab); });

  const body = $('#drawerBody');
  let html;
  if (q) html = (await Promise.all(DTABS.map(t => buildTab(t, s)))).join('');
  else html = await buildTab(tab, s);

  if (my !== dseq) return;                     // 期间又渲染过一次，这一份别再盖上去
  const keep = (!toTop && !q && dscrollTab === tab) ? dscroll : 0;
  body.innerHTML = html;

  /* 搜索：把五页铺开后按文字筛，命中的一律展开 */
  if (q) {
    let n = 0;
    $$('.dgrp', body).forEach(g => {
      const hay = (g.textContent + ' ' + (g.dataset.kw || '')).toLowerCase();
      const hit = hay.includes(q);
      g.hidden = !hit;
      if (hit) { n++; g.classList.remove('fold'); }
    });
    $$('.drawer-hint', body).forEach(el => el.remove());
    if (!n) body.innerHTML = `<div class="dempty">${esc(T('searchNone'))}</div>`;
  }
  /* 「当前」范围：把用不上的控件收起来，整组都空了就连组一起藏 */
  if (!q && (s.dscope || 'cur') === 'cur') {
    const m = s.mode;
    $$('[data-modes]', body).forEach(el => {
      if (el.classList.contains('dgrp')) return;
      el.hidden = !el.dataset.modes.split(' ').includes(m);
    });
    $$('.dgrp', body).forEach(g => {
      if (g.dataset.modes && !g.dataset.modes.split(' ').includes(m)) { g.hidden = true; return; }
      const gi = $('.dgi', g); if (!gi) return;
      const live = [...gi.children].filter(k => !(k.hasAttribute('data-modes') && k.hidden));
      if (!live.length) g.hidden = true;
    });
  }
  body.scrollTop = keep;                       // 改设置时停在原地，不跳回顶部
  dscrollTab = q ? null : tab;
  body.onscroll = () => { if (!q) dscroll = body.scrollTop; };

  /* 折叠：直接改 class，不重渲染，才能有过渡动画 */
  const doFold = (b) => {
    const k = b.dataset.fold, sec = b.closest('.dgrp');
    const now = !sec.classList.contains('fold');
    sec.classList.toggle('fold', now); A.fold[k] = now;
  };
  $$('[data-fold]', body).forEach(b => {
    b.onclick = (e) => { if (e.target.closest('[data-tg]')) return; doFold(b); };  // 标题里的开关不连带折叠
    b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doFold(b); } };
  });

  $$('[data-seg2]', body).forEach(b => b.onclick = async () => { await applySetting(b.dataset.seg2, b.dataset.v); renderDrawer(); });
  $$('[data-seg] button', body).forEach(b => b.onclick = async () => {
    const k = b.closest('[data-seg]').dataset.seg;
    if (k.startsWith('pf.')) { await saveProf({ [k.slice(3)]: b.dataset.v }); renderDrawer(); return; }
    if (k.startsWith('bk.')) { A.bk[k.slice(3)] = b.dataset.v; A.bk.msg = ''; renderDrawer(); return; }
    await applySetting(k, b.dataset.v); renderDrawer();
  });
  $$('[data-tg]', body).forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const k = b.dataset.tg;
    const cur = k.startsWith('src.') ? srcVal(k) : deep(A.set, k);
    await applySetting(k, !cur); renderDrawer();
  });
  $$('[data-tin]', body).forEach(i => {
    i.onchange = async () => {
      const k = i.dataset.tin;
      if (k.startsWith('pf.')) { await saveProf({ [k.slice(3)]: i.value }); renderDrawer(); return; }
      /* 口令只留在内存里，一个字都不进存储 */
      if (k.startsWith('bk.')) { A.bk[k.slice(3)] = i.value; return; }
      await applySetting(k, i.value); renderDrawer();
    };
    i.onkeydown = (e) => { if (e.key === 'Enter') i.blur(); e.stopPropagation(); };
  });
  $$('[data-pace]', body).forEach(sl => sl.onchange = async () => {
    const k = sl.dataset.pace;
    if (sl.value === 'custom') { $(`[data-pacebox="${k}"]`, body)?.classList.add('on'); return; }
    await applySetting(k, Number(sl.value)); renderDrawer();
  });
  const readPace = async (k) => {
    const n = Number($(`[data-pacen="${k}"]`, body)?.value) || 0;
    const u = Number($(`[data-paceu="${k}"]`, body)?.value) || 1000;
    if (n > 0) await applySetting(k, Math.min(3600000, Math.max(1000, Math.round(n * u))));
  };
  $$('[data-pacen]', body).forEach(i => i.onchange = () => readPace(i.dataset.pacen));
  $$('[data-paceu]', body).forEach(i => i.onchange = () => readPace(i.dataset.paceu));
  /* 预设 ＋ 自定义数字 */
  $$('[data-nsel]', body).forEach(sl => sl.onchange = async () => {
    const k = sl.dataset.nsel;
    if (sl.value === 'custom') { $(`[data-nbox="${k}"]`, body)?.classList.add('on'); return; }
    await applySetting(k, Number(sl.value)); renderDrawer();
  });
  const readNum = async (k) => {
    const box = $(`[data-nnum="${k}"]`, body); if (!box) return;
    const sel = $(`[data-nsel="${k}"]`, body);
    const n = Number(box.value) || 0;
    const u = Number($(`[data-nunit="${k}"]`, body)?.value) || 1;
    const lo = Number(sel?.dataset.nmin) || 1, hi = Number(sel?.dataset.nmax) || 1e9;
    if (n > 0) await applySetting(k, Math.min(hi, Math.max(lo, Math.round(n * u))));
    renderDrawer();
  };
  $$('[data-nnum]', body).forEach(i => i.onchange = () => readNum(i.dataset.nnum));
  $$('[data-nunit]', body).forEach(i => i.onchange = () => readNum(i.dataset.nunit));
  $$('[data-chk] button', body).forEach(b => b.onclick = async () => {
    const g = b.closest('[data-chk]').dataset.chk, k = b.dataset.k;
    if (g === 'bk.parts') { A.bk.parts[k] = !A.bk.parts[k]; A.bk.msg = ''; renderDrawer(); return; }
    await applySetting(g, { ...A.set[g], [k]: !A.set[g][k] }); renderDrawer();
  });
  $$('[data-sel]', body).forEach(sl => sl.onchange = async () => { await applySetting(sl.dataset.sel, sl.value); renderDrawer(); });
  bindDiag(body);

  /* ---------- 语言 ---------- */
  $$('[data-lang]', body).forEach(sl => sl.onchange = async () => {
    const which = sl.dataset.lang, v = sl.value;
    if (v === '__new') { A.langNew = which; renderDrawer(); setTimeout(() => $('#langNewIn')?.focus(), 60); return; }
    const other = which === 'a' ? A.set.loc.b : A.set.loc.a;
    if (v === other) { toast(T('langSame')); renderDrawer(); return; }
    A.langNew = '';
    await applySetting('loc.' + which, v);
    renderDrawer();
  });
  const newOk = $('#langNewOk', body), newIn = $('#langNewIn', body);
  if (newOk && newIn) {
    const take = async () => {
      const name = S1(newIn.value);
      if (!name) { A.langNew = ''; renderDrawer(); return; }
      const code = LG.customCode(name);
      const which = A.langNew;
      const other = which === 'a' ? A.set.loc.b : A.set.loc.a;
      if (!code || code === other) { toast(T('langSame')); return; }
      A.langNew = '';
      await applySetting('loc.names', { ...(A.set.loc.names || {}), [code]: name });
      await applySetting('loc.' + which, code);
      renderDrawer();
    };
    newOk.onclick = take;
    newIn.onkeydown = (e) => { if (e.key === 'Enter') take(); };
  }
  const goAi = $('#btnLangGoAi', body);
  if (goAi) goAi.onclick = () => { A.fold.ai = false; openDrawer('lib'); setTimeout(() =>
    $('[data-g="ai"]', $('#drawerBody'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260); };

  /* ---------- 翻译 ---------- */
  const trSay = (m) => { const e = $('#trStatus', body); if (e) e.textContent = m; };
  const trRun = $('#btnTrRun', body);
  if (trRun) trRun.onclick = async () => {
    if (A.trAbort) { A.trAbort.abort(); A.trAbort = null; trRun.textContent = T('trRun'); return; }
    const ai = A.set.ai;
    if (!(await AI.askHost(ai.base))) { trSay(T('aiPerm')); return; }
    try { await NET.syncOriginRules(A.set); } catch { }
    A.trAbort = new AbortController();
    trRun.textContent = T('trStop');
    const bar = $('#trBar', body), fillI = $('#trBarI', body), list = $('#trList', body);
    bar?.classList.add('on');
    if (list) { list.innerHTML = ''; list.hidden = false; }
    const langs = [A.set.loc.a, A.set.loc.b];
    const r = await TR.translateWorks({
      works: trWorksOf(A.set.loc.scope), langs, limit: A.set.loc.batch, per: A.set.loc.per,
      note: A.set.ai.note !== false, signal: A.trAbort.signal,
      onProgress: ({ i, n, done, fail, row }) => {
        if (fillI) fillI.style.width = (n ? i / n * 100 : 0).toFixed(1) + '%';
        trSay(`${T('trRunning')} ${i} / ${n} · ${T('trDone')} ${done}${fail ? ` · ${T('trFail')} ${fail}` : ''}`);
        if (row && list) { list.insertAdjacentHTML('beforeend', trRow(row)); list.scrollTop = list.scrollHeight; }
      }
    });
    A.trAbort = null;
    bar?.classList.remove('on');
    trRun.textContent = T('trRun');
    if (!r.ok) { showDiag(r, body, '#trStatus'); return; }
    A.tr = await S.getTr();
    await reloadDaily(true);
    if (r.fail) showDiag(r, body, '#trStatus');
    else trSay(r.done ? `${T('trDone')} ${r.done} ${T('trWorks')}${r.left ? ` · ${T('trPending')} ${r.left}` : ''}` : T('trNothing'));
    if (A.cur) await show(A.byId.get(A.cur.id) || A.cur);
  };
  const trPack = $('#btnTrPack', body);
  if (trPack) trPack.onclick = async () => {
    const ai = A.set.ai;
    if (!(await AI.askHost(ai.base))) { trSay(T('aiPerm')); return; }
    try { await NET.syncOriginRules(A.set); } catch { }
    trPack.disabled = true;
    const bar = $('#trBar', body), fillI = $('#trBarI', body);
    bar?.classList.add('on');
    let bad = null;
    for (const c of [A.set.loc.a, A.set.loc.b]) {
      if (LG.isBuiltin(c)) continue;
      const r = await TR.translatePack(c, {
        onProgress: ({ i, n, done, fail }) => {
          if (fillI) fillI.style.width = (n ? i / n * 100 : 0).toFixed(1) + '%';
          trSay(`${T('trRunning')} · ${langName(c)} ${i} / ${n}${fail ? ` · ${T('trFail')} ${fail}` : ''}`);
        }
      });
      if (r.pack) applyPack(c, r.pack);
      if (!r.ok || r.fail) bad = r;
    }
    bar?.classList.remove('on');
    trPack.disabled = false;
    applyTips(); startClock();
    if (bad) showDiag(bad, body, '#trStatus');
    renderDrawer();
  };
  const trClear = $('#btnTrClear', body);
  if (trClear) trClear.onclick = async () => {
    for (const c of [A.set.loc.a, A.set.loc.b]) if (!LG.isBuiltin(c)) { await S.clearTr(c); await S.clearPack(c); dropPack(c); }
    A.tr = await S.getTr();
    await reloadDaily(true);
    toast(T('trCleared'));
    applyTips(); renderDrawer();
    if (A.cur) await show(A.byId.get(A.cur.id) || A.cur);
  };
  const ms = $('#matScale');
  if (ms) {
    const live = () => {
      const v = Number(ms.value);
      ms.style.setProperty('--fill', ((v - 0.4) / 1.6 * 100).toFixed(1) + '%');
      $('#matScaleVal').textContent = v.toFixed(2) + '×';
      document.body.style.setProperty('--ms', v);
    };
    ms.oninput = live;
    ms.onchange = async () => { await applySetting('matScale', Number(ms.value)); };
    live();
  }

  /* 拖动就看得见、松手才写入。墙色与灯光的四个滑杆共用这一套：
     拖的过程里只改画面，不落存储，也不重绘抽屉 —— 否则手一动面板就闪。 */
  function liveSlider(id, min, max, fmt, paint, key) {
    const el = $('#' + id, body); if (!el) return;
    const show = () => {
      const v = Number(el.value);
      el.style.setProperty('--fill', ((v - min) / (max - min) * 100).toFixed(1) + '%');
      const lab = $('#' + id + 'Val', body); if (lab) lab.textContent = fmt(v);
      paint(v);
    };
    el.oninput = show;
    el.onchange = async () => { await applySetting(key, Number(el.value)); renderDrawer(); };
    show();
  }
  const previewSet = (patch) => {
    const s2 = { ...A.set, ...patch, lamp: { ...A.set.lamp, ...(patch.lamp || {}) } };
    tintWall(s2); applyLight(s2.lamp); wallCap(s2);
    return s2;
  };
  liveSlider('wallSat', 0, 200, pctFmt, v => previewSet({ wallSat: v }), 'wallSat');
  liveSlider('wallTemp', -100, 100, v => signFmt(v, T('cool'), T('warm')), v => previewSet({ wallTemp: v }), 'wallTemp');
  liveSlider('lampBright', 0, 200, pctFmt, v => previewSet({ lamp: { bright: v } }), 'lamp.bright');
  liveSlider('lampAngle', -60, 60, v => v + '°', v => previewSet({ lamp: { angle: v } }), 'lamp.angle');
  liveSlider('lampWarm', -100, 100, v => signFmt(v, T('cool'), T('warm')), v => previewSet({ lamp: { warm: v } }), 'lamp.warm');
  const tr = $('[data-tonereset]', body);
  if (tr) tr.onclick = async () => {
    A.set = await S.setSettings({ wallSat: 100, wallTemp: 0 });
    applyRoom(); renderDrawer();
  };
  /* 自定义色板：取色器拖着就变，色号框失焦或回车才认 */
  const wc = $('[data-wcolor]', body), wh = $('[data-whex]', body);
  const setCustom = async (hex, commit) => {
    const v = TN.normHex(hex, '');
    if (!v) return;
    if (wc) wc.value = v;
    if (wh && document.activeElement !== wh) wh.value = v.toUpperCase();
    previewSet({ wall: 'custom', wallCustom: v });
    if (commit) { await applySetting('wallCustom', v); await applySetting('wall', 'custom'); renderDrawer(); }
  };
  if (wc) {
    wc.oninput = () => setCustom(wc.value, false);
    wc.onchange = () => setCustom(wc.value, true);
  }
  if (wh) {
    wh.onchange = () => setCustom(wh.value, true);
    wh.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); wh.blur(); } };
  }
  bindPickers(body);
  const cA = $('#btnCacheAll'); if (cA) cA.onclick = cacheAll;
  const cC = $('#btnCacheClear'); if (cC) cC.onclick = async () => { await S.cacheClear(); toast(T('done')); renderDrawer(); };
  bindBackup(body);
  /* 已移除：逐幅放回，或一次全放回来 */
  $$('[data-ungone]', body).forEach(b => b.onclick = async () => {
    await unhide(b.dataset.ungone);
    undoBarHide();
    renderDrawer();
    toast(T('hideBack'));
  });
  const gA = $('#btnGoneAll', body);
  if (gA) gA.onclick = async () => {
    A.gone = await S.clearGone();
    A.cat.forEach(w => { w._gone = false; });
    buildList(); resyncIdx(); applyTips(); undoBarHide(); renderDrawer();
    await S.setCursor({ idx: A.idx, at: Date.now(), sig: listSig() });
    toast(T('hideBack'));
  };
  const dN = $('#btnDailyNow');
  if (dN) dN.onclick = async () => {
    dN.disabled = true; dN.textContent = T('caching');
    let n = 0;
    try { n = (await chrome.runtime.sendMessage({ type: 'daily', force: true }))?.added || 0; } catch {}
    if (n) { await reloadDaily(); toast(T('dailyAdded') + ' ' + n); } else toast(T('dailyNoNew'));
    renderDrawer();
  };
  bindLib(body);
  const dC = $('#btnDailyClear');
  if (dC) dC.onclick = async () => { await S.clearDaily(); await reloadDaily(); toast(T('done')); renderDrawer(); };
  bindAI(body);
  const eX = $('#btnExport'); if (eX) eX.onclick = exportCache;
  const oF = $('#btnOpenFolder'); if (oF) oF.onclick = openFolder;
  const cP = $('#btnCopyPath'); if (cP) cP.onclick = () => { navigator.clipboard?.writeText(dbPath()); toast(T('copied')); };
}

/* 接口档：改一个字段就把整份列表写回去。
   密钥与模型顺手记进这个接口的名单里，同一个接口下可以来回换。 */
async function saveProf(patch, opt = {}) {
  if (!opt.keepDiag) A.diag = null;    // 改了接口配置，上一次的诊断就不作数了
  const ai = A.set.ai || {};
  const list = (ai.list || []).map(p => {
    if (p.id !== ai.cur) return p;
    const n = { ...p, ...patch };
    for (const [f, arr] of [['key', 'keys'], ['model', 'models']]) {
      const v = S1(n[f]), had = (n[arr] || []).filter(Boolean);
      n[arr] = v ? [...new Set([...had, v])].slice(-8) : had;
    }
    /* 顺手记一条探测结果：同一个模型只留最新的那一条 */
    if (opt.probe && S1(opt.probe.m)) {
      const rest = (n.probe || []).filter(x => x.m !== opt.probe.m);
      n.probe = [...rest, opt.probe].slice(-60);
    }
    if (Array.isArray(opt.probeAll)) n.probe = opt.probeAll.slice(-60);
    return n;
  });
  await applySetting('ai', { list });
}
/* 从名单里删掉一条；删的正好是在用的那条，就顺位换到下一条 */
async function dropProf(field, v) {
  const ai = A.set.ai || {}, arr = field === 'key' ? 'keys' : 'models';
  const list = (ai.list || []).map(p => {
    if (p.id !== ai.cur) return p;
    const rest = (p[arr] || []).filter(x => x !== v);
    const n = { ...p, [arr]: rest };
    if (n[field] === v) n[field] = rest[0] || '';
    return n;
  });
  await applySetting('ai', { list });
}

/* ---------------- AI 补全的按钮 ---------------- */
function bindAI(body) {
  const say = (t) => { const el = $('#aiStatus', body); if (el) el.textContent = t; };
  const eye = $('#btnAiEye', body);
  if (eye) eye.onclick = () => { A.aiEye = !A.aiEye; renderDrawer(); };

  /* 同一接口下的几把密钥 / 几个模型 */
  $$('[data-pfpick]', body).forEach(b => b.onclick = async (e) => {
    if (e.target.closest('[data-pfdrop]')) return;
    await saveProf({ [b.dataset.pfpick]: b.dataset.v }); renderDrawer();
  });
  $$('[data-pfdrop]', body).forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    await dropProf(b.dataset.pfdrop, b.dataset.v); renderDrawer();
  });

  /* 接口档：新建 / 复制 / 删除 / 切换 */
  const sel = $('#aiProf', body);
  if (sel) sel.onchange = async () => {
    const ai = A.set.ai || {};
    if (sel.value === '__new') {
      const id = 'p' + Date.now().toString(36);
      await applySetting('ai', { list: [...(ai.list || []), { id, name: '', fmt: 'auto', base: '', key: '', model: '' }], cur: id });
    } else await applySetting('ai', { cur: sel.value });
    renderDrawer();
  };
  const dup = $('#btnProfDup', body);
  if (dup) dup.onclick = async () => {
    const ai = A.set.ai || {}, cp = (ai.list || []).find(p => p.id === ai.cur);
    if (!cp) return;
    const id = 'p' + Date.now().toString(36);
    const copy = { ...cp, id, name: (profName(cp) + ' ' + T('copy')).slice(0, 40) };
    await applySetting('ai', { list: [...ai.list, copy], cur: id });
    renderDrawer();
  };
  const del = $('#btnProfDel', body);
  if (del) del.onclick = async () => {
    const ai = A.set.ai || {};
    const list = (ai.list || []).filter(p => p.id !== ai.cur);
    await applySetting('ai', { list, cur: list[0] ? list[0].id : '' });
    toast(T('aiProfGone')); renderDrawer();
  };

  /* 提示词编辑 */
  $$('[data-ppre]', body).forEach(b => b.onclick = () => {
    A.aiPrev = A.aiPrev === b.dataset.ppre ? null : b.dataset.ppre; renderDrawer();
  });
  $$('[data-pdef]', body).forEach(b => b.onclick = async () => {
    await applySetting('ai.p' + b.dataset.pdef, ''); toast(T('done')); renderDrawer();
  });
  const pc = $('#btnAiPcopy', body);
  if (pc) pc.onclick = () => { navigator.clipboard?.writeText($('.aiprev', body)?.textContent || ''); toast(T('copied')); };
  /* 改回和内置一字不差就存空，将来内置文案更新了还能跟着走 */
  const DEF = { 'ai.pSys': AI.DEFAULT_SYS, 'ai.pArt': AI.DEFAULT_ART, 'ai.pAny': AI.DEFAULT_ANY };
  $$('[data-tar]', body).forEach(t => t.onchange = async () => {
    const k = t.dataset.tar, v = t.value.trim();
    await applySetting(k, (!v || v === String(DEF[k] || '').trim()) ? '' : t.value);
    renderDrawer();
  });

  /* 清单里点 ↻：只重来这一张，回来就地换掉那一行 */
  $$('[data-retry]', body).forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const row = b.closest('.airow'); if (!row || b.disabled) return;
    const id = row.dataset.row, box = row.dataset.box;
    b.disabled = true; b.classList.add('spin');
    const before = row.querySelector('.airt b')?.textContent || '';
    const r = await AI.retryOne(id, box);
    if (!r.ok) {
      b.disabled = false; b.classList.remove('spin');
      toast(r.reason === 'perm' ? T('aiPerm') : r.reason === 'busy' ? T('aiBusy')
        : r.reason === 'gone' ? T('aiProfGone') : T('aiNeedCfg'));
      return;
    }
    /* 内存里那份清单也换掉，重渲染时才不会又变回旧的 */
    if (A.aiReport) {
      const i = A.aiReport.findIndex(x => x.id === id && x.box === box);
      if (i >= 0) A.aiReport[i] = r.row;
    }
    row.outerHTML = aiRow(r.row);
    bindAI(body);                                   // 换过的那一行要重新接线
    if (r.row.ok && r.row.now !== before) await reloadDaily(true);
    toast(r.row.ok ? `${T('aiDoneN')} · ${r.row.now}` : String(r.row.err).slice(0, 60));
  });

  const wipe = $('#btnAiWipe', body);
  if (wipe) wipe.onclick = async () => {
    A.aiReport = null; await S.setAIState({ report: [], done: 0, fail: 0, at: 0, err: '' }); renderDrawer();
  };

  const grant = $('#btnAiGrant', body);
  if (grant) grant.onclick = async () => {
    const ok = await AI.askHost(A.set.ai.base);          // 必须在点击里调用
    /* 本机地址：权限到手的这一刻才谈得上改写来源，立刻把规则铺上 */
    if (ok) { try { await NET.syncOriginRules(A.set); } catch { } }
    say(ok ? T('aiGranted') : T('aiDenied'));
    if (ok) renderDrawer();
  };

  const bt = $('#btnAiTest', body);
  if (bt) bt.onclick = async () => {
    const ai = A.set.ai;
    if (!(await AI.askHost(ai.base))) { say(T('aiPerm')); return; }
    try { await NET.syncOriginRules(A.set); } catch { }
    bt.disabled = true; say(T('aiTesting'));
    A.diag = null; $$('.diag', body).forEach(x => x.remove());
    const r = await AI.test(ai);
    bt.disabled = false;
    /* 结果记在**这一档**自己身上：换档、换地址都各算各的 */
    if (r.reach && r.text) {
      await saveProf({ okAt: Date.now(), okText: true, okVision: !!r.vision,
                       okModel: S1(ai.model), okBase: S1(ai.base) },
                     { probe: { m: S1(ai.model), text: true, vision: !!r.vision, at: Date.now(), err: r.vision ? '' : S1(r.msg) } });
    }
    if (r.ok) {
      say(`${T('aiOk')} · ${T('aiOkText')} · ${T('aiOkVision')}（${r.msg}）· ${T('aiOkUnlock')}`);
      renderDrawer();
      return;
    }
    if (r.msg === 'perm') { say(T('aiPerm')); return; }
    /* 文字通了但看不了图：先报好消息，再把识图那一段诊断挂出来 */
    const d = showDiag(r, body, '#aiStatus');
    if (r.reach && r.text) {
      const st = $('#aiStatus', body);
      const good = `${T('aiOkPart')} · ${T('aiOkText')} · ${T('aiOkUnlock')} · ${T('aiNoVision')}`;
      if (st) st.textContent = good;
      if (A.diag) A.diag.msg = good;
    }
    return d;
  };

  /* 文字 / 识图各用哪一档 */
  $$('[data-role]', body).forEach(sl => sl.onchange = async () => {
    await applySetting('ai.' + sl.dataset.role, sl.value);
    renderDrawer();
  });

  /* ---------- 探测模型 ---------- */
  const pb = $('#btnAiProbe', body);
  if (pb) pb.onclick = async () => {
    if (A.pbAbort) { A.pbAbort.abort(); A.pbAbort = null; pb.textContent = T('pbRun'); return; }
    const ai = A.set.ai;
    if (!(await AI.askHost(ai.base))) { say(T('aiPerm')); return; }
    try { await NET.syncOriginRules(A.set); } catch { }
    A.pbOpen = true; A.pbRows = [];
    A.pbAbort = new AbortController();
    pb.textContent = T('trStop');
    renderDrawer();
    const sig = A.pbAbort.signal;
    const bar = () => $('#pbBar', $('#drawerBody')), fill = () => $('#pbBarI', $('#drawerBody'));
    const list = () => $('#pbList', $('#drawerBody'));
    const note = (m) => { const e = $('.pbhead em', $('#drawerBody')); if (e) e.textContent = m; };
    bar()?.classList.add('on');
    note(T('pbListing'));

    /* 先问接口自己有哪些模型；问不到就拿存过的 + 诊断给的候选当种子 */
    const got = await AI.listModels(ai, sig);
    let cand = got.models || [];
    let fromApi = got.ok && cand.length > 0;
    if (!fromApi) {
      const v = DG.vendorOf(ai.base);
      cand = [...new Set([...(A.set.ai.models || []), S1(ai.model), ...((v && v.models) || [])])].filter(Boolean);
      note(got.ok ? T('pbNoList') : T('pbListFail', { e: S1(got.err).slice(0, 60) }));
    }
    /* 排个先后：名字像多模态的先探，明显不是聊天模型的（嵌入、语音、画图）直接跳过 */
    cand = cand.filter(AI.isChatModel);
    cand.sort((a, b) => (AI.looksVision(b) ? 1 : 0) - (AI.looksVision(a) ? 1 : 0));
    const CAP = 14;
    const over = cand.length > CAP;
    cand = cand.slice(0, CAP);
    if (!cand.length) {
      bar()?.classList.remove('on');
      A.pbAbort = null; pb.textContent = T('pbRun');
      note(T('pbNothing'));
      return;
    }

    let i = 0;
    const rows = [];
    await AI.probeModels(ai, cand, {
      signal: sig, concur: Math.max(1, Math.min(3, Number(ai.concur) || 2)),
      onRow: (r) => {
        rows.push(r); A.pbRows = rows.slice();
        i++;
        const f = fill(); if (f) f.style.width = (i / cand.length * 100).toFixed(1) + '%';
        note(T('pbRunning', { i, n: cand.length }));
        const L = list();
        if (L) { L.insertAdjacentHTML('beforeend', pbRow(r, S1(ai.model))); L.scrollTop = L.scrollHeight; }
      }
    });
    bar()?.classList.remove('on');
    A.pbAbort = null;
    /* 存进这一档，下次打开还看得见 */
    await saveProf({}, { probeAll: rows.map(r => ({ m: r.m, text: !!r.text, vision: !!r.vision, at: r.at, err: S1(r.err).slice(0, 120) })) });
    A.pbRows = rows;
    renderDrawer();
    const v = rows.filter(r => r.vision).length, t = rows.filter(r => r.text).length;
    setTimeout(() => {
      const e = $('.pbhead em', $('#drawerBody'));
      if (e) e.textContent = T('pbDone', { n: rows.length, v, t }) + (over ? ' · ' + T('pbCapped', { c: CAP }) : '');
    }, 40);
  };
  const pbWipe = $('#btnPbWipe', body);
  if (pbWipe) pbWipe.onclick = async () => {
    A.pbRows = null; A.pbOpen = false;
    await saveProf({}, { probeAll: [] });
    renderDrawer();
  };

  const redo = $('#btnAiRedo', body);
  if (redo) redo.onclick = async () => {
    redo.disabled = true;
    await AI.clearMarks('all');
    toast(T('aiCleared')); renderDrawer();
  };

  const run = $('#btnAiRun', body);
  if (run) run.onclick = async () => {
    if (A.aiAbort) { A.aiAbort.abort(); A.aiAbort = null; run.textContent = T('aiRun'); return; }
    const ai = A.set.ai;
    if (!(await AI.askHost(ai.base))) { say(T('aiPerm')); return; }
    try { await NET.syncOriginRules(A.set); } catch { }
    A.aiAbort = new AbortController();
    run.textContent = T('aiStop');
    A.aiReport = [];
    const bar = $('#aiBar', body), fillI = $('#aiBarI', body), list = $('#aiList', body), wipeBox = $('#aiWipeBox', body);
    bar?.classList.add('on');
    if (list) { list.innerHTML = ''; list.hidden = false; }
    if (wipeBox) wipeBox.hidden = false;
    const r = await AI.runBatch({
      scope: 'all', signal: A.aiAbort.signal,
      onProgress: ({ i, n, done, fail, row }) => {
        if (fillI) fillI.style.width = (n ? i / n * 100 : 0).toFixed(1) + '%';
        say(`${T('aiRunning')} ${i} / ${n} · ${T('aiDoneN')} ${done}${fail ? ` · ${T('aiFailN')} ${fail}` : ''}`);
        if (row && list) {
          A.aiReport.push(row);
          list.insertAdjacentHTML('beforeend', aiRow(row));
          list.scrollTop = list.scrollHeight;
        }
      }
    });
    A.aiAbort = null;
    bar?.classList.remove('on');
    if (r && (r.err || r.fail) && !A.aiAbort) setTimeout(() => showDiag({ status: r.status || 0, raw: r.raw || r.err,
      msg: $('#aiStatus', body)?.textContent || '' }, body, '#aiStatus'), 30);
    if (r.done) await reloadDaily(true);
    if (r.reason === 'perm') say(T('aiPerm'));
    else if (r.reason === 'busy') say(T('aiBusy'));
    else if (r.reason === 'off') say(T('aiNeedCfg'));
    else if (!r.done && !r.fail) say(T('aiNone'));
    renderDrawer();
  };
}

/* 打开新标签页时悄悄补一批：自定义图库的图片只有页面里读得到 */
let aiTicked = false;
async function aiTick() {
  if (aiTicked) return; aiTicked = true;
  const ai = A.set.ai || {};
  if (!AI.configured(ai)) return;
  if (!(await AI.hasHost(ai.base))) return;
  const [d, l, st] = await Promise.all([S.getDaily(), S.getLocalLib(), S.getAIState()]);
  if (AI.pendingOf(d, l, ai, false).n) {
    const per = Number(ai.sched) > 0 ? Number(ai.sched) * 60000 : Infinity;
    /* 只定时不自动时，按周期来 */
    if (ai.auto || Date.now() - (st.at || 0) >= per) {
      const r = await AI.runBatch({ scope: 'all' });
      if (r.report?.length) A.aiReport = r.report;
      if (r.done) await reloadDaily(true);
    }
  }
  /* 补全有没有活干是一回事，译文有没有欠着是另一回事，分开算 */
  await trTick().catch(() => { });
}

/* 新进来的作品顺手译一遍 —— 开了「作品信息也用这两种语言」才做，
   一轮只译一小批，不跟补全抢时间。 */
async function trTick() {
  const loc = A.set.loc || {};
  if (!loc.tr) return;
  const langs = [loc.a, loc.b].filter(c => c && !LG.isBuiltin(c));
  if (!langs.length) return;
  const ai = A.set.ai || {};
  if (!AI.configured(ai) || !(await AI.hasHost(ai.base))) return;
  const pend = TR.pendingTr(A.cat || [], A.tr, langs, ai.note !== false, false);
  if (!pend.length) return;
  const r = await TR.translateWorks({
    works: A.cat || [], langs, limit: Math.min(Number(loc.batch) || 50, 12),
    per: loc.per, note: ai.note !== false
  });
  if (r.done) {
    A.tr = await S.getTr();
    await reloadDaily(true);
    if (A.cur) await show(A.byId.get(A.cur.id) || A.cur);
  }
}

/* 悬停即时试挂：只改 DOM 属性，不写入存储 */
function previewRoom(k, v) {
  const b = document.body;
  if (k === 'frame') { b.dataset.frame = v; b.dataset.liner = linerFor(v, A.set.matStyle); }
  else if (k === 'matStyle') b.dataset.liner = linerFor(A.set.frame, v);
  else if (k === 'tex') { b.dataset.tex = v; tintWall({ ...A.set, tex: v }); applyLight(A.set.lamp); wallCap({ ...A.set, tex: v }); }
  else if (k === 'wall') { b.dataset.wall = v; tintWall({ ...A.set, wall: v }); applyLight(A.set.lamp); wallCap({ ...A.set, wall: v }); }
}
/* 色卡下面那行常驻的名称条。
   原来是悬停时在色块上方弹一个深色小气泡，深墙上看不清，多行时还挡住上一行的色卡；
   改成固定一行，指到哪读到哪，谁也挡不着谁。 */
function wallCap(s) {
  const nm = $('#wcapName'), hx = $('#wcapHex'); if (!nm) return;
  const own = texBase(s.tex || 'none');
  const w = WALLS.find(x => x.k === s.wall);
  nm.textContent = own ? lx(texDef(s.tex), A.lang) : (s.wall === 'custom' ? T('wallCustom') : (w ? lx(w, A.lang) : ''));
  hx.textContent = wallHexOf(s).toUpperCase();
}
function bindPickers(root) {
  $$('[data-pick]', root).forEach(b => {
    const k = b.dataset.pick, v = b.dataset.k;
    b.onclick = async () => { A.hover = null; await applySetting(k, v); renderDrawer(); };
    b.onmouseenter = () => { A.hover = v; previewRoom(k, v); };
    b.onmouseleave = () => { if (A.hover === v) { A.hover = null; applyRoom(); wallCap(A.set); } };
  });
}

/* 抽屉开合或窗口变化后，重新判断铺满/完整显示 */
function refit() {
  const w = A.cur; if (!w || A.set.mode !== 'immersive') return;
  const el = $('#lay' + A.layer), img = $('img', el);
  const scrolling = w.format === 'scroll' && A.set.scrollPan;
  el.classList.toggle('contain', fitMode(w) === 'contain' && !scrolling);
  el.classList.toggle('scrolling', scrolling);
  if (scrolling) {
    const vw = stageW();
    const bandH = Math.max(140, Math.min(innerHeight * 0.60, (vw * 2.6) / w.img.ar));
    const iw = bandH * w.img.ar;
    img.style.height = bandH + 'px';
    img.style.top = Math.round((innerHeight - bandH) / 2 - innerHeight * 0.06) + 'px';
    img.style.setProperty('--imgw', iw + 'px');
  }
}

const AI_BOOL = ['on', 'forDaily', 'forLocal', 'auto', 'over', 'note', 'split'];
async function applySetting(key, val) {
  /* src.<来源 id>.<字段> 走的不是设置，而是图库那份存储 */
  if (String(key).startsWith('src.')) return applySrc(key, val);
  if (['kenburns', 'autohide', 'workSafe', 'scrollPan', 'newTabAdvance', 'dailyNew', 'localLib', 'filmEdge'].includes(key)) val = !!val;
  if (['intervalMs', 'cacheLimitMB', 'matScale', 'carouselMs', 'filmMs', 'wallSat', 'wallTemp'].includes(key)) val = Number(val);
  /* 嵌套设置（ai.base 这种）写成一层层的补丁，交给 setSettings 深合并 */
  if (String(key).includes('.')) {
    const ks = String(key).split('.');
    if (ks[0] === 'ai' && AI_BOOL.includes(ks[1])) val = !!val;
    if (ks[0] === 'ai' && ['batch', 'concur'].includes(ks[1])) val = Number(val);
    if (ks[0] === 'loc' && ['tr', 'pack'].includes(ks[1])) val = !!val;
    if (ks[0] === 'loc' && ['batch', 'per'].includes(ks[1])) val = Number(val);
    if (ks[0] === 'lamp') val = Number(val);
    let patch = val;
    for (let i = ks.length - 1; i >= 0; i--) patch = { [ks[i]]: patch };
    A.set = await S.setSettings(patch);
    if (ks[0] === 'lamp') { applyRoom(); return; }
    if (ks[0] === 'ai') { try { chrome.runtime.sendMessage({ type: 'ai-arm' }); } catch { } }
    if (ks[0] === 'loc' && ['a', 'b'].includes(ks[1])) { await relang(); return; }
    [A.lang, A.other] = resolveLang(A.set);
    return;
  }
  A.set = await S.setSettings({ [key]: val });
  if (key === 'ai') { try { chrome.runtime.sendMessage({ type: 'ai-arm' }); } catch { } }
  [A.lang, A.other] = resolveLang(A.set);
  document.body.dataset.mode = A.set.mode;
  document.body.dataset.kb = A.set.kenburns ? '1' : '0';
  document.body.dataset.ui = A.set.ui;
  applyRoom();
  applyDir();
  applyTips(); startClock(); startTimer(); armIdle();
  if (key === 'mode') { A.painted = null; MODES.stopLoops(); }
  if (key === 'dailyNew' || key === 'localLib') { await reloadDaily(); A.painted = null; }
  if (['scope', 'order', 'workSafe'].includes(key)) { buildList(); A.idx = 0; A.painted = null; }
  if (['film', 'filmEdge', 'filmRun'].includes(key) && A.set.mode === 'film') A.painted = null;
  if (['carouselMs', 'filmMs'].includes(key)) MODES.applyPace(A.set);
  if (['mode', 'quality', 'lang', 'scope', 'order', 'workSafe', 'scrollPan', 'fit', 'film', 'filmEdge', 'filmRun'].includes(key)) await show(A.list[A.idx] || A.list[0]);
  if (['frame', 'matStyle', 'matScale'].includes(key) && !['wall', 'carousel'].includes(A.set.mode)) {
    A.set = await S.setSettings({ mode: 'wall' }); document.body.dataset.mode = 'wall'; applyRoom(); applyTips();
    await show(A.list[A.idx]);
  }
  if (key === 'clock') setTimeout(refit, 60);
  if (key === 'lang') await relang();
}

/* ============================================================
   换语言：装卸语言包、重排书写方向、把画面上的字全部重刷一遍
   ============================================================ */
async function relang() {
  const before = [A.lang, A.other];
  [A.lang, A.other] = resolveLang(A.set);
  const want = new Set([A.lang, A.other].filter(c => !LG.isBuiltin(c)));
  /* 不再用到的语言包从内存里卸掉 —— 词表上挂着一堆用不到的语言只会碍事 */
  for (const c of before) if (c && !want.has(c) && !LG.isBuiltin(c)) dropPack(c);
  const packs = await S.getPacks();
  for (const c of want) if (!hasPack(c) && packs[c]) applyPack(c, packs[c]);
  applyDir(); applyTips(); startClock();
  A.painted = null;
  if (A.cur) await show(A.list[A.idx] || A.cur);
  else buildList();
}

/* 待译件数：按选定的范围数一数 */
function trWorksOf(scope) {
  const all = A.cat || [];
  if (scope === 'builtin') return all.filter(w => !w.daily && !w.local);
  if (scope === 'daily') return all.filter(w => w.daily);
  if (scope === 'local') return all.filter(w => w.local);
  return all;
}

/* 浏览器为本扩展分配的 IndexedDB 实际路径 */
function dbPath() {
  const id = globalThis.chrome?.runtime?.id || '<extension-id>';
  const ua = navigator.userAgent;
  const leaf = `IndexedDB/chrome-extension_${id}_0.indexeddb.leveldb`;
  if (/Windows/i.test(ua)) return `%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\${leaf.replace(/\//g, '\\')}`;
  if (/Mac OS X|Macintosh/i.test(ua)) return `~/Library/Application Support/Google/Chrome/Default/${leaf}`;
  return `~/.config/google-chrome/Default/${leaf}`;
}

const EXPORT_DIR = 'Corridor Gallery';
/* chrome.downloads 对文件名很挑剔：统一转成安全的 ASCII */
function safeName(str, fallback = '') {
  let s = String(str ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')       // 去掉重音符号
    .replace(/[\u2010-\u2015\u2212]/g, '-')                 // 各种连字符 → -
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '')
    .replace(/约\s*/g, 'c.').replace(/世纪/g, 'C').replace(/之后/g, '').replace(/年代?/g, '')
    .replace(/[^\x20-\x7E]/g, '')                            // 其余非 ASCII 丢弃
    .replace(/[\\/:*?"<>|~#%{}\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ').replace(/^[\s.\-]+|[\s.\-]+$/g, '').slice(0, 80);
  return s || fallback;
}

/* 把已缓存的作品逐张写成 .jpg，存入 下载/Corridor Gallery */
async function exportCache() {
  const btn = $('#btnExport'); if (!btn || btn.disabled) return;
  const entries = await S.cacheList();
  const best = new Map();                                  // 每幅作品取最大的一份
  for (const e of entries) {
    if (!e.id) continue;
    const cur = best.get(e.id);
    if (!cur || e.size > cur.size) best.set(e.id, e);
  }
  if (!best.size) { toast(T('noCache')); return; }
  btn.disabled = true;
  let n = 0;
  for (const [id, e] of best) {
    const w = A.byId.get(id); if (!w) continue;
    const blob = await S.cacheGet(e.url); if (!blob) continue;
    const url = URL.createObjectURL(blob);
    const yr = safeName(w.year);
    const fn = `${EXPORT_DIR}/${safeName(w.artist.en, 'Unknown')} - ${safeName(w.title.en, w.id)}${yr ? ` (${yr})` : ''}.jpg`;
    try {
      const dlId = await chrome.downloads.download({ url, filename: fn, conflictAction: 'overwrite', saveAs: false });
      A.lastDl = dlId; trackDownload(dlId, url); n++;
    } catch (e) { URL.revokeObjectURL(url); console.warn('export failed', fn, e); }
    btn.textContent = `${T('exporting')} ${n}/${best.size}`;
    await new Promise(r => setTimeout(r, 70));
  }
  if (A.lastDl != null) await S.setSettings({ lastDownloadId: A.lastDl });
  btn.disabled = false;
  toast(T('exported', { n }));
  renderDrawer();
}
const dlUrls = new Map();
function trackDownload(id, url) {
  dlUrls.set(id, url);
  if (trackDownload._on) return;
  trackDownload._on = true;
  chrome.downloads.onChanged.addListener(d => {
    if (d.state && (d.state.current === 'complete' || d.state.current === 'interrupted')) {
      const u = dlUrls.get(d.id);
      if (u) { URL.revokeObjectURL(u); dlUrls.delete(d.id); }
    }
  });
}
/* 一键在系统文件管理器里打开导出目录（Windows 资源管理器 / macOS 访达 / Linux 文件管理器） */
async function openFolder() {
  const id = A.lastDl ?? (await S.getSettings()).lastDownloadId;
  try {
    if (id != null) { chrome.downloads.show(id); return; }
  } catch {}
  try { chrome.downloads.showDefaultFolder(); }
  catch { toast(T('noCache')); }
}

async function cacheAll() {
  const btn = $('#btnCacheAll'); if (!btn) return;
  btn.disabled = true;
  const pool = A.cat.filter(w => !(A.set.workSafe && w.mature));
  let done = 0;
  for (const w of pool) {
    const url = imgUrl(w, pickSize(w, targetWidthFor(w, A.set.mode)));
    try { if (!await S.cacheHas(url)) await S.fetchImage(url, { id: w.id }); } catch {}
    done++;
    btn.textContent = `${T('caching')} ${done}/${pool.length}`;
    if (done % 6 === 0) { const st = await S.cacheStats(); if (st.bytes > A.set.cacheLimitMB * 1048576) break; }
  }
  toast(T('cacheDone')); renderDrawer();
}

/* ============================================================
   文案与提示
   ============================================================ */
function applyTips() {
  const set = (id, k) => { const e = $(id); if (e) e.dataset.tip = T(k); };
  set('#btnPrev', 'prev'); set('#btnNext', 'next'); set('#btnZoom', 'zoom');
  set('#btnInfo', 'info'); set('#btnLib', 'library'); set('#btnSet', 'settings');
  set('#btnDl', 'download'); set('#btnHide', 'hide');
  $('#btnMode').dataset.tip = T('mode') + ': ' + T('mode_' + A.set.mode);
  $('#btnMode').innerHTML = `<svg><use href="#i-m-${A.set.mode}"></use></svg>`;
  $('#libQ').placeholder = T('search');
  $('#libReset').textContent = T('reset');
  const tabs = $$('#libTabs button');
  tabs[0].textContent = T('all');
  tabs[1].textContent = T('favorites') + (A.favs.length ? ' ' + A.favs.length : '');
  tabs[2].textContent = T('history');
  if (tabs[3]) {
    tabs[3].textContent = T('daily') + (A.daily ? ' ' + A.daily : '');
    tabs[3].style.display = A.set.dailyNew ? '' : 'none';
  }
  if (tabs[4]) {
    tabs[4].textContent = T('myLib') + (A.lib ? ' ' + A.lib : '');
    tabs[4].style.display = (A.set.localLib && A.lib) ? '' : 'none';
  }
  $('.brand b').textContent = T('brandA');
  $('.brand i').textContent = T('brandB');
  updateFavBtn();
}

/* ============================================================
   事件
   ============================================================ */
function wire() {
  $('#btnPrev').onclick = () => go(-1);
  $('#btnNext').onclick = () => go(1);
  $('#hotL').onclick = () => go(-1);
  $('#hotR').onclick = () => go(1);
  $('#btnPlay').onclick = () => { A.paused = !A.paused; MODES.setPaused(A.paused); startTimer(); toast(A.paused ? T('pause') : T('play')); };
  $('#btnFav').onclick = async () => {
    if (!A.cur) return;
    const added = await S.toggleFav(A.cur.id);
    A.favs = await S.getFavs(); updateFavBtn(); applyTips();
    toast(added ? T('favAdded') : T('favRemoved'));
  };
  $('#btnHide').onclick = () => hideCurrent();
  $('#btnZoom').onclick = () => A.cur && zoomOpen(A.cur);
  $('.frame-wrap').onclick = () => A.cur && zoomOpen(A.cur);
  $$('.imm-img').forEach(i => i.onclick = () => { if (A.set.mode === 'immersive') A.cur && zoomOpen(A.cur); });
  $('#btnInfo').onclick = () => { if (!A.cur) return; renderInfo(A.cur); openSheet('#infoSheet'); };
  $('#btnDl').onclick = () => A.cur && download(A.cur);
  $('#zDl').onclick = () => A.cur && download(A.cur);
  $('#btnLib').onclick = () => { renderFilters(); renderGrid(); openSheet('#libSheet'); $('#libQ').focus(); };
  $('#btnSet').onclick = () => drawerOpen() ? closeDrawer() : openDrawer();
  $('#btnMode').onclick = () => { const o = MODE_KEYS; applySetting('mode', o[(o.indexOf(A.set.mode) + 1) % o.length]); };
  $('#drawerReset').onclick = async () => {
    A.set = await S.resetSettings(); [A.lang, A.other] = resolveLang(A.set);
    document.body.dataset.mode = A.set.mode; document.body.dataset.kb = '1';
    applyRoom(); buildList(); applyTips(); startClock(); startTimer();
    await show(A.list[A.idx] || A.list[0]);
    renderDrawer(true); toast(T('resetOk'));
  };
  const sc = $('#dscope');
  if (sc) $$('button', sc).forEach(b => b.onclick = async () => { await applySetting('dscope', b.dataset.v); renderDrawer(true); });
  const lab = $('#label');
  /* 点墙签＝翻面：转到侧面那一瞬换内容，宽度的变化也就藏在这一瞬里 */
  if (lab) lab.onclick = () => {
    if (lab.classList.contains('flipping')) return;
    A.labFlip = !A.labFlip;
    lab.classList.add('flipping');
    setTimeout(() => { if (A.cur) paintLabel(A.cur); }, 245);
    setTimeout(() => lab.classList.remove('flipping'), 520);
  };
  const bt = $('#btnTheme');
  if (bt) bt.onclick = async () => { await applySetting('ui', A.set.ui === 'light' ? 'dark' : 'light'); renderDrawer(); };
  const dq = $('#dq'), dqx = $('#dqx');
  if (dq) {
    const run = () => { A.dq = dq.value; renderDrawer(true); };
    dq.oninput = run;
    dq.onkeydown = (e) => { if (e.key === 'Escape') { dq.value = ''; run(); } e.stopPropagation(); };
    if (dqx) dqx.onclick = () => { dq.value = ''; A.dq = ''; renderDrawer(true); dq.focus(); };
  }
  $('#btnDaily').onclick = () => openReveal();
  $('#rvClose').onclick = closeSheets;
  $('#drawerClose').onclick = closeDrawer;
  $$('#dtabs button').forEach(b => b.onclick = async () => {
    A.dtab = b.dataset.dt;
    if (A.dtab === 'room' && !['wall', 'carousel'].includes(A.set.mode)) await applySetting('mode', 'wall');
    renderDrawer(true);
  });
  $('#drawer').addEventListener('mouseleave', () => { if (A.hover) { A.hover = null; applyRoom(); wallCap(A.set); } });
  $('#libReset').onclick = async () => {
    A.set = await S.setSettings({ filters: { movements: [], regions: [], tags: [], hues: [], countries: [], artists: [], eraMin: null, eraMax: null, q: '' } });
    A.libQ = ''; $('#libQ').value = ''; renderFilters(); renderGrid();
  };
  $$('#libTabs button').forEach(b => b.onclick = () => {
    $$('#libTabs button').forEach(x => x.classList.remove('on')); b.classList.add('on');
    A.libTab = b.dataset.t; renderFilters(); renderGrid();
  });
  let qT; $('#libQ').oninput = e => { clearTimeout(qT); qT = setTimeout(() => { A.libQ = e.target.value; renderGrid(); }, 160); };
  $$('[data-close]').forEach(b => b.onclick = closeSheets);
  $$('.sheet').forEach(s => s.addEventListener('mousedown', e => { if (e.target === s) closeSheets(); }));

  /* 缩放交互 */
  const st = $('#zoomStage');
  st.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY); }, { passive: false });
  st.addEventListener('dblclick', () => Z.scale > Z.min * 1.05 ? zoomFit() : zoomAt(3, innerWidth / 2, innerHeight / 2));
  let drag = null;
  st.addEventListener('pointerdown', e => { drag = { x: e.clientX - Z.x, y: e.clientY - Z.y }; st.setPointerCapture(e.pointerId); st.classList.add('drag'); });
  st.addEventListener('pointermove', e => { if (!drag) return; Z.x = e.clientX - drag.x; Z.y = e.clientY - drag.y; clampZ(); applyZ(); });
  st.addEventListener('pointerup', () => { drag = null; st.classList.remove('drag'); });
  st.addEventListener('pointercancel', () => { drag = null; st.classList.remove('drag'); });
  $('#zIn').onclick = () => zoomAt(1.5, innerWidth / 2, innerHeight / 2);
  $('#zOut').onclick = () => zoomAt(1 / 1.5, innerWidth / 2, innerHeight / 2);
  $('#zFit').onclick = zoomFit;

  /* 键盘 */
  addEventListener('keydown', e => {
    if (e.target.matches('input,select,textarea')) {
      /* Esc 先退出输入。框里本来就是空的（比如藏品库一打开就聚焦、还没打字的搜索框），
         那这一下顺手把面板一起关掉——不然看着像 Esc 失灵：面板还开着，
         而 i / z / m / 空格 又都被「有面板开着」挡住，得按第二次才活过来。
         框里有字就只退出输入，再按一次才关。 */
      if (e.key === 'Escape') {
        e.target.blur();
        if (!e.target.value && $$('.sheet.open').length) { e.preventDefault(); closeSheets(); }
      }
      return;
    }
    const open = $$('.sheet.open').length > 0;
    switch (e.key) {
      case 'ArrowRight': case 'j': if (!Z.on) { e.preventDefault(); go(1); } break;
      case 'ArrowLeft': case 'k': if (!Z.on) { e.preventDefault(); go(-1); } break;
      case 'Escape': if (open) { e.preventDefault(); closeSheets(); } else if (drawerOpen()) { e.preventDefault(); closeDrawer(); } break;
      case ' ': if (!open) { e.preventDefault(); A.paused = !A.paused; startTimer(); } break;
      /* 字母快捷键一律 preventDefault：藏品库一打开就把焦点给了搜索框，
         不拦住的话这个字母会接着被打进那个框里（按 L 打开，框里就先躺了个 l）。
         上面已经把「焦点在输入框里」的情况提前 return 掉了，这里拦不到正常打字。 */
      case 'f': case 'F': e.preventDefault(); $('#btnFav').click(); break;
      case 'z': case 'Z': if (!open) { e.preventDefault(); $('#btnZoom').click(); } break;
      case 'i': case 'I': if (!open) { e.preventDefault(); $('#btnInfo').click(); } break;
      case 'l': case 'L': if (!open) { e.preventDefault(); $('#btnLib').click(); } break;
      case 's': case 'S': if (!open) { e.preventDefault(); $('#btnSet').click(); } break;
      case 'c': case 'C': if (!open) { e.preventDefault(); applySetting('clock', A.set.clock === 'off' ? 'bar' : A.set.clock === 'bar' ? 'grand' : 'off'); } break;
      case 'm': case 'M': if (!open) { e.preventDefault(); $('#btnMode').click(); } break;
      case 'd': case 'D': if (A.cur) { e.preventDefault(); download(A.cur); } break;
      case 'x': case 'X': if (!open) { e.preventDefault(); hideCurrent(); } break;
    }
  });
  ['mousemove', 'keydown', 'wheel', 'pointerdown'].forEach(ev => addEventListener(ev, armIdle, { passive: true }));
  $('#stage').addEventListener('wheel', e => {
    if (Z.on || $$('.sheet.open').length) return;
    if (MODES.modeWheel(A.set.mode, e.deltaY)) e.preventDefault();
  }, { passive: false });
  $('#masonry').addEventListener('pointerover', e => { if (e.target.closest('.mcell')) MODES.modeHover('masonry', true); });
  $('#masonry').addEventListener('pointerout', e => { if (e.target.closest('.mcell') && !e.relatedTarget?.closest?.('.mcell')) MODES.modeHover('masonry', false); });
  document.addEventListener('corridor:jump', e => jumpTo(e.detail));
  document.addEventListener('corridor:set', e => applySetting(e.detail.k, e.detail.v));
  let rzT; addEventListener('resize', () => { if (Z.on) zoomFit(); clearTimeout(rzT); rzT = setTimeout(() => { refit(); MODES.relayout(A.set.mode); }, 240); }, { passive: true });
  addEventListener('beforeunload', () => A.objUrls.forEach(u => URL.revokeObjectURL(u)));
}

function buildCatalog(all) {
  const gone = new Set(A.gone || []);
  A.cat = all.map(w => ({
    ...w,
    _gone: gone.has(w.id),
    _hue: hueKeyOf(w.vis.accent),
    _country: (w.place?.zh || '').split(' ')[0],
    _search: [w.title.zh, w.title.en, w.artist.zh, w.artist.en, w.museum?.zh, w.museum?.en,
              w.place?.zh, w.place?.en, w.year, label(MOVEMENTS, w.movement, 'zh'), label(MOVEMENTS, w.movement, 'en'),
              ...(w.tags || []), COUNTRIES[(w.place?.zh || '').split(' ')[0]] || ''].filter(Boolean).join(' ').toLowerCase()
  }));
  A.byId = new Map(A.cat.map(w => [w.id, w]));
}

/* 每日新作变动后，重建目录与播放列表 */
const mergeAll = (cat, daily, lib, set) => applyTr(cat
  .concat(set.dailyNew ? (daily.works || []) : [])
  .concat(set.localLib ? (lib.works || []) : []));

/* ---------------- 译文覆盖层 ----------------
   译文单独存一层，不写回作品本身 —— 内置馆藏是只读的静态 JSON，
   每日新作与自定义图库也不该被译文撑大。这里在建目录时把它并进来：
   双语字段直接多长一个语言键（于是 tx() 一个字都不用改），
   年代与生卒这类平铺的短语挂到 w.tr[语言码] 上，由 dtw() 去取。
   ---------------------------------------- */
const TR_OBJ = ['title', 'artist', 'medium', 'museum', 'place', 'look', 'note'];
const TR_FLAT = ['year', 'life'];
function applyTr(list) {
  const tr = A.tr;
  if (!tr || !Object.keys(tr).length) return list;
  return list.map(w => {
    const m = tr[w.id];
    if (!m) return w;
    const out = { ...w, tr: {} };
    for (const [lg, rec] of Object.entries(m)) {
      if (!rec) continue;
      for (const k of TR_OBJ) {
        const v = S1(rec[k]);
        if (!v) continue;
        out[k] = { ...(out[k] || {}), [lg]: v };
      }
      const flat = {};
      for (const k of TR_FLAT) if (S1(rec[k])) flat[k] = S1(rec[k]);
      if (Object.keys(flat).length) out.tr[lg] = flat;
    }
    return out;
  });
}

/* 书写方向与 <html lang>：换成阿拉伯语、希伯来语这类要从右往左排 */
function applyDir() {
  const el = document.documentElement;
  el.lang = LG.intlOf(A.lang);
  const d = LG.dirOf(A.lang);
  el.dir = d;
  document.body.dataset.dir = d;
  /* 墙签与图注按它此刻显示的那种语言排；两种方向不同的语言并排时不会打架 */
  const lab = $('#label');
  if (lab) lab.dir = LG.dirOf(A.labFlip ? A.other : A.lang);
}

/* 每日新作或自定义图库变动后，重建目录与播放列表 */
async function reloadDaily(keepView = false) {
  const [cat, daily, lib] = await Promise.all([
    fetch(rt('data/catalog.json')).then(r => r.json()), S.getDaily(), S.getLocalLib()
  ]);
  A.daily = (daily.works || []).length; A.fresh = daily.fresh || 0;
  A.lib = (lib.works || []).length;
  A.libSrcs = lib.srcs || [];
  A.libName = A.libSrcs.map(x => x.name || hostOf(x.url)).filter(Boolean).join(' · ');
  buildCatalog(mergeAll(cat, daily, lib, A.set));
  buildList(); applyTips(); paintSeal();
  if (!keepView && !A.byId.get(A.cur?.id)) await show(A.list[0]);
}

/* ============================================================
   启动
   ============================================================ */
async function init() {
  const [cat, set, favs, hist, cur, daily, lib, tr, packs, gone] = await Promise.all([
    fetch(rt('data/catalog.json')).then(r => r.json()),
    S.getSettings(), S.getFavs(), S.getHistory(), S.getCursor(), S.getDaily(), S.getLocalLib(),
    S.getTr(), S.getPacks(), S.getGone()
  ]);
  S.setLocalReader(LOCAL.readFile);
  A.set = set; A.tr = tr || {}; [A.lang, A.other] = resolveLang(set); A.favs = favs; A.hist = hist; A.gone = gone;
  /* 界面语言包：非中英的语言，文案是模型译好存在本机的，这里灌回词表 */
  for (const [c, pk] of Object.entries(packs || {})) if (c === A.lang || c === A.other) applyPack(c, pk);
  A.daily = (daily.works || []).length; A.fresh = daily.fresh || 0;
  A.lib = (lib.works || []).length;
  A.libSrcs = lib.srcs || [];
  A.libName = A.libSrcs.map(x => x.name || hostOf(x.url)).filter(Boolean).join(' · ');
  buildCatalog(mergeAll(cat, daily, lib, set));

  document.body.dataset.mode = set.mode;
  document.body.dataset.kb = set.kenburns ? '1' : '0';
  document.body.dataset.ui = set.ui;
  applyRoom();
  applyDir();

  // 随机种子每天一换，保证同一天各标签页顺序一致
  A.seed = hashStr('corridor' + new Date().toDateString());
  buildList();

  // 恢复游标：按设定的间隔决定是否前进
  A.idx = 0;
  if (cur && cur.sig === listSig() && Number.isInteger(cur.idx)) {
    A.idx = cur.idx % A.list.length;
    const ms = A.set.intervalMs;
    if (A.set.newTabAdvance) A.idx = (A.idx + 1) % A.list.length;
    else if (ms > 0) { const n = Math.floor((Date.now() - (cur.at || 0)) / ms); if (n > 0) A.idx = (A.idx + n) % A.list.length; }
  } else if (A.set.newTabAdvance || A.set.order === 'shuffle') {
    A.idx = Math.floor(Math.random() * A.list.length);
  }
  await S.setCursor({ idx: A.idx, at: Date.now(), sig: listSig() });

  MODES.setupModes({
    S, A, imgUrl, pickSize, stageW, esc, tx, dt, dtw, capHTML,
    T, jumpTo, setIndex,
    zoomCurrent: () => A.cur && zoomOpen(A.cur)
  });
  MODES.applyPace(A.set);
  wire(); applyTips(); startClock(); startTimer(); armIdle(); paintSeal();
  await show(A.list[A.idx]);

  if (!A.set.seenFirstRun) { setTimeout(() => toast(T('firstRun')), 900); S.setSettings({ seenFirstRun: true }); }
  if (!navigator.onLine) toast(T('offline'));
  setTimeout(() => { if (!document.hidden) aiTick().catch(() => { }); }, 6000);
}
init().catch(err => {
  console.error(err);
  $('#boot').innerHTML = `<div class="b" style="max-width:460px;text-align:center"><b>CORRIDOR</b>
    <p style="color:#8b857a;font-size:13px;line-height:1.8;margin-top:18px">${esc(String(err && err.message || err))}</p></div>`;
});
