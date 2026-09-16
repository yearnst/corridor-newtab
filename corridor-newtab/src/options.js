import { t, lx, FRAMES, LINERS, WALLS, WALLGROUPS, TEXTURES, TEXGROUPS, applyPack } from './i18n.js';
import * as S from './store.js';
import * as LG from './langs.js';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let set, lang = 'zh', other = 'en', total = 0;
const T = (k, v) => t(lang, k, v);
/* 跟新标签页里一套规则：母语 / 外语两个位置，界面跟其中一个走 */
function resolveLang(st) {
  const a = String(st?.loc?.a || 'zh'), b = String(st?.loc?.b || (a === 'en' ? 'zh' : 'en'));
  if (st?.lang === 'native') return [a, b];
  if (st?.lang === 'foreign') return [b, a];
  const g = LG.guess();
  const near = (c) => (c === g ? 2 : (String(c).split('-')[0] === String(g).split('-')[0] ? 1 : 0));
  return near(b) > near(a) ? [b, a] : [a, b];
}
/* 界面语言包：非中英的语言，文案是模型译好存在本机的 */
async function loadPacks() {
  const ps = await S.getPacks();
  for (const [c, pk] of Object.entries(ps || {})) if (c === lang || c === other) applyPack(c, pk);
}
function applyDir() {
  const el = document.documentElement;
  el.lang = LG.intlOf(lang);
  el.dir = LG.dirOf(lang);
  document.body.dataset.dir = LG.dirOf(lang);
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), 1800); }
const row = (l, s, c) => `<div class="row"><div class="lab"><b>${esc(l)}</b>${s ? `<span>${esc(s)}</span>` : ''}</div>${c}</div>`;
const block = (l, s, c) => `<div class="row" style="display:block"><div class="lab" style="margin-bottom:8px"><b>${esc(l)}</b>${s ? `<span>${esc(s)}</span>` : ''}</div>${c}</div>`;
const seg = (id, o, cur) => `<div class="seg" data-seg="${id}">${o.map(x => `<button data-v="${esc(x.v)}" class="${String(x.v) === String(cur) ? 'on' : ''}">${esc(x.t)}</button>`).join('')}</div>`;
const tg = (id, on) => `<button class="sw-toggle${on ? ' on' : ''}" data-tg="${id}" role="switch" aria-checked="${!!on}"></button>`;
function dbPath() {
  const id = globalThis.chrome?.runtime?.id || '<extension-id>';
  const ua = navigator.userAgent;
  const leaf = `IndexedDB/chrome-extension_${id}_0.indexeddb.leveldb`;
  if (/Windows/i.test(ua)) return `%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\${leaf.replace(/\//g, '\\')}`;
  if (/Mac OS X|Macintosh/i.test(ua)) return `~/Library/Application Support/Google/Chrome/Default/${leaf}`;
  return `~/.config/google-chrome/Default/${leaf}`;
}
/* 与新标签页抽屉保持一致 */
const INTERVALS = [
  { v: 0, k: 'intervalManual' }, { v: 60000, n: 1, u: 'min' }, { v: 300000, n: 5, u: 'min' },
  { v: 900000, n: 15, u: 'min' }, { v: 1500000, n: 25, u: 'min', tag: 'pomodoro' },
  { v: 3600000, n: 1, u: 'hour' }, { v: 21600000, n: 6, u: 'hour' }, { v: 86400000, n: 1, u: 'day' }
];
const PACES = [0, 3000, 5000, 10000, 15000, 30000, 60000, 180000, 300000, 600000, 1800000];
const ivTxt = (v) => v === 0 ? T('intervalOff')
  : v < 60000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)} ${T('sec')}`
  : `${(v / 60000).toFixed(v % 60000 ? 1 : 0)} ${T('minute')}`;
const paceOpts = (cur) => PACES.concat(PACES.includes(cur) ? [] : [cur])
  .sort((a, b) => a - b).map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(ivTxt(v))}</option>`).join('');
const TEXCHIP = { level5:220, rollmatt:180, skimtrowel:200, venetian:210, marmorino:195, stucco:150,
  microcement:185, diatom:140, eggshell:200, hessian:90, linen:74, silk:110, velvet:140,
  damask:210, brocatelle:200, felt:150, blackbox:130, ledwall:96, microperf:105, projection:130,
  concrete:260, wood:270, travertine:220, brick:150, sandstone:145,
  brushed:200, brass:210, copper:195, corten:225, blacksteel:205, goldleaf:190 };

async function render() {
  const st = await S.cacheStats();
  const ver = globalThis.chrome?.runtime?.getManifest?.().version || '';
  const ivOpts = INTERVALS.map(o => ({ v: o.v, t: o.k ? T(o.k) : `${o.n} ${T(o.u)}${o.tag ? ' · ' + T(o.tag) : ''}` }));
  $('#hName').textContent = T('appName');
  $('#hLead').textContent = T('optLead');
  $('#body').innerHTML =
    row(T('lang'), T('optLangHint'), seg('lang', [
      { v: 'native', t: LG.nameOf(set.loc.a, set.loc.names) },
      { v: 'foreign', t: LG.nameOf(set.loc.b, set.loc.names) },
      { v: 'auto', t: T('langUIAuto') }], set.lang)) +
    row(T('mode'), '', `<select class="sel" data-sel="mode">${['wall', 'carousel', 'film', 'immersive', 'masonry'].map(k => `<option value="${k}"${set.mode === k ? ' selected' : ''}>${esc(T('mode_' + k))}</option>`).join('')}</select>`) +

    `<div class="sectitle">${esc(T('interval'))}</div>` +
    row(T('newTab'), T('newTabDesc'), tg('newTabAdvance', set.newTabAdvance)) +
    row(T('timed'), T('timedDesc'), `<select class="sel" data-sel="intervalMs">${ivOpts.map(o => `<option value="${o.v}"${String(o.v) === String(set.intervalMs) ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`) +
    row(T('carInt'), T('carIntDesc'), `<select class="sel" data-sel="carouselMs">${paceOpts(set.carouselMs)}</select>`) +
    row(T('filmInt'), T('filmIntDesc'), `<select class="sel" data-sel="filmMs">${paceOpts(set.filmMs)}</select>`) +
    row(T('order'), '', seg('order', [{ v: 'shuffle', t: T('shuffle') }, { v: 'sequential', t: T('sequential') }], set.order)) +
    row(T('quality'), '', `<select class="sel" data-sel="quality">${[['auto', 'qAuto'], ['saver', 'qSaver'], ['high', 'qHigh'], ['max', 'qMax']].map(([v, k]) => `<option value="${v}"${set.quality === v ? ' selected' : ''}>${esc(T(k))}</option>`).join('')}</select>`) +
    row(T('workSafe'), '', tg('workSafe', set.workSafe)) +
    row(T('daily'), T('dailyDesc'), tg('dailyNew', set.dailyNew)) +
    row(T('localLib'), T('localDesc'), tg('localLib', set.localLib)) +
    `<div class="row" style="display:block"><div class="lab"><b>${esc(T('ai'))}</b>
      <span>${esc(T('aiDesc'))}</span></div>
      <div class="lab" style="margin-top:7px"><span>${esc(T('aiOptHint'))}</span></div></div>` +

    `<div class="sectitle">${esc(T('mode_wall'))}</div>` +
    block(T('frame'), '', `<div class="pickrow">${FRAMES.map(f => `<button class="frchip${set.frame === f.k ? ' on' : ''}" data-pick="frame" data-k="${f.k}" data-frame="${f.k}">
       <span class="fp"><span class="mat-p"><i></i></span></span><b>${esc(lx(f, lang))}</b></button>`).join('')}</div>`) +
    row(T('mat'), '', seg('matStyle', LINERS.map(l => ({ v: l.k, t: lx(l, lang) })), set.matStyle)) +
    block(T('matWidth'), T('matWidthDesc'),
      `<div class="slider"><input type="range" id="matScale" min="0.4" max="2" step="0.05" value="${set.matScale}"
         style="--fill:${((set.matScale - 0.4) / 1.6 * 100).toFixed(1)}%"><b id="matScaleVal">${set.matScale.toFixed(2)}×</b></div>`) +
    block(T('wall'), '', `<div class="wallpick">${WALLGROUPS.map(g => {
      const items = WALLS.filter(w => w.g === g.k);
      return items.length ? `<div class="wglab">${esc(lx(g, lang))}</div><div class="dotrow">${
        items.map(w => `<button class="wdot${set.wall === w.k ? ' on' : ''}" data-pick="wall" data-k="${w.k}"
          style="background:${w.c}" title="${esc(lx(w, lang))}" aria-label="${esc(lx(w, lang))}"></button>`).join('')}</div>` : '';
    }).join('')}</div>`) +
    block(T('tex'), '', TEXGROUPS.map(g => {
      const items = TEXTURES.filter(x => x.g === g.k);
      return items.length ? `<div class="texglab">${esc(lx(g, lang))}</div><div class="texgrid">${items.map(x => `<button class="texchip${set.tex === x.k ? ' on' : ''}" data-pick="tex" data-k="${x.k}">
         <u style="${x.k === 'none' ? '' : `background-image:url(/assets/tex/${x.k}.webp);background-size:${TEXCHIP[x.k] || 90}px${x.base ? `;background-color:${x.base}` : ''}`}"></u>
         <s>${esc(lx(x, lang))}</s></button>`).join('')}</div>` : '';
    }).join('')) +
    `<div class="sectitle">${esc(T('mode_film'))}</div>` +
    row(T('filmStyle'), T('filmStyleDesc'), seg('film', ['positive','negative','bw','slide','cine'].map(k => ({ v: k, t: T('film_' + k) })), set.film)) +
    row(T('filmRun'), '', seg('filmRun', [{ v: 'glide', t: T('filmGlide') }, { v: 'step', t: T('filmStep') }], set.filmRun)) +
    row(T('filmEdge'), T('filmEdgeDesc'), tg('filmEdge', set.filmEdge)) +

    row(T('kenburns'), '', tg('kenburns', set.kenburns)) +
    row(T('clock'), '', seg('clock', [{ v: 'off', t: T('clockOff') }, { v: 'bar', t: T('clockBar') }, { v: 'grand', t: T('clockGrand') }], set.clock)) +

    `<div class="sectitle">${esc(T('cache'))}</div>
     <div class="row"><div class="lab"><b>${esc(T('cached'))} ${st.works} / ${total} ${esc(T('works'))}</b>
       <span>${esc(T('cacheDesc'))}</span>
       <span style="margin-top:6px">${esc(T('cacheSize'))}: ${fmt(st.bytes)} / ${set.cacheLimitMB} MB</span>
       <div class="cachebar"><i style="width:${Math.min(100, st.bytes / (set.cacheLimitMB * 1048576) * 100).toFixed(1)}%"></i></div>
       <span style="margin-top:8px"><b>${esc(T('evict'))}</b> — ${esc(T('evictDesc'))}</span></div>
       <div style="display:flex;gap:8px"><button class="bigbtn pri" id="pf">${esc(T('cacheAll'))}</button>
       <button class="bigbtn" id="cl">${esc(T('cacheClear'))}</button></div></div>` +
    row(T('cacheLimit'), '', `<select class="sel" data-sel="cacheLimitMB">${[200, 400, 600, 1000, 2000].map(v => `<option value="${v}"${set.cacheLimitMB === v ? ' selected' : ''}>${v} MB</option>`).join('')}</select>`) +
    `<div class="row" style="display:block"><div class="lab"><b>${esc(T('cachePath'))}</b><span>${esc(T('cachePathDesc'))}</span></div>
       <div class="pathbox"><code>${esc(dbPath())}</code><button id="cp">${esc(T('copyPath'))}</button></div>
       <div style="display:flex;gap:8px;margin-top:11px"><button class="bigbtn" id="of">${esc(T('openFolder'))}</button></div></div>` +

    `<div class="sectitle">Chrome</div>
     <div class="hintbox"><b>${esc(T('footerTitle'))}</b><br>${esc(T('footerDesc'))}
       <ol><li>${esc(T('footerStep1'))}</li><li>${esc(T('footerStep2'))}</li></ol></div>` +
    `<div class="row"><div class="lab"><b>${esc(T('resetAll'))}</b></div><button class="bigbtn" id="rs">${esc(T('reset'))}</button></div>` +

    `<div class="sectitle">${esc(T('about'))}</div>
     <div class="about"><span class="an">长廊 CORRIDOR</span>
       ${esc(T('version'))} <b>${esc(ver)}</b><br>
       ${esc(T('author'))} <b>Charles Chern</b> · <b>@yearnst</b><br>
       <span class="alinks">
         <a href="https://yearnst.github.io/corridor-newtab/" target="_blank" rel="noopener noreferrer">${esc(T('siteHome'))}</a>
         <a href="https://github.com/yearnst/corridor-newtab" target="_blank" rel="noopener noreferrer">${esc(T('siteRepo'))}</a>
       </span>
       <span style="display:block;margin-top:8px">${esc(T('credits'))}</span>
       <span style="display:block;margin-top:6px;opacity:.8">© ${new Date().getFullYear()} Charles Chern · MIT License</span></div>`;

  $$('[data-seg] button').forEach(b => b.onclick = () => save(b.closest('[data-seg]').dataset.seg, b.dataset.v));
  $$('[data-tg]').forEach(b => b.onclick = () => save(b.dataset.tg, !set[b.dataset.tg]));
  $$('[data-sel]').forEach(s => s.onchange = () => save(s.dataset.sel, s.value));
  $$('[data-pick]').forEach(b => b.onclick = () => save(b.dataset.pick, b.dataset.k));
  const ms = $('#matScale');
  if (ms) {
    ms.oninput = () => {
      const v = Number(ms.value);
      ms.style.setProperty('--fill', ((v - 0.4) / 1.6 * 100).toFixed(1) + '%');
      $('#matScaleVal').textContent = v.toFixed(2) + '×';
    };
    ms.onchange = () => save('matScale', Number(ms.value));
  }
  $('#cp').onclick = () => { navigator.clipboard?.writeText(dbPath()); toast(T('copied')); };
  $('#of').onclick = async () => {
    const id = (await S.getSettings()).lastDownloadId;
    try { if (id != null) return chrome.downloads.show(id); } catch {}
    try { chrome.downloads.showDefaultFolder(); } catch {}
  };
  $('#cl').onclick = async () => { await S.cacheClear(); toast(T('done')); render(); };
  $('#rs').onclick = async () => { set = await S.resetSettings(); [lang, other] = resolveLang(set); applyDir(); render(); toast(T('resetOk')); };
  $('#pf').onclick = async () => {
    const b = $('#pf'); b.disabled = true; b.textContent = T('caching');
    try { await chrome.runtime.sendMessage({ type: 'prefetch', limit: 40 }); } catch {}
    b.disabled = false; toast(T('cacheDone')); render();
  };
}
async function save(k, v) {
  if (['workSafe', 'kenburns', 'newTabAdvance', 'dailyNew', 'localLib', 'filmEdge'].includes(k)) v = !!v;
  if (['intervalMs', 'cacheLimitMB', 'matScale', 'carouselMs', 'filmMs'].includes(k)) v = Number(v);
  set = await S.setSettings({ [k]: v }); [lang, other] = resolveLang(set);
  await loadPacks(); applyDir();
  document.body.dataset.frame = set.frame;
  render();
}
(async () => {
  set = await S.getSettings(); [lang, other] = resolveLang(set);
  await loadPacks(); applyDir();
  document.body.dataset.frame = set.frame;
  try { total = (await (await fetch(chrome.runtime.getURL('data/catalog.json'))).json()).length; } catch { total = 106; }
  render();
})();
