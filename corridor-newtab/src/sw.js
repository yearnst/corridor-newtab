/* 后台服务：定时把作品图片预取到本地，保证离线可用 */
import * as S from './store.js';
import { runDaily } from './daily.js';
import * as AI from './ai.js';

const LADDER = [120, 250, 330, 500, 960, 1280, 1920, 3840];
const url = (w, px) => `${w.img.base}/${px}px-${w.img.name}`;
const pick = (w, target) => w.img.sizes.find(s => s >= target) ?? w.img.sizes.at(-1);

async function catalog() {
  const r = await fetch(chrome.runtime.getURL('data/catalog.json'));
  return r.json();
}

async function prefetch(limit = 8) {
  if (!navigator.onLine) return;
  const set = await S.getSettings();
  const st = await S.cacheStats();
  if (st.bytes > set.cacheLimitMB * 1048576 * 0.95) return;
  const cat = await catalog();
  const target = set.quality === 'saver' ? 1280 : set.quality === 'max' ? 3840 : 1920;
  let n = 0;
  for (const w of cat) {
    if (n >= limit) break;
    if (set.workSafe && w.mature) continue;
    const u = url(w, pick(w, target));
    if (await S.cacheHas(u)) continue;
    try { await S.fetchImage(u, { id: w.id }); n++; } catch { /* 忽略网络错误 */ }
    await new Promise(r => setTimeout(r, 400));
  }
  await S.cacheTrim(set.cacheLimitMB * 1048576);
}

/* ---------- AI 补全 ----------
   后台只补得了「每日新作」：自定义图库的目录句柄要在页面里才读得到，
   所以本机图片留给下一次打开新标签页时补，这里只负责把时钟摆上。 */
async function armAI() {
  const ai = (await S.getSettings()).ai || {};
  try { await chrome.alarms.clear('corridor-ai'); } catch { }
  const every = Number(ai.sched) || 0;
  if (!AI.configured(ai) || !every) return;
  chrome.alarms.create('corridor-ai', { delayInMinutes: 5, periodInMinutes: Math.max(15, every) });
}
async function aiRun(scope = 'daily') {
  const ai = (await S.getSettings()).ai || {};
  if (!AI.configured(ai)) return { done: 0, fail: 0, reason: 'off' };
  return AI.runBatch({ scope });
}
/* 设置一改就重新对时 */
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.settings) armAI(); });

chrome.runtime.onInstalled.addListener(async (d) => {
  await S.setSettings({});                     // 写入默认值
  chrome.alarms.create('corridor-prefetch', { delayInMinutes: 1, periodInMinutes: 180 });
  chrome.alarms.create('corridor-daily', { delayInMinutes: 3, periodInMinutes: 360 });
  armAI();
  if (d.reason === 'install') chrome.tabs.create({});
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('corridor-prefetch', { delayInMinutes: 2, periodInMinutes: 180 });
  chrome.alarms.create('corridor-daily', { delayInMinutes: 4, periodInMinutes: 360 });
  armAI();
});
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'corridor-prefetch') prefetch();
  if (a.name === 'corridor-daily') dailyThenAI();       // 一天只真正拉一次，其余直接返回
  if (a.name === 'corridor-ai') aiRun('daily');         // 定时清扫漏网的
});
/* 新作进来了就顺手补全，省得等下一个整点 */
async function dailyThenAI(force = false) {
  const n = await runDaily(force);
  const ai = (await S.getSettings()).ai || {};
  if (n && ai.auto && AI.configured(ai)) { try { await AI.runBatch({ scope: 'daily' }); } catch { } }
  return n;
}
chrome.action.onClicked.addListener(() => chrome.tabs.create({}));
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg?.type === 'prefetch') { prefetch(msg.limit || 8).then(() => send({ ok: true })); return true; }
  if (msg?.type === 'daily') { dailyThenAI(!!msg.force).then(n => send({ ok: true, added: n })); return true; }
  if (msg?.type === 'ai') { aiRun(msg.scope || 'daily').then(r => send({ ok: true, ...r })).catch(e => send({ ok: false, err: String(e) })); return true; }
  if (msg?.type === 'ai-arm') { armAI().then(() => send({ ok: true })); return true; }
});
