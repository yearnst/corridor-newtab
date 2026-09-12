/* ============================================================
   三种新呈现方式：瀑布流 / 虚拟展厅 / 环形长廊
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let C = null;                       // 由 app.js 注入的上下文
const M = { raf: null, imgs: new Map(), hz: 0, hoff: 0, hels: null, citems: null, mfill: 0,
  cidx: 0, cfrac: 0, ctarget: 0, cdue: 0, cwheel: 0,
  cdrag: null, cclick: false, drift: 0, paused: false, mcols: null, moff: [], mspeed: [] };

export function setupModes(ctx) { C = ctx; }

/* 取图并缓存 objectURL：最多四路并发，失败就抛出交给调用方重试 */
let inflight = 0; const waiting = [];
function slot() {
  if (inflight < 4) { inflight++; return Promise.resolve(); }
  return new Promise(r => waiting.push(r)).then(() => { inflight++; });
}
function release() { inflight = Math.max(0, inflight - 1); const n = waiting.shift(); if (n) n(); }
async function pic(w, px) {
  const key = w.id + '@' + px;
  if (M.imgs.has(key)) return M.imgs.get(key);
  await slot();
  try {
    const r = await C.S.fetchImage(C.imgUrl(w, C.pickSize(w, px)), { id: w.id });
    const u = URL.createObjectURL(r.blob);
    C.A.objUrls.add(u); M.imgs.set(key, u); return u;
  } finally { release(); }
}
/* 取图失败时先挂占位图，过一会儿再试一次；不然一张 20px 的小图会永远糊在墙上 */
function retryLater(el, fn) {
  clearTimeout(el._rt);
  el._rt = setTimeout(() => { el.dataset.id = ''; fn(el); }, 1600 + Math.floor(Math.random() * 1600));
}

/* ============================================================ 瀑布流 */
export function paintMasonry() {
  const box = $('#mcols');
  /* 顺着 A.list 取前 72 幅：这一段正是别的模式已经预取过的，
     所以一进来顶上那一屏几乎立刻就有图。换成随机抽选看着更「新鲜」，
     代价是几乎全都没缓存，第一屏会糊很久 —— 试过，不划算。 */
  const list = C.A.list.slice(0, 72);
  if (!list.length) return;
  const n = Math.max(3, Math.min(6, Math.round(C.stageW() / 330)));
  box.style.setProperty('--mgap', Math.round(C.stageW() / 120) + 'px');
  const cols = Array.from({ length: n }, () => []);
  const h = new Array(n).fill(0);
  for (const w of list) {                       // 贪心装箱：每次放进最短的一列
    const k = h.indexOf(Math.min(...h));
    cols[k].push(w); h[k] += 1 / w.img.ar;
  }
  /* 占位图必须挂在格子上，不能挂在 img 上：img 载入前是 opacity:0，
     挂在它身上的占位图会跟着一起被藏起来，格子就是一块纯色 —— 那正是
     「刚进瀑布流时上面一片空白」的原因。 */
  const cell = (w) => `<div class="mcell${w.id === C.A.cur?.id ? ' cur' : ''}" data-id="${w.id}" style="aspect-ratio:${w.img.ar};background-image:url(${C.esc(w.vis.lqip || '')})">
      <img data-id="${w.id}" data-px="500" alt="">
      <div class="mcap"><b>${C.esc(C.tx(w.title))}</b><span>${C.esc([C.tx(w.artist), C.dtw(w, 'year')].filter(Boolean).join(' · '))}</span></div>
    </div>`;
  // 内容复制一份，实现无缝循环滚动
  box.innerHTML = cols.map(c => `<div class="mcol">${c.map(cell).join('')}${c.map(cell).join('')}</div>`).join('');
  $$('.mcell', box).forEach(el => el.onclick = () => C.jumpTo(el.dataset.id, 'immersive'));
  fillMasonry(box);
  M.drift = 0; M.mcols = $$('.mcol', box); M.mspeed = M.mcols.map((_, i) => 0.85 + 0.28 * (i / Math.max(1, n - 1)));
  /* 循环周期＝第二份内容第一格的 offsetTop，正好是「一份的高 + 一道间距」。
     用 scrollHeight/2 会少算半道间距，每绕一圈接缝处跳一下。 */
  M.mper = M.mcols.map((col, i) => {
    const k = col.children[cols[i].length];
    return k ? k.offsetTop : col.scrollHeight / 2;
  });
  M.moff = M.mcols.map(() => 0);
  startDrift();
}
/* 瀑布流是固定的 72 幅在无限循环，不是一条无尽的流 —— 所以别按「进视口才取」，
   直接把这 72 幅全取回来：取完之后转多少圈都不会再出现模糊的占位图。
   两点讲究：① 同一幅在上下两份副本里各有一个 img，只发一次请求、两处共用；
   ② 按离视口的远近排队（slot() 是先进先出的），眼前这一屏最先清晰。 */
function fillMasonry(box) {
  const byId = new Map();
  for (const img of $$('.mcell img', box)) {
    const a = byId.get(img.dataset.id);
    if (a) a.push(img); else byId.set(img.dataset.id, [img]);
  }
  const order = [...byId.entries()].map(([id, els]) => {
    let d = Infinity;
    for (const e of els) {
      const t = e.getBoundingClientRect().top;
      d = Math.min(d, t < 0 ? -t * 2 : t);        // 已经滚过去的排后面
    }
    return { id, els, d };
  }).sort((a, b) => a.d - b.d);

  const seq = ++M.mfill;                          // 重新铺过就作废，别把旧的贴上去
  const load = (it, tries) => {
    const w = C.A.byId.get(it.id); if (!w) return;
    pic(w, 500).then(u => {
      if (M.mfill !== seq) return;
      for (const e of it.els) { e.src = u; e.classList.add('in'); }
    }).catch(() => {
      /* 无限循环里一格糊着就永远糊着，所以多试几次，间隔逐次拉长、封顶 20 秒；
         离开瀑布流或重新铺过就不再试 */
      if (M.mfill === seq && C.A.set.mode === 'masonry' && tries < 6) {
        setTimeout(() => load(it, tries + 1), Math.min(20000, 1200 * (tries + 1) ** 2));
      }
    });
  };
  for (const it of order) load(it, 0);
}

/* 每列各自循环，速度略有差异 —— 既无缝也有层次 */
function startDrift() {
  cancelAnimationFrame(M.raf);
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(64, now - last); last = now;
    if (!M.paused && C.A.set.mode === 'masonry' && M.mcols) {
      const adv = dt * 0.019;
      M.mcols.forEach((col, i) => {
        const per = (M.mper && M.mper[i]) || col.scrollHeight / 2;
        M.moff[i] = (M.moff[i] + adv * M.mspeed[i]);
        if (per > 0) M.moff[i] = ((M.moff[i] % per) + per) % per;
        col.style.transform = `translateY(${-M.moff[i]}px)`;
      });
    }
    M.raf = requestAnimationFrame(step);
  };
  M.raf = requestAnimationFrame(step);
}
const io = new IntersectionObserver((es) => {
  /* 一批 entry 按 DOM 顺序送来，直接遍历等于「第一列整列排前面」，
     右边几列的顶格要等最久 —— 排一下，离视口越近的越先取。 */
  const q = es.filter(e => e.isIntersecting)
    .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
  /* 这里**不能** await：一 await 整个循环就串行了，一次只取一张，
     pic() 里那个四路并发的闸门根本用不上 —— 瀑布流一屏一百多张，
     冷启动时就会一直空着。全部发出去，由 slot() 限流，顺序仍按上面排好的来。 */
  for (const e of q) {
    const img = e.target; io.unobserve(img);
    const w = C.A.byId.get(img.dataset.id); if (!w) continue;
    pic(w, Number(img.dataset.px) || 500)
      .then(u => { img.src = u; img.classList.add('in'); })
      .catch(() => io.observe(img));                  // 取图失败：等会儿再进视口时重试
  }
}, { rootMargin: '600px' });
function lazy(root) { $$('img[data-px]', root).forEach(i => io.observe(i)); }

/* ============================================================ 环形长廊
   连续位移模型：所有排布由 M.cfrac（浮点位移）驱动，
   自动轮播、按键、滚轮、鼠标拖拽共用同一套缓动，画面永远是连贯的。
   ============================================================ */
const CAR = { dwell: 4200, tau: 240, span: 3 };   // dwell 由设置里的「环形长廊节奏」覆盖

function carGap() { return Math.min(480, Math.max(272, C.stageW() * 0.262)); }
/* JS 的 Math.round 对负数是向上取整（round(-1.5) = -1、round(1.5) = 2），
   直接用会让「向右拖」和「向左拖」同样的距离落到不同档位。这里改成对称取整。 */
const snap = (x) => Math.sign(x) * Math.round(Math.abs(x));

export async function paintCarousel() {
  const world = $('#cworld'), stage = $('#carousel');
  if (!C.A.list.length) return;
  M.cidx = C.A.idx; M.cfrac = 0; M.ctarget = 0; M.cdue = 0; M.cdrag = null; M.cwheel = 0;
  world.innerHTML = ''; M.citems = [];
  for (let d = -CAR.span; d <= CAR.span; d++) {
    const el = document.createElement('div');
    el.className = 'citem'; el.dataset.d = d;
    el.innerHTML = `<span class="cframe"><img alt="" draggable="false"></span>`;

    world.appendChild(el); M.citems.push(el);
  }
  let hint = $('#chint');
  if (!hint) { hint = document.createElement('div'); hint.className = 'chint'; hint.id = 'chint'; stage.appendChild(hint); }
  hint.textContent = C.T('dragHint2');
  hint.style.opacity = '';
  setTimeout(() => { const h = $('#chint'); if (h) h.style.opacity = 0; }, 4600);
  wireDrag(stage);
  const cap = $('#ccap'); if (cap) { cap.dataset.id = ''; cap.innerHTML = ''; }
  stage.classList.remove('lit');
  applyCarousel(); paintCap();
  /* 图拉不下来（离线、网络挂住）也别把展厅一直黑着：等不到就先亮灯，图到了自然补上 */
  await Promise.race([
    Promise.all(M.citems.map(el => fillItem(el))),
    new Promise(r => setTimeout(r, 2600)),
  ]);
  requestAnimationFrame(() => { paintCap(); stage.classList.add('lit'); });
  startSpin();
}

/* 依据浮点位移重排 —— 每帧调用，纯 transform，无布局抖动 */
function applyCarousel() {
  const gap = carGap();
  for (const el of (M.citems || [])) {
    const p = Number(el.dataset.d) - M.cfrac;            // 连续位置
    const a = Math.abs(p);
    const t = Math.min(1, a);                            // 0 = 正中，1 = 已经完全是配角
    const rot = -Math.max(-1.35, Math.min(1.35, p)) * 34;
    const sc  = 1 + 0.22 * Math.max(0, 1 - a) - 0.08 * Math.min(1, Math.max(0, a - 1));
    /* 两侧退得更远、掉得更快，中间那一幅才立得住 */
    const op  = a >= 3.4 ? 0 : a <= 1 ? 1 - 0.46 * a : a <= 2 ? 0.54 - 0.24 * (a - 1) : 0.30 - 0.30 * (a - 2);
    el.style.transform = `translate3d(-50%,-50%,0) translateX(${(p * gap).toFixed(1)}px) translateZ(${(-a * 320).toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
    el.style.opacity = Math.max(0, op).toFixed(3);
    /* 配角压暗、褪色、失焦：干扰降下来，视线自然落到中间 */
    /* 中间那幅略微提亮提彩、两侧压暗褪色失焦 —— 一升一降，反差才拉得开 */
    el.style.filter = `brightness(${(1 + 0.09 * (1 - t) - 0.50 * t).toFixed(3)}) saturate(${(1 + 0.07 * (1 - t) - 0.46 * t).toFixed(3)}) contrast(${(1 + 0.04 * (1 - t) - 0.14 * t).toFixed(3)}) blur(${(Math.max(0, a - 0.5) * 1.8).toFixed(2)}px)`;
    el.style.zIndex = String(30 - Math.round(a * 4));
    const focus = a < 0.5;
    if (el._f !== focus) { el._f = focus; el.classList.toggle('focus', focus); }
  }
  syncCap();
}

/* 把「画 + 展签」当成一组，整组在竖直方向居中（略偏下一点，视觉上才不头重脚轻）。
   以前 .cworld 顶在固定的 36%，横幅作品下方就空出一大片，竖幅又贴到底。 */
const CAP_GAP = 18;
function placeCap() {
  const cap = $('#ccap'); if (!cap) return;
  const el = (M.citems || []).find(x => x._f) || (M.citems || [])[CAR.span];
  const world = $('#cworld'), hostEl = $('#carousel');
  if (!el || !world || !hostEl) return;
  const ih = el.getBoundingClientRect().height;
  const H = hostEl.getBoundingClientRect().height;
  if (!ih || !H) return;
  cap.classList.remove('tight');
  let ch = cap.offsetHeight;
  let top = (H - (ih + CAP_GAP + ch)) / 2 + 14;      // +14：重心压在画上，正正中反而显得偏高
  if (top < 26) {                                    // 真放不下就先收起导览语再算一次
    cap.classList.add('tight'); ch = cap.offsetHeight;
    top = Math.max(20, (H - (ih + CAP_GAP + ch)) / 2 + 8);
  }
  world.style.top = Math.round(top + ih / 2) + 'px';
  cap.style.top = Math.round(top + ih + CAP_GAP) + 'px';
}

function focusWork() {
  const L = C.A.list.length; if (!L) return null;
  return C.A.list[((M.cidx + snap(M.cfrac)) % L + L) % L];
}

/* 每帧同步展签。
   关键在于不再等缓动收敛（tau=240 要 ~1.3s 才落到 0.004，展签就是那样迟到的）：
   画一动，字就随它退场；越过半格立刻把内容换好（此时还是隐形的）；
   等画滑到最后一点点，字再逐行浮起来。字永远和画同步。 */
function syncCap() {
  const cap = $('#ccap'); if (!cap) return;
  const off = Math.abs(M.cfrac - snap(M.cfrac));        // 离最近一格有多远：0 … 0.5
  const moving = off > 0.13;
  const w = focusWork();
  if (w && cap.dataset.id !== w.id) {
    cap.dataset.id = w.id;
    cap.innerHTML = C.capHTML(w);
    cap._place = true;                                  // 内容换了，落定时重新量位置
  }
  if (cap._mv !== moving) {
    cap._mv = moving;
    cap.classList.toggle('swap', moving);
    if (!moving) cap._place = true;
  }
  if (!moving && cap._place) { cap._place = false; placeCap(); }
}

/* 强制重画（切模式、换藏品列表时用） */
function paintCap() {
  const cap = $('#ccap'); if (!cap) return;
  cap.dataset.id = ''; cap._mv = null; cap._place = true;
  syncCap();
}

/* 位移超过一格时换基准：只把落到两端之外的那一张搬到另一端换图，
   其余六张的 src 一动不动 —— 所以滚动时不会闪。 */
function rebaseCarousel() {
  const n = M.cfrac > 0 ? Math.floor(M.cfrac) : Math.ceil(M.cfrac);
  if (!n) return;
  const L = C.A.list.length, W = CAR.span * 2 + 1;
  M.cidx = ((M.cidx + n) % L + L) % L;
  M.cfrac -= n; M.ctarget -= n;
  for (const el of (M.citems || [])) {
    let d = Number(el.dataset.d) - n;
    let moved = false;
    while (d < -CAR.span) { d += W; moved = true; }
    while (d > CAR.span) { d -= W; moved = true; }
    el.dataset.d = d;
    if (moved) fillItem(el);                   // 只有搬过位置的那张才换画
  }
  commitCarousel();
}
let ccommit = null;
function commitCarousel() {                    // 合并写入，拖拽时不刷爆存储
  clearTimeout(ccommit);
  ccommit = setTimeout(() => C.setIndex(M.cidx), 240);
}
async function fillItem(el) {
  const L = C.A.list.length, d = Number(el.dataset.d);
  const w = C.A.list[((M.cidx + d) % L + L) % L];
  if (!w || el.dataset.id === w.id) return;
  el.dataset.id = w.id;
  el.classList.add('swapping');                // 换图期间藏起来，不让旧图一闪
  let u;
  try { u = await pic(w, Math.abs(d) <= 1 ? 960 : 500); }
  catch { el.classList.remove('swapping'); retryLater(el, fillItem); return; }
  if (el.dataset.id !== w.id) return;
  const f = $('.cframe img', el);
  if (f) f.src = u;
  el.classList.remove('swapping');
}

function startSpin() {
  cancelAnimationFrame(M.raf);
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(64, now - last); last = now;
    if (C.A.set.mode === 'carousel') {
      if (!M.cdrag) {
        if (Math.abs(M.ctarget - M.cfrac) < 0.004) {
          M.cfrac = M.ctarget;
          // 用绝对时刻计时，浏览器降频时停留时长依然准确
          if (M.paused || !CAR.dwell) M.cdue = 0;
          else if (!M.cdue) M.cdue = now + CAR.dwell;
          else if (now >= M.cdue) { M.cdue = 0; M.ctarget += 1; }
        } else {
          M.cdue = 0;
          M.cfrac += (M.ctarget - M.cfrac) * (1 - Math.exp(-dt / CAR.tau));
        }
        rebaseCarousel(); applyCarousel();
      }
    }
    M.raf = requestAnimationFrame(step);
  };
  M.raf = requestAnimationFrame(step);
}

/* 鼠标 / 触控左右拖动 */
function wireDrag(stage) {
  if (stage.dataset.drag) return; stage.dataset.drag = '1';
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || C.A.set.mode !== 'carousel') return;
    e.preventDefault();
    M.cdrag = { x: e.clientX, base: M.cfrac, moved: 0, lx: e.clientX, lt: performance.now(), v: 0, id: e.pointerId };
    try { stage.setPointerCapture(e.pointerId); } catch { }
    stage.classList.add('grabbing');
    const h = $('#chint'); if (h) h.style.opacity = 0;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!M.cdrag || e.pointerId !== M.cdrag.id) return;
    const dx = e.clientX - M.cdrag.x;
    M.cdrag.moved = Math.max(M.cdrag.moved, Math.abs(dx));
    M.cfrac = M.cdrag.base - dx / carGap();
    const t = performance.now(), dt = t - M.cdrag.lt;
    if (dt > 10) { M.cdrag.v = (e.clientX - M.cdrag.lx) / dt; M.cdrag.lx = e.clientX; M.cdrag.lt = t; }
    rebaseCarousel(); applyCarousel();
  });
  const release = (e) => {
    if (!M.cdrag || (e && e.pointerId !== undefined && e.pointerId !== M.cdrag.id)) return;
    const fling = -M.cdrag.v * 170 / carGap();               // 甩动惯性
    M.ctarget = snap(M.cfrac + Math.max(-2.4, Math.min(2.4, fling)));
    const tap = M.cdrag.moved <= 6;
    M.cdrag = null; M.cdue = 0;
    stage.classList.remove('grabbing');
    /* 设了指针捕获之后，click 事件的目标会被改写成 stage，挂在 .citem 上的 onclick 永远不触发。
       所以点击一律在这里按坐标判定：点中间那幅放大，点旁边那幅转过去。 */
    if (tap && e && e.clientX !== undefined) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.citem');
      if (el) { const k = Number(el.dataset.d) - snap(M.cfrac); k === 0 ? C.zoomCurrent() : carouselGo(k); }
    }
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  /* 不监听 pointerleave：设置了指针捕获之后它会在拖拽途中误触发，一甩到屏幕边缘就断了 */
  addEventListener('blur', () => release());
  stage.addEventListener('dragstart', (e) => e.preventDefault());
}

export function carouselGo(delta) {
  M.ctarget = snap(M.cfrac) + delta;
  M.cdue = 0;
}

/* ============================================================ 通用 */
export async function paintMode(mode) {
  stopLoops();
  if (mode === 'masonry') return paintMasonry();
  if (mode === 'carousel') return paintCarousel();
  if (mode === 'film') return paintFilm();
}
export function stopLoops() {
  cancelAnimationFrame(M.raf); M.raf = null;
  const c = $('#carousel'); if (c) c.classList.remove('lit');
  const f = $('#film'); if (f) f.classList.remove('lit');
}
export function setPaused(p) { M.paused = p; }
export function modeGo(mode, delta) {
  if (mode === 'masonry') { const d = delta * innerHeight * 0.55; (M.moff || []).forEach((_, i) => M.moff[i] += d); return true; }
  if (mode === 'carousel') { carouselGo(delta); return true; }
  if (mode === 'film') { filmGo(delta); return true; }
  return false;
}
export function modeWheel(mode, dy) {
  if (mode === 'masonry') { (M.moff || []).forEach((_, i) => M.moff[i] += dy * 0.85); return true; }
  if (mode === 'carousel') { M.cwheel = (M.cwheel || 0) + dy; if (Math.abs(M.cwheel) > 70) { carouselGo(M.cwheel > 0 ? 1 : -1); M.cwheel = 0; } return true; }
  if (mode === 'film') { M.fwheel = (M.fwheel || 0) + dy; if (Math.abs(M.fwheel) > 70) { filmGo(M.fwheel > 0 ? 1 : -1); M.fwheel = 0; } return true; }
  return false;
}
export function modeHover(mode, on) { if (mode === 'masonry') M.paused = on; }
export function syncCarousel(idx) {
  if (M.cidx === idx || M.cdrag) return;
  M.cidx = idx; M.cfrac = 0; M.ctarget = 0; M.cdue = 0;
  (M.citems || []).forEach(fillItem); applyCarousel(); paintCap();
}
export function relayout(mode) {
  if (mode === 'masonry') paintMasonry();
  if (mode === 'carousel') { paintCap(); applyCarousel(); }
  if (mode === 'film') paintFilm();
}
/* 节奏设置改了以后立刻生效，不用重画整条片子 */
export function applyPace(set) {
  CAR.dwell = Number(set.carouselMs) || 0;
  M.cdue = 0; M.fdue = 0;
}

/* ============================================================ 胶卷
   样式：**一幅焦点图** —— 片门那一幅完全平整、正对观众、最大也最亮；
   两侧是一条**平滑的山谷形长带**：从左上远处蜿蜒而来，落到谷底的焦点，
   再向右上远处而去 —— 像一条搭在浅谷里的胶片。

   之前几版的教训必须记下来：把「卷曲/蜿蜒」做成短周期波（yaw 波周期
   只有 500px 左右）再叠上陡峭的底角，相邻画格的转角会剧烈跳变
   （实测 67°→47°→52°→65°），画面上就是一堆被拧侧的碎卡片，不是一条
   胶卷。真实蜿蜒的片子是**一条平滑大弧**：转角逐帧渐变（相邻差 <15°）、
   画格始终可读，远端靠「变小、变暗、变虚」退场，而不是侧立成细条。

   曲线（全部分量都慢、都平滑）：
   ① 平顶（FLAT）：只罩住片门那一幅 —— 一块绝对平整的矩形（焦点）。
   ② yaw 单调渐近 46°，过渡长（TRN≈2.1 格高）：邻幅 3–12°、第二幅
      ~20°、第三幅 ~35° —— 渐变，不跳变；两端也只是中度侧转。
   ③ pitch 底子让两端**抬升**（山谷两翼，−7°）：远处 = 更高 + 更小 +
      更暗，深度读法一致（之前两端下垂，既远又往下，读着就别扭）。
   ④ 深度：单调后退趋势 + 一条很温和的深度波（周期 1800px——周期短于
      十帧时相邻帧各在波两侧，z 的斜率会把画格角度拽得来回摆）。
   ⑤ 远处画格按距离挂**离散档位的模糊**（b1/b2/b3），越远越虚。

   分层画法不变：片身画在 canvas 上，画面切成薄片贴着片基摆；
   白色帧线画在上层 canvas 上跟着走带移动。
   ============================================================ */
/* 基准画格高 250px 下的一套尺寸；实际按画格高等比缩放，所以小窗口里波形一样好看 */
const FILM = {
  tau: 300, REF: 250,
  SPAN: 36,              /* 片带上放几幅（首尾相接成一个环） */
  SW: 17,                /* 片身薄片宽。相邻薄片的法线略有不同，边沿上会留下
                            约 (片高/2 × 转角) 的锯齿，所以宁可切细一点 */
  PSW: 72,               /* 画面薄片宽。画也切片 —— 每片仍是刚性平面（弦≈弧，看不出变形），
                            但整幅画因此贴着片基弯，相邻两幅再也不会在屏幕上互相压住 */
  RP: 1.70,              /* 齿孔间距 ÷ 齿孔带高（35mm 实物 4.75 ÷ 2.8） */
  PHR: 0.132,            /* 齿孔带高 ÷ 画格高 */
  BLR: 0.085,            /* 齿孔带与画面之间那一圈空片基，片边印字就印在这儿 */
  ARMAX: 2.4,            /* 画面最宽的长宽比 */
  YAW: 46,               /* 纵深拧转的渐近角（度）：中度侧转，画格永远可读 */
  TRN: 2.1,              /* 卷曲过渡长度（× 画格高）：更长过渡 = sat 最陡段摊开到三四帧，
                            单帧转角跳变 ≤15°（1.75 时矮窗口里第 3 帧会一下跳 30°） */
  YAWW: 4.5, PYW: 1150, PY1: 0.55,      /* 平面卷的微扰：幅度小、周期长，只添一点活 */
  PITCH: -7, PITW: 4, PPW: 1600, PP1: 0,  /* 山谷两翼抬升角（负=抬）+ 极缓的竖向微扰 */
  ZW: 150, PZW: 1800,    /* 深度波：幅度（px）·周期（px）。周期必须长 —— 周期短于
                            十帧时相邻帧各在波的两侧，z 的斜率会把 chord 角拽得来回摆 */
  DEPTH: 560,            /* 单调后退趋势（延伸），片子在两端缩进黑里；起步被 sat 压平 */
  BLUR: 1,               /* 远处离散模糊档位开关（0 = 关） */
  GAP: 26,               /* 帧线：两幅画之间露出的片基 */
  PERS: 1250,            /* 透视焦距。越短远近差越明显；改这里必须同步改 .frow 的 perspective */
  LIT: [-0.34, -0.82, 0.46],  /* 打光方向（左上前方），用来算片基上的明暗与高光 */
};

function picH() { return Math.round(Math.min(innerHeight * 0.26, 300)); }

/* 沿弧长积分出整条曲线，两个方向各积一次。s=0 是片门正中，平顶罩着它。 */
function buildPath(pich, flat) {
  const F = FILM, RAD = Math.PI / 180;
  const k = pich / F.REF;
  const G = M.fg = {
    SW: F.SW * k, REACH: Math.max(1560, innerWidth * 1.10),
    FLAT: flat, TR: F.TRN * pich,
    LYW: F.PYW * k / (2 * Math.PI), LPW: F.PPW * k / (2 * Math.PI), LZW: F.PZW * k / (2 * Math.PI),
    ZW: F.ZW * k, DEPTH: F.DEPTH * k, GAP: Math.round(F.GAP * k),
  };
  const n = Math.ceil(G.REACH / G.SW) + 2;
  const N = n * 2 + 1, mid = n;
  const X = new Float32Array(N), Y = new Float32Array(N), Z = new Float32Array(N);
  /* m²/(1+m²)：起步二阶连续（平顶接弯段没有棱），渐近到 1（远处不再加倍地拧） */
  const sat = (m) => m <= 0 ? 0 : m * m / (1 + m * m);
  /* 波的包络：从平顶边缘起波。左右两侧各带一点相位差：真拿着的胶卷两边不会镜像对称 */
  const env = (q) => sat((Math.abs(q) - G.FLAT * 0.9) / (G.TR * 0.8));
  const yawAt = (q) => {
    const m = (Math.abs(q) - G.FLAT) / G.TR, ph = F.PY1 + (q < 0 ? 0.7 : 0);
    return (Math.sign(q) * F.YAW * sat(m) + F.YAWW * env(q) * Math.sin(q / G.LYW + ph)) * RAD;
  };
  const pitAt = (q) => {
    const m = (Math.abs(q) - G.FLAT * 0.86) / G.TR, ph = F.PP1 + (q < 0 ? 0.55 : 0);
    /* PITCH 为负 = 两端抬升（山谷两翼）：远处更高、更小、更暗，深度读法一致 */
    return (Math.sign(q) * F.PITCH * sat(m) + F.PITW * env(q) * Math.cos(q / G.LPW + ph)) * RAD;
  };
  Z[mid] = 0;                                       /* 片门平段：z 恒为 0，焦点图是平的 */
  const walk = (dir) => {
    let x = 0, y = 0, z = 0;
    for (let j = 1; j <= n; j++) {
      const q = dir * (j - 0.5) * G.SW;
      const a = yawAt(q), r = pitAt(q);
      const step = dir * G.SW;
      x += Math.cos(a) * Math.cos(r) * step;
      z -= Math.sin(a) * Math.cos(r) * step;
      y += Math.sin(r) * step;
      const i = mid + dir * j;
      /* 单调后退从平段末端才起步，且用 sat 压平起步斜率 —— 直接线性起步的话，
         平段里的片身角度是平的、z 却在往下走，刚出片门的那幅会被折出一道假转角。
         深度波同样以平段末端为相位起点：(1−cos) 在起点处值和斜率都是 0，
         荡出去的段更远、转回来的段又近了 —— 远近节奏全靠它。 */
      const f0 = G.FLAT * 0.98;
      const md = Math.max(0, Math.abs(q) - f0) / Math.max(1, G.REACH - f0) * sat((Math.abs(q) - f0) / G.TR);
      /* 深度波也带左右相位差，但要把平段里的常量扣掉 —— 否则左侧平段会比右侧
         整体低一截，焦点那一幅正跨在台阶上（中段会被折出十几度的假转角） */
      const phz = dir < 0 ? 0.6 : 0;
      const w = Math.max(0, Math.abs(q) - f0) / G.LZW;
      const zw = G.ZW * (Math.cos(phz) - Math.cos(w + phz)) / 2;
      X[i] = x; Y[i] = y;
      Z[i] = z - G.DEPTH * md - zw;
    }
  };
  walk(1); walk(-1);
  M.path = { X, Y, Z, mid, n, SW: G.SW };
}
function pathAt(s) {
  const T = M.path, q = s / T.SW;
  const k = Math.max(-T.n, Math.min(T.n - 1, Math.floor(q))), f = q - k;
  const i = T.mid + k;
  const L = (a) => a[i] + (a[i + 1] - a[i]) * f;
  return { x: L(T.X), y: L(T.Y), z: L(T.Z) };
}
/* 绕自身长轴的扭转去掉了：片子不拧，卷曲全靠 yaw＋pitch，齿孔带才是一条干净的带 */
function rollAt() { return 0; }

/* 把「弧长区间 [s0,s1]」摆成一块平面：两端点都落在曲线上，所以片身是连着的。
   几何全部来自 colFrame —— 和 canvas 片基同一套数。 */
function segAt(s0, s1, roll) {
  const C = colFrame(s0, s1);
  return {
    len: C.w, yaw: C.yaw, pitch: C.pitch, z: C.mid.z,
    tr: `translate3d(${C.mid.x.toFixed(1)}px,${C.mid.y.toFixed(1)}px,${C.mid.z.toFixed(1)}px) ` +
      `rotateY(${C.yaw.toFixed(2)}deg) rotateZ(${C.pitch.toFixed(2)}deg) rotateX(${roll.toFixed(2)}deg)`,
  };
}

/* 这一片朝着哪儿、被照到多少。片基是弯的，光滚过去哪儿亮哪儿暗 ——
   「像不像真胶片」大半就落在这上头。算一次烧进内联样式，每帧不再动它。 */
const HALF = (() => {
  const L = FILM.LIT, h = [L[0], L[1], L[2] + 1];
  const n = Math.hypot(h[0], h[1], h[2]);
  return [h[0] / n, h[1] / n, h[2] / n];
})();
function litAt(yawDeg, pitchDeg, rollDeg) {
  /* 法线 = ex × ey = (sin yaw, 0, cos yaw)，对应 rotateY(+yaw)；
     与 colFrame / segAt 用的是同一个约定 */
  const R = Math.PI / 180, a = rollDeg * R, p = pitchDeg * R, b = yawDeg * R;
  /* 局部 +Z 依次过 rotateX(a) → rotateZ(p) → rotateY(b) */
  let x = Math.sin(a) * Math.sin(p), y = -Math.sin(a) * Math.cos(p), z = Math.cos(a);
  const x2 = x * Math.cos(b) + z * Math.sin(b);
  z = -x * Math.sin(b) + z * Math.cos(b); x = x2;
  const L = FILM.LIT;
  const lam = Math.max(0, x * L[0] + y * L[1] + z * L[2]);
  const sp = Math.pow(Math.max(0, x * HALF[0] + y * HALF[1] + z * HALF[2]), 24);
  return { lam, sp };
}
/* 明暗 = 打光 + 远近；两样都不用 filter，写成一层平色背景，
   省掉几百个离屏渲染面 —— 卡顿主要就是被 filter 吃掉的 */
function shadeOf(lam, sp, d) {
  const G = M.fg;
  const dep = Math.min(1, Math.max(0, (d - G.REACH * 0.08) / (G.REACH * 0.84)));
  const dark = (1 - (0.36 + 0.64 * lam)) * 0.62 + dep * dep * 0.90;
  return { sh: Math.round(Math.min(0.94, dark) * 100), gl: Math.round(sp * 34 * (1 - dep) * (M.glK == null ? 1 : M.glK)) };
}
/* 片型的颜色是 CSS 变量给的，取出来直接算成「这一片该是什么色」，
   于是高光层和明暗层两层满幅背景都省掉了 —— 重绘面积少一半 */
function rgbOf(str) {
  const t = (str || '').trim();
  if (!t || t === 'transparent' || t === 'none') return null;
  const h = t.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(h)) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  const m = t.match(/-?[\d.]+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null;
}
function tone(c, sh, gl) {
  if (!c) return 'transparent';
  const g = gl / 100, k = 1 - sh / 100;
  return 'rgb(' + c.map(v => Math.round((v * (1 - g) + 255 * g) * k)).join(',') + ')';
}

/* ============================================================
   片身画在一张 canvas 上，而不是几百个 DOM 薄片。
   量过：238 个带 3D 变换的元素，光是每帧合成就要 117ms —— 把它们的背景
   全换成纯色、把齿孔相位冻住，一毫秒都省不下来，代价全在「元素个数」上。
   一张 canvas 只有一个图层，而且还能画出真正的圆角齿孔和连续的高光。
   片身的分段跟着画面薄片走（见 colFrame/bandCols），走带时按相位档重画；
   相位不变时连重画都省掉。胶片颗粒层拿掉了：按档重画后整屏 overlay
   抠像两遍全幅合成跟不起，明暗层次在渐变里留着，观感损失很轻。
   ============================================================ */

/* 一段片基 [s0,s1] 的**弦平面**几何：位置在两端点中点、朝向取弦的转角。
   这正是画面薄片（.fps）被 CSS 摆出来的那块刚性平面 —— 两个轴用与
   rotateY(-yaw)·rotateZ(pitch) 完全相同的矩阵约定算出。
   片基照它分段来画、图片照它来摆：同一段、同一套数，两边按构造重合，
   远处拧得再狠也不会「图片浮在片基上」。 */
function colFrame(s0, s1) {
  const P0 = pathAt(s0), P1 = pathAt(s1);
  const dx = P1.x - P0.x, dy = P1.y - P0.y, dz = P1.z - P0.z;
  const w = Math.hypot(dx, dy, dz) || (s1 - s0);
  const DEG = 180 / Math.PI;
  const yaw = Math.atan2(-dz, dx) * DEG, pitch = Math.atan2(dy, Math.hypot(dx, dz)) * DEG;
  const p = pitch / DEG, cy = Math.cos(yaw / DEG), sy = Math.sin(yaw / DEG);
  const cp = Math.cos(p), sp = Math.sin(p);
  /* 两轴与 CSS rotateY(+yaw)·rotateZ(pitch) 摆出来的薄片完全一致：
     横轴严格平行弦向量（右侧后退时 z 为负）—— 这是「图片贴着曲线」的硬约束。
     注意符号：CSS rotateY(α) 把局部 +X 映到 z' = −sin(α)，而弦的 z 分量是
     −cos(pitch)·sin(yaw)，所以要的是 **+yaw**。写成 −yaw 会把画面在纵深上镜像，
     片门附近 yaw≈0 看不出来，一拐弯就越走越偏 —— 那正是「只有中间几幅正常」的病根。 */
  const ex = [cp * cy, sp, -cp * sy];        /* 平面的横向轴（沿片子走向） */
  const ey = [-sp * cy, cp, sp * sy];        /* 平面的纵向轴（片子的高度方向） */
  const mid = { x: (P0.x + P1.x) / 2, y: (P0.y + P1.y) / 2, z: (P0.z + P1.z) / 2 };
  const pt = (lx, c) => [mid.x + ex[0] * lx + ey[0] * c, mid.y + ex[1] * lx + ey[1] * c, mid.z + ex[2] * lx + ey[2] * c];
  return { s0, s1, w, yaw, pitch, mid, pt };
}
/* 3D 点投到屏幕，透视式子和 CSS 的一模一样 */
function projPt(P, O) {
  const f = FILM.PERS / Math.max(140, FILM.PERS - P[2]);
  return [O.ox + O.sc * P[0] * f, O.oy + O.sc * P[1] * f];
}
function quad(ctx, a, b, c, d, fill) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function fitCanvas(cv, W, H) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = Math.round(W * dpr), h = Math.round(H * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* 片身的分段表：**帧内就按画面薄片的边界切**（每片一块刚体弦平面），
   帧间空隙和两端边距按 ≤42px 细分。canvas 与 DOM 用同一张表，
   图片与片基在每一段上都严丝合缝。 */
function bandCols(G) {
  const L = M.tapeLen || 1, DS = 42, out = [];
  const slices = [];
  if (M.frames) for (const fr of M.frames) {
    let p = fr.seg.mid - M.fx; p -= Math.round(p / L) * L;
    /* 与 applyFilm 同一道可见门限：DOM 隐藏了的帧不进分段表，
       否则最远端曲线极陡处弦长≫弧长，边界折线会疯掉 */
    if (Math.abs(p) > G.REACH * 0.9) continue;
    const half = fr.seg.pw / 2;
    for (let i = 0; i < fr.cnt; i++)
      slices.push([p - half + i * fr.step, p - half + (i + 1) * fr.step]);
  }
  slices.sort((a, b) => a[0] - b[0]);
  let prev = -G.REACH;
  const fill = (a, b) => {
    const n = Math.max(1, Math.ceil((b - a) / DS));
    for (let i = 0; i < n; i++) out.push([a + (b - a) * i / n, a + (b - a) * (i + 1) / n]);
  };
  for (const [a, b] of slices) {
    if (a > prev) fill(prev, a);
    out.push([a, b]); prev = Math.max(prev, b);
  }
  if (prev < G.REACH) fill(prev, G.REACH);
  return out.map(([a, b]) => colFrame(a, b));
}
/* 一条片身条带（弧长全线 × 离中线 [c0,c1]）一条闭合路径一次填完。
   折点取每段自己的右端 —— 相邻两段在边界上共用同一个点，接缝无发丝线。 */
function ribbonCols(ctx, O, c0, c1, cols, stops) {
  if (!cols.length) return;
  const top = [], bot = [];
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    if (i === 0) {
      top.push(projPt(col.pt(-col.w / 2, c0), O));
      bot.push(projPt(col.pt(-col.w / 2, c1), O));
    }
    top.push(projPt(col.pt(col.w / 2, c0), O));
    bot.push(projPt(col.pt(col.w / 2, c1), O));
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  /* 渐变区间取折线自己的横向范围（透视折叠时首点不一定是最左点），
     色标一律钳进 [0,1] —— addColorStop 对越界值是直接抛错的 */
  let xa = Infinity, xb = -Infinity;
  for (const p of top) { if (p[0] < xa) xa = p[0]; if (p[0] > xb) xb = p[0]; }
  for (const p of bot) { if (p[0] < xa) xa = p[0]; if (p[0] > xb) xb = p[0]; }
  if (xb - xa < 0.5) { ctx.fillStyle = stops[stops.length >> 1][1]; ctx.fill(); return; }
  const g = ctx.createLinearGradient(xa, 0, xb, 0);
  let last = -1;
  for (const [t, col] of stops) {
    const q = Math.min(1, Math.max(0, Math.max(last + 1e-4, t)));
    g.addColorStop(q, col); last = q;
  }
  ctx.fillStyle = g; ctx.fill();
}

function buildBandBody() {
  const stage = $('#film'); if (!stage || !M.path) return;
  const W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
  const G = M.fg, O = M.fO = { ox: W / 2, oy: M.ftop || H / 2, sc: M.fsc || 1 };
  const cv = M.bodyCv || (M.bodyCv = document.createElement('canvas'));
  const ctx = fitCanvas(cv, W, H);
  ctx.clearRect(0, 0, W, H);
  const cs = getComputedStyle(stage);
  const CB = rgbOf(cs.getPropertyValue('--base')) || [52, 52, 60];
  const CT = rgbOf(cs.getPropertyValue('--trackc'));
  /* 片基越亮，高光越要收着 —— 幻灯片那种浅卡纸再加高光就一片惨白了 */
  M.glK = Math.max(0.18, 1 - (CB[0] * 0.3 + CB[1] * 0.59 + CB[2] * 0.11) / 255 * 1.05);
  const CE = rgbOf(cs.getPropertyValue('--edge')) || [200, 180, 140];
  const printA = parseFloat(cs.getPropertyValue('--print')) || 0;
  const CH = M.fch, PH = M.fPH, BL = M.fBL, PW = M.fPW;
  const half = CH / 2, EDGE = Math.max(1.4, CH * 0.007);
  /* 分段跟着画面薄片走（走带时每次重算 —— 量不大，一条几百个点而已） */
  const cols = M.fcols = bandCols(G);
  if (!cols.length) { M.bodyKey = null; return; }
  /* 色标逐段取：颜色按这一段的朝光角度，位置按投影后的屏幕横坐标。
     区间取全部段投影的 min/max —— 远端透视折叠时最深点反而投得靠里，
     用首末两点定区间会把色标算出负值/超一，addColorStop 直接抛错 */
  let xa = Infinity, xb = -Infinity;
  for (const col of cols) {
    const x0 = projPt(col.pt(-col.w / 2, 0), O)[0], x1 = projPt(col.pt(col.w / 2, 0), O)[0];
    if (x0 < xa) xa = x0; if (x0 > xb) xb = x0;
    if (x1 < xa) xa = x1; if (x1 > xb) xb = x1;
  }
  const span = xb - xa || 1;
  const body = [], lipT = [], lipB = [], trk = [];
  for (const col of cols) {
    const sm = (col.s0 + col.s1) / 2;
    let { lam, sp } = litAt(col.yaw, col.pitch, rollAt(sm));
    /* 片门那一段被放映机的光正打着，片基也透亮起来 —— 焦点脚下一池光 */
    const gf = Math.max(0, 1 - Math.abs(sm) / (G.FLAT * 1.5));
    if (gf > 0) { lam = Math.min(1, lam + 0.50 * gf * gf); sp = Math.min(1, sp + 0.10 * gf); }
    const { sh, gl } = shadeOf(lam, sp, Math.abs(sm));
    const t = (projPt(col.pt(0, 0), O)[0] - xa) / span;
    body.push([t, tone(CB, sh, gl)]);
    lipT.push([t, tone(CB, Math.max(0, sh - 26), gl + 16)]);
    lipB.push([t, tone(CB, Math.min(96, sh + 30), 0)]);
    if (CT) trk.push([t, tone(CT, sh, gl)]);
  }
  ribbonCols(ctx, O, -half, half, cols, body);
  /* 上层：只画上下两条外缘（片基 + 齿孔带）。它盖在画面之上，
     于是画面薄片接缝处那点锯齿边被片基压住 —— 露出来的就是一条干净的帧线，
     实物胶片的画格边本来也是这么来的。 */
  const ov = M.overCv || (M.overCv = document.createElement('canvas'));
  const oc = fitCanvas(ov, W, H);
  oc.clearRect(0, 0, W, H);
  const cov = M.fCover = Math.max(PH + BL * 0.5, (M.fOpenH || CH * 0.6) / 2 - Math.max(6, CH * 0.024));
  for (const sgn of [-1, 1]) {
    const a1 = sgn < 0 ? -half : cov, b1 = sgn < 0 ? -cov : half;
    ribbonCols(oc, O, a1, b1, cols, body);
  }
  ribbonCols(oc, O, -half, -half + EDGE, cols, lipT);
  ribbonCols(oc, O, half - EDGE, half, cols, lipB);
  if (CT) ribbonCols(oc, O, -half + PH + BL * 0.22, -half + PH + BL * 0.66, cols, trk);
  /* 片边印字：每个齿距一小组竖道，按段裁着画，跟着弦平面走 */
  if (printA > 0.02) {
    const c0 = -half + PH + BL * 0.26, c1 = -half + PH + BL * 0.72;
    for (const col of cols) {
      const k0 = Math.floor((col.s0 - PW * 0.44) / PW), k1 = Math.ceil((col.s1 - PW * 0.10) / PW);
      for (let k = k0; k <= k1; k++) {
        const s = k * PW;
        for (const [a, b] of [[0.10, 0.17], [0.24, 0.28], [0.36, 0.44]]) {
          const sa = Math.max(s + PW * a, col.s0), sb = Math.min(s + PW * b, col.s1);
          if (sb - sa < 0.5) continue;
          const { lam, sp } = litAt(0, 0, rollAt((sa + sb) / 2));
          const { sh } = shadeOf(lam, sp, Math.abs((sa + sb) / 2));
          if (sh > 88) continue;
          const ink = `rgba(${CE[0]},${CE[1]},${CE[2]},${(printA * (1 - sh / 100) * 0.8).toFixed(3)})`;
          const lx = x => (x - (col.s0 + col.s1) / 2) * (col.w / Math.max(1, col.s1 - col.s0));
          quad(oc, projPt(col.pt(lx(sa), c0), O), projPt(col.pt(lx(sb), c0), O),
            projPt(col.pt(lx(sb), c1), O), projPt(col.pt(lx(sa), c1), O), ink);
        }
      }
    }
  }
  /* 颗粒层去掉了：片基现在跟着走带每个相位档重画一次，整屏 overlay+抠像
     两遍全幅合成跟不起。颜色渐变里的明暗层次留着，观感损失很轻。 */
  M.bodyKey = `${W}x${H}x${(M.fsc || 1).toFixed(3)}x${Math.round(M.ftop || 0)}`;
}

/* 每帧：片基跟着走带重画（分段与画面薄片对齐），再把齿孔按段画上去 */
function drawBand() {
  const stage = $('#film'), cv = $('#fband'), ovc = $('#fover');
  if (!cv || !ovc || !M.path || !M.fg) return;
  const W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
  const key = `${W}x${H}x${(M.fsc || 1).toFixed(3)}x${Math.round(M.ftop || 0)}`;
  const rebuilt = M.bodyKey !== key;
  /* 齿孔有三十来像素宽，走带时把相位量化到 1.2px 完全看不出来；
     相位档没变就整张都不重画 —— 自动走带每帧只挪 0.3px 左右，
     四帧里只有一帧真的重画。 */
  const q = Math.round(M.fx / 1.2);
  if (M.holeQ === q && !rebuilt) return;
  M.holeQ = q;
  buildBandBody();
  const under = fitCanvas(cv, W, H);
  under.clearRect(0, 0, W, H);
  if (M.bodyCv) under.drawImage(M.bodyCv, 0, 0, W, H);
  const ctx = fitCanvas(ovc, W, H);
  ctx.clearRect(0, 0, W, H);
  if (M.overCv) ctx.drawImage(M.overCv, 0, 0, W, H);
  const G = M.fg, O = M.fO, PW = M.fPW, CH = M.fch, PH = M.fPH;
  if (!O || M.holeC === null || !M.fcols) return;
  const half = CH / 2, hw = PW * 0.29;
  const cIn = half - PH * 0.80, cOut = half - PH * 0.20;
  const ph = ((M.fx % PW) + PW) % PW;
  const HC = M.holeC, RIM = M.rimC;
  /* 齿孔也按段裁着画：跨过段边界的孔拆成两笔，各用各的弦平面，
     和它脚下的片基、旁边的画面永远同面 */
  for (const col of M.fcols) {
    const k0 = Math.floor((col.s0 + ph - hw) / PW), k1 = Math.ceil((col.s1 + ph + hw) / PW);
    for (let k = k0; k <= k1; k++) {
      const s = k * PW - ph;
      const sa = Math.max(s - hw, col.s0), sb = Math.min(s + hw, col.s1);
      if (sb - sa < 0.4) continue;
      const { lam, sp } = litAt(0, 0, rollAt((sa + sb) / 2));
      const { sh } = shadeOf(lam, sp, Math.abs((sa + sb) / 2));
      if (sh > 92) continue;
      const fill = tone(HC, sh, 0);
      const rim = `rgba(${RIM[0]},${RIM[1]},${RIM[2]},${(0.22 * (1 - sh / 110)).toFixed(3)})`;
      const lx = x => (x - (col.s0 + col.s1) / 2) * (col.w / Math.max(1, col.s1 - col.s0));
      for (const sgn of [-1, 1]) {
        const a = projPt(col.pt(lx(sa), sgn * cOut), O), b = projPt(col.pt(lx(sb), sgn * cOut), O);
        const c = projPt(col.pt(lx(sb), sgn * cIn), O), d = projPt(col.pt(lx(sa), sgn * cIn), O);
        quad(ctx, a, b, c, d, fill);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
}

/* 量出片子在屏幕上真正占的上下范围（含透视缩小），据此把它和展签一起摆正中 */
function bandExtent() {
  const G = M.fg, per = FILM.PERS, half = (M.fch || 320) / 2;
  let lo = 1e9, hi = -1e9;
  for (let s = -G.REACH * 0.78; s <= G.REACH * 0.78; s += G.SW * 4) {
    const p = pathAt(s), k = per / Math.max(260, per - p.z);
    const r = half * Math.abs(Math.cos(rollAt(s) * Math.PI / 180)) + 6;
    lo = Math.min(lo, (p.y - r) * k); hi = Math.max(hi, (p.y + r) * k);
  }
  return { lo, hi };
}

function placeStrip() {
  const stage = $('#film'), strip = $('#fstrip'), cap = $('#fcap');
  if (!stage || !strip || !cap || !M.path) return;
  const H = stage.clientHeight; if (!H) return;
  const { lo, hi } = bandExtent(), raw = hi - lo;
  cap.classList.remove('tight');
  let ch = cap.offsetHeight;
  /* 底下给走带提示留一条，不然小窗口里展签会压到它 */
  const RES = 34;
  /* 波太大就整条等比缩进窗口：.fstrip 是平的，缩它等于缩最终成像，不动 3D */
  const fitScale = (c) => Math.max(0.55, Math.min(1, (H - 34 - c - 24 - RES) / raw));
  let sc = fitScale(ch);
  if ((H - raw * sc - 34 - ch - RES) / 2 < 10) { cap.classList.add('tight'); ch = cap.offsetHeight; sc = fitScale(ch); }
  const span = raw * sc;
  const top = Math.max(6, (H - span - 34 - ch - RES) / 2);
  strip.style.transform = sc < 0.999 ? `scale(${sc.toFixed(4)})` : '';
  strip.style.top = Math.round(top - lo * sc) + 'px';
  cap.style.top = Math.round(top + span + 34) + 'px';
  cap.style.bottom = 'auto';
  /* canvas 上的片身要跟 DOM 里的画面用同一个原点和同一个缩放 */
  M.ftop = Math.round(top - lo * sc); M.fsc = sc;
  M.bodyKey = null; drawBand();
}

/* 画面取图：3D 变换过的元素 IntersectionObserver 靠不住，自己按弧长距离取 */
function wantPic(fr) {
  if (fr.url || fr.loading) return;
  fr.loading = true;
  pic(fr.w, 960).then(u => {
    fr.url = u; fr.loading = false;
    for (const el of fr.els) { el.style.backgroundImage = `url(${u})`; el.classList.add('in'); }
  }).catch(() => { fr.loading = false; });
}

export async function paintFilm() {
  const stage = $('#film'), band = $('#fband'), row = $('#frow');
  if (!band || !row || !C.A.list.length) return;
  /* 只铺一段窗口，但窗口要罩住当前这幅 —— 从展墙第 60 幅切过来时，
     片子上必须就是那一幅，不能还从头开始 */
  const all = C.A.list, N = all.length, SPAN = Math.min(FILM.SPAN, N);
  const cur = Math.max(0, Math.min(N - 1, C.A.idx | 0));
  const base = N <= SPAN ? 0 : (((cur - (SPAN >> 1)) % N) + N) % N;
  const list = Array.from({ length: SPAN }, (_, i) => all[(base + i) % N]);
  M.flist = list;

  const PICH = picH();
  const PH = Math.round(PICH * FILM.PHR);
  const PW = Math.round(PH * FILM.RP);
  const BL = Math.round(PICH * FILM.BLR);
  const CH = PICH + (PH + BL) * 2;
  M.fch = CH; M.fPICH = PICH; M.fPW = PW; M.fPH = PH; M.fBL = BL;

  /* 片带：每幅画占 pw 宽，两侧各留 GAP 的片基当帧线 */
  const slide = C.A.set.film === 'slide';
  const openH = slide ? Math.round(PICH * 0.74) : Math.round(PICH * 0.965);
  M.fOpenH = openH;
  const startIdx = Math.max(0, list.findIndex(w => w.id === C.A.cur?.id));
  /* 平顶只罩住片门那一幅：唯一的焦点图是绝对平的矩形 */
  const gpw = Math.round(openH * Math.max(0.5, Math.min(FILM.ARMAX, list[startIdx].img.ar)));
  buildPath(PICH, Math.max(240, gpw / 2 + Math.round(FILM.GAP * (PICH / FILM.REF)) * 2));
  const G = M.fg;
  stage.style.setProperty('--pich', PICH + 'px');

  M.tape = []; let t = 0;
  for (const w of list) {
    const pw = Math.round(openH * Math.max(0.5, Math.min(FILM.ARMAX, w.img.ar)));
    M.tape.push({ w, start: t, pw, step: pw + G.GAP * 2, mid: t + G.GAP + pw / 2 });
    t += pw + G.GAP * 2;
  }
  M.tapeLen = t;

  /* ① 连续的片身：薄片首尾共用端点，边沿是顺下来的一条，没有折角；
        薄片上没有画，所以怎么弯都谈不上「变形」。
        齿孔画在薄片自己的背景上，各片相位差是常数 --k，走带时整条只改一个 --pp。
        明暗与高光按这一片的朝向算好烧进样式，静止的东西不必每帧再算。 */
  const cs = getComputedStyle(stage);
  M.holeC = rgbOf(cs.getPropertyValue('--hole'));
  M.rimC = rgbOf(cs.getPropertyValue('--rim')) || [255, 255, 255];
  M.bodyKey = null;

  /* ② 画面：也切成薄片，所以整幅画贴着片基弯 —— 既不变形，也不会和邻幅重叠 */
  M.frames = []; const pieces = [];
  for (let j = 0; j < list.length; j++) {
    const seg = M.tape[j];
    const cnt = Math.max(2, Math.round(seg.pw / FILM.PSW));
    const step = seg.pw / cnt;
    /* 交叠量要盖得住扇形缝：缝宽约 画高/2 × 相邻片的转角差。
       只在片与片之间加，最外侧两条边不加 —— 否则画的两头会多出一截没图的黑边。 */
    const pad = Math.max(4, openH * 0.055);
    const lq = list[j].vis.lqip;
    const suf = [];
    for (let i = 0; i < cnt; i++) {
      const pl = i === 0 ? 0 : pad, pr = i === cnt - 1 ? 0 : pad;
      /* 定位必须写成绝对像素、并把 transform-origin 钉在 0 0。
         默认的 transform-origin:50% 50% 会让浏览器把整串变换按原点做共轭
         （p' = o + M(p − o)），于是串里的 scaleX(k) 额外带出一个与 k 有关的位移。
         片门那几格弦≈弧、k≈1，位移为零所以看着是对的；一拐弯每片的 k 各不相同，
         位移就各走各的 —— 这正是「只有中间几幅正常、左右都错位重叠」的根因。
         钉死 origin 之后 p' = M(p)：内容左右两端严格落在这一段的弦端点上。 */
      suf.push(`translate(${(-(pl + step / 2)).toFixed(2)}px,${(-openH / 2).toFixed(2)}px)`);
      pieces.push(`<i class="fps" data-i="${j}" style="width:${(step + pl + pr).toFixed(2)}px;height:${openH}px;` +
        `background-size:${seg.pw}px ${openH}px;background-position:${(pl - i * step).toFixed(2)}px 0;` +
        `background-image:url(${lq})"></i>`);
    }
    M.frames.push({ w: list[j], seg, cnt, step, suf, els: null, url: null, loading: false, vis: -1, sh: -1, bl: 0 });
  }
  row.innerHTML = pieces.join('');
  const els = $$('.fps', row);
  let o = 0;
  for (const fr of M.frames) { fr.els = els.slice(o, o + fr.cnt); o += fr.cnt; }

  M.fcur = startIdx; M.fx = M.tape[startIdx].mid; M.ftarget = M.fx; M.fdue = 0;
  /* 片门那格要跟顶栏计数、收藏、放大看到的是同一幅 */
  if (list[startIdx] && list[startIdx].id !== C.A.cur?.id) {
    C.setIndex(all.findIndex(x => x.id === list[startIdx].id));
  }

  const cap = $('#fcap');
  if (cap) { cap.dataset.id = ''; cap.innerHTML = ''; cap._mv = null; cap.classList.remove('swap'); }
  clearTimeout(M.fcapT);
  stage.classList.remove('lit');
  applyFilm(true);
  requestAnimationFrame(placeStrip);
  const hint = $('#fhint');
  if (hint) {
    hint.textContent = C.T('filmHint');
    hint.style.opacity = ''; setTimeout(() => { const h = $('#fhint'); if (h) h.style.opacity = 0; }, 5200);
  }
  wireFilmDrag(stage);
  startFilm();
}

/* 每帧：片身只改一个齿孔相位；画面各薄片摆到自己那一小段弧上。
   走带没动就整个跳过 —— 定格模式下大部分时间都是静止的，不该白算。 */
function applyFilm(force) {
  const stage = $('#film');
  if (!stage || !M.tape || !M.frames || !M.path) return;
  if (!force && M.fapplied === M.fx) { syncFilmCap(); return; }
  M.fapplied = M.fx;
  const G = M.fg, L = M.tapeLen, PW = M.fPW || 60, REACH = G.REACH;
  drawBand();
  let bestJ = 0, bd = Infinity;
  for (let j = 0; j < M.frames.length; j++) {
    const fr = M.frames[j], seg = fr.seg;
    let p = seg.mid - M.fx;
    p -= Math.round(p / L) * L;                      // 片带首尾相接
    const d = Math.abs(p);
    if (d > REACH * 0.9) {
      if (fr.vis !== 0) { fr.vis = 0; for (const el of fr.els) el.style.display = 'none'; }
      continue;
    }
    if (fr.vis !== 1) { fr.vis = 1; for (const el of fr.els) el.style.display = ''; }
    if (d < REACH * 0.8) wantPic(fr);
    const half = seg.pw / 2, step = fr.step;
    let fy = 0, fp = 0;                              // 这一幅正中那一片的朝向
    for (let i = 0; i < fr.cnt; i++) {
      const a0 = p - half + i * step, a1 = a0 + step, mid = (a0 + a1) / 2;
      const S = segAt(a0, a1, rollAt(mid));
      /* 每片都是单独合成的，边上带抗锯齿；两片挨着时两条半透明边一叠就露出底色，
         看着像画上被划了几道。多叠 2px 把缝压掉，画面只是被拉伸千分之几，看不出来。 */
      fr.els[i].style.transform = `${S.tr} scaleX(${(S.len / step).toFixed(4)}) ${fr.suf[i]}`;
      if (i === (fr.cnt >> 1)) { fy = S.yaw; fp = S.pitch; }
    }
    /* 远近明暗：一幅一个值，量化到整数，绝大多数帧根本不用写 */
    /* 焦点那一幅最亮（压暗减半 + 片门光池）；两侧的帧跟着自己那一段的
       朝向与距离走：卷弯背光的更暗、转回来迎光的又亮一点，蜿蜒起伏可读 */
    const { lam, sp } = litAt(fy, fp, rollAt(p));
    const lit = d < half;
    let sh = Math.min(94, shadeOf(lam * 0.42 + 0.58, sp * 0.35, d).sh
      + Math.round(26 * Math.min(1, d / (REACH * 0.32))));
    if (lit) sh = Math.round(sh * 0.42);
    if (fr.sh !== sh) { fr.sh = sh; for (const el of fr.els) el.style.setProperty('--sh', sh); }
    /* 远处画格的虚化档位：出了蜿蜒的主体段再挂，越远越虚 */
    if (FILM.BLUR) {
      const bs = G.FLAT + G.TR * 2.7;
      const bl = d < bs ? 0 : Math.min(3, 1 + Math.floor((d - bs) / 320));
      if (fr.bl !== bl) {
        fr.bl = bl;
        for (const el of fr.els) {
          el.classList.toggle('b1', bl === 1); el.classList.toggle('b2', bl === 2); el.classList.toggle('b3', bl === 3);
        }
      }
    }
    if (d < bd) { bd = d; bestJ = j; }
    if (fr.lit !== lit) { fr.lit = lit; for (const el of fr.els) el.classList.toggle('gate', lit); }
  }
  if (bestJ !== M.fcur) {
    M.fcur = bestJ;
    clearTimeout(M.fidxT);
    M.fidxT = setTimeout(() => {
      const w = M.flist[M.fcur];
      if (w && C.A.set.mode === 'film') C.setIndex(C.A.list.findIndex(x => x.id === w.id));
    }, 110);
  }
  syncFilmCap();
}
function syncFilmCap() {
  const cap = $('#fcap'); if (!cap || !M.flist || !M.tape) return;
  const w = M.flist[M.fcur]; if (!w) return;
  const seg = M.tape[M.fcur];
  let p = seg.mid - M.fx; p -= Math.round(p / M.tapeLen) * M.tapeLen;
  const off = Math.abs(p) / (seg.pw / 2);
  const ms = Number(C.A.set.filmMs) || 0;
  const glide = C.A.set.filmRun === 'glide' && ms > 0;
  const moving = glide ? false : off > 0.35;
  if (cap.dataset.id !== w.id) {
    cap.dataset.id = w.id;
    if (glide) {
      cap.classList.add('swap'); cap._mv = true;
      clearTimeout(M.fcapT);
      M.fcapT = setTimeout(() => {
        const cw = M.flist[M.fcur];
        cap.innerHTML = C.capHTML(cw); cap.dataset.id = cw.id;
        cap.classList.remove('swap'); cap._mv = false; placeStrip();
      }, 170);
      return;
    }
    cap.innerHTML = C.capHTML(w); cap._place = true;
  }
  if (cap._mv !== moving) { cap._mv = moving; cap.classList.toggle('swap', moving); if (!moving) cap._place = true; }
  if (!moving && cap._place) { cap._place = false; placeStrip(); }
}

function filmCenter(j) {
  const n = M.tape.length, seg = M.tape[((j % n) + n) % n];
  let t = seg.mid;
  t -= Math.round((t - M.fx) / M.tapeLen) * M.tapeLen;
  return t;
}
export function filmGo(delta) { if (M.tape) { M.ftarget = filmCenter(M.fcur + delta); M.fdue = 0; } }

function startFilm() {
  cancelAnimationFrame(M.raf);
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(64, now - last); last = now;
    if (C.A.set.mode === 'film' && M.tape) {
      const per = M.tape[M.fcur] ? M.tape[M.fcur].step : 400;
      const ms = Number(C.A.set.filmMs) || 0;
      if (!M.fdrag) {
        if (C.A.set.filmRun === 'glide' && ms > 0 && !M.paused) {
          M.fx += per * dt / ms; M.ftarget = M.fx;
        } else if (Math.abs(M.ftarget - M.fx) < 0.4) {
          M.fx = M.ftarget;
          if (M.paused || !ms) M.fdue = 0;
          else if (!M.fdue) M.fdue = now + ms;
          else if (now >= M.fdue) { M.fdue = 0; M.ftarget = filmCenter(M.fcur + 1); }
        } else {
          M.fdue = 0;
          M.fx += (M.ftarget - M.fx) * (1 - Math.exp(-dt / FILM.tau));
        }
      }
      applyFilm();
    }
    M.raf = requestAnimationFrame(step);
  };
  M.raf = requestAnimationFrame(step);
  requestAnimationFrame(() => { const s = $('#film'); if (s) s.classList.add('lit'); });
}

function wireFilmDrag(stage) {
  if (stage.dataset.drag) return; stage.dataset.drag = '1';
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || C.A.set.mode !== 'film') return;
    e.preventDefault();
    M.fdrag = { x: e.clientX, base: M.fx, moved: 0, lx: e.clientX, lt: performance.now(), v: 0, id: e.pointerId };
    try { stage.setPointerCapture(e.pointerId); } catch { }
    stage.classList.add('grabbing');
    const h = $('#fhint'); if (h) h.style.opacity = 0;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!M.fdrag || e.pointerId !== M.fdrag.id) return;
    const dx = e.clientX - M.fdrag.x;
    M.fdrag.moved = Math.max(M.fdrag.moved, Math.abs(dx));
    M.fx = M.fdrag.base - dx * 1.25;
    const t = performance.now(), dt = t - M.fdrag.lt;
    if (dt > 10) { M.fdrag.v = (e.clientX - M.fdrag.lx) / dt; M.fdrag.lx = e.clientX; M.fdrag.lt = t; }
    applyFilm();
  });
  const rel = (e) => {
    if (!M.fdrag || (e && e.pointerId !== undefined && e.pointerId !== M.fdrag.id)) return;
    M.ftarget = M.fx + Math.max(-1400, Math.min(1400, -M.fdrag.v * 300));
    if (C.A.set.filmRun === 'step') M.ftarget = filmCenter(M.fcur);
    const tap = M.fdrag.moved <= 6;
    M.fdrag = null; M.fdue = 0;
    stage.classList.remove('grabbing');
    if (tap && e && e.clientX !== undefined) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.fps');
      if (el) {
        if (el.classList.contains('gate')) C.zoomCurrent();
        else { M.ftarget = filmCenter(Number(el.dataset.i)); M.fdue = 0; }
      }
    }
  };
  stage.addEventListener('pointerup', rel);
  stage.addEventListener('pointercancel', rel);
  addEventListener('blur', () => rel());
  stage.addEventListener('dragstart', (e) => e.preventDefault());
}
