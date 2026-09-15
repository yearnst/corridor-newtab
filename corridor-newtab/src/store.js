// 设置、收藏、历史 与 本地图片缓存 / settings, favourites, history and the local image cache

export const DEFAULTS = {
  /* 长廊只认两个语言位置：母语（loc.a）与外语（loc.b）。
     lang 说的是「界面跟谁走」：native 母语 | foreign 外语 | auto 跟系统在两者间挑。
     旧版本存的 'zh' / 'en' 会在归一化时迁到新写法上。 */
  lang: 'native',
  loc: {
    a: 'zh',                  // 母语
    b: 'en',                  // 外语
    names: {},                // 自定义语言的显示名：{ 'x-xxx': '闽南话' }
    tr: false,                // 作品信息也补这两种语言（要先把接口测通）
    scope: 'all',             // 译哪些：all | builtin 内置馆藏 | daily 每日新作 | local 自定义图库
    batch: 50,                // 一轮译几件
    pack: true,               // 界面文案也一并译（选了非内置语言时自动打开）
    per: 4                    // 一次请求打包几件作品
  },
  ui: 'dark',                 // 设置面板的配色：dark | light
  dscope: 'cur',              // 设置只列当前呈现模式用得上的（cur），还是全都列出来（all）
  mode: 'wall',          // immersive | wall | film  【默认展墙；胶卷作第三种呈现方式】
  intervalMs: 1500000,        // 25 min（番茄钟）；0 = 仅手动
  newTabAdvance: true,        // 每次打开新标签页换一幅
  order: 'shuffle',           // shuffle | sequential
  scope: 'all',               // all | fav | filter
  quality: 'auto',            // auto | saver | high | max
  fit: 'smart',               // smart | cover | contain  沉浸式画面适配
  frame: 'ebony',             // laurel|salon|baroque|rococo|ebony|walnut|oak|boxblack|thingold|float|none
  wall: 'terracotta',         // 墙面颜色（custom = 用下面这个自定义色）
  wallCustom: '#8A4B36',      // 自定义色板
  wallSat: 100,               // 墙色饱和度 0–200%
  wallTemp: 0,                // 墙色色温 -100 冷 … +100 暖
  tex: 'velvet',              // 墙面纹理
  /* 灯光：射灯打在墙上的样子。角度同时决定投影方向与纹理的受光面。 */
  lamp: { bright: 100,        // 亮度 0–200%
          angle: -18,         // -60 左 … +60 右（默认对上贴图烘焙的左上光）
          warm: 0,            // -100 冷白 … +100 暖黄
          n: 1 },             // 灯数 0–4（0 = 不打灯）
  matStyle: 'mount',          // auto|linen|mount|wide|none
  matScale: 0.9,              // 留白宽度倍率 0.4–2.0
  kenburns: true,
  autohide: true,
  /* 勾选＝静止几秒后淡出。分得细一点，每一项对应画面上一处实实在在的东西 */
  hideParts: { chrome: true, clock: false, counter: true,
               title: false, artist: false, meta: false, museum: false,
               look: true, palette: true },
  carouselMs: 15000,          // 环形长廊每格停留；0 = 不自动转
  filmMs: 3000,               // 胶卷走带节拍（默认 3 秒一格）；0 = 停带
  film: 'positive',         // 胶片风格
  filmEdge: true,             // 片边字与格号
  filmRun: 'step',            // glide 连续走带 | step 逐格（默认逐格：走完就停住，画面不飘）
  clock: 'bar',               // off | bar | grand
  workSafe: true,
  scrollPan: true,
  cacheLimitMB: 400,
  dailyNew: true,             // 每天从 Wikimedia Commons 补几幅新作
  dailyN: 3,                  // 每天补几幅
  localLib: true,             // 自定义图库是否参与展览
  /* AI 补全：用你自己的多模态模型给每日新作与自定义图库补字段。
     base 或 model 留空＝不启用，两个图库沿用原来的规则。 */
  ai: {
    on: false,
    /* 可以存好几套接口，随时下拉切换；下面 fmt/base/key/model 是「当前这套」的
       只读镜像，读设置时自动同步，别直接写 */
    /* 每一档：{ id, name, fmt, base, key, model, keys[], models[],
                  okAt/okText/okVision/okModel —— 这一档实测出来的本事，
                  probe[] —— 探测过的模型清单 [{m, text, vision, at, err}] } */
    list: [],
    cur: '',                  // 设置面板里正在看的那一档
    /* 文字（翻译、界面语言包）与识图（作品补全）可以各用各的接口。
       split 关着＝两件事都用 cur 那一档。 */
    split: false,
    useText: '', useVision: '',
    fmt: 'auto',              // auto | openai | anthropic
    base: '', key: '', model: '',
    forDaily: true,           // 补每日新作
    forLocal: true,           // 补自定义图库
    auto: true,               // 新作品入库后立刻补
    sched: 'daily',           // off | 6h | daily
    rename: 'auto',           // auto 只换机器起的名 | always 总是重写 | never 不动标题
    retry: 1,                 // 失败重试几次；0 不重试，-1 直至成功（最多 30 轮）
    over: false,              // 覆盖已有字段
    note: true,               // 连长文介绍一起生成
    batch: 20,                // 一轮最多补几张
    concur: 2,                // 并发
    temp: 0.2, gap: 250,
    /* 三份提示词，留空＝用 ai.js 里内置的那份 */
    pSys: '', pArt: '', pAny: '',
    /* 下面这几个是「当前这一档」的只读镜像，跟 fmt/base/key/model 一样，
       读设置时自动同步，别直接写 */
    okAt: 0, okText: false, okVision: false, okModel: ''
  },
  lastDownloadId: null,
  filters: { movements: [], countries: [], regions: [], tags: [], hues: [], artists: [], eraMin: null, eraMax: null, q: '' },
  seenFirstRun: false
};

const SYNC_KEYS = ['settings'];

/* ---------------- chrome.storage helpers ---------------- */
const area = () => (globalThis.chrome?.storage?.local) || memoryArea();
function memoryArea() {           // 让页面在非扩展环境下也能跑（调试用）
  globalThis.__mem = globalThis.__mem || {};
  return {
    get: (k) => Promise.resolve(typeof k === 'string' ? { [k]: globalThis.__mem[k] } : Object.fromEntries(Object.keys(k || globalThis.__mem).map(x => [x, globalThis.__mem[x]]))),
    set: (o) => { Object.assign(globalThis.__mem, o); return Promise.resolve(); },
    remove: (k) => { delete globalThis.__mem[k]; return Promise.resolve(); }
  };
}

const FRAME_ALIAS = { gilt: 'laurel', florentine: 'salon', steel: 'thingold', aluminium: 'thingold',
                     champagne: 'thingold', black: 'ebony', wood: 'walnut' };
export async function getSettings() {
  const { settings } = await area().get('settings');
  const s = deepMerge(structuredClone(DEFAULTS), settings || {});
  if (FRAME_ALIAS[s.frame]) s.frame = FRAME_ALIAS[s.frame];      // 兼容旧版本存下的画框名
  if (typeof s.showClock === 'boolean') { s.clock = s.showClock ? 'bar' : 'off'; delete s.showClock; }
  if (s.mode === 'hall') s.mode = 'wall';                // v1.6 移除虚拟展厅
  if (['plaster'].includes(s.tex)) s.tex = 'venetian';
  if (s.tex === 'latex') s.tex = 'rollmatt';        // v1.5 起由「哑光滚涂」取代
  if (s.intervalMs === -1) { s.newTabAdvance = true; s.intervalMs = 0; }
  /* 语言：从旧的 auto|zh|en 迁到「母语 / 外语 + 界面跟谁」 */
  s.loc = Object.assign(structuredClone(DEFAULTS.loc), s.loc || {});
  if (s.lang === 'zh' || s.lang === 'en') {
    /* 原来界面是哪种，哪种就是母语；另一种顺位当外语。这样迁完界面一个字都不变 */
    if (!settings?.loc) { s.loc.a = s.lang; s.loc.b = s.lang === 'zh' ? 'en' : 'zh'; }
    s.lang = 'native';
  }
  if (!['auto', 'native', 'foreign'].includes(s.lang)) s.lang = 'auto';
  const LC = (v, d) => { v = String(v || '').trim().slice(0, 32); return /^[A-Za-z][\w-]*$|^x-[\w-]+$/.test(v) ? v : d; };
  s.loc.a = LC(s.loc.a, 'zh');
  s.loc.b = LC(s.loc.b, s.loc.a === 'en' ? 'zh' : 'en');
  if (s.loc.b === s.loc.a) s.loc.b = s.loc.a === 'en' ? 'zh' : 'en';
  if (!s.loc.names || typeof s.loc.names !== 'object') s.loc.names = {};
  s.loc.names = Object.fromEntries(Object.entries(s.loc.names).filter(([k, v]) => /^x-/.test(k) && v)
    .slice(0, 12).map(([k, v]) => [k, String(v).slice(0, 40)]));
  if (!['all', 'builtin', 'daily', 'local'].includes(s.loc.scope)) s.loc.scope = 'all';
  s.loc.batch = Math.min(2000, Math.max(1, Math.round(Number(s.loc.batch) || 50)));
  s.loc.per = Math.min(10, Math.max(1, Math.round(Number(s.loc.per) || 4)));
  s.loc.tr = !!s.loc.tr; s.loc.pack = !!s.loc.pack;
  if (!['dark', 'light'].includes(s.ui)) s.ui = 'dark';
  if (!['cur', 'all'].includes(s.dscope)) s.dscope = 'cur';
  s.dailyN = Math.min(12, Math.max(1, Math.round(Number(s.dailyN) || 3)));
  s.matScale = Math.min(2, Math.max(0.4, Number(s.matScale) || 1));
  /* 墙色：自定义色板与两个微调。色号只认 #rgb / #rrggbb，别的一律回默认 */
  const HEX = (v, d) => {
    v = String(v || '').trim();
    if (/^[0-9a-f]{3}$/i.test(v) || /^[0-9a-f]{6}$/i.test(v)) v = '#' + v;
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map(c => c + c).join('');
    return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d;
  };
  s.wallCustom = HEX(s.wallCustom, '#8a4b36');
  const clampN = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  s.wallSat = clampN(s.wallSat, 0, 200, 100);
  s.wallTemp = clampN(s.wallTemp, -100, 100, 0);
  s.lamp = Object.assign(structuredClone(DEFAULTS.lamp), (s.lamp && typeof s.lamp === 'object') ? s.lamp : {});
  s.lamp.bright = clampN(s.lamp.bright, 0, 200, 100);
  s.lamp.angle = clampN(s.lamp.angle, -60, 60, -18);
  s.lamp.warm = clampN(s.lamp.warm, -100, 100, 0);
  s.lamp.n = clampN(s.lamp.n, 0, 4, 1);
  if (typeof s.mat === 'boolean') { s.matStyle = s.mat ? 'auto' : 'none'; delete s.mat; }
  if (!['off', 'bar', 'grand'].includes(s.clock)) s.clock = 'off';
  if (!s.hideParts || typeof s.hideParts !== 'object') s.hideParts = { ...DEFAULTS.hideParts };
  const hp = s.hideParts;
  /* 老版本只有 chrome / info / look / palette 四项，拆开落到细项上 */
  if (hp.info !== undefined) {
    for (const k of ['title', 'artist', 'meta', 'museum']) if (hp[k] === undefined) hp[k] = !!hp.info;
    delete hp.info;
  }
  if (hp.counter === undefined) hp.counter = !!hp.chrome;
  for (const k of Object.keys(DEFAULTS.hideParts)) hp[k] = hp[k] === undefined ? DEFAULTS.hideParts[k] : !!hp[k];
  for (const k of Object.keys(hp)) if (!(k in DEFAULTS.hideParts)) delete hp[k];
  /* 自定义时间也要收得住：0（不自动）或 1 秒 – 60 分钟 */
  const pace = (v, d) => { v = Number(v); return v === 0 ? 0 : (Number.isFinite(v) && v >= 1000 && v <= 3600000) ? Math.round(v) : d; };
  s.carouselMs = pace(s.carouselMs, 15000);
  s.filmMs = pace(s.filmMs, 3000);
  if (!['positive', 'negative', 'bw', 'slide', 'cine'].includes(s.film)) s.film = 'positive';
  if (!['glide', 'step'].includes(s.filmRun)) s.filmRun = 'glide';
  s.filmEdge = !!s.filmEdge;
  if (!['immersive', 'wall', 'masonry', 'carousel', 'film'].includes(s.mode)) s.mode = 'wall';
  const a = s.ai = Object.assign(structuredClone(DEFAULTS.ai), s.ai || {});
  const FMT = ['auto', 'openai', 'anthropic'];
  a.list = (Array.isArray(a.list) ? a.list : []).filter(x => x && typeof x === 'object').slice(0, 16)
    .map((p, i) => {
      /* 一个接口下可以存好几把密钥、好几个模型；key / model 是「现在用的那个」 */
      const uniq = (a, cur) => [...new Set([...(Array.isArray(a) ? a : []).map(x => String(x || '').trim()),
        String(cur || '').trim()].filter(Boolean))].slice(0, 8);
      const key = String(p.key || '').trim(), model = String(p.model || '').trim();
      /* 「测试连接」的结果记在这一档自己身上：换了地址就作废，换了模型只作废识图那一项
         （文字那一关跟具体型号关系不大，识图则完全取决于型号） */
      const base = String(p.base || '').trim();
      let okAt = Math.max(0, Math.round(Number(p.okAt) || 0));
      let okText = !!p.okText, okVision = !!p.okVision;
      const okModel = String(p.okModel || '').slice(0, 80);
      const okBase = String(p.okBase || '').slice(0, 200);
      if (okAt && okBase && okBase !== base) { okAt = 0; okText = false; okVision = false; }
      if (okVision && okModel && okModel !== model) okVision = false;
      /* 探测过的模型：{ m 模型名, text 文字行不行, vision 识图行不行, at, err } */
      const probe = (Array.isArray(p.probe) ? p.probe : []).filter(x => x && x.m).slice(0, 60)
        .map(x => ({ m: String(x.m).slice(0, 80), text: !!x.text, vision: !!x.vision,
                     at: Math.max(0, Math.round(Number(x.at) || 0)), err: String(x.err || '').slice(0, 120) }));
      return {
        id: String(p.id || 'p' + (i + 1)).slice(0, 24),
        name: String(p.name || '').trim().slice(0, 40),
        fmt: FMT.includes(p.fmt) ? p.fmt : 'auto',
        base,
        key, model,
        keys: uniq(p.keys, key),
        models: uniq(p.models, model),
        okAt, okText, okVision, okModel: okAt ? (okModel || model) : '', okBase: okAt ? (okBase || base) : '',
        probe
      };
    });
  /* 从 v1.12.x 的单份配置升上来：原来那套变成第一档 */
  if (!a.list.length && (String(a.base || '').trim() || String(a.model || '').trim()))
    a.list = [{ id: 'p1', name: '', fmt: FMT.includes(a.fmt) ? a.fmt : 'auto',
      base: String(a.base).trim(), key: String(a.key || '').trim(), model: String(a.model).trim(),
      keys: [String(a.key || '').trim()].filter(Boolean), models: [String(a.model).trim()].filter(Boolean) }];
  if (!a.list.some(p => p.id === a.cur)) a.cur = a.list[0] ? a.list[0].id : '';
  const cp = a.list.find(p => p.id === a.cur);          // 当前这套，镜像到平铺字段上
  a.fmt = cp ? cp.fmt : 'auto'; a.base = cp ? cp.base : '';
  a.key = cp ? cp.key : ''; a.model = cp ? cp.model : '';
  a.okAt = cp ? cp.okAt : 0; a.okText = cp ? cp.okText : false;
  a.okVision = cp ? cp.okVision : false; a.okModel = cp ? cp.okModel : '';
  /* 文字 / 识图各用哪一档：指到不存在的档上就退回 cur */
  a.split = !!a.split;
  for (const k of ['useText', 'useVision']) {
    a[k] = String(a[k] || '').slice(0, 24);
    if (!a.list.some(p => p.id === a[k])) a[k] = '';
  }
  /* 定时补全从 off/6h/daily 改成了分钟数 */
  if (a.sched === 'off') a.sched = 0;
  else if (a.sched === '6h') a.sched = 360;
  else if (a.sched === 'daily') a.sched = 1440;
  a.sched = Math.min(43200, Math.max(0, Math.round(Number(a.sched) || 0)));
  if (a.sched && a.sched < 15) a.sched = 15;
  if (!['auto', 'always', 'never'].includes(a.rename)) a.rename = 'auto';
  for (const k of ['on', 'forDaily', 'forLocal', 'auto', 'over', 'note']) a[k] = !!a[k];
  a.batch = Math.min(2000, Math.max(1, Math.round(Number(a.batch) || 20)));
  a.concur = Math.min(8, Math.max(1, Math.round(Number(a.concur) || 2)));
  a.retry = Math.min(20, Math.max(-1, Math.round(Number(a.retry) || 0)));
  a.temp = Math.min(1, Math.max(0, Number(a.temp) ?? 0.2));
  a.gap = Math.min(5000, Math.max(0, Math.round(Number(a.gap) || 0)));
  for (const k of ['pSys', 'pArt', 'pAny']) a[k] = String(a[k] || '').slice(0, 8000);
  return s;
}
export async function setSettings(patch) {
  const cur = await getSettings();
  const next = deepMerge(cur, patch);
  await area().set({ settings: next });
  return getSettings();          // 再走一遍归一化：切换接口档后镜像字段要立刻跟上
}
export async function resetSettings() {
  await area().set({ settings: structuredClone(DEFAULTS) });
  return structuredClone(DEFAULTS);
}
function deepMerge(a, b) {
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = deepMerge(a[k] && typeof a[k] === 'object' ? a[k] : {}, b[k]);
    else a[k] = b[k];
  }
  return a;
}

/* ---------------- favourites & history ---------------- */
export async function getFavs() { return (await area().get('favs')).favs || []; }
export async function toggleFav(id) {
  const favs = await getFavs();
  const i = favs.indexOf(id);
  if (i >= 0) favs.splice(i, 1); else favs.unshift(id);
  await area().set({ favs });
  return i < 0;             // true = 新加入
}
/* ---------------- 已移除 ----------------
   收藏的反面。点了「去除」的作品不再参与轮换，藏品库里也不显示 ——
   但只是一份 id 名单，作品本身一个字都没动：设置里随时逐幅或一键放回来。
   所以它存的是「我不想再看见这幅」，不是「删掉这幅」。 */
export async function getGone() { return (await area().get('gone')).gone || []; }
export async function addGone(id) {
  const gone = await getGone();
  if (gone.includes(id)) return gone;
  const next = [id, ...gone].slice(0, 4000);
  await area().set({ gone: next });
  return next;
}
export async function unGone(id) {
  const gone = (await getGone()).filter(x => x !== id);
  await area().set({ gone });
  return gone;
}
export async function clearGone() { await area().set({ gone: [] }); return []; }

export async function getHistory() { return (await area().get('history')).history || []; }
export async function pushHistory(id) {
  let h = await getHistory();
  h = [{ id, at: Date.now() }, ...h.filter(x => x.id !== id)].slice(0, 300);
  await area().set({ history: h });
  return h;
}
export async function clearHistory() { await area().set({ history: [] }); }

/* 播放游标：跨标签页保持顺序 */
/* 每日新作：{ day, at, frontier:[分类], works:[作品] } */
export async function getDaily() {
  const d = (await area().get('daily')).daily;
  return { day: '', at: 0, frontier: [], works: [], ...(d || {}) };
}
export async function setDaily(d) { await area().set({ daily: d }); }
export async function clearDaily() { await area().set({ daily: { day: '', at: 0, frontier: [], works: [] } }); }

/* ---------------- 自定义图库 ----------------
   { at, srcs:[…], works:[…] }
   srcs 一条一个来源：
     { id, kind:'dir'|'url', name, url?, at, n, err, f:{inc,exc,rx,ext[],minPx} }
   文件夹来源的目录句柄另存在 corridor-fs 库里，按 id 分开放。
   老版本存的是 { name, at, works }（只有一个文件夹），读的时候迁成第一个来源，
   id 就叫 root —— 正好跟老句柄的键对上，用户不用重新授权。
   ---------------------------------------- */
const LIB_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp'];
function normSrc(x, i) {
  const s = x && typeof x === 'object' ? x : {};
  const kind = s.kind === 'url' ? 'url' : 'dir';
  const f = (s.f && typeof s.f === 'object') ? s.f : {};
  const ext = (Array.isArray(f.ext) ? f.ext : LIB_EXTS)
    .map(v => String(v || '').toLowerCase().replace(/^\./, '')).filter(v => LIB_EXTS.includes(v));
  return {
    id: String(s.id || 's' + (i + 1)).slice(0, 24),
    kind,
    name: String(s.name || '').slice(0, 60),
    url: kind === 'url' ? String(s.url || '').slice(0, 500) : '',
    at: Math.max(0, Math.round(Number(s.at) || 0)),
    n: Math.max(0, Math.round(Number(s.n) || 0)),
    err: String(s.err || '').slice(0, 160),
    on: s.on === undefined ? true : !!s.on,
    f: {
      inc: String(f.inc || '').slice(0, 200),
      exc: String(f.exc || '').slice(0, 200),
      rx: !!f.rx,
      ext: ext.length ? ext : LIB_EXTS.slice(),
      minPx: Math.min(4000, Math.max(0, Math.round(Number(f.minPx) ?? 200)))
    }
  };
}
export async function getLocalLib() {
  const d = (await area().get('locallib')).locallib || {};
  const out = { at: Number(d.at) || 0, srcs: [], works: Array.isArray(d.works) ? d.works : [] };
  if (Array.isArray(d.srcs) && d.srcs.length) out.srcs = d.srcs.slice(0, 12).map(normSrc);
  else if (String(d.name || '') || out.works.length) {
    /* 从「一个文件夹」升上来 */
    out.srcs = [normSrc({ id: 'root', kind: 'dir', name: d.name || '', at: d.at || 0, n: out.works.length }, 0)];
  }
  /* 老作品没有 sid，补上；顺带把老的 local:<路径> 补成 local:root|<路径> */
  const only = out.srcs.length === 1 ? out.srcs[0].id : '';
  for (const w of out.works) {
    if (!w.sid) w.sid = only || 'root';
    if (typeof w.img?.base === 'string' && w.img.base.startsWith('local:') && !w.img.base.includes('|')) {
      const p = w.img.base.slice(6);
      w.img.base = w.img.full = 'local:' + (w.sid || 'root') + '|' + p;
    }
  }
  /* 每个来源当下有多少张，以 works 为准 */
  for (const s of out.srcs) s.n = out.works.filter(w => w.sid === s.id).length;
  return out;
}
export async function setLocalLib(d) {
  const srcs = (Array.isArray(d.srcs) ? d.srcs : []).slice(0, 12).map(normSrc);
  const works = Array.isArray(d.works) ? d.works : [];
  await area().set({ locallib: { at: Number(d.at) || Date.now(), srcs, works } });
}
export async function clearLocalLib() { await area().set({ locallib: { at: 0, srcs: [], works: [] } }); }
/* 换掉某一个来源的作品，别的来源原样留着 */
export async function setLibSource(src, works) {
  const lib = await getLocalLib();
  const i = lib.srcs.findIndex(x => x.id === src.id);
  const s = normSrc({ ...src, at: Date.now(), n: (works || []).length }, i < 0 ? lib.srcs.length : i);
  if (i < 0) lib.srcs.push(s); else lib.srcs[i] = s;
  const rest = lib.works.filter(w => w.sid !== s.id);
  await setLocalLib({ at: Date.now(), srcs: lib.srcs, works: rest.concat(works || []) });
  return getLocalLib();
}
export async function dropLibSource(id) {
  const lib = await getLocalLib();
  await setLocalLib({ at: Date.now(), srcs: lib.srcs.filter(x => x.id !== id),
                      works: lib.works.filter(w => w.sid !== id) });
  return getLocalLib();
}

/* AI 补全的运行记录：{ at, done, fail, left, err, ms }，和设置分开存，免得互相盖 */
export async function getAIState() {
  const d = (await area().get('aistate')).aistate;
  return { at: 0, done: 0, fail: 0, left: 0, err: '', ms: 0, lock: 0, tok: '', report: [], ...(d || {}) };
}
export async function setAIState(p) {
  const c = await getAIState();
  await area().set({ aistate: { ...c, ...p } });
}

/* ---------------- 译文 ----------------
   作品的译文不写回原作品，单独放一层「覆盖层」：
     tr = { <作品id>: { <语言码>: { title, artist, medium, museum, place, look, note } } }
   这样内置馆藏（静态 JSON，改不了）、每日新作、自定义图库三处都能用同一套办法，
   换语言不动原库，想清掉一句话的事。

   界面文案包另存一份：
     packs = { <语言码>: { at, n, ui:{…}, mv:{…}, rg:{…}, tg:{…}, hue:{…}, wall:{…}, tex:{…}, liner:{…} } }
   ---------------------------------------- */
export async function getTr() { return (await area().get('tr')).tr || {}; }
export async function setTr(t) { await area().set({ tr: t || {} }); }
export async function mergeTr(patch) {
  const t = await getTr();
  for (const [id, byLang] of Object.entries(patch || {})) {
    t[id] = Object.assign(t[id] || {}, byLang);
  }
  await area().set({ tr: t });
  return t;
}
/* 清译文：不给语言码就全清 */
export async function clearTr(lang) {
  if (!lang) { await area().set({ tr: {} }); return; }
  const t = await getTr();
  for (const id of Object.keys(t)) { delete t[id][lang]; if (!Object.keys(t[id]).length) delete t[id]; }
  await area().set({ tr: t });
}
export async function trStats() {
  const t = await getTr();
  const by = {};
  for (const m of Object.values(t)) for (const k of Object.keys(m)) by[k] = (by[k] || 0) + 1;
  return { works: Object.keys(t).length, by };
}

export async function getPacks() { return (await area().get('packs')).packs || {}; }
export async function getPack(lang) { return (await getPacks())[lang] || null; }
export async function setPack(lang, pack) {
  const ps = await getPacks();
  ps[lang] = pack;
  /* 语言包不小，只留最近用过的 8 种 */
  const keys = Object.entries(ps).sort((a, b) => (b[1]?.at || 0) - (a[1]?.at || 0)).slice(0, 8).map(x => x[0]);
  await area().set({ packs: Object.fromEntries(keys.map(k => [k, ps[k]])) });
}
export async function clearPack(lang) {
  const ps = await getPacks();
  if (lang) delete ps[lang]; else { await area().set({ packs: {} }); return; }
  await area().set({ packs: ps });
}

export async function getCursor() { return (await area().get('cursor')).cursor || null; }
export async function setCursor(c) { await area().set({ cursor: c }); }

/* ---------------- IndexedDB 图片缓存 ----------------
   两个 store：images 只放 blob，meta 只放 {size, used, id}。
   统计和淘汰都只读 meta，几百兆的图片不会因为「算一下占用」被整个读进内存。
   ---------------------------------------------------- */
const DB_NAME = 'corridor-cache', DB_VER = 2, STORE = 'images', META = 'meta';
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'url' });
        s.createIndex('used', 'used');
      }
      if (!d.objectStoreNames.contains(META)) {
        const m = d.createObjectStore(META, { keyPath: 'url' });
        m.createIndex('used', 'used');
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
function tx(mode) { return db().then(d => d.transaction(STORE, mode).objectStore(STORE)); }
function mtx(mode) { return db().then(d => d.transaction(META, mode).objectStore(META)); }
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

/* 老版本升级上来时，把 meta 补齐（只跑一次） */
let metaReady = null;
function ensureMeta() {
  if (metaReady) return metaReady;
  metaReady = (async () => {
    try {
      const m = await mtx('readonly');
      if (await wrap(m.count())) return;
      const s = await tx('readonly');
      const all = await wrap(s.getAll());
      if (!all.length) return;
      const w = await mtx('readwrite');
      for (const r of all) w.put({ url: r.url, size: r.size || 0, used: r.used || Date.now(), id: r.id });
    } catch {}
  })();
  return metaReady;
}

export async function cacheGet(url) {
  try {
    const s = await tx('readonly');
    const rec = await wrap(s.get(url));
    if (!rec) return null;
    touch(url);                                   // 只更新 meta，不重写整个 blob
    return rec.blob;
  } catch { return null; }
}
async function touch(url) {
  try {
    const m = await mtx('readwrite');
    const r = await wrap(m.get(url));
    if (r) { r.used = Date.now(); m.put(r); }
  } catch {}
}
export async function cachePut(url, blob, meta = {}) {
  try {
    const now = Date.now();
    const s = await tx('readwrite');
    await wrap(s.put({ url, blob, size: blob.size, used: now, added: now, ...meta }));
    const m = await mtx('readwrite');
    m.put({ url, size: blob.size, used: now, id: meta.id });
  } catch {}
}
export async function cacheHas(url) {
  try { const s = await tx('readonly'); return !!(await wrap(s.getKey(url))); } catch { return false; }
}
/* 列出全部缓存条目（用于导出） */
export async function cacheList() {
  await ensureMeta();
  try {
    const m = await mtx('readonly');
    const all = await wrap(m.getAll());
    return all.map(r => ({ url: r.url, id: r.id, size: r.size || 0 }));
  } catch { return []; }
}
export async function cacheStats() {
  await ensureMeta();
  try {
    const m = await mtx('readonly');
    const all = await wrap(m.getAll());
    const ids = new Set(all.map(r => r.id).filter(Boolean));
    return { count: all.length, works: ids.size || all.length, bytes: all.reduce((n, r) => n + (r.size || 0), 0) };
  } catch { return { count: 0, works: 0, bytes: 0 }; }
}
export async function cacheClear() {
  try {
    const s = await tx('readwrite'); await wrap(s.clear());
    const m = await mtx('readwrite'); await wrap(m.clear());
  } catch {}
}
/* 超过上限就按「最久没看过的先删」，一直删到上限的 90%，留出余量少折腾 */
export async function cacheTrim(limitBytes) {
  await ensureMeta();
  try {
    const favs = new Set(await getFavs());                  // 收藏过的最后才动
    const m = await mtx('readonly');
    const all = await wrap(m.getAll());
    let total = all.reduce((n, r) => n + (r.size || 0), 0);
    if (total <= limitBytes) return { total, removed: 0 };
    all.sort((a, b) => (favs.has(a.id) - favs.has(b.id)) || ((a.used || 0) - (b.used || 0)));
    const dead = [];
    for (const r of all) {
      if (total <= limitBytes * 0.9) break;
      dead.push(r.url); total -= (r.size || 0);
    }
    if (dead.length) {
      const si = await tx('readwrite'); const mi = await mtx('readwrite');
      for (const u of dead) { si.delete(u); mi.delete(u); }
    }
    return { total, removed: dead.length };
  } catch { return { total: 0, removed: 0 }; }
}

/* 取图：先查本地缓存，未命中再抓取并存入本地 */
let sinceTrim = 0, trimT = null;
/* 新写入累计到 12 MB 就检查一次上限，避免每张图都全表扫一遍 */
function maybeTrim(bytes) {
  sinceTrim += bytes;
  if (sinceTrim < 12 * 1048576) return;
  sinceTrim = 0;
  clearTimeout(trimT);
  trimT = setTimeout(async () => {
    const s = await getSettings();
    cacheTrim((s.cacheLimitMB || 400) * 1048576);
  }, 1200);
}
let localReader = null;
/* app 启动时注入本地文件读取器，store 本身不依赖 File System API */
export function setLocalReader(fn) { localReader = fn; }

export async function fetchImage(url, meta = {}) {
  if (url.startsWith('local:')) {                 // 本机图片：直接读，不进缓存库
    if (!localReader) throw new Error('local reader unavailable');
    const file = await localReader(url.slice(6));
    return { blob: file, fromCache: true };
  }
  const hit = await cacheGet(url);
  if (hit) return { blob: hit, fromCache: true };
  const resp = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
  if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
  const blob = await resp.blob();
  cachePut(url, blob, meta);
  maybeTrim(blob.size);
  return { blob, fromCache: false };
}
