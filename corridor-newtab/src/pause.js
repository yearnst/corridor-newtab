/* ============================================================
   暂歇 —— 把长廊临时关掉的那一屏

   扩展一旦接管了新标签页，就没法「让位」给 Chrome 原来那一页：
   chrome_url_overrides 是全有或全无，页面里也跳不回 chrome://new-tab-page。
   所以「临时关闭」的诚实做法是：这一页还是长廊的，只是不展画了，
   改成一块安静的落脚地 —— 上面是你常去的那几个站点。

   站点从哪来，三处合流：
     · 自己钉的（offLinks）—— 存在本机，零权限，想放什么放什么
     · Chrome 算出来的常访问（chrome.topSites）
     · 当前 profile 里打开着的标签页（chrome.tabs）—— 按站点汇总，几个标签页
       同属一个站就并成一条，标签页多的排前面

   后两处都要权限，所以都做成**可选权限**，第一次开启时才申请。跟 AI 接口地址是
   同一套做法：安装与更新都不多一条警告，老用户不会因为这次更新被停用。
   一个都没授权就只显示自己钉的那几个。

   哪一条都能从墙上摘掉：摘掉的是站点（按域名记）。自己钉的那几条摘掉＝直接从
   offLinks 里删；自动来的进两份名单之一：
     · offHidden  已移除 —— 随手摘的。摘的时候记下它当时的名次与标签页数，
       等它排得更靠前、或者标签页开得更多，就自己回来。设置里也能手动放回。
     · offBlocked 永不再现 —— 明说了不想再看见的，只能手动解除。

   签还能拖着换位置，顺序记在 offOrder 里（分组时只在组内换）。

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
export async function hasTabs() {
  if (!globalThis.chrome?.permissions) return false;
  try { return await chrome.permissions.contains({ permissions: ['tabs'] }); } catch { return false; }
}
export async function askTabs() {                // 同样必须在用户点击里调用
  if (!globalThis.chrome?.permissions) return false;
  try { return await chrome.permissions.request({ permissions: ['tabs'] }); } catch { return false; }
}
export async function dropTabs() {
  if (!globalThis.chrome?.permissions) return false;
  try { return await chrome.permissions.remove({ permissions: ['tabs'] }); } catch { return false; }
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

/* 打开着的标签页，按站点汇总：同一个域名的几个标签页并成一条，
   开得多的排前面。一条只占一张签 —— 十二个知乎标签页不该把整面墙占满。
   url 取法：只开了一个就指向那一个页面（更有用），开了好几个就指向站点首页。 */
export async function openTabs() {
  if (!globalThis.chrome?.tabs?.query) return [];
  let list = [];
  try { list = await chrome.tabs.query({}); } catch { return []; }
  const by = new Map();
  for (const t of (Array.isArray(list) ? list : [])) {
    const url = S1(t?.url);
    if (!/^https?:\/\//i.test(url)) continue;         // chrome:// 与扩展页不算
    const h = hostOf(url);
    if (!h) continue;
    let g = by.get(h);
    /* 站点首页要用原样的 origin：hostOf 去掉的那个 www. 只用来归类与显示，
       真拿去拼网址的话，有些站点的裸域根本不开门。 */
    if (!g) { let origin = ''; try { origin = new URL(url).origin; } catch { }
      g = { host: h, origin, url, title: S1(t?.title), n: 0, ids: [] }; by.set(h, g); }
    g.n++;
    if (typeof t?.id === 'number') g.ids.push(t.id);
    if (!g.title) g.title = S1(t?.title);
  }
  return [...by.values()]
    .sort((a, b) => b.n - a.n)
    .map(g => ({
      url: g.n > 1 ? (g.origin ? g.origin + '/' : g.url) : g.url,
      title: g.n > 1 ? (niceName(g.title, g.url) || g.host) : g.title,
      n: g.n, ids: g.ids
    }));
}

/* 自己钉的在前，两处自动来的在后，按域名去重。
   去重按域名而不是完整网址：同一个站点的两条路径没必要占两张签。 */
export const keyOf = (w) => w.src === 'pin' ? w.url : w.host;

/* 「已移除」是暂时的：摘的时候记下它当时的两个信号 —— 在常访问榜上的名次 r、
   开着几个标签页 n。后来排得更靠前，或者标签页开得更多，就说明它又重要了，
   自己回来。r / n 为 null 表示当时没有这个信号（或者是老版本存的），
   那一路就不会自动回来，只能在设置里手动放回。 */
const hidMap = (set) => {
  const m = new Map();
  for (const x of (Array.isArray(set?.offHidden) ? set.offHidden : [])) {
    if (typeof x === 'string') m.set(x, { h: x, r: null, n: null });     // 老版本只存了域名
    else if (x && x.h) m.set(x.h, { h: x.h, r: x.r ?? null, n: x.n ?? null, src: x.src });
  }
  return m;
};
const backAgain = (e, r, n) =>
  (e.r != null && r != null && r < e.r) || (e.n != null && n > e.n);

export async function collect(set) {
  const n = Math.min(24, Math.max(1, Math.round(Number(set?.offN) || 8)));
  const blocked = new Set(Array.isArray(set?.offBlocked) ? set.offBlocked : []);
  const hid = hidMap(set);
  const raw = (Array.isArray(set?.offLinks) ? set.offLinks : [])
    .map(x => ({ url: S1(x?.url), title: S1(x?.name), src: 'pin' }))
    .filter(x => /^https?:\/\//i.test(x.url));
  const [top, tabs] = await Promise.all([
    set?.offTop === false ? [] : topSites(),
    set?.offTabs === false ? [] : openTabs()
  ]);
  /* 两个信号：现在排第几、现在开着几个 */
  const rankOf = new Map(top.map((x, i) => [hostOf(x.url), i]));
  const tabsOf = new Map(tabs.map(x => [hostOf(x.url), x.n || 1]));
  const seen = new Set();
  const take = (x, src) => {
    const h = hostOf(x.url);
    const pin = src === 'pin';
    const k = h + (pin ? '|' + x.url : '');       // 自己钉的允许同域多条
    if (!h) return null;
    if (!pin) {
      if (blocked.has(h)) return null;
      const e = hid.get(h);
      if (e && !backAgain(e, rankOf.has(h) ? rankOf.get(h) : null, tabsOf.get(h) || 0)) return null;
    }
    if (seen.has(k) || (!pin && seen.has(h))) return null;
    seen.add(k); seen.add(h);
    const it = { url: x.url, host: h, name: niceName(x.title, x.url), src, pin };
    if (src === 'tab') { it.n = x.n || 1; it.ids = x.ids || []; }
    /* 摘掉它的时候要记下这两个数，所以每一条都带着 */
    it.r = rankOf.has(h) ? rankOf.get(h) : null;
    it.tabs = tabsOf.get(h) || 0;
    it.key = keyOf(it);
    return it;
  };
  /* 自己钉的一定会显示 —— 「最多显示几个」削的是自动来的那批。
     不这样的话，钉满之后再从墙上钉一个，会看着像没反应。 */
  const pinned = raw.map(x => take(x, 'pin')).filter(Boolean).slice(0, 24);
  const room = Math.max(0, n - pinned.length);
  /* 两处自动来源轮流取，谁也不饿着：只按顺序排的话，常访问榜一满
     标签页那一路就永远露不了面。 */
  const rest = [];
  let i = 0, j = 0;
  while (rest.length < room && (i < top.length || j < tabs.length)) {
    if (i < top.length) { const it = take(top[i++], 'top'); if (it) { rest.push(it); if (rest.length >= room) break; } }
    if (j < tabs.length) { const it = take(tabs[j++], 'tab'); if (it) rest.push(it); }
  }
  const out = pinned.concat(rest.slice(0, room));
  /* 手动拖过的顺序压在自动顺序之上；没拖过的按原样排在后面。
     分组是按 src 分的，所以这一次排序同时管住了「组内顺序」。 */
  const ord = Array.isArray(set?.offOrder) ? set.offOrder : [];
  if (ord.length) {
    const at = (w) => { const k = ord.indexOf(w.key); return k < 0 ? Infinity : k; };
    out.forEach((w, k) => { w._i = k; });
    out.sort((a, b) => at(a) - at(b) || a._i - b._i);
    out.forEach(w => { delete w._i; });
  }
  return out;
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
   这是拿 <div> + onclick 换不来的。

   每一条右上角（告示与索引里是右侧）一个 × —— 自己钉的那几条是从名单里删掉，
   自动来的是记进「已移除」，下次不再露面。整理模式下 × 让位给勾选框。 */
const item = (w, i, inner, T, tidy, vars = '') =>
  `<a class="offitem${w.pin ? ' pinned' : ''}" href="${esc(w.url)}" data-i="${i}" draggable="true"
      data-k="${esc(w.key)}" data-src="${esc(w.src)}"${w.ids && w.ids.length ? ` data-ids="${esc(w.ids.join(','))}"` : ''}
      title="${esc(w.url)}"${vars}>${inner}` +
    (tidy
      ? `<span class="offck" aria-hidden="true"></span>`
      : `<button class="offx" data-del="${esc(w.key)}" title="${esc(T('offRemove'))}" aria-label="${esc(T('offRemove'))}">&#215;</button>`) +
    `</a>`;

/* ---------------- 分组 ----------------
   两处自动来源同时**都有内容**时，一面墙上混着三种来路的签会看不出所以然，
   所以按来路分三组，每组一个很轻的小标题。只有一处有内容时不分 ——
   一个光杆标题比不分组更碍眼。

   注意：分组只管**怎么摆**。哪几条入选仍然由 collect() 里那轮
   「两处轮流取」决定，不然按组排就等于回到「一处排满另一处露不了面」。 */
const SRC_ORDER = ['pin', 'top', 'tab'];
export function grouped(list) {
  return ['top', 'tab'].every(k => list.some(w => w.src === k));
}
/* 返回 [{src, items:[{w, i}]}, ...]，i 是全局序号 —— 编号与彩签的色相都按整面墙连着算 */
export function groupsOf(list) {
  return SRC_ORDER
    .map(src => ({ src, items: list.map((w, i) => ({ w, i })).filter(x => x.w.src === src) }))
    .filter(g => g.items.length);
}

/* 标签页那一路：同站开了好几个就在域名后面缀上数目 */
const sub = (w) => w.src === 'tab' && w.n > 1 ? `${w.host} · ${w.n}` : w.host;

/* 墙上那张「＋」：手动钉一个站点不必再翻设置。
   点一下就地展开成一个小表单 —— 这一屏本来就是给「顺手」用的。
   整理的时候它让开，免得跟勾选框抢地方。 */
const addTile = (T, tidy) => tidy ? '' : `<button class="offadd-tile" id="offPin">
    <s>＋</s><b>${esc(T('offPinHere'))}</b></button>
  <form class="offadd-form" id="offPinForm" hidden>
    <input class="tin" id="offPinName" placeholder="${esc(T('offNamePh'))}" spellcheck="false" autocomplete="off">
    <input class="tin" id="offPinUrl" placeholder="https://example.com" spellcheck="false" autocomplete="off">
    <div class="offadd-row">
      <button class="bigbtn sm pri" type="submit">${esc(T('offAddBtn'))}</button>
      <button class="bigbtn sm" type="button" id="offPinCancel">${esc(T('cancel'))}</button>
    </div>
  </form>`;

/* 不整理的时候只留一个很轻的「整理」；进了整理模式才摊开那一条工具栏。
   墙面平时是干净的，这一点比少点一次更要紧。 */
const tools = (T, tidy, hasTab) => `<div class="offtools">` + (tidy
  ? `<span class="offbar-n" id="offSelN">${esc(T('offSelNone'))}</span>
     <button class="bigbtn sm" id="offSelAll">${esc(T('offSelAll'))}</button>
     <button class="bigbtn sm pri" id="offDelSel" disabled>${esc(T('offDelSel'))}</button>` +
    (hasTab ? `<button class="bigbtn sm" id="offCloseSel" disabled>${esc(T('offCloseSel'))}</button>` : '') +
    `<button class="bigbtn sm" id="offTidyDone">${esc(T('offTidyDone'))}</button>`
  : `<span class="offbar-n drag">${esc(T('offDragHint'))}</span>
     <button class="offlink" id="offTidy">${esc(T('offTidy'))}</button>`) + `</div>`;

export function render(list, style, T, skin = 'plain', tidy = false) {
  if (!list.length) return '';
  const n = list.length;
  const hasTab = list.some(w => w.src === 'tab');
  const gs = grouped(list);
  const head = (src) => gs ? `<div class="off-gh" data-src="${src}">${esc(T('offSrc_' + src))}</div>` : '';
  /* 不分组时就是一组（没有标题），分组时按来路摊开 —— 两条路走同一段渲染代码 */
  const blocks = (one) => (gs ? groupsOf(list) : [{ src: '', items: list.map((w, i) => ({ w, i })) }])
    .map(g => head(g.src) + g.items.map(({ w, i }) => one(w, i)).join('')).join('');

  if (style === 'notice') {
    return `<div class="off-notice">
      <div class="offn-head">
        <div class="offn-k">CORRIDOR</div>
        <h2>${esc(T('offTitle'))}</h2>
        <div class="offn-rule"></div>
        <p class="offn-t">${esc(T('offSub'))}</p>
      </div>
      <div class="offn-grid">${blocks((w, i) => item(w, i,
        `<s>${no2(i)}</s><b>${esc(w.name)}</b><i>${esc(sub(w))}</i>`, T, tidy))}</div>
      <div class="offadd-slot">${addTile(T, tidy)}</div>
      ${tools(T, tidy, hasTab)}
    </div>`;
  }
  if (style === 'index') {
    return `<div class="off-index">
      <div class="offi-head"><b>${esc(T('offIndexTitle'))}</b><span>${esc(T('offIndexEn'))}</span></div>
      <div class="offi-list">${blocks((w, i) => item(w, i,
        `<b>${esc(w.name)}</b><span class="offi-dots"></span><i>${esc(sub(w))}</i>`, T, tidy))}</div>
      <div class="offadd-slot">${addTile(T, tidy)}</div>
      ${tools(T, tidy, hasTab)}
    </div>`;
  }
  /* 默认：展签墙。彩签那一皮的配色逐张算好，写成行内变量 */
  const tile = (w, i) => item(w, i,
    `<s>${no2(i)}</s><b>${esc(w.name)}</b><i>${esc(sub(w))}</i>`, T, tidy, skinVars(i, n, skin));
  /* 分组时每组自己一段：小标题 + 一排签。
     不这么分而只在同一个 flex 容器里插「占满整行」的标题，标题的宽度一受限
     后面的签就会挤回同一行 —— 截图里一眼看得出来。 */
  const body = gs
    ? groupsOf(list).map(g => `<section class="off-grp">
        <div class="off-gh" data-src="${g.src}">${esc(T('offSrc_' + g.src))}</div>
        <div class="off-row">${g.items.map(({ w, i }) => tile(w, i)).join('')}</div>
      </section>`).join('') + `<div class="off-row">${addTile(T, tidy)}</div>`
    : list.map((w, i) => tile(w, i)).join('') + addTile(T, tidy);
  return `<div class="off-tags${gs ? ' grouped' : ''}" data-skin="${esc(skin)}">${body}</div>
    <div class="off-cap">${esc(T('offSub2'))}</div>
    ${tools(T, tidy, hasTab)}`;
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
    <div class="offadd-slot">${addTile(T, false)}</div>
  </div>`;
}
