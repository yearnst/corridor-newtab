/* ============================================================
   语言表 —— 长廊只认「母语」和「外语」两个位置，具体是哪两种由你定。

   每一条： c 语言码（BCP-47）· n 该语言自己的写法 · e 英文写法
            r 从右往左写 · g 分组（只为下拉里排个序）
   自定义语言用 x-… 开头，名字就是用户自己填的那串字。
   ============================================================ */

export const LANGS = [
  /* 内置的两种：不接接口也能用 */
  { c: 'zh',      n: '简体中文',        e: 'Chinese (Simplified)',  g: 'built' },
  { c: 'en',      n: 'English',         e: 'English',               g: 'built' },

  /* 东亚 */
  { c: 'zh-Hant', n: '繁體中文',        e: 'Chinese (Traditional)', g: 'ea' },
  { c: 'yue',     n: '粵語',            e: 'Cantonese',             g: 'ea' },
  { c: 'ja',      n: '日本語',          e: 'Japanese',              g: 'ea' },
  { c: 'ko',      n: '한국어',           e: 'Korean',                g: 'ea' },
  { c: 'bo',      n: 'བོད་སྐད།',           e: 'Tibetan',               g: 'ea' },
  { c: 'mn',      n: 'Монгол',          e: 'Mongolian',             g: 'ea' },

  /* 东南亚与南亚 */
  { c: 'vi',      n: 'Tiếng Việt',      e: 'Vietnamese',            g: 'sa' },
  { c: 'th',      n: 'ไทย',              e: 'Thai',                  g: 'sa' },
  { c: 'id',      n: 'Bahasa Indonesia',e: 'Indonesian',            g: 'sa' },
  { c: 'ms',      n: 'Bahasa Melayu',   e: 'Malay',                 g: 'sa' },
  { c: 'tl',      n: 'Filipino',        e: 'Filipino',              g: 'sa' },
  { c: 'my',      n: 'မြန်မာ',            e: 'Burmese',               g: 'sa' },
  { c: 'km',      n: 'ខ្មែរ',              e: 'Khmer',                 g: 'sa' },
  { c: 'lo',      n: 'ລາວ',              e: 'Lao',                   g: 'sa' },
  { c: 'hi',      n: 'हिन्दी',             e: 'Hindi',                 g: 'sa' },
  { c: 'bn',      n: 'বাংলা',            e: 'Bengali',               g: 'sa' },
  { c: 'ta',      n: 'தமிழ்',            e: 'Tamil',                 g: 'sa' },
  { c: 'te',      n: 'తెలుగు',            e: 'Telugu',                g: 'sa' },
  { c: 'mr',      n: 'मराठी',            e: 'Marathi',               g: 'sa' },
  { c: 'gu',      n: 'ગુજરાતી',           e: 'Gujarati',              g: 'sa' },
  { c: 'kn',      n: 'ಕನ್ನಡ',            e: 'Kannada',               g: 'sa' },
  { c: 'ml',      n: 'മലയാളം',          e: 'Malayalam',             g: 'sa' },
  { c: 'pa',      n: 'ਪੰਜਾਬੀ',            e: 'Punjabi',               g: 'sa' },
  { c: 'si',      n: 'සිංහල',           e: 'Sinhala',               g: 'sa' },
  { c: 'ne',      n: 'नेपाली',            e: 'Nepali',                g: 'sa' },
  { c: 'ur',      n: 'اردو',             e: 'Urdu',       r: 1,      g: 'sa' },

  /* 西亚与北非 */
  { c: 'ar',      n: 'العربية',          e: 'Arabic',     r: 1,      g: 'me' },
  { c: 'he',      n: 'עברית',            e: 'Hebrew',     r: 1,      g: 'me' },
  { c: 'fa',      n: 'فارسی',            e: 'Persian',    r: 1,      g: 'me' },
  { c: 'tr',      n: 'Türkçe',           e: 'Turkish',               g: 'me' },
  { c: 'ku',      n: 'Kurdî',            e: 'Kurdish',               g: 'me' },
  { c: 'hy',      n: 'Հայերեն',          e: 'Armenian',              g: 'me' },
  { c: 'ka',      n: 'ქართული',          e: 'Georgian',              g: 'me' },
  { c: 'az',      n: 'Azərbaycanca',     e: 'Azerbaijani',           g: 'me' },
  { c: 'kk',      n: 'Қазақша',          e: 'Kazakh',                g: 'me' },
  { c: 'uz',      n: 'Oʻzbekcha',        e: 'Uzbek',                 g: 'me' },

  /* 欧洲 */
  { c: 'es',      n: 'Español',          e: 'Spanish',               g: 'eu' },
  { c: 'pt',      n: 'Português',        e: 'Portuguese',            g: 'eu' },
  { c: 'pt-BR',   n: 'Português (Brasil)', e: 'Portuguese (Brazil)', g: 'eu' },
  { c: 'fr',      n: 'Français',         e: 'French',                g: 'eu' },
  { c: 'de',      n: 'Deutsch',          e: 'German',                g: 'eu' },
  { c: 'it',      n: 'Italiano',         e: 'Italian',               g: 'eu' },
  { c: 'nl',      n: 'Nederlands',       e: 'Dutch',                 g: 'eu' },
  { c: 'ru',      n: 'Русский',          e: 'Russian',               g: 'eu' },
  { c: 'uk',      n: 'Українська',       e: 'Ukrainian',             g: 'eu' },
  { c: 'pl',      n: 'Polski',           e: 'Polish',                g: 'eu' },
  { c: 'cs',      n: 'Čeština',          e: 'Czech',                 g: 'eu' },
  { c: 'sk',      n: 'Slovenčina',       e: 'Slovak',                g: 'eu' },
  { c: 'hu',      n: 'Magyar',           e: 'Hungarian',             g: 'eu' },
  { c: 'ro',      n: 'Română',           e: 'Romanian',              g: 'eu' },
  { c: 'bg',      n: 'Български',        e: 'Bulgarian',             g: 'eu' },
  { c: 'el',      n: 'Ελληνικά',         e: 'Greek',                 g: 'eu' },
  { c: 'sr',      n: 'Српски',           e: 'Serbian',               g: 'eu' },
  { c: 'hr',      n: 'Hrvatski',         e: 'Croatian',              g: 'eu' },
  { c: 'sl',      n: 'Slovenščina',      e: 'Slovenian',             g: 'eu' },
  { c: 'sv',      n: 'Svenska',          e: 'Swedish',               g: 'eu' },
  { c: 'da',      n: 'Dansk',            e: 'Danish',                g: 'eu' },
  { c: 'nb',      n: 'Norsk',            e: 'Norwegian',             g: 'eu' },
  { c: 'fi',      n: 'Suomi',            e: 'Finnish',               g: 'eu' },
  { c: 'is',      n: 'Íslenska',         e: 'Icelandic',             g: 'eu' },
  { c: 'et',      n: 'Eesti',            e: 'Estonian',              g: 'eu' },
  { c: 'lv',      n: 'Latviešu',         e: 'Latvian',               g: 'eu' },
  { c: 'lt',      n: 'Lietuvių',         e: 'Lithuanian',            g: 'eu' },
  { c: 'ca',      n: 'Català',           e: 'Catalan',               g: 'eu' },
  { c: 'eu',      n: 'Euskara',          e: 'Basque',                g: 'eu' },
  { c: 'gl',      n: 'Galego',           e: 'Galician',              g: 'eu' },
  { c: 'ga',      n: 'Gaeilge',          e: 'Irish',                 g: 'eu' },
  { c: 'cy',      n: 'Cymraeg',          e: 'Welsh',                 g: 'eu' },
  { c: 'la',      n: 'Latina',           e: 'Latin',                 g: 'eu' },

  /* 非洲与其他 */
  { c: 'sw',      n: 'Kiswahili',        e: 'Swahili',               g: 'af' },
  { c: 'am',      n: 'አማርኛ',            e: 'Amharic',               g: 'af' },
  { c: 'ha',      n: 'Hausa',            e: 'Hausa',                 g: 'af' },
  { c: 'yo',      n: 'Yorùbá',           e: 'Yoruba',                g: 'af' },
  { c: 'zu',      n: 'isiZulu',          e: 'Zulu',                  g: 'af' },
  { c: 'af',      n: 'Afrikaans',        e: 'Afrikaans',             g: 'af' },
  { c: 'eo',      n: 'Esperanto',        e: 'Esperanto',             g: 'af' }
];

export const BUILTIN = ['zh', 'en'];
export const GROUPS = ['built', 'ea', 'sa', 'me', 'eu', 'af'];

const BY = new Map(LANGS.map(l => [l.c, l]));
export const isCustom = (c) => String(c || '').startsWith('x-');
export const find = (c) => BY.get(String(c || '')) || null;

/* 自定义语言：码是 x-<纯字母数字>，展示名就是用户填的那串 */
export function customCode(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  /* 码要能安全地当 storage 的键、当 <html lang>，所以只留 ASCII；
     写「闽南话」这种全非拉丁的名字时，退回按码点生成一串短标识 */
  const slug = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return 'x-' + (slug || Array.from(s).map(ch => ch.codePointAt(0).toString(36)).join('').slice(0, 12));
}

/* 显示用的名字：内置的用它自己的写法；自定义的用当时存下的那串 */
export function nameOf(code, custom) {
  const l = find(code);
  if (l) return l.n;
  if (isCustom(code)) return (custom && custom[code]) || code.slice(2);
  return code || '';
}
/* 发给模型时用的名字：英文写得准，模型认得更牢 */
export function askName(code, custom) {
  const l = find(code);
  if (l) return l.e;
  if (isCustom(code)) return (custom && custom[code]) || code.slice(2);
  return code || '';
}
export const isRTL = (code) => !!find(code)?.r;
export const dirOf = (code) => (isRTL(code) ? 'rtl' : 'ltr');
export const isBuiltin = (code) => BUILTIN.includes(code);

/* 中日韩：标点、日期格式、断行都跟拉丁文不一样 */
const CJK = ['zh', 'zh-Hant', 'yue', 'ja', 'ko'];
export const isCJK = (code) => CJK.includes(code);

/* 英文的日期跟浏览器的地区走：en-US 排成 September 22，en-GB 排成 22 September；
   浏览器不是英文，就按 en-US（界面用的是美式拼写） */
function enRegion() {
  const l = String(globalThis.navigator?.language || '');
  return /^en-[a-z]{2}$/i.test(l) ? l : 'en-US';
}
/* Intl 认得的地区码，用来格式化时钟与日期；认不得就退回英文 */
export function intlOf(code) {
  if (!code || isCustom(code) || code === 'en') return enRegion();
  const map = { zh: 'zh-CN', 'zh-Hant': 'zh-TW', yue: 'zh-HK', pt: 'pt-PT', nb: 'nb-NO' };
  if (map[code]) return map[code];
  try { new Intl.DateTimeFormat(code); return code; } catch { return enRegion(); }
}

/* 浏览器语言 → 表里最接近的一条 */
export function guess(nav) {
  const list = nav || (globalThis.navigator?.languages) || [globalThis.navigator?.language || 'en'];
  for (const raw of list) {
    const s = String(raw || '');
    if (/^zh\b/i.test(s)) return /hant|tw|hk|mo/i.test(s) ? 'zh-Hant' : 'zh';
    const exact = LANGS.find(l => l.c.toLowerCase() === s.toLowerCase());
    if (exact) return exact.c;
    const base = s.split('-')[0].toLowerCase();
    const hit = LANGS.find(l => l.c.toLowerCase() === base);
    if (hit) return hit.c;
  }
  return 'en';
}
/* 母语定了，外语给个像样的默认：中文配英文，别的一律配英文，英文配中文 */
export const partnerOf = (a) => (a === 'en' ? 'zh' : 'en');

/* 界面此刻用的是哪一门语言 —— 跟 app.js / options.js 里的 resolveLang 同一套规矩，
   只是那两处要「主＋次」两门，这里只要排在前面的那一门。
   后台（补全跑批）没有界面可问，就靠这个从设置里算出来。 */
export function uiLangOf(set) {
  const a = String(set?.loc?.a || 'zh'), b = String(set?.loc?.b || (a === 'en' ? 'zh' : 'en'));
  if (set?.lang === 'native') return a;
  if (set?.lang === 'foreign') return b;
  const g = guess();
  const near = (c) => (c === g ? 2 : (String(c).split('-')[0] === String(g).split('-')[0] ? 1 : 0));
  return near(b) > near(a) ? b : a;
}
