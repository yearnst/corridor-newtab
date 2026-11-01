/* ============================================================
   飞书多维表格的「公开分享视图」，当作一个在线图库。
   链接形如 https://xxx.feishu.cn/share/base/view/shr…

   飞书没有给这类链接开放接口，这里用的是分享页自己调的那几条：
     · records_and_meta / records_by_page —— 整个视图的记录（附件、主字段）
     · box/stream/download/v2/cover/<附件> —— 附件原图
   不带飞书的 cookie 一律回「Login Required」。没登录飞书的人，打开一次分享页
   就会拿到一个访客 cookie，等同于自己在浏览器里打开这个链接；登录着的人直接用他自己的。
   打开分享页时会经过 accounts.feishu.cn、login.feishu.cn 两次跳转，
   所以授权要连这两个域名一起要，少一个跳转就被拦下。
   ============================================================ */

const S1 = (v) => String(v ?? '').trim();
const SHARE_RE = /^https:\/\/((?:[a-z0-9-]+\.)*feishu\.cn)\/share\/base\/view\/(shr[0-9a-z]+)/i;
const COVER_RE = /^https:\/\/(?:[a-z0-9-]+\.)*feishu\.cn\/space\/api\/box\/stream\/download\/v2\/cover\//i;
const FS_HOST_RE = /^https?:\/\/(?:[a-z0-9-]+\.)*(?:feishu\.cn|larksuite\.com)(?:[/:?#]|$)/i;
export const LOGIN_ORIGINS = ['https://accounts.feishu.cn/*', 'https://login.feishu.cn/*'];
/* 浏览器能直接显示的几种；heic、tiff 这类没有后缀可认，转不了，扫描时略过 */
const SHOWABLE = /^image\/(jpe?g|pjpeg|png|gif|webp|avif|bmp)$/i;
const EXT_OF = { 'image/jpeg': 'jpg', 'image/pjpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/avif': 'avif', 'image/bmp': 'bmp' };

/* 分享视图链接 → { origin, token }；不是就回 null */
export function parseShare(u) {
  const m = SHARE_RE.exec(S1(u));
  return m ? { origin: 'https://' + m[1].toLowerCase(), token: m[2] } : null;
}
export const isCover = (u) => COVER_RE.test(S1(u));
/* 是飞书或 Lark 的地址、却不是能用的分享视图链接：回一个提示的键，好告诉用户该换哪种链接 */
export function badLink(u) {
  const s = S1(u);
  if (!FS_HOST_RE.test(s) || parseShare(s)) return '';
  return /larksuite\.com/i.test(s) ? 'libFsLark' : 'libFsNeedShare';
}
/* 这个来源要授权的全部域名：分享链接所在的那个，加上两个登录跳转域名 */
export function originsFor(u) {
  const p = parseShare(u) || shareOfCover(u);
  return p ? [p.origin + '/*', ...LOGIN_ORIGINS] : null;
}

/* ---------------- 访客会话 ----------------
   打开一次分享页（跟着跳转走完），浏览器就记下了飞书的 cookie。
   同一时刻好几张图一起 401，只开一次。 */
const pending = new Map();
export function ensureSession(p) {
  const k = p.origin + '|' + p.token;
  if (!pending.has(k)) {
    const job = fetch(`${p.origin}/share/base/view/${p.token}`, { credentials: 'include', cache: 'no-store' })
      .then(r => { try { r.body?.cancel(); } catch { } return r.ok; })
      .catch(() => false)
      .finally(() => setTimeout(() => pending.delete(k), 5000));
    pending.set(k, job);
  }
  return pending.get(k);
}

async function getJSON(url, signal) {
  const r = await fetch(url, { credentials: 'include', cache: 'no-store', signal });
  if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status });
  return r.json();
}
/* 调分享页的接口；回「要登录」就先建立访客会话，再试一次 */
async function api(p, path, params, signal) {
  const url = `${p.origin}/space/api/bitable/external/view/share/${path}?` +
    new URLSearchParams({ shareToken: p.token, removeFmlExtra: 'true', ...params });
  let j = await getJSON(url, signal);
  if (j?.code === 5) { await ensureSession(p); j = await getJSON(url, signal); }
  return j;
}

/* ---------------- 单元格 → 文字（只用于标题，取主字段） ---------------- */
const flat = (x) => Array.isArray(x)
  ? x.map(y => (y && typeof y === 'object') ? S1(y.text ?? y.name ?? y.link ?? '') : S1(y)).join('')
  : (x && typeof x === 'object') ? S1(x.text ?? x.name ?? '') : S1(x);
function textOf(fm, v, rid, fld) {
  if (!fld) return '';
  /* 公式、查找引用这类字段的值不在 recordMap 里，在 formulaInfo 里（一段 JSON，取 data） */
  const f = v.formulaInfo?.fieldMap?.[fld]?.[rid]?.value;
  if (f) { try { return flat(JSON.parse(f).data); } catch { } }
  const val = v.recordMap?.[rid]?.[fld]?.value;
  if (val == null) return '';
  const def = fm[fld] || {};
  if (def.type === 5 && typeof val === 'number') return new Date(val).toISOString().slice(0, 10);
  if (def.type === 3 || def.type === 4) {        // 单选 / 多选：存的是选项 id
    const opts = def.property?.options || [];
    return (Array.isArray(val) ? val : [val]).map(id => opts.find(o => o.id === id)?.name || '').filter(Boolean).join(' / ');
  }
  return flat(val);
}

/* 附件原图的地址。revToken 留空：表格改过之后地址也不变，作品的 id 就稳得住。
   fallback_source=1 不能省 —— 少了它，飞书只找「封面图」，找不到回 202 加一句 Cover No Exist。 */
export function coverURL(p, fld, rid, tk) {
  return `${p.origin}/space/api/box/stream/download/v2/cover/${encodeURIComponent(tk)}?` + new URLSearchParams({
    extra: JSON.stringify({ sharePerm: { shareToken: p.token, fieldId: fld, recordId: rid, revToken: '' } }),
    fallback_source: '1', mount_node_token: tk, mount_point: 'bitable',
    width: '99999', height: '99999', policy: 'allow_up'
  });
}
function shareOfCover(u) {
  if (!isCover(u)) return null;
  try {
    const x = new URL(u);
    const sp = JSON.parse(x.searchParams.get('extra') || '{}').sharePerm;
    return sp?.shareToken ? { origin: x.origin, token: sp.shareToken } : null;
  } catch { return null; }
}

/* 取一张附件。cookie 被清掉或过期（401 / 403）就重新打开一次分享页，再试一次。
   202 也算 ok，所以还要看回来的是不是图。 */
export async function fetchCover(url) {
  const go = () => fetch(url, { credentials: 'include', cache: 'no-store' });
  let r = await go();
  if (r.status === 401 || r.status === 403) {
    const p = shareOfCover(url);
    if (p && await ensureSession(p)) r = await go();
  }
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  if (!/^image\//i.test(S1(r.headers.get('content-type')))) {
    try { r.body?.cancel(); } catch { }
    throw new Error('HTTP ' + r.status + ' not an image ' + url);
  }
  return r.blob();
}

/* ---------------- 列出一个分享视图里的全部图片 ----------------
   回 { ok, items:[{ u, t, n }], name, err }：u 是原图地址，t 是主字段（当标题），n 是带后缀的文件名。 */
export async function listShare(u, { max = 800, signal } = {}) {
  const p = parseShare(u);
  if (!p) return { ok: false, err: 'libFsNeedShare', items: [] };
  let j;
  try { j = await api(p, 'records_and_meta', {}, signal); }
  catch (e) {
    if (e?.name === 'AbortError') throw e;
    return { ok: false, err: e?.status ? 'HTTP ' + e.status : 'libFsNet', items: [] };
  }
  /* 5 = 要登录（建立访客会话后仍然要，就是没公开），3 = 找不到；飞书回了别的错误码也按「没公开或失效」说 */
  if (typeof j?.code !== 'number') return { ok: false, err: 'libFsFormat', items: [] };
  if (j.code !== 0) return { ok: false, err: 'libFsNotPublic', items: [] };
  let snap = null;
  try { snap = JSON.parse(j.data.snapshot); } catch { }
  let v = snap?.viewShareEntity;
  if (!v || !v.recordMap) return { ok: false, err: 'libFsFormat', items: [] };
  const fm = snap.fieldMap || {};
  const att = Object.keys(fm).filter(k => fm[k]?.type === 17);
  const prim = v.primaryKey;
  const items = [], seen = new Set();

  const take = (pg) => {
    /* recordMap 的键序每次都不一样；照视图里的排序（rankMap）来，排不上的放最后 */
    const rank = pg.rankInfo?.rankMap || {};
    const ids = Object.keys(pg.recordMap || {})
      .sort((a, b) => (rank[a] ?? '￿') < (rank[b] ?? '￿') ? -1 : (rank[a] ?? '￿') > (rank[b] ?? '￿') ? 1 : 0);
    for (const rid of ids) {
      const rec = pg.recordMap[rid]; if (!rec) continue;
      const title = textOf(fm, pg, rid, prim);
      for (const fld of att) {
        for (const a of (Array.isArray(rec[fld]?.value) ? rec[fld].value : [])) {
          const tk = S1(a?.attachmentToken || a?.id);
          const mime = S1(a?.mimeType).toLowerCase();
          if (!tk || seen.has(tk) || !SHOWABLE.test(mime)) continue;
          seen.add(tk);
          let n = S1(a.name) || tk;
          if (!/\.[a-z0-9]{2,5}$/i.test(n)) n += '.' + (EXT_OF[mime] || 'jpg');
          items.push({ u: coverURL(p, fld, rid, tk), t: title, n });
        }
      }
    }
  };
  take(v);
  /* 记录多到一页装不下才会有下一页；飞书一页给得很多，到上限就停 */
  for (let guard = 0; v.hasMore && items.length < max && guard < 100; guard++) {
    const q = { offset: S1(v.offset) };
    if (v.offsetNum != null) q.offsetNum = v.offsetNum;
    if (v.revToken) q.revToken = v.revToken;
    let pj;
    try { pj = await api(p, 'records_by_page', q, signal); } catch (e) { if (e?.name === 'AbortError') throw e; break; }
    if (pj?.code !== 0) break;
    try { v = JSON.parse(pj.data.records); } catch { break; }
    if (!v?.recordMap) break;
    take(v);
  }
  return { ok: true, items: items.slice(0, max), name: S1(snap.name) };
}
