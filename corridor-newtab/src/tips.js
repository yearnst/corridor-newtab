/* 设置里的 ⓘ：鼠标停上去就弹出详细说明，移开就收，不占页面高度。
   说明文字放在按钮自己的 data-tip 里；整页只挂这一份事件，抽屉重画也不用重新绑定。
   触屏没有「停上去」：点一下显示，点别处收起。 */
let tip = null, anchor = null;
const box = () => {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'dtip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    document.body.appendChild(tip);
  }
  return tip;
};
export function hideTip() { if (tip) tip.hidden = true; anchor = null; }
function showTip(btn) {
  const text = btn.dataset.tip; if (!text) return;
  const t = box();
  t.textContent = text; t.hidden = false; anchor = btn;
  const r = btn.getBoundingClientRect(), m = 12;
  const w = t.offsetWidth, h = t.offsetHeight;
  let x = Math.min(Math.max(m, r.left - 8), innerWidth - w - m);
  /* 优先放在图标上方，免得盖住下面还要看的设置；上面放不下才放下面 */
  let y = r.top - h - 8;
  if (y < m) y = Math.min(r.bottom + 8, Math.max(m, innerHeight - h - m));
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
const hit = (e) => e.target.closest?.('.dinfo[data-tip]');
document.addEventListener('mouseover', (e) => { const b = hit(e); if (b && b !== anchor) showTip(b); });
document.addEventListener('mouseout', (e) => { const b = hit(e); if (b && !b.contains(e.relatedTarget)) hideTip(); });
document.addEventListener('focusin', (e) => { const b = hit(e); if (b) showTip(b); });
document.addEventListener('focusout', (e) => { if (hit(e)) hideTip(); });
document.addEventListener('click', (e) => { const b = hit(e); if (b) { e.preventDefault(); e.stopPropagation(); if (b !== anchor) showTip(b); } }, true);
document.addEventListener('pointerdown', (e) => { if (!hit(e)) hideTip(); }, true);
document.addEventListener('keydown', () => hideTip(), true);
document.addEventListener('scroll', () => hideTip(), true);
