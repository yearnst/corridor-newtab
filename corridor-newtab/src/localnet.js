/* ============================================================
   本机模型：把「来源」这道门打开

   Ollama / LM Studio / llama.cpp 这些本机服务都带一道 Origin 白名单。
   浏览器给扩展发出去的请求一律带 Origin: chrome-extension://<id>，
   不在白名单里 —— Ollama 于是回一个空响应体的 403。
   界面上看到的就是「HTTP 403 · 未知错误」：既不是密钥不对，
   也不是模型没权限，纯粹是它不认得敲门的人。

   所以这里做一件很小的事：拿到那个地址的主机权限之后，
   用一条 declarativeNetRequest 规则，把发往**本机地址**的请求的
   Origin 改写成那个地址自己（http://localhost:11434 之类）。
   于是在 Ollama 看来这是本机自己发的请求，照它默认的白名单就放行。

   三条自我约束：
   · 只改本机地址（localhost / 127.x / 0.0.0.0 / ::1 / *.local），
     公网接口一个字都不动 —— 对外改写 Origin 是另一回事，不该做。
   · initiatorDomains 锁死在本扩展上：网页自己发往同一个端口的请求不受影响。
   · 用户没给这个地址授权，规则就不生效（declarativeNetRequestWithHostAccess
     的语义就是「只在你已有权限的地方管用」）。

   实在改写不成（旧版 Chrome、规则被策略挡下），还有第二条路：
   让用户给 Ollama 放行扩展来源，命令在 diag.js 里按系统给出。
   ============================================================ */

const S1 = (v) => String(v ?? '').trim();

/* 本机的几种写法。*.local 是 mDNS 的主机名，同样算本机。
   注意比的是 hostname（不带端口）—— URL.host 带着 :11434，怎么比都不会相等。 */
export const LOCAL_HOST = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|::1|::|\[::1\]|\[::\]|[\w-]+\.local)$/i;

export function hostOf(base) {
  let b = S1(base);
  if (!b) return '';
  if (!/^https?:\/\//i.test(b)) b = 'https://' + b;
  try { return new URL(b).host; } catch { return ''; }
}
export function hostnameOf(base) {
  let b = S1(base);
  if (!b) return '';
  if (!/^https?:\/\//i.test(b)) b = 'https://' + b;
  try { return new URL(b).hostname; } catch { return ''; }
}
/* 地址指向本机吗 */
export function isLocal(base) {
  const h = hostnameOf(base);
  return !!h && LOCAL_HOST.test(h);
}
/* 0.0.0.0 与 [::1] 能连上，却不在扩展页的 connect-src 里，
   也不在 Ollama 的默认白名单里 —— 这两种写法要劝用户改掉 */
export function isAwkwardLocal(base) {
  const h = hostnameOf(base);
  return /^(0\.0\.0\.0|::1|::)$/i.test(h);
}
/* 这个地址的来源（scheme + host + port）；不是本机就回空串 */
export function localOrigin(base) {
  let b = S1(base);
  if (!b) return '';
  if (!/^https?:\/\//i.test(b)) b = 'http://' + b;      // 本机默认按 http 认
  try {
    const u = new URL(b);
    return LOCAL_HOST.test(u.hostname) ? u.origin : '';
  } catch { return ''; }
}

/* 设置里所有接口档中的本机来源，去重 */
export function localOriginsOf(set) {
  const ai = (set && set.ai) ? set.ai : (set || {});
  const list = Array.isArray(ai.list) ? ai.list : [];
  const all = list.map(p => localOrigin(p && p.base)).concat(localOrigin(ai.base));
  return [...new Set(all.filter(Boolean))];
}

/* ---------------- 规则 ---------------- */
const RID_FROM = 9100, RID_TO = 9115;          // 这一段号段归本机来源改写用
const RIDS = Array.from({ length: RID_TO - RID_FROM + 1 }, (_, i) => RID_FROM + i);

export const canRewrite = () => !!globalThis.chrome?.declarativeNetRequest?.updateDynamicRules;

/* 按当前设置重铺规则：有几个本机地址就铺几条，没有就全撤掉。
   幂等，随便调；调用方不必先判断有没有变。 */
export async function syncOriginRules(set) {
  if (!canRewrite()) return { ok: false, n: 0, why: 'unsupported' };
  const origins = localOriginsOf(set).slice(0, RIDS.length);
  const id = globalThis.chrome?.runtime?.id || '';
  const addRules = origins.map((o, i) => ({
    id: RIDS[i],
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [{ header: 'origin', operation: 'set', value: o }] },
    condition: Object.assign({
      urlFilter: '|' + o + '/',
      resourceTypes: ['xmlhttprequest', 'other']
    }, id ? { initiatorDomains: [id] } : {})
  }));
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: RIDS, addRules });
    return { ok: true, n: addRules.length, origins };
  } catch (e) {
    return { ok: false, n: 0, why: String(e && e.message || e) };
  }
}

/* 发请求之前顺手确认一次。铺过的地址直接返回，不会每次都去写规则。
   getSet 是 store.js 的 getSettings —— 这里不 import store，免得绕成环。 */
const armed = new Set();
export async function ensure(base, getSet) {
  const o = localOrigin(base);
  if (!o || !canRewrite() || armed.has(o)) return;
  armed.add(o);
  try {
    if (await ruleOn(base)) return;
    await syncOriginRules(await getSet());
  } catch { armed.delete(o); }
}

/* 这个地址此刻有没有铺上规则 —— 诊断时用来判断「改写这条路走没走通」 */
export async function ruleOn(base) {
  const o = localOrigin(base);
  if (!o || !canRewrite()) return false;
  try {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.some(r => RIDS.includes(r.id) &&
      (r.action?.requestHeaders || []).some(h => S1(h.value) === o));
  } catch { return false; }
}
