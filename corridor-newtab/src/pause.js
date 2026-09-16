/* ============================================================
   暂歇 —— 把长廊临时关掉的那一屏

   扩展一旦接管了新标签页，就没法「让位」给 Chrome 原来那一页：
   chrome_url_overrides 是全有或全无，页面里也跳不回 chrome://new-tab-page。
   所以「临时关闭」的诚实做法是：这一页还是长廊的，只是不展画了，
   改成一块安静的落脚地 —— 上面是你常去的那几个站点。

   站点从哪来，两处合流：
     · 自己钉的（offLinks）—— 存在本机，零权限，想放什么放什么
     · Chrome 算出来的常访问（chrome.topSites）—— 要权限，所以做成**可选权限**，
       第一次开启时才申请。跟 AI 接口地址是同一套做法：安装与更新都不多一条警告，
       老用户不会因为这次更新被停用。没授权就只显示自己钉的那几个。

   两件刻意不做的事：
     · 不取图标。topSites 只给站点名与网址；要图标就得再加 favicon 权限
       （又一次警告），或者去第三方图标服务取 —— 那等于把你常去的站点
       报给别人。这一页一个网络请求都不发。
     · 不碰历史记录。topSites 给的是 Chrome 自己算好的那张榜，
       我们读到的只有标题和网址，读不到你什么时候去过、去过几次。
   ============================================================ */

const S1 = (v) => String(v ?? '').trim();

/* ---------------- 可选权限 ---------------- */
export async function hasTop() {
  if (!globalThis.chrome?.permissions) return false;
  try { return await chrome.permissions.contains({ permissions: ['topSites'] }); } catch { return false; }
}
export async function askTop() {                 // 必须在用户点击里调用
  if (!globalThis.chrome?.permissions) return false;
  try { return await chrome.permissions.request({ permissions: ['topSites'] }); } catch { return false; }
}
export async function dropTop() {
  if (!globalThis.chrome?.permissions) return false;
  try { return await chrome.permissions.remove({ permissions: ['topSites'] }); } catch { return false; }
}

/* ---------------- 取站点 ---------------- */
/* 域名：去掉 www.，端口留着（本机服务靠端口区分） */
export function hostOf(url) {
  try {
    const u = new URL(S1(url));
    return u.host.replace(/^www\./i, '');
  } catch { return ''; }
}
/* 站点名：Chrome 给的标题常常是一整句「知乎 - 有问题，就会有答案」，
   取第一个分隔符之前那一段就够挂在签上了；实在没有标题就拿域名顶上。 */
export function niceName(title, url) {
  let t = S1(title).replace(/\s+/g, ' ');
  const cut = t.split(/\s+[-–—|·]\s+|:\s+|[：，、。｜|]/)[0].trim();
  if (cut.length >= 2) t = cut;
  if (!t) {
    const h = hostOf(url);
    t = h.split('.')[0] || h;
  }
  return t.slice(0, 28);
}

async function topSites() {
  if (!globalThis.chrome?.topSites?.get) return [];
  try {
    const list = await chrome.topSites.get();
    return (Array.isArray(list) ? list : []).map(x => ({ url: S1(x?.url), title: S1(x?.title) }))
      .filter(x => /^https?:\/\//i.test(x.url));
  } catch { return []; }
}

/* 自己钉的在前，Chrome 那张榜在后，按域名去重。
   去重按域名而不是完整网址：同一个站点的两条路径没必要占两张签。 */
export async function collect(set) {
  const n = Math.min(24, Math.max(1, Math.round(Number(set?.offN) || 8)));
  const raw = (Array.isArray(set?.offLinks) ? set.offLinks : [])
    .map(x => ({ url: S1(x?.url), title: S1(x?.name), pin: true }))
    .filter(x => /^https?:\/\//i.test(x.url));
  const auto = (set?.offTop === false) ? [] : await topSites();
  const seen = new Set();
  const take = (x) => {
    const h = hostOf(x.url);
    const k = h + (x.pin ? '|' + x.url : '');     // 自己钉的允许同域多条
    if (!h || (seen.has(h) && !x.pin) || seen.has(k)) return null;
    seen.add(k); seen.add(h);
    return { url: x.url, host: h, name: niceName(x.title, x.url), pin: !!x.pin };
  };
  /* 自己钉的一定会显示 —— 「最多显示几个」削的是 Chrome 那张榜。
     不这样的话，钉满之后再从墙上钉一个，会看着像没反应。 */
  const pinned = raw.map(take).filter(Boolean).slice(0, 24);
  const room = Math.max(0, n - pinned.length);
  const rest = [];
  for (const x of auto) {
    if (rest.length >= room) break;
    const it = take(x);
    if (it) rest.push(it);
  }
  return pinned.concat(rest);
}

/* ---------------- 展签的两种皮 ----------------
   plain 简约：奶油色纸，跟作品展签同一种（默认）
   color 彩签：一排签从左到右像一柄色卡扇面铺开

   色相在这里算好、以 CSS 变量交出去。为什么不用 oklch()：它要 Chrome 111，
   而这个扩展的底线是 110。所以用 hsl 加一条亮度补偿 —— 黄绿本来就显亮、
   蓝紫显暗，不补的话一排签的明暗会跳得厉害。
   ---------------------------------------- */
export const SKINS = ['plain', 'color'];
export const skinOf = (set) => SKINS.includes(set?.offTagSkin) ? set.offTagSkin : 'plain';

const HUE_FROM = 8, HUE_TO = 300;            // 珊瑚红 → 紫；一柄色卡扇面的跨度
export function swatch(i, n) {
  const t = n > 1 ? i / (n - 1) : 0;
  const h = Math.round(HUE_FROM + (HUE_TO - HUE_FROM) * t);
  /* warm: h=60（黄）为 1，h=240（蓝）为 -1。
     黄绿本来就显亮，压一点；蓝紫显暗，提一点 —— 但补过头蓝紫就发白了，
     所以幅度只给 3，再给冷色多一点饱和把颜色兜住。 */
  const warm = Math.cos((h - 60) * Math.PI / 180);
  const l = 84 - 3 * warm;
  const S_ = 48 - 6 * warm;
  const hsl = (ll, ss = S_) => `hsl(${h} ${Math.round(ss * 10) / 10}% ${Math.round(ll * 10) / 10}%)`;
  return {
    h,
    c1: hsl(l + 4),        // 每张签自己也是左浅右深的一道渐变
    c2: hsl(l - 4),
    ink: hsl(19, 40),      // 标题：带着这张签自己的色气的深墨
    num: hsl(32, 58),      // 编号
    dim: hsl(37, 22)       // 域名
  };
}
const skinVars = (i, n, skin) => {
  if (skin !== 'color') return '';
  const c = swatch(i, n);
  return ` style="--c1:${c.c1};--c2:${c.c2};--ink:${c.ink};--num:${c.num};--dim:${c.dim}"`;
};

/* ---------------- 三种排版 ----------------
   tag    展签墙 —— 墙还在灯还亮着，挂的是签不是画（默认）
   notice 闭馆告示 —— 画撤了，门上一张告示
   index  目录索引 —— 展览手册最后那页的索引
   ---------------------------------------- */
export const STYLES = ['tag', 'notice', 'index'];
export const styleOf = (set) => STYLES.includes(set?.offStyle) ? set.offStyle : 'tag';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const no2 = (i) => String(i + 1).padStart(2, '0');

/* 每一条都是 <a>：中键、Cmd 点击、右键「在新标签页打开」全都照常管用，
   这是拿 <div> + onclick 换不来的。 */
const item = (w, i, inner, vars = '') =>
  `<a class="offitem${w.pin ? ' pinned' : ''}" href="${esc(w.url)}" data-i="${i}"
      title="${esc(w.url)}"${vars}>${inner}${
    w.pin ? `<button class="offx" data-unpin="${esc(w.url)}" title="移除" aria-label="移除">&#215;</button>` : ''}</a>`;

/* 墙上那张「＋」：手动钉一个站点不必再翻设置。
   点一下就地展开成一个小表单 —— 这一屏本来就是给「顺手」用的。 */
const addTile = (T) => `<button class="offadd-tile" id="offPin">
    <s>＋</s><b>${esc(T('offPinHere'))}</b></button>
  <form class="offadd-form" id="offPinForm" hidden>
    <input class="tin" id="offPinName" placeholder="${esc(T('offNamePh'))}" spellcheck="false" autocomplete="off">
    <input class="tin" id="offPinUrl" placeholder="https://example.com" spellcheck="false" autocomplete="off">
    <div class="offadd-row">
      <button class="bigbtn sm pri" type="submit">${esc(T('offAddBtn'))}</button>
      <button class="bigbtn sm" type="button" id="offPinCancel">${esc(T('cancel'))}</button>
    </div>
  </form>`;

export function render(list, style, T, skin = 'plain') {
  if (!list.length) return '';
  const n = list.length;
  if (style === 'notice') {
    return `<div class="off-notice">
      <div class="offn-head">
        <div class="offn-k">CORRIDOR</div>
        <h2>${esc(T('offTitle'))}</h2>
        <div class="offn-rule"></div>
        <p class="offn-t">${esc(T('offSub'))}</p>
      </div>
      <div class="offn-grid">${list.map((w, i) => item(w, i,
        `<s>${no2(i)}</s><b>${esc(w.name)}</b><i>${esc(w.host)}</i>`)).join('')}</div>
      <div class="offadd-slot">${addTile(T)}</div>
    </div>`;
  }
  if (style === 'index') {
    return `<div class="off-index">
      <div class="offi-head"><b>${esc(T('offIndexTitle'))}</b><span>${esc(T('offIndexEn'))}</span></div>
      <div class="offi-list">${list.map((w, i) => item(w, i,
        `<b>${esc(w.name)}</b><span class="offi-dots"></span><i>${esc(w.host)}</i>`)).join('')}</div>
      <div class="offadd-slot">${addTile(T)}</div>
    </div>`;
  }
  /* 默认：展签墙。彩签那一皮的配色逐张算好，写成行内变量 */
  return `<div class="off-tags" data-skin="${esc(skin)}">${list.map((w, i) => item(w, i,
    `<s>${no2(i)}</s><b>${esc(w.name)}</b><i>${esc(w.host)}</i>`, skinVars(i, n, skin))).join('')}
    ${addTile(T)}</div>
    <div class="off-cap">${esc(T('offSub2'))}</div>`;
}

/* 一条都没有时的那一屏：别空着，告诉用户下一步点哪儿 */
export function renderEmpty(granted, T) {
  return `<div class="off-empty">
    <div class="offn-k">CORRIDOR</div>
    <h2>${esc(T('offTitle'))}</h2>
    <div class="offn-rule"></div>
    <p>${esc(granted ? T('offNoneGranted') : T('offNone'))}</p>
    <div class="dbc btnrow">
      ${granted ? '' : `<button class="bigbtn pri" id="offAsk">${esc(T('offAsk'))}</button>`}
      <button class="bigbtn" id="offCfg">${esc(T('offCfg'))}</button>
    </div>
    <div class="offadd-slot">${addTile(T)}</div>
  </div>`;
}
