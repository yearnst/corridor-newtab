/* ============================================================
   AI 补全 —— 用你自己的多模态大模型，给「每日新作」与「自定义图库」
   补齐标题、题材、材质、看点、介绍等字段。

   · 接口兼容两种格式：OpenAI 的 /chat/completions、Anthropic 的 /messages。
     本机跑的模型（Ollama / LM Studio / vLLM）填 OpenAI 格式即可。
   · 接口地址留空＝整套功能关闭，两个图库沿用原来的规则，一个请求都不发。
   · 密钥只写在本机 chrome.storage.local，只发往你自己填的那个地址。
   · 补全时会把图片缩到 1024px 以内的 JPEG 发给那个地址 —— 这是识图的前提。
     不启用就完全不发；每日新作本就是公开图片，自定义图库请自行斟酌。
   ============================================================ */
import * as S from './store.js';
import * as NET from './localnet.js';
import { MOVEMENTS, REGIONS, TAGS } from './i18n.js';

/* 名作用的题材词表就是内置藏品那 20 个；通用图片再多一档日常题材，
   两边都只能从词表里挑，挑出来的值筛选面板认得，不会长出野生标签 */
export const ART_TAGS = ['portrait', 'self-portrait', 'figure', 'group', 'landscape', 'city', 'sea', 'water',
  'snow', 'night', 'garden', 'flowers', 'still-life', 'interior', 'animals', 'mythology', 'religion', 'war',
  'dance', 'abstract'];
export const ALL_TAGS = Object.keys(TAGS);
const MV = Object.keys(MOVEMENTS);
const RG = Object.keys(REGIONS);
const FORMATS = ['std', 'tall', 'wide', 'scroll'];

const TIMEOUT = 90000;          // 单次请求上限
const MAXPX = 1024;             // 发出去的图片长边

/* ---------------- 配置 ---------------- */
/* 默认值写在 store.js 的 DEFAULTS.ai 里，这里只判断「算不算配好了」 */
const S1 = (v) => String(v ?? '').trim();
/* 模型回来的字段最终会进 DOM。界面那一层会转义，这里再去一次尖括号与控制字符 ——
   模型读的是图片与网页文字，那些都是别人写的东西，不该让它们带着标签进库。 */
export const clean = (v, n = 400) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  .replace(/[<>]/g, '')
  .trim().slice(0, n);
export const configured = (ai) => !!(ai && ai.on && S1(ai.base) && S1(ai.model));

/* ---------------- 两个角色 ----------------
   text   翻译作品信息、译界面语言包 —— 纯文字，不挑模型
   vision 看图补全作品字段 —— 非多模态模型不行

   两件事可以共用一套接口（默认），也可以各用各的：
   便宜的小模型做翻译、贵的多模态模型只在补图时才动，是很自然的分工。
   profOf() 把选中的那一档摊平成老写法（fmt/base/key/model），
   于是下面所有函数都不用管「这是哪一档」这件事。
   ---------------------------------------- */
export const ROLES = ['text', 'vision'];
export function profOf(set, role = 'vision') {
  const ai = (set && set.ai) ? set.ai : (set || {});
  const list = Array.isArray(ai.list) ? ai.list : [];
  const byId = (id) => list.find(x => x.id === id);
  let p = null;
  if (ai.split) p = byId(role === 'text' ? ai.useText : ai.useVision);
  if (!p) p = byId(ai.cur) || list[0] || null;
  return {
    ...ai,
    role,
    pid: p ? p.id : '',
    pname: p ? (S1(p.name) || '') : '',
    fmt: p ? p.fmt : 'auto', base: p ? p.base : '', key: p ? p.key : '', model: p ? p.model : '',
    keys: p ? p.keys : [], models: p ? p.models : [], probe: p ? p.probe : [],
    okAt: p ? p.okAt : 0, okText: p ? !!p.okText : false, okVision: p ? !!p.okVision : false,
    okModel: p ? p.okModel : ''
  };
}
/* 这一角色到底能不能开工 —— 凭的是实测记录，不是模型名长什么样 */
export const roleReady = (set, role) => {
  const p = profOf(set, role);
  if (!configured(p)) return false;
  return role === 'text' ? !!p.okText : !!p.okVision;
};

/* ---------------- 端点与鉴权 ---------------- */
export function detectFmt(base, fmt) {
  if (fmt === 'openai' || fmt === 'anthropic') return fmt;
  const b = S1(base).toLowerCase();
  return /anthropic|\/messages(\/|$)/.test(b) ? 'anthropic' : 'openai';
}
/* 用户可以只填到 /v1，也可以把完整地址贴进来，两种都认 */
export function endpoint(base, fmt) {
  let b = S1(base).replace(/\s/g, '');
  if (!b) return '';
  if (!/^https?:\/\//i.test(b)) b = 'https://' + b;
  b = b.replace(/\/+$/, '');
  if (/\/(chat\/completions|messages|responses)$/i.test(b)) return b;
  let path = '';
  try { path = new URL(b).pathname; } catch { return ''; }
  const ver = /\/v\d[\w.-]*(\/|$)/i.test(path);
  return b + (ver ? '' : '/v1') + (fmt === 'anthropic' ? '/messages' : '/chat/completions');
}
export function originOf(base) {
  const u = endpoint(base, 'openai');
  try { return new URL(u).origin + '/*'; } catch { return ''; }
}
/* MV3 只给了维基媒体的常驻权限，别的地址得用户点一下才拿得到 */
export async function hasHost(base) {
  const o = originOf(base); if (!o) return false;
  if (!globalThis.chrome?.permissions) return true;
  try { return await chrome.permissions.contains({ origins: [o] }); } catch { return false; }
}
export async function askHost(base) {          // 必须在用户点击里调用
  const o = originOf(base); if (!o) return false;
  if (!globalThis.chrome?.permissions) return true;
  try { return await chrome.permissions.request({ origins: [o] }); } catch { return false; }
}

/* ---------------- 一次请求 ---------------- */
function build(ai, sys, user, dataURL, maxTok = 1600) {
  const fmt = detectFmt(ai.base, ai.fmt);
  const url = endpoint(ai.base, fmt);
  const key = S1(ai.key);
  const temp = Number.isFinite(+ai.temp) ? +ai.temp : 0.2;
  if (fmt === 'anthropic') {
    const i = dataURL.indexOf(',');
    return {
      url, fmt,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: {
        model: S1(ai.model), max_tokens: maxTok, temperature: temp, system: sys,
        messages: [{ role: 'user', content: dataURL ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dataURL.slice(i + 1) } },
          { type: 'text', text: user }
        ] : [{ type: 'text', text: user }] }]
      }
    };
  }
  return {
    url, fmt,
    headers: Object.assign({ 'content-type': 'application/json' }, key ? { authorization: 'Bearer ' + key } : {}),
    body: {
      model: S1(ai.model), max_tokens: maxTok, temperature: temp,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        /* 纯文字任务（翻译、连通性自检）就发字符串 content —— 不带图片的模型
           往往只认这一种写法，数组形式反倒会被顶回来 */
        { role: 'user', content: dataURL
          ? [{ type: 'text', text: user }, { type: 'image_url', image_url: { url: dataURL } }]
          : user }
      ]
    }
  };
}
function textOf(fmt, j) {
  if (fmt === 'anthropic') return (j?.content || []).filter(p => p?.type === 'text').map(p => p.text).join('\n');
  const m = j?.choices?.[0]?.message;
  if (typeof m?.content === 'string') return m.content;
  if (Array.isArray(m?.content)) return m.content.map(p => p?.text || '').join('\n');
  return j?.choices?.[0]?.text || '';
}
/* 模型爱包代码块、爱多写一句话，都剥掉 */
export function parseJSON(s) {
  let t = S1(s);
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (f) t = f[1].trim();
  /* 对象和数组都要认：翻译那条路要的就是一个数组，
     只按 { } 去切会把 [ {…},{…} ] 切成一串对象，parse 必然失败 */
  const oa = t.indexOf('{'), ob = t.lastIndexOf('}');
  const aa = t.indexOf('['), ab = t.lastIndexOf(']');
  const cut = (a, b) => (a >= 0 && b > a) ? t.slice(a, b + 1) : null;
  /* 哪个括号先出现就以哪个为准 */
  const first = (aa >= 0 && (oa < 0 || aa < oa)) ? cut(aa, ab) : cut(oa, ob);
  for (const cand of [first, cut(oa, ob), cut(aa, ab), t]) {
    if (!cand) continue;
    try { return JSON.parse(cand); } catch { }
    try { return JSON.parse(cand.replace(/,\s*([}\]])/g, '$1')); } catch { }
  }
  return null;
}

/* 报错要短，能放进清单那一行；长网址去掉，剩下的才是有用的 */
const short = (m) => S1(m).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || '未知错误';

async function once(req, signal) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT);
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const r = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body),
      credentials: 'omit', signal: ac.signal });
    const raw = await r.text();
    /* 原始返回体留一份给诊断用 —— err 那一行要短到能塞进清单里，
       但「到底哪儿不对」的线索往往就在被截掉的后半截 */
    if (!r.ok) return { ok: false, status: r.status, err: `HTTP ${r.status} · ${short(raw)}`, raw: S1(raw).slice(0, 1200), url: req.url };
    let j = null; try { j = JSON.parse(raw); } catch { return { ok: false, err: '返回的不是 JSON', raw: S1(raw).slice(0, 600), url: req.url }; }
    return { ok: true, text: textOf(req.fmt, j) };
  } catch (e) {
    const m = S1(e?.message);
    return { ok: false, err: e?.name === 'AbortError' ? '超时或已取消' : ('网络错误 · ' + short(m)), raw: m.slice(0, 600), url: req.url };
  } finally { clearTimeout(t); signal?.removeEventListener('abort', onAbort); }
}
/* 400 的原因已经写在返回体里、且跟 response_format 无关时，脱字段再试一次也是白试。
   最常见的就是「这个模型不认图片」和「没这个模型」—— 探测时这一下能省掉一半请求。 */
const NO_DEGRADE = /messages\.content\.type|image_url|input tag 'image'|only support(s)? text|model[^]{0,30}(not\s+found|does\s+not\s+exist|no\s+such)|"?code"?\s*[:=]\s*"?1210"?|不支持图片|模型不存在/i;
const noRetryBody = (raw) => NO_DEGRADE.test(S1(raw));

/* 有些兼容服务不认 response_format / temperature，被顶回来就脱掉再试一次 */
export async function ask(ai, sys, user, dataURL, signal, maxTok) {
  const req = build(ai, sys, user, dataURL, maxTok);
  if (!req.url) return { ok: false, err: '接口地址填得不对', status: 0, raw: 'bad base url' };
  /* 本机地址：先把「来源改写」那条规则铺上，否则 Ollama 会以 403 顶回来 */
  await NET.ensure(ai.base, S.getSettings);
  let r = await once(req, signal);
  if (!r.ok && (r.status === 400 || r.status === 422) && !noRetryBody(r.raw)) {
    const b = { ...req.body }; delete b.response_format; delete b.temperature;
    r = await once({ ...req, body: b }, signal);
  }
  return r;
}

/* ---------------- 图片 ---------------- */
async function toJPEG(blob, px = MAXPX) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, px / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = new OffscreenCanvas(w, h);
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = await c.convertToBlob({ type: 'image/jpeg', quality: 0.82 });
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('encode'));
    fr.readAsDataURL(out);
  });
}
/* 每日新作走网络缩略图；自定义图库走本机文件（只有页面里读得到，
   后台服务拿不到目录句柄，会自然跳过，留给下次打开新标签页时补） */
async function imageOf(w) {
  if (w.local) {
    const { blob } = await S.fetchImage(w.img.base);
    return toJPEG(blob);
  }
  const sizes = w.img?.sizes?.length ? w.img.sizes : [960];
  const px = sizes.find(s => s >= 900) ?? sizes[sizes.length - 1];
  const { blob } = await S.fetchImage(`${w.img.base}/${px}px-${w.img.name}`, { id: w.id });
  return toJPEG(blob);
}

/* ---------------- 提示词 ----------------
   三份模板都可以在设置里改。花括号里的是占位符，发出去之前会被换掉：
     {title} {artist} {year} {museum} {file} {folder} {dims}  已知线索
     {shape}     要求模型输出的 JSON 骨架
     {vocab}     词表约束（流派 / 地区 / 题材 / 画幅 / 办公模式 / 把握）
     {movements} {regions} {tags}   单独的词表
     {noteLen}   介绍字数要求，跟着「生成作品介绍」开关走
   改坏了不会出安全问题：词表是在代码里过滤的，不靠模型自觉。
   ---------------------------------------- */
export const DEFAULT_SYS = `你是美术馆的编目员，也懂摄影、设计与日常影像。你的工作是看图，为一张图片补全条目信息。
铁律：
1. 只依据图像本身和给出的线索。拿不准就留空字符串（数组留空数组），绝不编造人名、年代、机构、尺寸。
2. 中文用简体，英文用地道英文，两边表达同一个意思，不必逐字对译。
3. 只输出一个 JSON 对象。不要代码块、不要前后多余的话。`;

export const DEFAULT_ART = `这是一件绘画作品。已知线索（可能不准，可以纠正）：
标题：{title}
艺术家：{artist}
年代：{year}
收藏机构：{museum}
原文件名：{file}

请按下面的结构输出 JSON：
{shape}
写作要求：
· title_zh 给通行中文译名，没有约定译名就据画面意译；title_en 保留或纠正原名。
· artist 只在你确实认得这位艺术家时填，否则原样保留线索里的名字。
· look 一句话，二十字上下，说这幅画最值得看的地方，中英各一句。
· note {noteLen}，讲画的内容、画法与它的来历，像展签旁边那段导览，别堆形容词。
{vocab}`;

export const DEFAULT_ANY = `这是用户自己图库里的一张图片。它可能是照片、截图、插画、设计稿、海报、词卡、闪卡、游戏卡、扫描件等，也可能是绘画——先看清楚它到底是什么，别默认它是名画。如果是海报或图书封面，文件名格式为：《**》电影海报/《**》图书封面，艺术作品参考如下信息项，其他类型按最佳方式揭示作品。
已知线索（多半是从文件名和文件夹名猜的，很可能没意义）：
文件名：{file}
现用标题：{title}
所在文件夹：{folder}
像素尺寸：{dims}
请按下面的结构输出 JSON：
{shape}
写作要求：
· title 用一句朴素的话说清画面里是什么，八到十六个字，像相册里给照片起的名字，不要艺术品式的题目。
  画面上印着的片名、书名、品牌名、地名、赛事名可以直接用进标题，认得出就别绕开它。
· artist：只有画面上有清晰署名、水印、落款，或它确实是你认得的知名作品时才填；否则一律留空，别把文件夹名当作者。
· year：画面上有日期或年份才填，否则留空。
· medium 写它是什么：摄影 / 数码插画 / 水彩 / 海报设计 / 屏幕截图 / 三维渲染 之类。
· place：能看出具体地点才填。museum 一般留空。
· look 一句话，二十字上下，说这张图最抓人的地方。
· note {noteLen}，写画面内容、构图、光线与色彩、给人的感觉。就事论事，不要拔高。
{vocab}`;

const SHAPE = `{
 "kind": "",        // painting|drawing|print|photo|illustration|design|screenshot|other
 "title_zh": "", "title_en": "",
 "artist_zh": "", "artist_en": "",
 "year": "", 
 "medium_zh": "", "medium_en": "",
 "movement": "", "region": "",
 "place_zh": "", "place_en": "",
 "museum_zh": "", "museum_en": "",
 "tags": [], "format": "", "mature": false,
 "look_zh": "", "look_en": "",
 "note_zh": "", "note_en": "",
 "conf": 0
}`;
export const NOTE_LEN = {
  art: { on: '中文 120–200 字，英文 60–110 词', off: '留空' },
  any: { on: '中文 60–120 字，英文 30–70 词', off: '留空' }
};
export const PLACEHOLDERS = ['title', 'artist', 'year', 'museum', 'file', 'folder', 'dims',
  'shape', 'vocab', 'noteLen', 'movements', 'regions', 'tags'];

function vocabText(tags) {
  return `movement 只能取以下之一或留空：${MV.join(' / ')}
region 只能取以下之一或留空：${RG.join(' / ')}
tags 只能从以下里挑 1–5 个：${tags.join(' / ')}
format 只能取：std（常规）/ tall（竖长）/ wide（横长）/ scroll（长卷），拿不准留空
mature：画面有裸体、血腥或不适合在办公室屏幕上出现的内容时为 true，否则 false
conf：你对这条判断的把握，0 到 1`;
}
/* 只认得的占位符才替换，写错的原样留着，好让人一眼看出没生效 */
const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

function varsOf(w, kind, note) {
  const t = w.title || {}, a = w.artist || {}, m = w.museum || {};
  const list = kind === 'art' ? ART_TAGS : ALL_TAGS;
  const dims = w.img?.w ? `${w.img.w} × ${w.img.h}` : (w.dims || '（无）');
  return {
    title: (kind === 'art' ? (t.en || t.zh) : (t.zh || t.en)) || '（无）',
    artist: (a.en || a.zh) || '（无）',
    folder: (a.zh || a.en) || '（无）',
    year: w.year || '（无）',
    museum: (m.en || m.zh) || '（无）',
    file: w.img?.name || w.src?.file || '（无）',
    dims,
    shape: SHAPE,
    vocab: vocabText(list),
    noteLen: NOTE_LEN[kind][note ? 'on' : 'off'],
    movements: MV.join(' / '), regions: RG.join(' / '), tags: list.join(' / ')
  };
}
/* 设置里留空就用内置的那份 */
export const promptsOf = (ai) => ({
  sys: S1(ai?.pSys) || DEFAULT_SYS,
  art: S1(ai?.pArt) || DEFAULT_ART,
  any: S1(ai?.pAny) || DEFAULT_ANY
});
export function buildPrompt(w, ai) {
  const kind = w.local ? 'any' : 'art';
  const p = promptsOf(ai);
  return { kind, sys: p.sys, user: fill(kind === 'art' ? p.art : p.any, varsOf(w, kind, ai?.note !== false)) };
}
/* 设置面板里的「看看实际发出去什么」：有待补的就拿真作品渲染，没有就用样例 */
const SAMPLE = {
  art: { title: { zh: 'The Starry Night', en: 'The Starry Night' }, artist: { zh: 'van Gogh', en: 'van Gogh' },
        year: '', museum: { zh: '', en: '' }, img: { name: 'Van_Gogh_-_Starry_Night.jpg', w: 2000, h: 1580 } },
  any: { local: true, title: { zh: 'IMG_2043', en: 'IMG_2043' }, artist: { zh: 'Downloads', en: 'Downloads' },
        year: '', img: { name: 'IMG_2043.jpg', w: 3024, h: 4032 } }
};
export function previewPrompt(ai, kind, work) {
  const w = work || SAMPLE[kind] || SAMPLE.art;
  const p = promptsOf(ai);
  return { sys: p.sys, user: fill(kind === 'art' ? p.art : p.any, varsOf(w, kind, ai?.note !== false)) };
}

/* ---------------- 结果落回作品 ---------------- */
/* 相机、微信、截图工具起的名字——这类标题该换掉 */
const JUNK_PREFIX = /^(?:img|dsc|dscn|dscf|pxl|photo|image|picture|pic|screen[\s_-]?shot|屏幕?截图|截屏|截图|微信图片|wechatimg|mmexport|qq图片|download|图片|照片|psx|inked|gopro|dji|panorama|pano|vlcsnap|snapshot|capture|scan|scanned|export|output|tmp|temp|file|video)/i;
const JUNK_PLAIN = /^(?:未命名|untitled|no ?name|new file|新建\S*|无标题)[\s._\-()0-9]*$|^[\d\s._\-–—:()]{4,}$|^[0-9a-f-]{8,}$/i;
const JUNK_FOLDER = /^(downloads?|desktop|documents|pictures|photos|images|img|imgs|新建文件夹|下载|桌面|图片|照片|截图|screenshots?|wallpapers?|壁纸|素材|未分类|misc|temp|tmp|assets|media|camera|dcim|保存的图片|收藏)$/i;
/* 相机、截图工具、微信起的名字：要么整个就是「未命名」，
   要么是「前缀＋一串数字」——后半段几乎没有字，才算机器名，
   「Photo of a cat」这种有内容的标题不能误伤 */
export function junkTitle(s) {
  s = S1(s);
  if (!s || s.length < 2) return true;
  if (JUNK_PLAIN.test(s)) return true;
  const m = s.match(JUNK_PREFIX);
  if (!m) return false;
  const rest = s.slice(m[0].length);
  const digits = (rest.match(/\d/g) || []).length;
  const letters = (rest.match(/[A-Za-z一-鿿]/g) || []).length;
  return !rest.trim() || (digits >= 4 && letters <= 4);
}

const pick = (v, list) => { const x = S1(v).toLowerCase(); return list.includes(x) ? x : ''; };
function yearNum(s) {
  const t = S1(s);
  const r = t.match(/\b([5-9]\d{2}|1\d{3}|20[0-4]\d)\b/);
  if (r) return +r[1];
  const c = t.match(/(\d{1,2})\s*(?:世纪|th|st|nd|rd)?\s*(?:century)?/i);
  return c && /世纪|century/i.test(t) ? (+c[1] - 1) * 100 + 50 : 0;
}

/* 返回被改动的字段名清单（可能是空数组＝看过了但没什么可补），失败返回 null */
export function applyResult(w, r, ai) {
  if (!r || typeof r !== 'object') return null;
  const over = !!ai.over, local = !!w.local;
  const ch = [];
  const put = (name, obj, zh, en) => {              // 双语字段：有一边就补一边
    zh = clean(zh, name === 'note' ? 4000 : 400); en = clean(en, name === 'note' ? 4000 : 400);
    if (!zh && !en) return;
    let hit = false;
    if (!obj.zh || over) { if (obj.zh !== (zh || en)) hit = true; obj.zh = zh || en; }
    if (!obj.en || over) { if (obj.en !== (en || zh)) hit = true; obj.en = en || zh; }
    if (hit) ch.push(name);
  };
  const one = (k, v) => { v = clean(v, 120); if (v && (!S1(w[k]) || over) && w[k] !== v) { w[k] = v; ch.push(k); } };

  /* 标题：本机图库的标题本来就是文件名，机器起的名字才换掉，像样的不动 */
  const nz = clean(r.title_zh, 200), ne = clean(r.title_en, 200);
  const CJK = /[一-鿿]/;
  if (nz || ne) {
    const cur = w.title || (w.title = { zh: '', en: '' });
    const was = cur.zh + ' | ' + cur.en;
    const keep = local && ai.rename === 'never';
    const machine = local && !keep && (ai.rename === 'always' || (junkTitle(cur.zh) && junkTitle(cur.en)));
    if (!keep) {
      if (machine || over) { cur.zh = nz || ne; cur.en = ne || nz; }
      else {
        /* 每日新作常见：中文名那一格塞的还是英文原名，补个通行译名 */
        const latinZh = !local && S1(cur.zh) === S1(cur.en) && !CJK.test(cur.zh);
        if (!S1(cur.zh) || (latinZh && CJK.test(nz))) cur.zh = nz || cur.zh;
        if (!S1(cur.en)) cur.en = ne || cur.en;
      }
    }
    if (was !== cur.zh + ' | ' + cur.en) ch.push('title');
  }
  /* 作者：本机图库里那个「作者」其实是上层文件夹名，只在模型真认出人时才动 */
  const az = clean(r.artist_zh, 120), ae = clean(r.artist_en, 120);
  const art = w.artist || (w.artist = { zh: '', en: '' });
  if (local) {
    const wasA = art.zh + ' | ' + art.en;
    const folderish = JUNK_FOLDER.test(S1(art.zh)) || JUNK_FOLDER.test(S1(art.en));
    if (az || ae) { if (folderish || !S1(art.zh) || over) { art.zh = az || ae; art.en = ae || az; } }
    else if (folderish && ai.rename !== 'never') { art.zh = ''; art.en = ''; }
    if (wasA !== art.zh + ' | ' + art.en) ch.push('artist');
  } else put('artist', art, az, ae);

  if (!w.medium) w.medium = { zh: '', en: '' };
  if (!w.museum) w.museum = { zh: '', en: '' };
  if (!w.place) w.place = { zh: '', en: '' };
  if (!w.look) w.look = { zh: '', en: '' };
  if (!w.note) w.note = { zh: '', en: '' };
  put('medium', w.medium, r.medium_zh, r.medium_en);
  put('museum', w.museum, r.museum_zh, r.museum_en);
  put('place', w.place, r.place_zh, r.place_en);
  put('look', w.look, r.look_zh, r.look_en);
  if (ai.note !== false) put('note', w.note, r.note_zh, r.note_en);

  one('year', r.year);
  if (S1(w.year) && !w.ys) { const y = yearNum(w.year); if (y) { w.ys = y; ch.push('ys'); } }
  const mv = pick(r.movement, MV); if (mv && (!w.movement || over) && w.movement !== mv) { w.movement = mv; ch.push('movement'); }
  const rg = pick(r.region, RG); if (rg && (!w.region || over) && w.region !== rg) { w.region = rg; ch.push('region'); }

  const good = (local ? ALL_TAGS : ART_TAGS);
  const got = (Array.isArray(r.tags) ? r.tags : []).map(x => S1(x).toLowerCase()).filter(x => good.includes(x));
  if (got.length) {
    const next = [...new Set(over ? got : [...(w.tags || []), ...got])].slice(0, 6);
    if (next.join() !== (w.tags || []).join()) { w.tags = next; ch.push('tags'); }
  }

  const fm = pick(r.format, FORMATS);
  if (fm === 'scroll' && (w.img?.ar || 0) >= 2.5 && w.format !== 'scroll') { w.format = 'scroll'; ch.push('format'); }

  if (r.mature === true && !w.mature) { w.mature = true; ch.push('mature'); }   // 只往「不适合办公」的方向拨
  w.ai = { at: Date.now(), m: S1(ai.model), c: Number(r.conf) || 0, n: ch.length };
  return ch;
}

/* 报告里显示的名字 */
export const nameOf = (w) => S1(w && w.title && w.title.zh) || S1(w && w.title && w.title.en)
  || S1(w && w.img && w.img.name) || S1(w && w.id) || '?';

/* ---------------- 单张 ---------------- */
export async function describe(w, ai, signal) {
  let dataURL;
  try { dataURL = await imageOf(w); }
  catch (e) { return { ok: false, err: '读不到图片 · ' + short(e?.message), soft: true }; }
  const { sys, user } = buildPrompt(w, ai);
  const r = await ask(ai, sys, user, dataURL, signal);
  if (!r.ok) return r;
  const j = parseJSON(r.text);
  if (!j) return { ok: false, err: '模型没给出可用的 JSON', status: 0, raw: '模型没给出可用的 JSON · ' + S1(r.text).slice(0, 300) };
  return { ok: true, data: j };
}

/* 值得再试一次的：限流、服务器抽风、网络断一下、模型这次没好好回话。
   密钥不对、地址不对、图片不存在这些，重试一百次也还是那样。 */
export function retryable(r) {
  if (!r || r.ok) return false;
  if (r.soft) return false;                       // 读不到本机图片：这一轮再来也没用
  const st = Number(r.status) || 0;
  if ([400, 401, 403, 404, 405, 422].includes(st)) return false;
  return true;
}
const MAX_FOREVER = 30;                           // 「直至成功」也得有个头
const backoff = (n) => Math.min(20000, 600 * Math.pow(1.8, n));

/* 带重试的单张：返回 { ok, data|err, tries } */
export async function describeRetry(w, ai, signal, onTry) {
  const want = Number(ai.retry) || 0;
  const max = want < 0 ? MAX_FOREVER : want;
  let r, n = 0;
  for (;;) {
    r = await describe(w, ai, signal);
    n++;
    if (r.ok || n > max || !retryable(r) || signal?.aborted) break;
    onTry?.(n, r);
    await new Promise(res => setTimeout(res, backoff(n - 1)));
    if (signal?.aborted) break;
  }
  return { ...r, tries: n };
}

/* ---------------- 批量 ---------------- */
export const needsAI = (w, ai, force) => (force || !w.ai?.at) &&
  ((w.daily && ai.forDaily !== false) || (w.local && ai.forLocal !== false));

export function pendingOf(daily, lib, ai, force) {
  const d = ai.forDaily === false ? [] : (daily?.works || []).filter(w => needsAI(w, ai, force));
  const l = ai.forLocal === false ? [] : (lib?.works || []).filter(w => needsAI(w, ai, force));
  return { daily: d, local: l, n: d.length + l.length };
}

async function pool(list, n, fn) {
  const it = list[Symbol.iterator]();
  const one = async () => { for (;;) { const x = it.next(); if (x.done) return; await fn(x.value); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, list.length || 1)) }, one));
}

let running = false;
export const isRunning = () => running;

/* scope: 'all' | 'daily' | 'local'；local 只有在页面里才跑得动（后台读不到本机目录） */
export async function runBatch(opt = {}) {
  const { scope = 'all', force = false, limit = 0, onProgress, signal } = opt;
  const set = await S.getSettings();
  const ai = profOf(set, 'vision');            // 补全用的是识图那一档
  if (!configured(ai)) return { ok: false, reason: 'off', done: 0, fail: 0 };
  if (running) return { ok: false, reason: 'busy', done: 0, fail: 0 };
  if (!(await hasHost(ai.base))) return { ok: false, reason: 'perm', done: 0, fail: 0 };

  /* 页面和后台各有一份模块实例，靠存储里的一把租约互相避让，
     别把同一批图片补两遍 —— chrome.storage 没有原子比较写，
     所以写上自己的记号、等一小会儿再看还在不在，在才算抢到 */
  const tok = Math.random().toString(36).slice(2) + '-' + Date.now();
  const lk = await S.getAIState();
  if (lk.lock && Date.now() - lk.lock < 600000) return { ok: false, reason: 'busy', done: 0, fail: 0 };
  await S.setAIState({ lock: Date.now(), tok });
  await new Promise(r => setTimeout(r, 140 + Math.random() * 200));
  if ((await S.getAIState()).tok !== tok) return { ok: false, reason: 'busy', done: 0, fail: 0 };

  running = true;
  const t0 = Date.now();
  let done = 0, fail = 0, lastErr = '';
  try {
    const [daily, lib] = await Promise.all([S.getDaily(), S.getLocalLib()]);
    const p = pendingOf(daily, lib, ai, force);
    let list = [];
    if (scope !== 'local') list = list.concat(p.daily.map(w => ({ w, box: 'daily' })));
    if (scope !== 'daily') list = list.concat(p.local.map(w => ({ w, box: 'local' })));
    const cap = limit || Number(ai.batch) || 20;
    list = list.slice(0, cap);
    if (!list.length) { await S.setAIState({ lock: 0, tok: '' }); return { ok: true, done: 0, fail: 0, left: 0 }; }

    let dirtyD = false, dirtyL = false, since = 0;
    const flush = async () => {
      if (dirtyD) { await S.setDaily(daily); dirtyD = false; }
      if (dirtyL) { await S.setLocalLib(lib); dirtyL = false; }
      await S.setAIState({ lock: Date.now(), tok });        // 续租：长队列别被当成死锁
      since = 0;
    };
    let i = 0;
    const report = [];
    onProgress?.({ i: 0, n: list.length, done: 0, fail: 0, row: null });
    await pool(list, Math.max(1, Math.min(4, Number(ai.concur) || 2)), async ({ w, box }) => {
      if (signal?.aborted) return;
      const t1 = Date.now(), was = nameOf(w);
      const r = await describeRetry(w, ai, signal);
      const row = { id: w.id, box, was, now: was, ok: false, err: '', f: [], ms: Date.now() - t1, tries: r.tries || 1 };
      if (r.ok) {
        const ch = applyResult(w, r.data, ai);
        if (ch) {
          row.ok = true; row.f = ch; row.now = nameOf(w); row.ms = Date.now() - t1;
          done++; box === 'daily' ? (dirtyD = true) : (dirtyL = true);
        } else { row.err = '模型返回的内容用不了'; fail++; lastErr = row.err; }
      } else {
        /* 本机图片读不到多半是权限没给，别把它标成已补，下次还能再来 */
        row.err = r.err || '未知错误'; fail++; lastErr = row.err;
      }
      report.push(row);
      if (++since >= 4) await flush();
      onProgress?.({ i: ++i, n: list.length, done, fail, row });
      if (ai.gap) await new Promise(r2 => setTimeout(r2, Number(ai.gap) || 250));
    });
    await flush();

    const left = pendingOf(daily, lib, ai, force).n;
    await S.setAIState({ at: Date.now(), done, fail, left, err: lastErr, ms: Date.now() - t0,
      report: report.slice(-200), lock: 0, tok: '' });
    return { ok: true, done, fail, left, err: lastErr, report };
  } catch (e) {
    await S.setAIState({ at: Date.now(), err: S1(e?.message).slice(0, 120), lock: 0, tok: '' });
    return { ok: false, reason: 'error', err: S1(e?.message), done, fail };
  } finally { running = false; try { await S.setAIState({ lock: 0, tok: '' }); } catch { } }
}

/* 补全清单里点一行的重试：只补这一张，回一条新的记录 */
export async function retryOne(id, box) {
  const set = await S.getSettings();
  const ai = profOf(set, 'vision');
  if (!configured(ai)) return { ok: false, reason: 'off' };
  if (!(await hasHost(ai.base))) return { ok: false, reason: 'perm' };
  if (running) return { ok: false, reason: 'busy' };
  /* 后台正跑着一整批时别插队：它到时候会把整份库写回去，这一张会被冲掉 */
  const lk = await S.getAIState();
  if (lk.lock && Date.now() - lk.lock < 600000) return { ok: false, reason: 'busy' };
  const store = box === 'local' ? await S.getLocalLib() : await S.getDaily();
  const w = (store.works || []).find(x => x.id === id);
  if (!w) return { ok: false, reason: 'gone' };

  running = true;
  const t1 = Date.now(), was = nameOf(w);
  const row = { id, box, was, now: was, ok: false, err: '', f: [], ms: 0, tries: 1 };
  try {
    const r = await describeRetry(w, ai);
    row.tries = r.tries || 1;
    if (r.ok) {
      const ch = applyResult(w, r.data, ai);
      if (ch) {
        row.ok = true; row.f = ch; row.now = nameOf(w);
        box === 'local' ? await S.setLocalLib(store) : await S.setDaily(store);
      } else row.err = '模型返回的内容用不了';
    } else row.err = r.err || '未知错误';
  } catch (e) { row.err = short(e?.message); }
  finally { running = false; }
  row.ms = Date.now() - t1;

  /* 存下来的那份记录里，把这一行换成新的 */
  try {
    const st = await S.getAIState();
    const rep = (st.report || []).map(x => (x.id === id && x.box === box) ? row : x);
    await S.setAIState({ report: rep });
  } catch { }
  return { ok: true, row };
}

/* 清掉补全记号，让下一轮重新补（已写进去的字段不会退回原样） */
export async function clearMarks(scope = 'all') {
  if (scope !== 'local') { const d = await S.getDaily(); for (const w of d.works || []) delete w.ai; await S.setDaily(d); }
  if (scope !== 'daily') { const l = await S.getLocalLib(); for (const w of l.works || []) delete w.ai; await S.setLocalLib(l); }
}

/* ---------------- 列一列这个接口有哪些模型 ----------------
   OpenAI 兼容与 Anthropic 都提供 GET /v1/models。拉不到就返回空，
   界面会退回到「你自己存过的那几个」。 */
export function modelsURL(base, fmt) {
  const ep = endpoint(base, fmt);
  if (!ep) return '';
  try {
    const u = new URL(ep);
    u.pathname = u.pathname.replace(/\/(chat\/completions|messages|responses)$/i, '/models');
    u.search = '';
    return u.toString();
  } catch { return ''; }
}
export async function listModels(ai, signal) {
  const fmt = detectFmt(ai.base, ai.fmt);
  const url = modelsURL(ai.base, fmt);
  if (!url) return { ok: false, err: '接口地址填得不对', models: [] };
  await NET.ensure(ai.base, S.getSettings);
  const key = S1(ai.key);
  const headers = fmt === 'anthropic'
    ? { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
    : (key ? { authorization: 'Bearer ' + key } : {});
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 20000);
  const onAbort = () => ac.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const r = await fetch(url, { headers, credentials: 'omit', signal: ac.signal });
    const raw = await r.text();
    if (!r.ok) return { ok: false, status: r.status, err: `HTTP ${r.status} · ${short(raw)}`, raw: raw.slice(0, 600), models: [] };
    let j = null; try { j = JSON.parse(raw); } catch { return { ok: false, err: '返回的不是 JSON', raw: raw.slice(0, 400), models: [] }; }
    /* 各家外壳不一：{data:[{id}]} / {models:[{name}]} / {data:[…字符串]} 都见过 */
    const arr = Array.isArray(j) ? j : (j.data || j.models || j.result || []);
    const models = [...new Set(arr.map(x => S1(typeof x === 'string' ? x : (x?.id ?? x?.name ?? x?.model))).filter(Boolean))];
    return { ok: true, models };
  } catch (e) {
    const m = S1(e?.message);
    return { ok: false, err: e?.name === 'AbortError' ? '超时或已取消' : ('网络错误 · ' + short(m)), raw: m.slice(0, 400), models: [] };
  } finally { clearTimeout(t); signal?.removeEventListener('abort', onAbort); }
}

/* 名字里带这些字样的，多半是能识图的 —— 只用来把探测队列排个先后，
   不作数，最终认不认图片一律以实测为准。 */
const VISIONISH = /(^|[-_/.])(v|vl|vlm|vision|visual|multimodal|omni|mm)([-_.\d]|$)|llava|pixtral|internvl|minicpm-?v|cogvlm|qwen.*vl|gpt-4o|gemini|claude-3|claude-[45]|glm-4\.?[15]?v|step-1o|molmo|idefics|phi-.*vision|granite.*vision/i;
export const looksVision = (m) => VISIONISH.test(S1(m));
/* 一眼就知道不是聊天模型的（嵌入、重排、语音、画图），别浪费一次请求 */
const NOT_CHAT = /embed|rerank|moderation|whisper|tts|audio|speech|image-?gen|dall-?e|stable-?diffusion|flux|sd3|cogview|wanx|upscal|ocr-?only|guard/i;
export const isChatModel = (m) => !NOT_CHAT.test(S1(m));

/* ---------------- 探测：这个模型到底行不行 ----------------
   不猜。真发两个请求：一句纯文字，一张小图。
   回 { m, text, vision, err, ms }。
   ---------------------------------------- */
let probeImg = null;
async function tinyJPEG() {
  if (probeImg) return probeImg;
  const c = new OffscreenCanvas(96, 64), g = c.getContext('2d');
  g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 96, 64);
  g.fillStyle = '#c0392b'; g.beginPath(); g.arc(48, 32, 20, 0, Math.PI * 2); g.fill();
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: .9 });
  probeImg = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  return probeImg;
}

export async function probeModel(ai, model, signal, opt = {}) {
  const one = { ...ai, model: S1(model) };
  const t0 = Date.now();
  const row = { m: S1(model), text: false, vision: false, err: '', status: 0, raw: '', ms: 0, at: Date.now() };
  /* 第一步：纯文字 */
  const t = await ask(one, '你只输出 JSON，不要任何多余的话。',
    '把「你好」译成英文。输出 {"say":"…"}', null, signal, 200);
  if (!t.ok) {
    row.err = t.err || '未知错误'; row.status = t.status || 0; row.raw = t.raw || row.err;
    row.ms = Date.now() - t0; return row;
  }
  const tj = parseJSON(t.text);
  row.text = !!(tj && S1(tj.say));
  if (!row.text) { row.err = '通了，但没按 JSON 回话'; row.raw = S1(t.text).slice(0, 300); row.ms = Date.now() - t0; return row; }
  if (opt.textOnly) { row.ms = Date.now() - t0; return row; }
  /* 第二步：给它看一张小图 */
  const url = await tinyJPEG();
  const v = await ask(one, '你只输出 JSON。', '图里是什么形状、什么颜色？输出 {"shape":"","color":""}', url, signal);
  if (!v.ok) { row.err = v.err || ''; row.status = v.status || 0; row.raw = v.raw || row.err; row.ms = Date.now() - t0; return row; }
  const vj = parseJSON(v.text);
  row.vision = !!(vj && (S1(vj.shape) || S1(vj.color)));
  /* 把它「看见了什么」原样带回去 —— 界面上报一句「红色 圆形」比一句「通过」让人踏实 */
  if (row.vision) row.saw = `${S1(vj.color)} ${S1(vj.shape)}`.trim();
  else { row.err = '看不了图片'; row.raw = S1(v.text).slice(0, 300); }
  row.ms = Date.now() - t0;
  return row;
}

/* 把一批模型挨个探一遍。onRow 每探完一个回调一次。 */
export async function probeModels(ai, models, opt = {}) {
  const { onRow, signal, concur = 2, textOnly = false } = opt;
  const list = [...new Set((models || []).map(S1).filter(Boolean))];
  const out = [];
  await pool(list, Math.max(1, Math.min(4, Number(concur) || 2)), async (m) => {
    if (signal?.aborted) return;
    const row = await probeModel(ai, m, signal, { textOnly });
    out.push(row);
    onRow?.(row);
    if (ai.gap) await new Promise(r => setTimeout(r, Number(ai.gap) || 0));
  });
  return out;
}

/* ---------------- 连通性自检 ----------------
   跟 probeModel 是同一件事：先纯文字，再看图。
   「这个模型能不能识图」永远是实测出来的结论，不看它叫什么名字。
   ---------------------------------------- */
export async function test(ai, signal) {
  if (!S1(ai.base)) return { ok: false, msg: '还没填接口地址', code: 'nobase' };
  if (!S1(ai.model)) return { ok: false, msg: '还没填模型名', code: 'nomodelname' };
  if (!(await hasHost(ai.base))) return { ok: false, msg: 'perm', code: 'perm' };

  const r = await probeModel(ai, ai.model, signal);
  const base = { reach: r.text || !!r.status || !r.err.startsWith('网络错误'),
                 text: r.text, vision: r.vision, status: r.status || 0, raw: r.raw || r.err, ms: r.ms };
  if (r.vision) return { ok: true, ...base, reach: true, saw: r.saw || '',
                         msg: r.saw ? `文字与图片都答上了（${r.saw}）` : '文字与图片都答上了' };
  if (r.text) return { ok: false, ...base, reach: true, msg: r.err || '通了，但这个模型看不了图片' };
  return { ok: false, ...base, reach: false, msg: r.err || '未知错误' };
}
