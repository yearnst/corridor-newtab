/* 后台服务：定时把作品图片预取到本地，保证离线可用 */
import * as S from './store.js';
import { runDaily } from './daily.js';
import * as AI from './ai.js';
import * as NET from './localnet.js';

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
  const gone = new Set(await S.getGone());          // 去除过的不值得占缓存
  const target = set.quality === 'saver' ? 1280 : set.quality === 'max' ? 3840 : 1920;
  let n = 0;
  for (const w of cat) {
    if (n >= limit) break;
    if (gone.has(w.id)) continue;
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
/* 本机模型的来源改写：接口地址一改就重铺（详见 localnet.js） */
async function armNet() {
  try { await NET.syncOriginRules(await S.getSettings()); } catch { }
}
/* 设置一改就重新对时 */
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.settings) { armAI(); armNet(); } });
/* 用户刚给某个地址授了权，规则这时候才真正管用 —— 立刻铺一遍 */
try { chrome.permissions?.onAdded?.addListener(() => armNet()); } catch { }

/* ---------- 商店新版：尽快换上 ----------
   Chrome 从商店下好新版以后，要等扩展「闲下来」才换；可新标签页就是这个扩展的页面，
   很多人一直开着一个，于是新版常常拖到重启浏览器才生效。
   这里接住 onUpdateAvailable：扩展的页面一个都没开着，就立刻 reload() 换上；
   还开着就不打扰 —— reload 会把扩展的页面关掉 —— 等最后一个关掉（或者翻去了别的网站）再换。
   查「开没开着」要 runtime.getContexts（Chrome 116+）；更老的 Chrome 拿不到，就照旧交给 Chrome 自己。
   只对从商店装的有用；开发者模式加载的不会收到更新。 */
const UPD = 'updPending';
const curVer = () => chrome.runtime.getManifest().version;
async function pagesOpen() {
  const all = await chrome.runtime.getContexts({});
  return all.filter(c => c.contextType !== 'BACKGROUND').length;
}
async function applyUpdate() {
  if (typeof chrome.runtime.getContexts !== 'function') return;
  const p = (await chrome.storage.local.get(UPD))[UPD];
  if (!p) return;
  /* 上次已经 reload 过、版本却没变：说明这条路换不上，别一直重启，留给 Chrome 下次启动时换 */
  if (p.tried === curVer() || p.v === curVer()) { await dropUpdate(); return; }
  if (await pagesOpen()) { chrome.alarms.create('corridor-update', { delayInMinutes: 2, periodInMinutes: 2 }); return; }
  await chrome.storage.local.set({ [UPD]: { ...p, tried: curVer() } });
  chrome.runtime.reload();
}
async function dropUpdate() {
  try { await chrome.storage.local.remove(UPD); await chrome.alarms.clear('corridor-update'); } catch { }
}
chrome.runtime.onUpdateAvailable?.addListener(async (d) => {
  await chrome.storage.local.set({ [UPD]: { v: String(d?.version || ''), at: Date.now() } });
  applyUpdate();
});
/* 关掉一个标签页就看一眼：可能正是最后一个新标签页（tabs.onRemoved 不需要 tabs 权限） */
let updT = 0;
chrome.tabs.onRemoved.addListener(() => { clearTimeout(updT); updT = setTimeout(() => applyUpdate().catch(() => { }), 1500); });
/* 每天主动问一次商店。Chrome 自己也会每隔几小时查，这只是不让它漏掉；查得太勤 Chrome 会限流 */
async function askStore() {
  try { await chrome.runtime.requestUpdateCheck(); } catch { }
}
globalThis.__corridorUpdate = { applyUpdate, pagesOpen, UPD };   // 测试用

chrome.runtime.onInstalled.addListener(async (d) => {
  if (d.reason === 'update') dropUpdate();       // 新版已经换上
  await S.setSettings({});                     // 写入默认值
  chrome.alarms.create('corridor-prefetch', { delayInMinutes: 1, periodInMinutes: 180 });
  chrome.alarms.create('corridor-daily', { delayInMinutes: 3, periodInMinutes: 360 });
  chrome.alarms.create('corridor-updcheck', { delayInMinutes: 30, periodInMinutes: 1440 });
  armAI(); armNet();
  if (d.reason === 'install') chrome.tabs.create({});
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('corridor-prefetch', { delayInMinutes: 2, periodInMinutes: 180 });
  chrome.alarms.create('corridor-daily', { delayInMinutes: 4, periodInMinutes: 360 });
  chrome.alarms.create('corridor-updcheck', { delayInMinutes: 30, periodInMinutes: 1440 });
  armAI(); armNet();
  applyUpdate().catch(() => { });              // 上次没换成的，这次启动再看一眼
});
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === 'corridor-prefetch') prefetch();
  if (a.name === 'corridor-daily') dailyThenAI();       // 一天只真正拉一次，其余直接返回
  if (a.name === 'corridor-ai') aiRun('daily');         // 定时清扫漏网的
  if (a.name === 'corridor-update') applyUpdate().catch(() => { });
  if (a.name === 'corridor-updcheck') askStore();
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
  if (msg?.type === 'net-arm') { armNet().then(() => send({ ok: true })); return true; }
});
