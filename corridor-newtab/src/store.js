// 设置、收藏、历史 与 本地图片缓存 / settings, favorites, history and the local image cache
import * as FS from './feishu.js';

/* 新装时的母语跟着浏览器走：首选语言是中文就是中文（外语配英文），其余一律英文（外语配中文）。
   这只决定「默认值」—— 装过的用户，onInstalled 那一下早把整份 settings 写进了 storage，
   语言照旧，不会因为升级被换掉。 */
function browserLang() {
  try {
    const nav = globalThis.navigator || {};
    const first = (nav.languages && nav.languages[0]) || nav.language || '';
    return /^zh\b/i.test(String(first)) ? 'zh' : 'en';
  } catch { return 'en'; }
}
const L0 = browserLang();

export const DEFAULTS = {
  /* 长廊只认两个语言位置：母语（loc.a）与外语（loc.b）。
     lang 说的是「界面跟谁走」：native 母语 | foreign 外语 | auto 跟系统在两者间挑。
     旧版本存的 'zh' / 'en' 会在归一化时迁到新写法上。 */
  lang: 'native',
  loc: {
    a: L0,                    // 母语：新装时跟浏览器（中文浏览器 zh，其余 en）
    b: L0 === 'zh' ? 'en' : 'zh',   // 外语：另一种
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
  /* 视频（只来自自定义图库）：full 播完整段再换（默认），interval 照轮换间隔换 —— 短的循环着等，长的到点就切 */
  videoLen: 'full',
  /* 声音：默认开着，音量 60%。videoMute 是「静音」那个开关，音量拨到 0 也等于静音。
     浏览器不让新页面自动出声时先静音放着，点一下页面就有声音 */
  videoMute: false,
  videoVol: 60,
  order: 'shuffle',           // shuffle | sequential
  scope: 'all',               // all | fav | filter
  quality: 'auto',            // auto | saver | high | max
  fit: 'smart',               // smart | cover | contain  沉浸式画面适配（默认智能；1.22.1–1.24.0 曾是 cover）
  frame: 'ebony',             // laurel|salon|baroque|rococo|ebony|walnut|oak|boxblack|thingold|float|none
  wall: 'terracotta',         // 墙面颜色（custom = 用下面这个自定义色）
  wallCustom: '#8A4B36',      // 自定义色板
  /* 今日画夹的底色：wall 跟着展墙走（默认）| dark 原来那块深色 | custom 单独挑一个 */
  rvWall: 'wall',
  rvWallCustom: '#2A2622',
  wallSat: 140,               // 墙色饱和度 0–200%
  wallTemp: 20,               // 墙色色温 -100 冷 … +100 暖
  tex: 'velvet',              // 墙面纹理
  /* 灯光：射灯打在墙上的样子。角度同时决定投影方向与纹理的受光面。 */
  lamp: { bright: 100,        // 亮度 0–200%
          angle: 0,           // -60 左 … +60 右（0 = 正对）
          warm: 50,           // -100 冷白 … +100 暖黄
          n: 1 },             // 灯数 0–4（0 = 不打灯）
  matStyle: 'mount',          // auto|linen|mount|wide|none
  matScale: 0.9,              // 留白宽度倍率 0.4–2.0
  kenburns: true,
  autohide: true,
  /* 勾选＝静止几秒后淡出。分得细一点，每一项对应画面上一处实实在在的东西 */
  hideParts: { chrome: true, clock: false, counter: true,
               label: false,                // 整张展签（展墙墙签、沉浸式信息卡、环形长廊与胶卷的展签）
               title: false, artist: false, meta: false, museum: false,
               look: false, palette: false },
  carouselMs: 15000,          // 环形长廊每格停留；0 = 不自动转
  filmMs: 3000,               // 胶卷走带节拍（默认 3 秒一格）；0 = 停带
  film: 'positive',         // 胶片风格
  filmEdge: true,             // 片边字与格号
  filmRun: 'step',            // glide 连续走带 | step 逐格（默认逐格：走完就停住，画面不飘）
  clock: 'bar',               // off | bar | grand
  /* 暂歇：临时把长廊关掉，这一页改成常去的那几个站点。
     off 存在设置里，于是跨标签页同步、重启浏览器也还是关着 —— 直到再点一次。 */
  off: false,
  offStyle: 'tag',            // tag 展签墙 | notice 闭馆告示 | index 目录索引
  offTagSkin: 'plain',        // 展签的皮：plain 简约（奶油纸）| color 彩签（左右渐变的色卡）
  /* 闭馆告示与目录索引不复用展墙，自己铺底 —— 深浅在这里选。
     auto＝跟着设置面板那个日/月走（展签墙不用它，它的底色就是墙）。 */
  offPaper: 'auto',           // auto | light | dark
  offTop: true,               // 是否合并 Chrome 的常访问榜（要 topSites 可选权限）
  offTabs: true,              // 是否合并当前打开的标签页（要 tabs 可选权限）
  offN: 8,                    // 自动来的那批最多显示几个（自己钉的不受限）
  offLinks: [],               // 自己钉的：[{ name, url }]
  offHidden: [],              // 随手摘掉的：[{ h 域名, r 当时名次, n 当时几个标签页, at }]
  offOrder: [],               // 手动拖出来的顺序（存的是签的 key）
  offBlocked: [],             // 永不再现：明说了不想再看见的，「全部放回」碰不到它
  workSafe: true,
  scrollPan: true,
  cacheLimitMB: 400,
  dailyNew: true,             // 每天从 Wikimedia Commons 补几幅新作
  dailyN: 3,                  // 每天补几幅
  localLib: true,             // 自定义图库是否参与展览
  libSync: false,             // 在线图库定时同步：线上新增的收进来，线上没了的（收藏的除外）拿掉
  libSyncMin: 1440,           // 同步间隔，分钟；默认一天
  libView: 'all',             // 来源列表只看哪一类：all | dir 文件夹 | url 网址
  libSort: 'add-d',           // 来源列表怎么排：add-d 新加的在前 | add-a | name-a | name-d
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
  s.loc.a = LC(s.loc.a, DEFAULTS.loc.a);
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
  s.libSync = !!s.libSync;
  s.libSyncMin = Math.min(43200, Math.max(1, Math.round(Number(s.libSyncMin) || 1440)));
  if (!['all', 'dir', 'url'].includes(s.libView)) s.libView = 'all';
  if (!['add-d', 'add-a', 'name-a', 'name-d'].includes(s.libSort)) s.libSort = 'add-d';
  s.matScale = Math.min(2, Math.max(0.4, Number(s.matScale) || 1));
  /* 墙色：自定义色板与两个微调。色号只认 #rgb / #rrggbb，别的一律回默认 */
  const HEX = (v, d) => {
    v = String(v || '').trim();
    if (/^[0-9a-f]{3}$/i.test(v) || /^[0-9a-f]{6}$/i.test(v)) v = '#' + v;
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map(c => c + c).join('');
    return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d;
  };
  s.wallCustom = HEX(s.wallCustom, '#8a4b36');
  if (!['wall', 'dark', 'custom'].includes(s.rvWall)) s.rvWall = 'wall';
  s.rvWallCustom = HEX(s.rvWallCustom, '#2a2622');
  const clampN = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  s.wallSat = clampN(s.wallSat, 0, 200, DEFAULTS.wallSat);
  s.wallTemp = clampN(s.wallTemp, -100, 100, DEFAULTS.wallTemp);
  s.lamp = Object.assign(structuredClone(DEFAULTS.lamp), (s.lamp && typeof s.lamp === 'object') ? s.lamp : {});
  s.lamp.bright = clampN(s.lamp.bright, 0, 200, DEFAULTS.lamp.bright);
  s.lamp.angle = clampN(s.lamp.angle, -60, 60, DEFAULTS.lamp.angle);
  s.lamp.warm = clampN(s.lamp.warm, -100, 100, DEFAULTS.lamp.warm);
  s.lamp.n = clampN(s.lamp.n, 0, 4, 1);
  if (typeof s.mat === 'boolean') { s.matStyle = s.mat ? 'auto' : 'none'; delete s.mat; }
  if (!['off', 'bar', 'grand'].includes(s.clock)) s.clock = 'off';
  /* 暂歇 */
  s.off = !!s.off;
  if (!['tag', 'notice', 'index'].includes(s.offStyle)) s.offStyle = 'tag';
  if (!['plain', 'color'].includes(s.offTagSkin)) s.offTagSkin = 'plain';
  if (!['auto', 'light', 'dark'].includes(s.offPaper)) s.offPaper = 'auto';
  s.offTop = s.offTop === undefined ? true : !!s.offTop;
  s.offTabs = s.offTabs === undefined ? true : !!s.offTabs;
  s.offN = Math.min(24, Math.max(1, Math.round(Number(s.offN) || 8)));
  const hosts = (v) => (Array.isArray(v) ? v : [])
    .map(x => String(x || '').trim().toLowerCase()).filter(Boolean).slice(0, 200);
  s.offBlocked = hosts(s.offBlocked);
  /* 已移除那份存的是对象，老版本存的是纯域名字符串，这里一并归一化。
     一个站点不该同时在两份名单里 —— 永不再现说了算。 */
  s.offHidden = (Array.isArray(s.offHidden) ? s.offHidden : []).map(x => {
    if (typeof x === 'string') return { h: x.trim().toLowerCase(), r: null, n: null, at: 0 };
    if (!x || !x.h) return null;
    return { h: String(x.h).trim().toLowerCase(),
             r: Number.isFinite(x.r) ? x.r : null, n: Number.isFinite(x.n) ? x.n : null,
             src: x.src || '', at: Number(x.at) || 0 };
  }).filter(x => x && x.h && !s.offBlocked.includes(x.h)).slice(0, 200);
  s.offOrder = (Array.isArray(s.offOrder) ? s.offOrder : [])
    .map(x => String(x || '').trim()).filter(Boolean).slice(0, 64);
  s.offLinks = (Array.isArray(s.offLinks) ? s.offLinks : []).slice(0, 24)
    .map(x => ({ name: String(x?.name || '').trim().slice(0, 40),
                 url: String(x?.url || '').trim().slice(0, 500) }))
    .filter(x => /^https?:\/\//i.test(x.url));
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
  if (!['full', 'interval'].includes(s.videoLen)) s.videoLen = 'full';
  s.videoMute = !!s.videoMute;
  { const vv = Number(s.videoVol); s.videoVol = Number.isFinite(vv) ? Math.min(100, Math.max(0, Math.round(vv))) : 60; }
  delete s.videoSound;                     // 1.25.0 开发中用过的旧开关，没发布过
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
  /* 语言不跟着重置：母语、外语和界面跟谁走，是「你读哪种文字」，不是一项展陈设置。
     不然用英文浏览器的中文用户点一下重置，界面就被换成了英文。 */
  const cur = await getSettings();
  const next = structuredClone(DEFAULTS);
  next.lang = cur.lang;
  next.loc = structuredClone(cur.loc);
  await area().set({ settings: next });
  return getSettings();
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

/* 整份写回 —— 备份恢复用。日常增删走上面那几个，别直接调这个 */
export async function setFavs(list) {
  const favs = [...new Set((Array.isArray(list) ? list : []).map(x => String(x || '').trim()).filter(Boolean))].slice(0, 4000);
  await area().set({ favs });
  return favs;
}
export async function setGone(list) {
  const gone = [...new Set((Array.isArray(list) ? list : []).map(x => String(x || '').trim()).filter(Boolean))].slice(0, 4000);
  await area().set({ gone });
  return gone;
}

export async function getHistory() { return (await area().get('history')).history || []; }
export async function setHistory(list) {
  const history = (Array.isArray(list) ? list : [])
    .filter(x => x && x.id).map(x => ({ id: String(x.id).slice(0, 80), at: Math.max(0, Math.round(Number(x.at) || 0)) }))
    .slice(0, 300);
  await area().set({ history });
  return history;
}
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
     { id, kind:'dir'|'url', name, url?, add, at, n, err, f:{inc,exc,rx,ext[],minPx},
       sync, sy, sa, sd }   // 网址来源：参不参加定时同步、上次同步的时间、新增几件、移除几件
   文件夹来源的目录句柄另存在 corridor-fs 库里，按 id 分开放。
   老版本存的是 { name, at, works }（只有一个文件夹），读的时候迁成第一个来源，
   id 就叫 root —— 正好跟老句柄的键对上，用户不用重新授权。
   ---------------------------------------- */
/* 视频后缀：local.js 与这里共用一份（store 不能反过来引 local.js） */
export const VIDEO_EXTS = ['mp4', 'm4v', 'webm', 'mov'];
const VID_RE = new RegExp('\\.(' + VIDEO_EXTS.join('|') + ')$', 'i');
export const isVideoURL = (u) => VID_RE.test(String(u || '').split(/[?#]/)[0]);
/* 图片后缀。前 7 种浏览器直接显示；svg 要补上宽高，tif/tiff 要解码转换（见下面 fetchImage）；
   tif/tiff、heic/heif、jxl 先让浏览器解，解不了交给自带的解码工人 */
const OLD_IMG = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp'];
export const IMG_EXTS = OLD_IMG.concat(['svg', 'tif', 'tiff', 'heic', 'heif', 'jxl']);
const LIB_EXTS = IMG_EXTS.concat(VIDEO_EXTS);
export const MAX_SRCS = 100;
/* 来源 id 是「d / u + 建立时刻的 36 进制」，老来源没有 add，就从 id 里读出加进来的时间 */
const idTime = (id) => { const t = parseInt(String(id || '').slice(1), 36); return t > 1.4e12 && t < 4e12 ? t : 0; };
const N0 = (v) => Math.max(0, Math.round(Number(v) || 0));
function normSrc(x, i) {
  const s = x && typeof x === 'object' ? x : {};
  const kind = s.kind === 'url' ? 'url' : 'dir';
  const f = (s.f && typeof s.f === 'object') ? s.f : {};
  let ext = (Array.isArray(f.ext) ? f.ext : LIB_EXTS)
    .map(v => String(v || '').toLowerCase().replace(/^\./, '')).filter(v => LIB_EXTS.includes(v));
  /* 1.25 以前只有图片那 7 种。那时 7 种全勾着的来源，意思就是「全都要」——
     升上来顺手把新加的格式（视频、svg、tiff、heic、jxl）都勾上；只勾了其中几种的，照原样留着。
     fv 记下已经迁过，之后再取消掉哪一种也不会被勾回来。 */
  if ((Number(f.fv) || 0) < 2 && OLD_IMG.every(e => ext.includes(e))) ext = [...new Set(ext.concat(LIB_EXTS))];
  return {
    id: String(s.id || 's' + (i + 1)).slice(0, 24),
    kind,
    name: String(s.name || '').slice(0, 60),
    ttl: String(s.ttl || '').slice(0, 80),     // 来源自己报的名字（比如飞书的表名），没起名时拿来显示
    url: kind === 'url' ? String(s.url || '').slice(0, 500) : '',
    add: N0(s.add) || idTime(s.id) || N0(s.at),
    at: N0(s.at),
    n: N0(s.n),
    sy: N0(s.sy), sa: N0(s.sa), sd: N0(s.sd),
    err: String(s.err || '').slice(0, 160),
    /* 上一次扫描时，因为浏览器解不了而跳过的：{ heic: 3, jxl: 1 } */
    skip: Object.fromEntries(Object.entries(s.skip && typeof s.skip === 'object' ? s.skip : {})
      .filter(([k, v]) => LIB_EXTS.includes(k) && Number(v) > 0).slice(0, 8).map(([k, v]) => [k, Math.round(Number(v))])),
    on: s.on === undefined ? true : !!s.on,
    sync: s.sync === undefined ? true : !!s.sync,   // 网址来源：参不参加定时同步（默认参加）
    f: {
      inc: String(f.inc || '').slice(0, 200),
      exc: String(f.exc || '').slice(0, 200),
      rx: !!f.rx,
      ext: ext.length ? ext : LIB_EXTS.slice(),
      fv: 2,
      minPx: Math.min(4000, Math.max(0, Math.round(Number(f.minPx) ?? 200)))
    }
  };
}
export async function getLocalLib() {
  const d = (await area().get('locallib')).locallib || {};
  const out = { at: Number(d.at) || 0, srcs: [], works: Array.isArray(d.works) ? d.works : [] };
  if (Array.isArray(d.srcs) && d.srcs.length) out.srcs = d.srcs.slice(0, MAX_SRCS).map(normSrc);
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
  const srcs = (Array.isArray(d.srcs) ? d.srcs : []).slice(0, MAX_SRCS).map(normSrc);
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
/* 增量改一个来源：拿掉 drop 里的作品、补上 add 里的（id 已经有的跳过），来源字段按 patch 改。
   每次都现读一遍最新的库再写，别的来源、别处刚写进去的东西都不会被冲掉。 */
export async function mergeLibSource(sid, { add = [], drop = [], patch = {} } = {}) {
  const lib = await getLocalLib();
  const i = lib.srcs.findIndex(x => x.id === sid);
  if (i < 0) return lib;                       // 来源刚被删掉了
  const gone = new Set(drop);
  let works = lib.works.filter(w => !(w.sid === sid && gone.has(w.id)));
  const have = new Set(works.map(w => w.id));
  works = works.concat(add.filter(w => w && !have.has(w.id) && have.add(w.id)));
  const n = works.filter(w => w.sid === sid).length;
  lib.srcs[i] = normSrc({ ...lib.srcs[i], ...patch, at: Date.now(), n }, i);
  await setLocalLib({ at: Date.now(), srcs: lib.srcs, works });
  return getLocalLib();
}
/* 只把这几件作品换成新的样子（AI 补全写回用）：库里已经没有的不会被加回来，
   这段时间里同步新加进来的也不会被冲掉 */
export async function patchLibWorks(list) {
  const by = new Map((list || []).filter(w => w && w.id).map(w => [w.id, w]));
  if (!by.size) return;
  const lib = await getLocalLib();
  let hit = 0;
  const works = lib.works.map(w => by.has(w.id) ? (hit++, by.get(w.id)) : w);
  if (hit) await setLocalLib({ at: lib.at || Date.now(), srcs: lib.srcs, works });
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
export async function setPacks(obj) {
  const ps = (obj && typeof obj === 'object') ? obj : {};
  const keys = Object.entries(ps).sort((a, b) => (b[1]?.at || 0) - (a[1]?.at || 0)).slice(0, 8).map(x => x[0]);
  await area().set({ packs: Object.fromEntries(keys.map(k => [k, ps[k]])) });
  return getPacks();
}
export async function clearPack(lang) {
  const ps = await getPacks();
  if (lang) delete ps[lang]; else { await area().set({ packs: {} }); return; }
  await area().set({ packs: ps });
}

export async function getCursor() { return (await area().get('cursor')).cursor || null; }
export async function setCursor(c) { await area().set({ cursor: c }); }

/* ---------------- IndexedDB 图片缓存 ----------------
   两个 store：images 只放 blob，meta 只放 {url, size, used, id, kind, px}。
   统计和淘汰都只读 meta，几百兆的图片不会因为「算一下占用」被整个读进内存。

   1.26 起每幅作品只存两份：
     主图（kind main）：这台设备要过的最大那一档，只升不降 —— 存进更大的一份，小的那份就删掉；
     缩略图（kind thumb，键 thumb:<作品 id>）：约 512 宽，从主图在本地缩出来，
       手里还没有主图时才去网上取一张 500 的。
   中间的尺寸都交给浏览器显示时缩放。视频的静帧（kind poster）算它的主图。
   查缓存一律按作品 id 查（meta 上的 id 索引），不再认具体地址：
   要 1280 时手里有 1920，就直接用 1920。
   ---------------------------------------------------- */
const DB_NAME = 'corridor-cache', DB_VER = 3, STORE = 'images', META = 'meta';
export const THUMB_W = 512;
const ORIG = 100000;               // 没有尺寸阶梯的原图（网址来源、飞书附件）记作「最大」
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
      const m = d.objectStoreNames.contains(META) ? r.transaction.objectStore(META)
        : d.createObjectStore(META, { keyPath: 'url' });
      if (!m.indexNames.contains('used')) m.createIndex('used', 'used');
      if (!m.indexNames.contains('id')) m.createIndex('id', 'id');
    };
    r.onsuccess = () => {
      const d = r.result;
      d.onversionchange = () => { d.close(); dbp = null; };     // 新版本要升级库：让出来
      res(d);
    };
    r.onerror = () => { dbp = null; rej(r.error); };
    /* 还开着旧版本的页面挡着升级：别让这一页一直等，先当没有缓存，稍后再试 */
    r.onblocked = () => setTimeout(() => { dbp = null; rej(new Error('blocked')); }, 3000);
  });
  return dbp;
}
function tx(mode) { return db().then(d => d.transaction(STORE, mode).objectStore(STORE)); }
function mtx(mode) { return db().then(d => d.transaction(META, mode).objectStore(META)); }
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

const pxOfKey = (u) => { const m = String(u || '').match(/\/(\d+)px-/); return m ? +m[1] : 0; };
function kindOf(r) {
  if (r.kind) return r.kind;
  const u = String(r.url || '');
  return u.startsWith('thumb:') ? 'thumb' : u.startsWith('poster:') ? 'poster' : 'main';
}
const pxOf = (r) => Number(r.px) || pxOfKey(r.url) || (kindOf(r) === 'thumb' ? THUMB_W : ORIG);

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
async function metaAll() { const m = await mtx('readonly'); return wrap(m.getAll()); }

/* 存进来、删掉了：本页里关心这件事的（「哪些作品手里有图」那张表）跟着改 */
const storedFns = new Set();
export function onStored(fn) { storedFns.add(fn); return () => storedFns.delete(fn); }
const emit = (e) => { for (const f of storedFns) { try { f(e); } catch { } } };

export async function cacheGet(url) {
  try {
    const s = await tx('readonly');
    const rec = await wrap(s.get(url));
    if (!rec) return null;
    touch(url);                                   // 只更新 meta，不重写整个 blob
    return rec.blob;
  } catch { return null; }
}
async function rawGet(url) {                      // 不算「看过」：整理缓存时读
  try { const s = await tx('readonly'); return (await wrap(s.get(url)))?.blob || null; } catch { return null; }
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
    const now = Date.now(), used = Number(meta.used) || now;
    const rec = { url, size: blob.size, used, id: meta.id, kind: meta.kind || 'main', px: Number(meta.px) || 0 };
    if (meta.big) rec.big = 1;
    if (meta.dg) rec.dg = 1;
    const d = await db();
    await new Promise((res, rej) => {
      const t = d.transaction([STORE, META], 'readwrite');
      t.objectStore(STORE).put({ url, blob, size: blob.size, used, added: now, id: meta.id });
      t.objectStore(META).put(rec);
      t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
    return true;
  } catch { return false; }
}
async function cacheDel(urls) {
  if (!urls.length) return;
  try {
    const d = await db();
    await new Promise((res, rej) => {
      const t = d.transaction([STORE, META], 'readwrite');
      const si = t.objectStore(STORE), mi = t.objectStore(META);
      for (const u of urls) { si.delete(u); mi.delete(u); }
      t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  } catch { }
}
export async function cacheHas(url) {
  try { const s = await tx('readonly'); return !!(await wrap(s.getKey(url))); } catch { return false; }
}

/* 一幅作品手里有什么：最大的那份主图、缩略图、以及多出来该清掉的 */
export async function artState(id) {
  const out = { main: null, thumb: null, extra: [] };
  if (!id) return out;
  try {
    await ensureMeta();
    const m = await mtx('readonly');
    const rs = await wrap(m.index('id').getAll(id));
    for (const r of rs) {
      r.px = pxOf(r);
      if (kindOf(r) === 'thumb') { if (!out.thumb) out.thumb = r; else out.extra.push(r); continue; }
      if (!out.main || r.px > out.main.px) { if (out.main) out.extra.push(out.main); out.main = r; }
      else out.extra.push(r);
    }
  } catch { }
  return out;
}
/* 整张表：作品 id → { px 主图宽度（0＝没有主图）, thumb 有没有缩略图, bytes } */
export async function cacheIndex() {
  const map = new Map();
  try {
    await ensureMeta();
    for (const r of await metaAll()) {
      if (!r.id) continue;
      const e = map.get(r.id) || { px: 0, thumb: false, bytes: 0 };
      e.bytes += r.size || 0;
      if (kindOf(r) === 'thumb') e.thumb = true; else e.px = Math.max(e.px, pxOf(r));
      map.set(r.id, e);
    }
  } catch { }
  return map;
}

/* 只升不降：存进一份主图，比它小的主图都删掉；手里已经有更大的就不存 */
async function putMain(id, url, blob, px, o = {}) {
  if (!id || !blob) return false;          // 认不出是谁的不进缓存：以后既用不上，也清不掉
  const st = await artState(id);
  if (st.main && st.main.url !== url && st.main.px >= px) return false;
  if (!(await cachePut(url, blob, { id, kind: o.kind || 'main', px, big: o.big }))) return false;
  const dead = [st.main, ...st.extra].filter(r => r && r.url !== url && kindOf(r) !== 'thumb');
  if (dead.length) await cacheDel(dead.map(r => r.url));
  emit({ id, kind: o.kind || 'main', px });
  maybeTrim();
  return true;
}

/* 缩略图：从手里那张大图在本地缩一张 webp，不联网。
   createImageBitmap 的缩放比画布一步缩小细腻；不支持就退回画布。 */
const thumbWait = new Map();
export function makeThumb(id, blob, ar) {
  if (!id || !blob) return Promise.resolve(null);
  if (thumbWait.has(id)) return thumbWait.get(id);
  const p = (async () => {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return null;
    const bmp = await bitmapOf(blob);
    const r = Number(ar) || (bmp.width / bmp.height) || 1;
    let W = THUMB_W;
    if (r > 2) W = Math.min(1600, Math.round(256 * r));      // 手卷这类横长的，别缩成一条线
    let H = Math.round(W / r);
    if (H > 1200) { H = 1200; W = Math.round(H * r); }
    if (W >= bmp.width) { W = bmp.width; H = bmp.height; }
    let small = null;
    try { small = await createImageBitmap(bmp, { resizeWidth: W, resizeHeight: H, resizeQuality: 'high' }); } catch { }
    const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(small || bmp, 0, 0, W, H);
    small?.close(); bmp.close();
    const out = await c.convertToBlob({ type: 'image/webp', quality: 0.84 });
    if (!out?.size) return null;
    if (!(await cachePut('thumb:' + id, out, { id, kind: 'thumb', px: W }))) return out;
    emit({ id, kind: 'thumb', px: W });
    maybeTrim();
    return out;
  })().catch(() => null).finally(() => thumbWait.delete(id));
  thumbWait.set(id, p);
  return p;
}
/* 有主图、还没缩略图的，补一张（后台慢慢补） */
export async function ensureThumb(w) {
  const st = await artState(w?.id);
  if (st.thumb || !st.main) return !!st.thumb;
  const b = await rawGet(st.main.url);
  return !!(b && await makeThumb(w.id, b, w.img?.ar));
}

/* ---------------- 网络：超时，以及「这个图源刚刚连不上」 ----------------
   受限的网络里，浏览器多半仍然报告「在线」，请求却一直挂着，要等系统的连接超时（几十秒）。
   这里给每个请求一个等响应头的时限，过了就放弃；连着失败就把这个图源记成「暂时连不上」，
   记在 storage.session 里，所有标签页和后台共用 —— 后面开的新标签页不再傻等，直接用手里有的。
   记号会自己到期（2 → 5 → 10 分钟），到期后的第一个请求就是试探；浏览器报告重新联网时立刻清掉。 */
const NETK = 'netbad';
let netMem = {}, netLoaded = null;
const sess = () => globalThis.chrome?.storage?.session || null;
export function netLoad() {
  if (netLoaded) return netLoaded;
  netLoaded = (async () => {
    try {
      const s = sess(); if (!s) return;
      netMem = (await s.get(NETK))?.[NETK] || {};
      chrome.storage.onChanged.addListener((ch, a) => { if (a === 'session' && ch[NETK]) netMem = ch[NETK].newValue || {}; });
    } catch { }
  })();
  return netLoaded;
}
export const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };
export const WM = 'https://upload.wikimedia.org/';
/* 同步版：页面启动时 netLoad() 过一次就能用 */
export function netOkSync(url = WM) {
  if (globalThis.navigator && navigator.onLine === false) return false;
  const r = netMem[hostOf(url)];
  return !r || r.until <= Date.now();
}
export async function netOk(url = WM) { await netLoad(); return netOkSync(url); }
async function netMark(host, bad) {
  if (!host) return;
  await netLoad();
  const cur = netMem[host];
  if (!bad) { if (!cur) return; netMem = { ...netMem }; delete netMem[host]; }
  else {
    const n = Math.min(3, (cur?.n || 0) + 1);
    netMem = { ...netMem, [host]: { n, until: Date.now() + [0, 2, 5, 10][n] * 60000 } };
  }
  try { await sess()?.set({ [NETK]: netMem }); } catch { }
}
export async function netReset() { netMem = {}; try { await sess()?.set({ [NETK]: {} }); } catch { } }

/* 取一张网上的图。headMs：等响应头的时限（连不上就在这一步卡住）；bodyMs：读完整张的时限 */
async function fetchNet(url, { headMs = 9000, bodyMs = 120000, signal } = {}) {
  const host = hostOf(url);
  const ac = new AbortController();
  let timedOut = false;
  const t = setTimeout(() => { timedOut = true; ac.abort(); }, headMs);
  const stop = () => ac.abort();
  signal?.addEventListener('abort', stop);
  try {
    let resp;
    try { resp = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: ac.signal }); }
    catch (e) {
      /* 连不上（不是我们自己喊停的）：记一笔 */
      if (!signal?.aborted && (timedOut || e instanceof TypeError)) netMark(host, true);
      const err = new Error(timedOut ? 'timeout ' + url : (e?.message || 'network') + ' ' + url);
      err.code = 'net';
      throw err;
    } finally { clearTimeout(t); }
    netMark(host, false);
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + url);
    const t2 = setTimeout(stop, bodyMs);
    try { return await resp.blob(); } finally { clearTimeout(t2); }
  } finally { signal?.removeEventListener('abort', stop); }
}
/* 同一张图同时被好几处要：只发一次请求 */
const inflight = new Map();
function once(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
async function getNetBlob(url, o = {}) {
  let blob = FS.isCover(url) ? await FS.fetchCover(url) : await fetchNet(url, o);   // 飞书附件要带飞书的 cookie
  if (needsConvert(url)) blob = await convertBlob(blob, url);
  return blob;
}
const offErr = () => { const e = new Error('offline'); e.code = 'offline'; return e; };

/* ---------------- 按作品取图 ----------------
   want：这一处要多宽（像素）。不超过缩略图那么宽的，走缩略图；其余走主图。
   选项：
     quick      手里有什么先给什么（主图小一点、只有缩略图都行，low 标出来），一点没有才联网
     cacheOnly  只看手里的，不联网
     noFallback 要的就是联网换清楚的那一份：拿不到就报错，别拿手里的旧图顶
     main       一定走主图（即使 want 很小）
     headMs     联网时等响应头的时限
   返回 { blob, px, low, fromCache }。本机文件夹里的图直接读盘，不进缓存。 */
const isDisk = (w) => String(w?.img?.base || '').startsWith('local:');
export function artSize(w, target) {
  const a = (w?.img?.sizes || []).filter(Boolean);
  if (!a.length) return ORIG;
  for (const s of a) if (s >= target) return s;
  return a[a.length - 1];
}
export function artUrl(w, px) { return w.local ? w.img.base : `${w.img.base}/${px}px-${w.img.name}`; }
/* 手里那份主图够不够这一处用：宽度到了要的（或者已经是这幅能取到的最大那档） */
function goodFor(w, want, m) {
  if (!m) return false;
  const top = w.local ? ORIG : artSize(w, 1e9);
  return m.px >= Math.min(want, top);
}
export async function hasGood(w, want) { return goodFor(w, want, (await artState(w.id)).main); }

export async function getArt(w, want = 1920, o = {}) {
  if (!w?.img) throw new Error('no image');
  if (w.video || isVideoURL(w.img.base)) return fetchPoster(w.img.base, { id: w.id });
  if (isDisk(w)) return fetchImage(w.img.base);
  const st = await artState(w.id);
  const hit = async (r, low) => {
    const b = r && await cacheGet(r.url);
    return b ? { blob: b, px: r.px, low, fromCache: true } : null;
  };
  /* 退路：手里有什么先拿什么 —— 主图（哪怕小一点）、缩略图 */
  const fallback = async () => (await hit(st.main, !goodFor(w, want, st.main))) || (await hit(st.thumb, true));

  if (want <= THUMB_W * 1.05 && !o.main) {
    if (st.thumb) { const r = await hit(st.thumb, false); if (r) return r; }
    if (st.main) {
      const b = await cacheGet(st.main.url);
      if (b) { const t = await makeThumb(w.id, b, w.img.ar); return { blob: t || b, px: t ? THUMB_W : st.main.px, low: false, fromCache: true }; }
    }
    if (o.cacheOnly) throw offErr();
    if (w.local) {                       // 网址来源没有小图可取：原图当主图存下，再缩一张
      const r = await fetchMain(w, ORIG, { ...o, noThumb: true });
      const t = await makeThumb(w.id, r.blob, w.img.ar);
      return { blob: t || r.blob, px: THUMB_W, low: false, fromCache: false };
    }
    const tpx = artSize(w, 500), url = artUrl(w, tpx);
    if (!(await netOk(url))) throw offErr();
    const blob = await once(url, () => getNetBlob(url, o));
    if ((await cachePut('thumb:' + w.id, blob, { id: w.id, kind: 'thumb', px: tpx }))) { emit({ id: w.id, kind: 'thumb', px: tpx }); maybeTrim(); }
    return { blob, px: tpx, low: false, fromCache: false };
  }

  if (goodFor(w, want, st.main)) { const r = await hit(st.main, false); if (r) return r; }
  if (o.quick || o.cacheOnly) {
    const f = await fallback(); if (f) return f;
    if (o.cacheOnly) throw offErr();
  }
  const target = w.local ? ORIG : artSize(w, want);
  const url = artUrl(w, target);
  if (!(await netOk(url))) {
    if (!o.noFallback) { const f = await fallback(); if (f) return f; }
    throw offErr();
  }
  try { return await fetchMain(w, target, o); }
  catch (e) {
    if (o.noFallback) throw e;
    const f = await fallback(); if (f) return f;
    throw e;
  }
}
async function fetchMain(w, px, o = {}) {
  const url = artUrl(w, px);
  const blob = await once(url, () => getNetBlob(url, o));
  await putMain(w.id, url, blob, px, { big: w.format === 'scroll' });
  /* 第一次有了主图：顺手缩一张缩略图 */
  if (!o.noThumb) artState(w.id).then(s => { if (!s.thumb) makeThumb(w.id, blob, w.img.ar); }).catch(() => { });
  return { blob, px, low: false, fromCache: false };
}

/* 这台设备的展示宽度：页面每次上墙时记下要过的最大那档，后台预取与「降级」都按它来 */
export async function dispPx() {
  const s = await getSettings();
  if (s.quality === 'saver') return 1280;
  if (s.quality === 'high') return 1920;
  if (s.quality === 'max') return 3840;
  const d = (await area().get('dispPx')).dispPx;
  return Math.min(3840, Math.max(960, Number(d?.px) || 1920));
}
export async function noteDisp(px) {
  px = Math.round(Number(px) || 0);
  if (px <= 0) return;
  const d = (await area().get('dispPx')).dispPx;
  if (!d || px > (Number(d.px) || 0)) await area().set({ dispPx: { px: Math.min(3840, px), at: Date.now() } });
}

/* 列出全部主图（用于导出：缩略图不导） */
export async function cacheList() {
  await ensureMeta();
  try {
    const all = await metaAll();
    return all.filter(r => kindOf(r) !== 'thumb').map(r => ({ url: r.url, id: r.id, size: r.size || 0 }));
  } catch { return []; }
}
export async function cacheStats() {
  await ensureMeta();
  try {
    const all = await metaAll();
    const main = new Set(), thumb = new Set();
    let bytes = 0, mainBytes = 0, thumbBytes = 0;
    for (const r of all) {
      const n = r.size || 0; bytes += n;
      if (kindOf(r) === 'thumb') { thumbBytes += n; if (r.id) thumb.add(r.id); }
      else { mainBytes += n; if (r.id) main.add(r.id); }
    }
    return { count: all.length, works: main.size, thumbs: thumb.size, bytes, mainBytes, thumbBytes };
  } catch { return { count: 0, works: 0, thumbs: 0, bytes: 0, mainBytes: 0, thumbBytes: 0 }; }
}
export async function cacheClear() {
  try {
    const s = await tx('readwrite'); await wrap(s.clear());
    const m = await mtx('readwrite'); await wrap(m.clear());
    emit({ cleared: true });
  } catch {}
}
/* 按作品 id 删缓存。某些作品已经彻底不在了 —— 来源撤了、每日新作换过 ——
   它们的图还占着地方。清「已移除」里的失效记录时顺手把这些图带走。
   本机文件夹的图不走缓存库（fetchImage 里 local: 直接读盘），所以只会命中网络来的那些。 */
export async function cacheDropIds(ids) {
  await ensureMeta();
  const want = new Set((Array.isArray(ids) ? ids : []).map(x => String(x || '')).filter(Boolean));
  if (!want.size) return { removed: 0, bytes: 0 };
  try {
    const dead = (await metaAll()).filter(r => want.has(r.id));
    await cacheDel(dead.map(r => r.url));
    for (const id of want) emit({ id, dropped: true, all: true });
    return { removed: dead.length, bytes: dead.reduce((n, r) => n + (r.size || 0), 0) };
  } catch { return { removed: 0, bytes: 0 }; }
}

/* 现在还认得的作品：内置馆藏 + 每日新作 + 自定义图库（开关关着的也算 —— 它们只是暂时不展出） */
async function knownIds() {
  const ids = new Set();
  try {
    const url = globalThis.chrome?.runtime?.getURL ? chrome.runtime.getURL('data/catalog.json') : 'data/catalog.json';
    (await (await fetch(url)).json()).forEach(w => ids.add(w.id));
    (await getDaily()).works.forEach(w => ids.add(w.id));
    (await getLocalLib()).works.forEach(w => ids.add(w.id));
  } catch { return null; }
  return ids;
}
/* 不在目录里了的那些：{ n 幅, bytes }（收藏的不算 —— 它们不会被清） */
export async function cacheOrphans() {
  const ids = await knownIds();
  if (!ids) return { n: 0, bytes: 0 };
  const favs = new Set(await getFavs());
  const by = new Map();
  try {
    for (const r of await metaAll()) {
      if (r.id && (ids.has(r.id) || favs.has(r.id))) continue;
      const k = r.id || r.url;
      by.set(k, (by.get(k) || 0) + (r.size || 0));
    }
  } catch { }
  return { n: by.size, bytes: [...by.values()].reduce((a, b) => a + b, 0) };
}
export async function cacheDropOrphans() {
  const ids = await knownIds();
  if (!ids) return { removed: 0, bytes: 0 };
  const favs = new Set(await getFavs());
  const dead = (await metaAll()).filter(r => !(r.id && (ids.has(r.id) || favs.has(r.id))));
  await cacheDel(dead.map(r => r.url));
  return { removed: dead.length, bytes: dead.reduce((n, r) => n + (r.size || 0), 0) };
}

/* 降级：一张大主图在本地缩到这台设备用得着的宽度，换下原来那份。返回省下的字节 */
async function shrinkMain(r, disp) {
  try {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return 0;
    const blob = await rawGet(r.url); if (!blob) return 0;
    const bmp = await createImageBitmap(blob);
    const W = Math.min(bmp.width, Math.max(960, disp));
    if (W >= bmp.width * 0.85) { bmp.close(); return 0; }
    const H = Math.max(1, Math.round(W * bmp.height / bmp.width));
    let small = null;
    try { small = await createImageBitmap(bmp, { resizeWidth: W, resizeHeight: H, resizeQuality: 'high' }); } catch { }
    const c = new OffscreenCanvas(W, H), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(small || bmp, 0, 0, W, H);
    small?.close(); bmp.close();
    const out = await c.convertToBlob({ type: 'image/webp', quality: 0.9 });
    if (!out?.size || out.size >= (r.size || 0)) return 0;
    const key = 'dg:' + W + ':' + String(r.url).replace(/^dg:\d+:/, '');
    if (!(await cachePut(key, out, { id: r.id, kind: 'main', px: W, used: r.used, dg: 1 }))) return 0;
    await cacheDel([r.url]);
    const saved = (r.size || 0) - out.size;
    Object.assign(r, { url: key, size: out.size, px: W, dg: 1 });
    emit({ id: r.id, kind: 'main', px: W });
    return saved;
  } catch { return 0; }
}

/* 超过上限时，按这个顺序腾地方，一直腾到上限的 90%：
     ① 已经不在任何目录里、也没收藏的作品的图；
     ② 降级：比这台设备用得着的大得多的主图，在本地缩小（放大看过的那些）；
     ③ 删主图：最久没看的先走，收藏的最后；缩略图留着 —— 断网时藏品库照样清楚；
     ④ 上限比缩略图总量还小时，缩略图也按最久没看的删。
   在线图库里收藏过的那几张一张都不删：线上可能已经没有了，缓存就是仅存的一份。
   同一时刻只让一处在整理（Web Locks），别的页面、后台撞上了就跳过。 */
export async function cacheTrim(limitBytes) {
  const run = () => trimNow(limitBytes);
  if (globalThis.navigator?.locks) {
    return navigator.locks.request('corridor-cache-trim', { ifAvailable: true },
      (l) => l ? run() : { total: 0, removed: 0, shrunk: 0, busy: true });
  }
  return run();
}
async function trimNow(limit) {
  await ensureMeta();
  try {
    const all = await metaAll();
    let total = all.reduce((n, r) => n + (r.size || 0), 0);
    if (total <= limit) return { total, removed: 0, shrunk: 0 };
    const goal = limit * 0.9;
    const favs = new Set(await getFavs());
    const keep = (r) => favs.has(r.id) && String(r.id || '').startsWith('lb-');
    const lru = (a, b) => (favs.has(a.id) - favs.has(b.id)) || ((a.used || 0) - (b.used || 0));
    const dead = [];
    const drop = (r) => { dead.push(r.url); total -= (r.size || 0); r._dead = true; };
    const ids = await knownIds();
    if (ids) for (const r of all) {
      if (total <= goal) break;
      if (!r.id || (!ids.has(r.id) && !favs.has(r.id))) drop(r);
    }
    let shrunk = 0;
    if (total > goal) {
      const disp = await dispPx();
      const cand = all.filter(r => !r._dead && kindOf(r) === 'main' && !r.big && pxOf(r) > disp * 1.3 && (r.size || 0) > 300 * 1024).sort(lru);
      const t0 = Date.now();
      for (const r of cand) {
        if (total <= goal || Date.now() - t0 > 30000) break;
        const saved = await shrinkMain(r, disp);
        if (saved > 0) { total -= saved; shrunk++; }
      }
    }
    if (total > goal) for (const r of all.filter(r => !r._dead && kindOf(r) !== 'thumb' && !keep(r)).sort(lru)) {
      if (total <= goal) break;
      drop(r);
    }
    if (total > goal) for (const r of all.filter(r => !r._dead && kindOf(r) === 'thumb' && !keep(r)).sort(lru)) {
      if (total <= goal) break;
      drop(r);
    }
    await cacheDel(dead);
    for (const r of all) if (r._dead && r.id) emit({ id: r.id, dropped: true, kind: kindOf(r) });
    return { total, removed: dead.length, shrunk };
  } catch { return { total: 0, removed: 0, shrunk: 0 }; }
}
/* 每次写入后过一会儿看一眼上限（连着写只看一次） */
let trimT = null;
function maybeTrim() {
  clearTimeout(trimT);
  trimT = setTimeout(async () => {
    try { const s = await getSettings(); await cacheTrim((s.cacheLimitMB || 400) * 1048576); } catch { }
  }, 2500);
}

/* 1.26 的一次性整理：老缓存里同一幅存了好几种尺寸 —— 每幅只留最大的一份当主图，其余删掉；
   最大的也只有缩略图那么大的（只在藏品库里见过），改记成缩略图；
   认不出是谁的（以前今日画夹存的那些没带作品 id）直接删。缩略图之后由后台慢慢补。 */
export async function cacheConsolidate() {
  if (((await area().get('cacheV')).cacheV || 0) >= 3) return null;
  const run = async () => {
    if (((await area().get('cacheV')).cacheV || 0) >= 3) return null;
    await ensureMeta();
    const all = await metaAll();
    const by = new Map(), dead = [];
    for (const r of all) {
      if (!r.id) { dead.push(r.url); continue; }
      if (!by.has(r.id)) by.set(r.id, []);
      by.get(r.id).push(r);
    }
    let thumbs = 0;
    for (const [id, rs] of by) {
      const ts = rs.filter(r => kindOf(r) === 'thumb');
      ts.slice(1).forEach(r => dead.push(r.url));
      const mains = rs.filter(r => kindOf(r) !== 'thumb').sort((a, b) => pxOf(b) - pxOf(a));
      if (!mains.length) continue;
      const top = mains[0];
      mains.slice(1).forEach(r => dead.push(r.url));
      if (kindOf(top) === 'main' && pxOf(top) <= THUMB_W * 1.05 && !ts.length) {
        const b = await rawGet(top.url);
        if (b && await cachePut('thumb:' + id, b, { id, kind: 'thumb', px: pxOf(top), used: top.used })) thumbs++;
        dead.push(top.url);
      } else if (!top.kind || !top.px) {
        try { const m = await mtx('readwrite'); await wrap(m.put({ ...top, kind: kindOf(top), px: pxOf(top) })); } catch { }
      }
    }
    await cacheDel(dead);
    await area().set({ cacheV: 3 });
    return { removed: dead.length, thumbs };
  };
  if (globalThis.navigator?.locks) return navigator.locks.request('corridor-cache-trim', run);
  return run();
}
let localReader = null;
/* app 启动时注入本地文件读取器，store 本身不依赖 File System API */
export function setLocalReader(fn) { localReader = fn; }

/* ---------------- 视频 ----------------
   视频作品的地址和图片一样（local:… 或网址），只是后缀不同。
   要图的地方（瀑布流、缩略图、放大、AI 识图）照旧调 fetchImage，
   拿到的是从片子里取出的一帧；真正放视频的只有沉浸式与展墙，它们走 mediaURL。 */
let posterMaker = null;
/* 取帧要用 <video>，后台 service worker 里没有；由页面注入 */
export function setPosterMaker(fn) { posterMaker = fn; }
const posters = new Map();                 // 本页内存里的静帧：地址 → Blob
const posterWait = new Map();              // 同一段片子别同时取好几次
async function fetchPoster(url, meta) {
  if (posters.has(url)) return { blob: posters.get(url), fromCache: true };
  const local = url.startsWith('local:');
  const key = 'poster:' + url;
  /* 网址来源的静帧和那边的图片一样进缓存库；本机视频的只留在内存里 ——
     本机的东西扩展不复制，这一条对取出来的帧也算数 */
  if (!local) { const hit = await cacheGet(key); if (hit) { posters.set(url, hit); return { blob: hit, fromCache: true }; } }
  if (!posterMaker) throw new Error('poster maker unavailable');
  if (!posterWait.has(url)) posterWait.set(url, (async () => {
    let src = url;
    if (local) {
      if (!localReader) throw new Error('local reader unavailable');
      src = await localReader(url.slice(6));
    }
    const blob = await posterMaker(src);
    if (posters.size > 60) posters.delete(posters.keys().next().value);
    posters.set(url, blob);
    if (!local && meta?.id) putMain(meta.id, key, blob, ORIG, { kind: 'poster' });
    return blob;
  })().finally(() => posterWait.delete(url)));
  return { blob: await posterWait.get(url), fromCache: false };
}
/* 放视频用的地址：本机文件做成 blob: 地址（浏览器按需从硬盘读，不整段读进内存），
   网址来源直接用原地址串流。调用方负责在不用时 revoke 本机那一种。 */
export async function mediaURL(url) {
  if (url.startsWith('local:')) {
    if (!localReader) throw new Error('local reader unavailable');
    return { url: URL.createObjectURL(await localReader(url.slice(6))), own: true };
  }
  return { url, own: false };
}

/* ---------------- 要先转一道才能放进 <img> 的图 ----------------
   svg：补上宽高（只有 viewBox 的 svg 没有固有尺寸，画框会量不准）；
   tif / tiff、heic / heif、jxl：浏览器自己解得了就原样用，解不了由解码工人解开再编码成 JPEG（带透明的用 PNG）。
   转换要用到页面里的 Image / 画布，由页面注入；本机文件转出来的只放在内存里，不写进缓存库。 */
const CONVERT_RE = /\.(svg|tiff?|heic|heif|jxl)$/i;
export const needsConvert = (u) => CONVERT_RE.test(String(u || '').split(/[?#]/)[0]);
let imageConverter = null;
export function setImageConverter(fn) { imageConverter = fn; }
const converted = new Map();
const nameOf = (u) => { const p = String(u || '').split(/[?#]/)[0]; return decodeURIComponent(p.slice(p.lastIndexOf('/') + 1).split('|').pop()); };
async function convertBlob(blob, url) {
  if (!imageConverter) throw new Error('image converter unavailable');
  return imageConverter(blob, nameOf(url));
}
/* svg 与其它非位图也要能画到画布上：createImageBitmap 不认 svg，走一趟 <img> */
export async function bitmapOf(blob) {
  if (!/svg/i.test(blob.type || '')) return createImageBitmap(blob);
  const u = URL.createObjectURL(blob);
  try {
    const im = new Image(); im.src = u; await im.decode();
    return await createImageBitmap(im);
  } finally { URL.revokeObjectURL(u); }
}

export async function fetchImage(url, meta = {}) {
  if (isVideoURL(url)) return fetchPoster(url, meta);
  if (url.startsWith('local:')) {                 // 本机图片：直接读，不进缓存库
    if (!localReader) throw new Error('local reader unavailable');
    const file = await localReader(url.slice(6));
    if (!needsConvert(url)) return { blob: file, fromCache: true };
    const key = url + '|' + file.size + '|' + file.lastModified;
    if (converted.has(key)) return { blob: converted.get(key), fromCache: true };
    const blob = await convertBlob(file, url);
    if (converted.size > 8) converted.delete(converted.keys().next().value);   // 转出来的可能很大，只留几张
    converted.set(key, blob);
    return { blob, fromCache: true };
  }
  /* 网上的图：有作品 id 的按作品查、按「只升不降」存；没有 id 的不进缓存 */
  /* 自定义图库（lb-）的图没有尺寸阶梯，取到的就是原图 */
  const px = String(meta.id || '').startsWith('lb-') ? ORIG : (pxOfKey(url) || ORIG);
  if (meta.id) {
    const st = await artState(meta.id);
    if (st.main && st.main.px >= px) { const b = await cacheGet(st.main.url); if (b) return { blob: b, fromCache: true }; }
  }
  const blob = await once(url, () => getNetBlob(url));
  if (meta.id) await putMain(meta.id, url, blob, px);
  return { blob, fromCache: false };
}
