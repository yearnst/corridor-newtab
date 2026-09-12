/* 颜色：墙色的取舍全在这一支里。

   两件事外面会用到：
     · 这面墙到底算亮还是算暗 —— 界面要不要反色、纹理要不要提反差，都看它。
       原来是每种颜色手写一个 light:true/false；有了自定义色板就写不动了，
       所以改成按 sRGB 相对亮度实算。阈值 0.22 是照着原来那十种颜色定的，
       换算下来一个都没变（陶土红仍算暗，鸽灰仍算亮）。
     · 在选定的颜色上再拧饱和度与色温 —— 一份「调色」而不是「换色」。
       全部在**线性光**里算，并且调完把亮度还原回去：
       拧色温只该改冷暖，不该顺手把墙调亮或调暗。
*/

const CLAMP = (v, a, b) => v < a ? a : v > b ? b : v;

export function hex2rgb(h) {
  h = String(h || '').trim();
  if (/^[0-9a-f]{3}$/i.test(h) || /^[0-9a-f]{6}$/i.test(h)) h = '#' + h;
  if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map(c => c + c).join('');
  if (!/^#[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const rgb2hex = (r, g, b) =>
  '#' + [r, g, b].map(v => CLAMP(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

/* 规范成 #rrggbb；认不出来就用兜底色 */
export const normHex = (h, dflt = '#191919') => {
  const c = hex2rgb(h); return c ? rgb2hex(c[0], c[1], c[2]) : dflt;
};

const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const toSrgb = (v) => { v = CLAMP(v, 0, 1); return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); };
const lum3 = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/* sRGB 相对亮度 0–1 */
export function relLum(hex) {
  const c = hex2rgb(hex); if (!c) return 0;
  return lum3(toLin(c[0]), toLin(c[1]), toLin(c[2]));
}

/* 这面墙算不算「亮墙」。0.22 见文件顶部的说明 */
export const isLight = (hex) => relLum(hex) > 0.22;

/* sat: 0–2（1 = 原样）  temp: -1 冷 … +1 暖 */
export function tone(hex, sat = 1, temp = 0) {
  const c = hex2rgb(hex); if (!c) return normHex(hex);
  sat = CLAMP(Number(sat) || 0, 0, 2);
  temp = CLAMP(Number(temp) || 0, -1, 1);
  let r = toLin(c[0]), g = toLin(c[1]), b = toLin(c[2]);
  const y0 = lum3(r, g, b);
  if (temp) {                                   // 白平衡：红蓝对拧，绿只动一点
    r *= 1 + 0.34 * temp;
    g *= 1 + 0.04 * temp;
    b *= 1 - 0.34 * temp;
    const y1 = lum3(r, g, b);
    if (y1 > 1e-6) { const k = y0 / y1; r *= k; g *= k; b *= k; }   // 亮度还原
  }
  if (sat !== 1) {
    const y = lum3(r, g, b);
    r = y + (r - y) * sat; g = y + (g - y) * sat; b = y + (b - y) * sat;
    r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  }
  return rgb2hex(toSrgb(r), toSrgb(g), toSrgb(b));
}

/* 两色之间线性插值（在线性光里做，混出来才不发灰） */
export function mix(h1, h2, t) {
  const a = hex2rgb(h1), b = hex2rgb(h2);
  if (!a || !b) return normHex(h1);
  t = CLAMP(t, 0, 1);
  const f = (x, y) => toSrgb(toLin(x) * (1 - t) + toLin(y) * t);
  return rgb2hex(f(a[0], b[0]), f(a[1], b[1]), f(a[2], b[2]));
}

/* 给 CSS 用的 rgba()。a 保留三位小数就够了 */
export function rgba(hex, a) {
  const c = hex2rgb(hex) || [255, 255, 255];
  return `rgba(${c[0]},${c[1]},${c[2]},${Math.round(CLAMP(a, 0, 1) * 1000) / 1000})`;
}
