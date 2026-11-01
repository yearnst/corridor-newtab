/* ============================================================
   在线图库的定时同步。

   只管网址来源：线上新出现的收进来（下载进缓存），线上没了的拿掉并删掉缓存 ——
   收藏过的除外，那几件留着，缓存也不会被清理掉（见 store.js 的 cacheTrim）。

   在新标签页里跑，不在后台：扫描要解析网页、读视频首帧、转 HEIC，这些都得有页面。
   新标签页打开得勤，开着的时候每分钟也会看一眼到没到点，实际效果和定时一样。
   好几个标签页同时开着，只有一个去同步（Web Locks）；同一个来源同一时刻只扫一遍。
   ============================================================ */
import * as S from './store.js';
import * as LOCAL from './local.js';

const lock = (name, opt, fn) => globalThis.navigator?.locks
  ? navigator.locks.request(name, opt, fn) : fn({ name });

/* 参加同步的：开着的、单独没关同步的网址来源 */
const isLive = (x) => x && x.kind === 'url' && x.on !== false && x.sync !== false && String(x.url || '').trim();

/* 到点了的网址来源 */
export function dueSrcs(set, lib, now = Date.now()) {
  if (!set?.libSync) return [];
  const per = Math.max(1, Number(set.libSyncMin) || 1440) * 60000;
  /* 从没同步过的，从上次扫描算起 */
  return (lib?.srcs || []).filter(x => isLive(x) && now - (x.sy || x.at || 0) >= per);
}

/* 同步一个来源。manual = 用户点的（重扫）：线上一条都没有时照实清空。
   errText 把错误码翻成要存进来源卡片的那句话。 */
export async function syncOne(src, { manual = false, errText = (e) => e, onProgress, signal } = {}) {
  return lock('corridor-src-' + src.id, {}, async () => {
    const [lib, favs] = await Promise.all([S.getLocalLib(), S.getFavs()]);
    const cur = lib.srcs.find(x => x.id === src.id);
    if (!cur) return { ok: false, err: 'gone' };
    const existing = lib.works.filter(w => w.sid === cur.id);
    const r = await LOCAL.syncURL(cur, { existing, keep: new Set(favs), manual, onProgress, signal });
    const now = Date.now();
    if (!r.ok) {
      const err = r.err === 'noperm' ? 'libNeedHost' : r.err;
      await S.mergeLibSource(cur.id, { patch: { err: errText(err), sy: now } });
      return { ok: false, err };
    }
    const l2 = await S.mergeLibSource(cur.id, {
      add: r.add, drop: r.drop,
      patch: { err: '', skip: r.skip, ttl: r.name || cur.ttl, sy: now, sa: r.add.length, sd: r.drop.length }
    });
    if (r.drop.length) await S.cacheDropIds(r.drop);
    const works = l2.works.filter(w => w.sid === cur.id);
    return { ok: true, add: r.add.length, drop: r.drop.length, total: works.length, works, skip: r.skip };
  });
}

/* 把到点了的都同步一遍；all = 不管到没到点，开着的网址来源全来一遍（「立即同步」）。
   别的标签页正在同步，就回 null。 */
export async function syncDue(set, { all = false, errText, onSrc } = {}) {
  return lock('corridor-libsync', { ifAvailable: true }, async (held) => {
    if (!held) return null;
    const lib = await S.getLocalLib();
    const list = all ? lib.srcs.filter(isLive) : dueSrcs(set, lib);
    const out = { n: list.length, done: 0, add: 0, drop: 0, fail: 0 };
    for (const [i, src] of list.entries()) {
      onSrc?.(src, i + 1, list.length);
      let r;
      try { r = await syncOne(src, { errText }); } catch (e) { r = { ok: false, err: String(e?.message || e) }; }
      if (r.ok) { out.done++; out.add += r.add; out.drop += r.drop; } else out.fail++;
    }
    return out;
  });
}
