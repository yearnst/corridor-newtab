/* ============================================================
   多语言 —— 让长廊说你的话

   两件事：
   1. 作品译文：把标题、艺术家、材质、收藏地、看点、介绍译成你选的
      母语与外语，存进一层覆盖层（store.js 的 tr），不动原库。
   2. 界面语言包：把设置面板与筛选词表整套译一遍，存进 packs，
      下次打开直接灌回词表。

   两件都是纯文字的活 —— 看不了图片的模型也做得来。所以「测试连接」
   只要文字那一关过了就解锁，识图那一关是另一码事。
   ============================================================ */
import * as S from './store.js';
import * as AI from './ai.js';
import * as LG from './langs.js';
import { packSource, enDate } from './i18n.js';

const S1 = (v) => String(v ?? '').trim();
const short = (m) => S1(m).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) || '未知错误';

/* ---------------- 一次带重试的纯文字请求 ---------------- */
const backoff = (n) => Math.min(20000, 600 * Math.pow(1.8, n));
const MAX_FOREVER = 30;

async function askJSON(ai, sys, user, signal, maxTok) {
  const want = Number(ai.retry) || 0;
  const max = want < 0 ? MAX_FOREVER : want;
  let last = null;
  for (let n = 0; ; n++) {
    const r = await AI.ask(ai, sys, user, null, signal, maxTok);
    if (r.ok) {
      const j = AI.parseJSON(r.text);
      if (j) return { ok: true, data: j };
      last = { ok: false, err: '模型没给出可用的 JSON', status: 0,
               raw: '模型没给出可用的 JSON · ' + S1(r.text).slice(0, 300) };
    } else last = r;
    if (n >= max || !AI.retryable(last) || signal?.aborted) break;
    await new Promise(res => setTimeout(res, backoff(n)));
    if (signal?.aborted) break;
  }
  return last || { ok: false, err: '未知错误' };
}

async function pool(list, n, fn) {
  const it = list[Symbol.iterator]();
  const one = async () => { for (; ;) { const x = it.next(); if (x.done) return; await fn(x.value); } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, list.length || 1)) }, one));
}

/* ============================================================
   一、作品译文
   ============================================================ */
export const TR_OBJ = ['title', 'artist', 'medium', 'museum', 'place', 'look', 'note'];
export const TR_FLAT = ['year', 'life'];
export const TR_FIELDS = [...TR_OBJ, ...TR_FLAT];

/* 拿哪一种当底本：目标是中日韩就优先用中文原文，别的一律走英文。
   （英文那一份是给全世界看的写法，转译到拉丁语系损耗最小。） */
export function pivotOf(w, lang) {
  const cjk = LG.isCJK(lang);
  const g = (o) => (o && typeof o === 'object') ? (cjk ? (S1(o.zh) || S1(o.en)) : (S1(o.en) || S1(o.zh))) : S1(o);
  const src = {};
  for (const k of TR_OBJ) { const v = g(w[k]); if (v) src[k] = v; }
  /* 年代与生卒是平铺的短语，里头夹着「约 / 世纪」这类中文限定词。
     目标不是中日韩时先过一遍 enDate 换成 c. / century，模型转起来省事得多 */
  for (const k of TR_FLAT) { const v = cjk ? S1(w[k]) : S1(enDate(w[k])); if (v) src[k] = v; }
  return src;
}

/* 这件作品这一种语言译过没有 —— 只要关键的那几项齐了就算齐 */
const KEY_FIELDS = ['title', 'look'];
export function hasTr(rec, w, note) {
  if (!rec) return false;
  for (const k of KEY_FIELDS) {
    if (!S1(rec[k]) && S1(pivotOf(w, 'en')[k])) return false;
  }
  if (note && S1(w.note && (w.note.en || w.note.zh)) && !S1(rec.note)) return false;
  return true;
}

/* 待译清单：{ w, lang } 一条一条摊平，好按件数算进度 */
export function pendingTr(works, tr, langs, note, force) {
  const out = [];
  for (const w of works || []) {
    for (const lg of langs) {
      if (LG.isBuiltin(lg)) continue;                 // 中英本来就有，不用译
      if (!force && hasTr(tr?.[w.id]?.[lg], w, note)) continue;
      out.push({ w, lang: lg });
    }
  }
  return out;
}

export const DEFAULT_TR_SYS = `你是美术馆的译者，替一个艺术画廊做本地化。
铁律：
1. 只翻译，不增不删不评论。原文没有的信息一个字也别加。
2. 人名、机构名、地名用目标语言的通行译法；没有通行译法就音译，并在括号里保留原文。
3. 画作标题按目标语言的美术史惯例；没有约定译名就据意译，别硬转写。
4. 保持原来的语气和长度：look 是一句话的看点，note 是展签旁那段导览。
5. year 与 life 里的年代限定词（约 / c. / 世纪 / century / 之后 / after）换成目标语言的写法，数字不要动。
6. 只输出一个 JSON 数组。不要代码块，不要前后多余的话。`;

export function trPrompt(items, lang, names) {
  const L = LG.askName(lang, names);
  const payload = items.map((x, i) => ({ i, ...x.src }));
  return {
    sys: DEFAULT_TR_SYS,
    user: `把下面每一条的每一个字段译成 ${L}（${lang}）。

输出一个 JSON 数组，长度与输入一致，每一条保留原来的 i，其余键名原样不动，值换成 ${L}：
[{"i":0,"title":"…","artist":"…"}, …]
输入里没有的键就不要出现在输出里。

输入：
${JSON.stringify(payload, null, 0)}`
  };
}

/* 只收我们认得的字段，长度也掐住，免得模型顺手写篇小作文进来。
   顺手洗掉尖括号和控制字符 —— 这些字段最终会进 DOM，界面那一层当然会转义，
   但「进来之前就不带标签」是更省心的一道防线：模型是外部输入，
   何况它读到的图片说明、网页 alt 本身也可能是别人写的。 */
export const clean = (v, n) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  .replace(/[<>]/g, '')
  .trim().slice(0, n);
const CAP = { title: 200, artist: 120, medium: 160, museum: 160, place: 160, look: 400, note: 4000, year: 80, life: 80 };
export function takeTr(src, got) {
  const rec = {};
  for (const k of TR_FIELDS) {
    if (!S1(src[k])) continue;                        // 原文没有这一项就不收
    const v = clean(got?.[k], CAP[k] || 200);
    if (v) rec[k] = v;
  }
  return Object.keys(rec).length ? rec : null;
}

/* scope: all | builtin | daily | local */
export async function translateWorks(opt = {}) {
  const { works = [], langs = [], scope = 'all', limit = 0, per = 4,
          note = true, force = false, onProgress, signal } = opt;
  const set = await S.getSettings();
  const ai = AI.profOf(set, 'text');            // 翻译走文字那一档
  if (!AI.configured(ai)) return { ok: false, reason: 'off', done: 0, fail: 0 };
  if (!(await AI.hasHost(ai.base))) return { ok: false, reason: 'perm', done: 0, fail: 0 };

  const tr = await S.getTr();
  const want = langs.filter(l => l && !LG.isBuiltin(l));
  if (!want.length) return { ok: true, done: 0, fail: 0, left: 0, reason: 'builtin' };

  let list = pendingTr(works, tr, want, note, force);
  const left0 = list.length;
  if (limit) list = list.slice(0, limit);
  if (!list.length) return { ok: true, done: 0, fail: 0, left: 0, report: [] };

  /* 同一种语言的凑在一堆，一次请求打包几件 —— 少发一次请求就少一份开销 */
  const byLang = new Map();
  for (const x of list) { if (!byLang.has(x.lang)) byLang.set(x.lang, []); byLang.get(x.lang).push(x); }
  const packs = [];
  const nper = Math.max(1, Math.min(10, Number(per) || 4));
  for (const [lang, arr] of byLang)
    for (let i = 0; i < arr.length; i += nper) packs.push({ lang, items: arr.slice(i, i + nper) });

  let done = 0, fail = 0, seen = 0, lastErr = '', lastRaw = '', lastStatus = 0;
  const report = [];
  const patch = {};
  onProgress?.({ i: 0, n: list.length, done: 0, fail: 0, row: null });

  await pool(packs, Math.max(1, Math.min(4, Number(ai.concur) || 2)), async (pk) => {
    if (signal?.aborted) return;
    const t0 = Date.now();
    const items = pk.items.map(x => {
      const src = pivotOf(x.w, pk.lang);
      if (!note) delete src.note;
      return { w: x.w, src };
    }).filter(x => Object.keys(x.src).length);
    if (!items.length) return;

    const { sys, user } = trPrompt(items, pk.lang, set.loc?.names);
    const r = await askJSON(ai, sys, user, signal, Math.min(8000, 700 + items.length * (note ? 900 : 260)));
    const ms = Date.now() - t0;

    if (!r.ok) {
      lastErr = r.err || '未知错误'; lastRaw = r.raw || lastErr; lastStatus = r.status || 0;
      for (const it of items) {
        fail++; seen++;
        const row = { id: it.w.id, lang: pk.lang, was: AI.nameOf(it.w), now: '', ok: false, err: lastErr, f: [], ms };
        report.push(row);
        onProgress?.({ i: seen, n: list.length, done, fail, row });
      }
      return;
    }
    /* 模型可能回数组，也可能回 {items:[…]} 或 {data:[…]}，都认 */
    const arr = Array.isArray(r.data) ? r.data
      : (Array.isArray(r.data?.items) ? r.data.items
        : (Array.isArray(r.data?.data) ? r.data.data
          : (Array.isArray(r.data?.result) ? r.data.result : null)));
    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      /* 按 i 对号入座；模型没给 i 就按顺序 */
      const got = arr ? (arr.find(x => Number(x?.i) === k) ?? arr[k]) : (items.length === 1 ? r.data : null);
      const rec = got ? takeTr(it.src, got) : null;
      seen++;
      const row = { id: it.w.id, lang: pk.lang, was: AI.nameOf(it.w), now: '', ok: false, err: '', f: [], ms };
      if (rec) {
        row.ok = true; row.f = Object.keys(rec); row.now = rec.title || '';
        patch[it.w.id] = Object.assign(patch[it.w.id] || {}, { [pk.lang]: rec });
        done++;
      } else { row.err = '这一条没译出来'; fail++; lastErr = row.err; }
      report.push(row);
      onProgress?.({ i: seen, n: list.length, done, fail, row });
    }
    /* 边译边存：中途停下来也不白干 */
    if (Object.keys(patch).length >= 8) { await S.mergeTr(patch); for (const k of Object.keys(patch)) delete patch[k]; }
    if (ai.gap) await new Promise(res => setTimeout(res, Number(ai.gap) || 0));
  });

  if (Object.keys(patch).length) await S.mergeTr(patch);
  return { ok: true, done, fail, left: Math.max(0, left0 - done), err: lastErr, raw: lastRaw, status: lastStatus, report };
}

/* ============================================================
   二、界面语言包
   ============================================================ */
export const DEFAULT_PACK_SYS = `你在给一个艺术画廊的浏览器扩展做界面本地化。
铁律：
1. 只回一个 JSON 对象，键原样照抄，值换成目标语言。一个键都不能少，也不要多。
2. 花括号占位符（{n} {m} {a} {b} {u} {v} 之类）必须原样保留，位置可以按语序挪，但不能删、不能改名、不能翻译。
3. <em> 这类标签原样保留。
4. 这些字要出现在按钮和标签上，务必短，别比原文长太多。
5. 这些专有名词原样保留，不要翻译：OpenAI、Anthropic、Ollama、LM Studio、Chrome、JSON、CORS、API、GLM、Wikimedia Commons、chrome-extension、OLLAMA_ORIGINS。
6. 不要代码块，不要解释。`;

export function packPrompt(chunk, lang, names) {
  const L = LG.askName(lang, names);
  const obj = {};
  for (const e of chunk) obj[e.ns + '.' + e.k] = e.en || e.zh;
  return {
    sys: DEFAULT_PACK_SYS,
    user: `把下面这些界面文案译成 ${L}（${lang}）。键是内部标识，原样照抄；值换成 ${L}。

${JSON.stringify(obj, null, 0)}`
  };
}

export const PACK_CHUNK = 40;

/* 把整套界面文案分批送出去。每一批各自重试，坏了一批不影响别的批。 */
export async function translatePack(lang, opt = {}) {
  const { onProgress, signal, force = false } = opt;
  if (!lang || LG.isBuiltin(lang)) return { ok: true, n: 0, total: 0, reason: 'builtin' };
  const set = await S.getSettings();
  const ai = AI.profOf(set, 'text');            // 界面语言包也是纯文字的活
  if (!AI.configured(ai)) return { ok: false, reason: 'off' };
  if (!(await AI.hasHost(ai.base))) return { ok: false, reason: 'perm' };

  const src = packSource();
  const have = force ? null : await S.getPack(lang);
  const done0 = {};
  if (have) for (const ns of Object.keys(have)) if (have[ns] && typeof have[ns] === 'object') done0[ns] = { ...have[ns] };
  const need = src.filter(e => !S1(done0[e.ns]?.[e.k]));

  const chunks = [];
  for (let i = 0; i < need.length; i += PACK_CHUNK) chunks.push(need.slice(i, i + PACK_CHUNK));
  if (!chunks.length) return { ok: true, n: src.length, total: src.length, pack: have, reason: 'have' };

  const out = done0;
  let got = 0, bad = 0, lastErr = '', lastRaw = '', lastStatus = 0, seen = 0;
  onProgress?.({ i: 0, n: need.length, done: 0, fail: 0 });

  await pool(chunks, Math.max(1, Math.min(3, Number(ai.concur) || 2)), async (ck) => {
    if (signal?.aborted) return;
    const { sys, user } = packPrompt(ck, lang, set.loc?.names);
    const r = await askJSON(ai, sys, user, signal, Math.min(8000, 400 + ck.length * 90));
    if (!r.ok || !r.data || typeof r.data !== 'object') {
      bad += ck.length; seen += ck.length;
      lastErr = r.err || '这一批没译出来'; lastRaw = r.raw || lastErr; lastStatus = r.status || 0;
      onProgress?.({ i: seen, n: need.length, done: got, fail: bad });
      return;
    }
    for (const e of ck) {
      const v = S1(r.data[e.ns + '.' + e.k] ?? r.data[e.k]);
      seen++;
      if (!v) { bad++; continue; }
      (out[e.ns] = out[e.ns] || {})[e.k] = clean(v, 600);
      got++;
    }
    onProgress?.({ i: seen, n: need.length, done: got, fail: bad });
    if (ai.gap) await new Promise(res => setTimeout(res, Number(ai.gap) || 0));
  });

  const total = Object.values(out).reduce((n, o) => n + Object.keys(o || {}).length, 0);
  const pack = { at: Date.now(), n: total, m: src.length, model: S1(ai.model), ...out };
  if (total) await S.setPack(lang, pack);
  return { ok: !!total, n: total, got, fail: bad, total: src.length, pack,
           err: lastErr, raw: lastRaw, status: lastStatus };
}

/* 界面包译到什么程度了 */
export async function packProgress(lang) {
  if (LG.isBuiltin(lang)) return { n: packSource().length, m: packSource().length, full: true };
  const p = await S.getPack(lang);
  const m = packSource().length;
  const n = p ? Object.entries(p).filter(([k]) => typeof p[k] === 'object')
    .reduce((a, [, o]) => a + Object.keys(o || {}).length, 0) : 0;
  return { n, m, full: n >= m, at: p?.at || 0 };
}
