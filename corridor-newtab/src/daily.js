/* ============================================================
   每日新作：每天从 Wikimedia Commons 的策展分类里再取几幅公有领域名作，
   补进藏品库。只走 commons.wikimedia.org 的公开 API，不需要账号，
   不上传任何东西；关掉开关就完全不联网做这件事。
   ============================================================ */
import * as S from './store.js';

const API = 'https://commons.wikimedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';
const LADDER = [120, 250, 330, 500, 960, 1280, 1920, 3840];
export const MAX_KEEP = 150;                 // 最多留这么多幅，满了删最早的
const PER_RUN = 3;                           // 每天新增几幅（默认；设置里可改）
const MIN_W = 1400, MIN_H = 900;

/* 起点分类：都是 Commons 上的策展类目，画质与版权都有人把过关 */
const ROOTS = [
  'Category:Featured pictures of paintings',
  'Category:Quality images of paintings',
  'Category:Paintings by Katsushika Hokusai',
  'Category:Paintings by Berthe Morisot',
  'Category:Paintings by Caspar David Friedrich',
  'Category:Paintings in the Metropolitan Museum of Art',
  'Category:Paintings in the National Gallery of Art',
  'Category:Paintings in the Rijksmuseum Amsterdam',
  'Category:Paintings in the Musée d\'Orsay',
  'Category:Paintings in the Art Institute of Chicago',
  'Category:Paintings in the Nationalmuseum Stockholm',
  'Category:Paintings in the Hermitage Museum',
  'Category:Paintings in the National Gallery, London',
  'Category:Paintings in the Städel Museum'
];

/* 明显不是「一幅完整作品」的文件名，直接跳过 */
const BAD = /(detail|fragment|signature|verso|reverse|back of|x-ray|infrared|radiograph|frame only|before restoration|during restoration|sketch for|study for|copy after|engraving after|photograph of|mosaic|tapestr|stained.?glass|sculpt|statue|bust of|coin|medal|map of|floor plan|facade|interior of the|ceiling of|altarpiece wing)/i;
/* 只让爬虫在「跟画有关」的子分类里游走，别跑到建筑照片去 */
const OK_CAT = /(painting|portrait|artwork|art project|oil on|tempera|watercolo|pastel|panel|canvas|by [A-Z])/i;
const strip = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

/* Categories 字段里认得出的题材 */
const TAGMAP = [
  [/portrait/i, 'portrait'], [/self-portrait/i, 'selfportrait'], [/landscape/i, 'landscape'],
  [/seascape|marine|ships?/i, 'sea'], [/still ?life/i, 'stilllife'], [/nocturne|night/i, 'night'],
  [/mytholog/i, 'myth'], [/religio|madonna|christ|saint/i, 'religion'], [/battle|war/i, 'war'],
  [/flower|floral/i, 'flowers'], [/garden/i, 'garden'], [/interior/i, 'interior'],
  [/animal|horse|dog|cat\b/i, 'animals'], [/snow|winter/i, 'snow'], [/dance|ballet/i, 'dance'],
  [/city|street|town/i, 'city'], [/water|river|lake/i, 'water'], [/group/i, 'group']
];
const MUSEUMS = [
  [/Metropolitan Museum/i, { zh: '大都会艺术博物馆', en: 'The Metropolitan Museum of Art' }, { zh: '美国 纽约', en: 'New York, USA' }],
  [/National Gallery of Art/i, { zh: '美国国家美术馆', en: 'National Gallery of Art' }, { zh: '美国 华盛顿', en: 'Washington, USA' }],
  [/Rijksmuseum/i, { zh: '荷兰国立博物馆', en: 'Rijksmuseum' }, { zh: '荷兰 阿姆斯特丹', en: 'Amsterdam, Netherlands' }],
  [/Mus[ée]e d'Orsay|Orsay/i, { zh: '奥赛博物馆', en: "Musée d'Orsay" }, { zh: '法国 巴黎', en: 'Paris, France' }],
  [/Art Institute of Chicago/i, { zh: '芝加哥艺术博物馆', en: 'Art Institute of Chicago' }, { zh: '美国 芝加哥', en: 'Chicago, USA' }],
  [/Nationalmuseum/i, { zh: '瑞典国立博物馆', en: 'Nationalmuseum' }, { zh: '瑞典 斯德哥尔摩', en: 'Stockholm, Sweden' }],
  [/Hermitage/i, { zh: '艾尔米塔什博物馆', en: 'Hermitage Museum' }, { zh: '俄罗斯 圣彼得堡', en: 'St Petersburg, Russia' }],
  [/National Gallery, London|National Gallery \(London\)/i, { zh: '英国国家美术馆', en: 'The National Gallery' }, { zh: '英国 伦敦', en: 'London, UK' }],
  [/St[äa]del/i, { zh: '施泰德美术馆', en: 'Städel Museum' }, { zh: '德国 法兰克福', en: 'Frankfurt, Germany' }],
  [/Louvre/i, { zh: '卢浮宫', en: 'Musée du Louvre' }, { zh: '法国 巴黎', en: 'Paris, France' }],
  [/Prado/i, { zh: '普拉多博物馆', en: 'Museo del Prado' }, { zh: '西班牙 马德里', en: 'Madrid, Spain' }],
  [/Uffizi/i, { zh: '乌菲齐美术馆', en: 'Uffizi Gallery' }, { zh: '意大利 佛罗伦萨', en: 'Florence, Italy' }],
  [/Tate/i, { zh: '泰特美术馆', en: 'Tate' }, { zh: '英国 伦敦', en: 'London, UK' }],
  [/Van Gogh Museum/i, { zh: '梵高博物馆', en: 'Van Gogh Museum' }, { zh: '荷兰 阿姆斯特丹', en: 'Amsterdam, Netherlands' }]
];

async function api(params, base = API) {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', action: 'query', ...params });
  const r = await fetch(`${base}?${q}`, { credentials: 'omit' });
  if (!r.ok) throw new Error('api ' + r.status);
  return r.json();
}
const zhOf = (L) => (L?.zh || L?.['zh-hans'] || L?.['zh-hant'] || L?.['zh-cn'] || {}).value || '';
const enOf = (L) => (L?.en || L?.['en-gb'] || {}).value || '';
const claimQ = (cl, pid) => cl?.[pid]?.[0]?.mainsnak?.datavalue?.value?.id || '';
const claimT = (cl, pid) => cl?.[pid]?.[0]?.mainsnak?.datavalue?.value?.time || '';

/* 补齐中英双语：Commons 的结构化数据里有「这张图是哪件作品」（P6243），
   顺着它到 Wikidata 拿作品、作者、收藏机构的中英文标签。
   一次运行只发三个请求，都是公开只读接口。 */
async function enrich(works) {
  const withPid = works.filter(w => w._pid);
  if (!withPid.length) return;
  try {
    // ① Commons：文件 → 作品 Q 号
    const d1 = await api({ action: 'wbgetentities', ids: withPid.map(w => 'M' + w._pid).join('|'), props: 'claims' }, API);
    const qmap = new Map();
    const extra = new Set();
    for (const w of withPid) {
      const e = d1?.entities?.['M' + w._pid];
      const cl = e?.statements || e?.claims;
      w._qa = claimQ(cl, 'P170');                       // 文件自己的作者声明，最可靠
      if (w._qa) extra.add(w._qa);
      const q = claimQ(cl, 'P6243');                    // 只认「这张图是哪件作品」，P180「描绘」会指到人身上
      if (q) { w._q = q; qmap.set(q, w); }
    }
    if (!qmap.size && !extra.size) return;
    // ② Wikidata：作品的标签与关键属性
    const need = new Set(extra);
    const d2 = qmap.size ? await api({ action: 'wbgetentities', ids: [...qmap.keys()].join('|'),
      props: 'labels|claims', languages: 'zh|zh-hans|zh-hant|zh-cn|en' }, WD) : { entities: {} };
    for (const [q, w] of qmap) {
      const e = d2?.entities?.[q]; if (!e) continue;
      const zh = zhOf(e.labels), en = enOf(e.labels);
      if (en) w.title = { zh: zh || en, en };
      w._noZh = !zh;                                    // 没有中文名就沿用原名，界面上会注明
      const cl = e.claims || {};
      w._qa = claimQ(cl, 'P170') || w._qa; w._qc = claimQ(cl, 'P195'); w._qm = claimQ(cl, 'P186');
      [w._qa, w._qc, w._qm].forEach(x => x && need.add(x));
      const t = claimT(cl, 'P571');
      if (t) { const y = (t.match(/([+-])(\d{4})/) || [])[2]; if (y) { w.year = String(+y); w.ys = +y; } }
    }
    if (!need.size) return;
    // ③ Wikidata：作者 / 收藏机构 / 材质的中英文名
    const d3 = await api({ action: 'wbgetentities', ids: [...need].slice(0, 50).join('|'),
      props: 'labels', languages: 'zh|zh-hans|zh-hant|zh-cn|en' }, WD);
    const lab = (q) => { const e = d3?.entities?.[q]; return e ? { zh: zhOf(e.labels), en: enOf(e.labels) } : null; };
    for (const w of withPid) {
      const a = lab(w._qa); if (a && a.en) w.artist = { zh: a.zh || a.en, en: a.en };
      const c = lab(w._qc); if (c && c.en) w.museum = { zh: c.zh || c.en, en: c.en };
      const m = lab(w._qm); if (m && m.en) w.medium = { zh: m.zh || m.en, en: m.en };
      delete w._qa; delete w._qc; delete w._qm; delete w._q; delete w._pid;
    }
  } catch { /* 拿不到就用 Commons 的原始元数据，不影响主流程 */ }
  for (const w of works) { delete w._pid; delete w._q; delete w._qa; delete w._qc; delete w._qm; }
}

/* 广度优先地在分类树里爬，前沿存在本地，每天接着上次走 */
async function nextBatch(state) {
  let frontier = state.frontier?.length ? state.frontier : ROOTS.slice();
  const files = [];
  let guard = 0;
  while (files.length < (state.want || PER_RUN) * 6 && frontier.length && guard++ < 4) {
    const cat = frontier.shift();
    let d;
    try {
      d = await api({
        generator: 'categorymembers', gcmtitle: cat, gcmtype: 'file|subcat', gcmlimit: '60',
        prop: 'imageinfo', iiprop: 'url|size|extmetadata'
      });
    } catch { continue; }
    for (const p of d?.query?.pages || []) {
      if (p.ns === 14) {
        if (frontier.length < 400 && OK_CAT.test(p.title) && !BAD.test(p.title)) frontier.push(p.title);
        continue;
      }
      const ii = p.imageinfo?.[0]; if (!ii) continue;
      files.push({ title: p.title, pid: p.pageid, ii });
    }
  }
  state.frontier = frontier;
  return files;
}

/* extmetadata 里的 HTML 常常塞了隐藏的机读字段和多语言版本，得挑干净 */
const hideless = (h) => String(h || '').replace(/<(div|span)[^>]*display:\s*none[^>]*>[\s\S]*?<\/\1>/gi, ' ');
function pickLang(html, lang) {
  const m = String(html || '').match(new RegExp(`lang="${lang}"[^>]*>\\s*(?:<[^>]+>\\s*)*([^<]{2,140})`));
  return m ? strip(m[1]) : '';
}
function dedupe(t) {
  t = String(t || '').trim();
  const m = t.match(/^(.{3,70}?)\s*\1$/);
  return m ? m[1].trim() : t;
}
/* 年代：识别世纪、约、区间，输出成本项目的中文写法（英文界面会自动转） */
function dateOf(html) {
  let t = strip(hideless(html)).replace(/date QS:\S*/g, ' ');
  const cen = t.match(/(\d{1,2})\s*(?:th|st|nd|rd)?\s*century/i);
  const cir = /\bcirca\b|\bca?\.\s|\babout\b/i.test(t);
  const rng = t.match(/\b([5-9]\d{2}|1\d{3}|20[0-2]\d)\s*[–—-]\s*([5-9]\d{2}|1\d{3}|20[0-2]\d)\b/);
  const one = t.match(/\b([5-9]\d{2}|1\d{3}|20[0-2]\d)\b/);
  let out = '', ys = 0;
  if (rng) { out = rng[1] + '–' + rng[2]; ys = +rng[1]; }
  else if (one) { out = one[1]; ys = +one[1]; }
  else if (cen) { out = cen[1] + ' 世纪'; ys = (+cen[1] - 1) * 100 + 50; }
  if (!out) return { text: '', ys: 0 };
  if (cir) out = '约 ' + out;
  return { text: out, ys };
}
function cleanName(t) {
  return String(t).replace(/^File:/, '').replace(/\.(jpe?g|png|tiff?|webp)$/i, '')
    .replace(/\s*-\s*Google Art Project.*$/i, '').replace(/[_]+/g, ' ')
    .replace(/\s*\(cropped\)|\s*\(retouched\)|\s*\(edited\)/gi, '').trim();
}

/* 把 Commons 的一条记录翻译成本项目的作品结构 */
function toWork(f, seen) {
  const ii = f.ii, em = ii.extmetadata || {};
  const lic = (em.License?.value || '') + ' ' + (em.LicenseShortName?.value || '');
  if (!/pd|public domain|cc0/i.test(lic)) return null;
  if (ii.width < MIN_W || ii.height < MIN_H) return null;
  const ar = ii.width / ii.height;
  if (ar < 0.3 || ar > 4.2) return null;
  const rawName = pickLang(em.ObjectName?.value, 'en') || strip(hideless(em.ObjectName?.value));
  let name = cleanName(dedupe(rawName) || f.title)
    .replace(/^[A-Z][a-z]+:\s*/, '')                        // 去掉 "English: " 这类语种前缀
    .replace(/\s{2,}/g, ' ').trim();
  if (name.length > 72) name = name.slice(0, 70).replace(/[\s,;:-]+\S*$/, '') + '…';
  if (!name || BAD.test(name) || BAD.test(f.title) || /LCCN\d/i.test(name)) return null;
  const artistRaw = dedupe(pickLang(em.Artist?.value, 'en') || strip(hideless(em.Artist?.value)));
  if (/photograph|photo:|user:|scan by|digitali|news service|press agency|studio of the|library of congress/i.test(artistRaw)) return null;   // 拍摄者不是作者
  if (/own work/i.test(em.Credit?.value || '')) return null;                     // 维基用户自己拍的现场照
  const cats0 = em.Categories?.value || '';
  if (!/painting|portrait|oil on|tempera|watercolo|pastel|canvas|panel|fresco/i.test(cats0 + ' ' + f.title)) return null;

  const raw = String(ii.url || '').split('?')[0];
  const m = raw.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/);
  if (!m) return null;
  const id = 'wc-' + m[3].replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48);
  if (seen.has(id)) return null;

  const cats = cats0;
  const tags = [...new Set(TAGMAP.filter(([re]) => re.test(cats) || re.test(name)).map(([, t]) => t))].slice(0, 4);
  const mu = MUSEUMS.find(([re]) => re.test(cats) || re.test(em.Credit?.value || ''));
  const artist = (artistRaw.replace(/\s*\(.*?\)\s*$/, '').slice(0, 60)) || 'Unknown';
  const dt = dateOf(em.DateTimeOriginal?.value);
  const sizes = LADDER.filter(s => s <= ii.width);
  if (!sizes.length) sizes.push(LADDER[0]);

  return {
    id, daily: true, addedAt: Date.now(), _pid: f.pid,
    title: { zh: name, en: name },
    artist: { zh: artist, en: artist },
    life: '', year: dt.text, ys: dt.ys,
    medium: { zh: '', en: '' }, dims: '',
    museum: mu ? mu[1] : { zh: '', en: '' },
    place: mu ? mu[2] : { zh: '', en: '' },
    movement: '', region: '', tags, mature: false,
    format: ar > 2 ? 'wide' : ar < 0.8 ? 'tall' : 'std',
    note: { zh: '', en: '' }, look: { zh: '', en: '' },
    img: {
      base: `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${m[3]}`,
      name: m[3], full: raw, w: ii.width, h: ii.height, ar: +ar.toFixed(4), sizes,
    },
    src: {
      file: f.title,
      page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(f.title.replace(/ /g, '_'))}`,
      licence: strip(em.LicenseShortName?.value) || 'Public domain'
    },
    vis: { accent: '#8a8375', lum: .5, sat: .2, palette: [], weights: [], lqip: '' }
  };
}

/* 取一张 250px 缩略图，算主色与占位图 —— 和内置作品用同一套呈现 */
async function analyse(w) {
  try {
    const u = `${w.img.base}/250px-${w.img.name}`;
    const r = await fetch(u, { credentials: 'omit' });
    const bmp = await createImageBitmap(await r.blob());
    const S2 = 64, c = new OffscreenCanvas(S2, S2), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0, S2, S2);
    const px = g.getImageData(0, 0, S2, S2).data;
    const bins = new Map();
    let lum = 0, sat = 0;
    for (let i = 0; i < px.length; i += 4) {
      const R = px[i], G = px[i + 1], B = px[i + 2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      lum += (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
      sat += mx ? (mx - mn) / mx : 0;
      const k = (R >> 4 << 8) | (G >> 4 << 4) | (B >> 4);
      const e = bins.get(k) || [0, 0, 0, 0];
      e[0] += R; e[1] += G; e[2] += B; e[3]++; bins.set(k, e);
    }
    const nPix = px.length / 4;
    const top = [...bins.values()].sort((a, b) => b[3] - a[3]).slice(0, 6);
    const hex = (v) => '#' + Math.round(v).toString(16).padStart(2, '0');
    w.vis.palette = top.map(e => hex(e[0] / e[3]) + hex(e[1] / e[3]).slice(1) + hex(e[2] / e[3]).slice(1));
    w.vis.weights = top.map(e => +(e[3] / nPix).toFixed(3));
    w.vis.lum = +(lum / nPix).toFixed(3);
    w.vis.sat = +(sat / nPix).toFixed(3);
    // 主色取占比最高又不是灰的那一档
    const vivid = top.find(e => {
      const R = e[0] / e[3], G = e[1] / e[3], B = e[2] / e[3];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      return mx && (mx - mn) / mx > .22;
    }) || top[0];
    if (vivid) w.vis.accent = w.vis.palette[top.indexOf(vivid)] || w.vis.accent;
    // 20px 占位图
    const q = new OffscreenCanvas(20, Math.max(1, Math.round(20 / w.img.ar)));
    q.getContext('2d').drawImage(bmp, 0, 0, q.width, q.height);
    const b = await q.convertToBlob({ type: 'image/jpeg', quality: .55 });
    w.vis.lqip = await new Promise(res => {
      const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsDataURL(b);
    });
    bmp.close();
    return true;
  } catch { return false; }
}

/* 跑一次：返回本次新增的作品数 */
export async function runDaily(force = false) {
  const set = await S.getSettings();
  if (!set.dailyNew && !force) return 0;
  if (!navigator.onLine) return 0;
  const st = await S.getDaily();
  const want = Math.min(12, Math.max(1, Number(set.dailyN) || PER_RUN));
  st.want = want;                              // 给 nextBatch 用，多爬一点备选
  const today = new Date().toISOString().slice(0, 10);
  if (!force && st.day === today) return 0;

  const builtin = await (await fetch(chrome.runtime.getURL('data/catalog.json'))).json();
  const seen = new Set([...builtin.map(w => w.id), ...st.works.map(w => w.id)]);

  let added = 0;
  try {
    const files = await nextBatch(st);
    for (const f of files) {
      if (added >= want) break;
      const w = toWork(f, seen);
      if (!w) continue;
      if (!(await analyse(w))) continue;
      seen.add(w.id); st.works.push(w); added++;
    }
  } catch { /* 网络问题就下次再说 */ }

  st.day = today; st.at = Date.now(); delete st.want;
  if (added) {
    await enrich(st.works.slice(-added));               // 只给这次新增的补双语
    st.fresh = (st.fresh || 0) + added;                 // 未看过的数量，给入口按钮用
  }
  /* 满了怎么办：收藏过的一律留着，其余按加入时间从最早的开始退场 */
  if (st.works.length > MAX_KEEP) {
    const favs = new Set(await S.getFavs());
    const keep = st.works.filter(w => favs.has(w.id));
    const rest = st.works.filter(w => !favs.has(w.id));
    const room = Math.max(0, MAX_KEEP - keep.length);
    st.works = [...keep, ...rest.slice(Math.max(0, rest.length - room))]
      .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  }
  await S.setDaily(st);
  return added;
}
