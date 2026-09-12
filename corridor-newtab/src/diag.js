/* ============================================================
   接口报错诊断 —— 把一句冷冰冰的 HTTP 4xx 翻译成「哪儿不对、该怎么办」

   各家兼容接口的报错文案五花八门，但出错的种类翻来覆去就那么十来种。
   这里只做一件事：看状态码和返回体，认出是哪一种，给出可执行的下一步。
   诊断结果不含界面文字，只回 { code, tips[], models[], host }，
   文案在 i18n.js 里，好让界面语言包也能把它一起译走。
   ============================================================ */

const S1 = (v) => String(v ?? '').trim();
const low = (v) => S1(v).toLowerCase();

/* ---------------- 各家值得先试的型号 ----------------
   这只是**探测队列的起点**，不是结论。

   哪家有没有多模态、哪个型号能不能读图，都在变（DeepSeek 就是个例子：
   一度没有，后来有了）。所以这里绝不写死「这家不行」，
   界面上给出的每一个「能识图」都必须是**真发过一次请求**测出来的。
   拉得到 /models 就按真实清单探，拉不到才拿这张表当种子。 */
export const VENDORS = [
  { id: 'zhipu',    re: /(^|\.)bigmodel\.cn$|zhipu/i,
    name: '智谱 GLM',       models: ['glm-4v-flash', 'glm-4v-plus', 'glm-4.5v'] },
  { id: 'openai',   re: /(^|\.)openai\.com$/i,
    name: 'OpenAI',         models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'] },
  { id: 'anthropic',re: /(^|\.)anthropic\.com$/i,
    name: 'Anthropic',      models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'] },
  { id: 'qwen',     re: /dashscope|aliyuncs/i,
    name: '阿里云百炼 通义',  models: ['qwen-vl-plus', 'qwen-vl-max', 'qwen2.5-vl-72b-instruct'] },
  { id: 'doubao',   re: /volces|volcengine/i,
    name: '火山方舟 豆包',    models: ['doubao-vision-pro', 'doubao-1.5-vision-pro-32k'] },
  { id: 'moonshot', re: /moonshot/i,
    name: 'Moonshot Kimi',  models: ['moonshot-v1-8k-vision-preview', 'moonshot-v1-32k-vision-preview'] },
  { id: 'silicon',  re: /siliconflow/i,
    name: 'SiliconCloud',   models: ['Qwen/Qwen2.5-VL-32B-Instruct', 'Qwen/Qwen2.5-VL-72B-Instruct'] },
  { id: 'minimax',  re: /minimax/i,
    name: 'MiniMax',        models: ['MiniMax-VL-01'] },
  { id: 'stepfun',  re: /stepfun/i,
    name: '阶跃星辰',        models: ['step-1v-8k', 'step-1o-turbo-vision'] },
  { id: 'gemini',   re: /generativelanguage|googleapis|gemini/i,
    name: 'Google Gemini',  models: ['gemini-2.0-flash', 'gemini-1.5-flash'] },
  { id: 'openrouter', re: /openrouter/i,
    name: 'OpenRouter',     models: ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001'] },
  { id: 'mistral',  re: /mistral/i,
    name: 'Mistral',        models: ['pixtral-12b-latest'] },
  { id: 'groq',     re: /groq/i,
    name: 'Groq',           models: ['meta-llama/llama-4-scout-17b-16e-instruct'] },
  { id: 'xai',      re: /(^|\.)x\.ai$/i,
    name: 'xAI Grok',       models: ['grok-2-vision-latest'] },
  { id: 'deepseek', re: /deepseek/i,
    name: 'DeepSeek',       models: ['deepseek-vl2', 'deepseek-chat'] },
  /* 本机跑的模型：Ollama 11434、LM Studio 1234、llama.cpp 8080、vLLM 8000… */
  { id: 'local',    re: /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|[\w-]+\.local)(:\d+)?$|^(localhost|127\.0\.0\.1|\[::1\]):/i,
    name: '本机模型',        models: ['qwen2.5vl', 'llava', 'minicpm-v', 'gemma3'], local: true }
];

export function hostOf(base) {
  let b = S1(base);
  if (!b) return '';
  if (!/^https?:\/\//i.test(b)) b = 'https://' + b;
  try { return new URL(b).host; } catch { return ''; }
}
export function vendorOf(base) {
  const h = hostOf(base);
  if (!h) return null;
  const probe = h + ' ' + S1(base);
  return VENDORS.find(v => v.re.test(h) || v.re.test(probe)) || null;
}

/* ---------------- 认症状 ---------------- */
/* 「这个模型不认图片」——各家说法不一，凑齐了一并认 */
const R_NOVISION = [
  /messages\.content\.type\s+is\s+invalid/i,          // 智谱 1210
  /"?code"?\s*[:=]\s*"?1210"?/i,
  /invalid\s+type\s+for\s+['"]?messages\[\d+\]\.content/i,
  /image_url[^]{0,80}(not\s+support|unsupported|invalid|unexpected|unknown)/i,
  /(not\s+support|unsupported|does\s?n[o']t\s+support)[^]{0,40}(image|vision|multimodal|multi-modal|视觉|图片|图像)/i,
  /(image|vision|multimodal|视觉|图片|图像)[^]{0,40}(not\s+support|unsupported|not\s+allowed|不支持)/i,
  /only\s+support(s)?\s+text/i,
  /input\s+tag\s+'image'/i,
  /content\s+must\s+be\s+a\s+string/i,
  /该模型不支持|模型不支持图片|不支持多模态|非多模态/
];
const R_NOMODEL = [
  /model[^]{0,30}(not\s+found|not\s+exist|does\s+not\s+exist|unknown|unavailable|no\s+such|invalid)/i,
  /(unknown|invalid|unsupported)\s+model/i,
  /模型不存在|无此模型|模型名称?(错误|无效)|未找到模型/,
  /"?code"?\s*[:=]\s*"?1211"?/i
];
const R_BADKEY = [
  /(invalid|incorrect|bad|wrong|missing|expired|revoked)[^]{0,20}(api[\s_-]?key|token|authorization|credential)/i,
  /(api[\s_-]?key|token)[^]{0,24}(invalid|not\s+valid|missing|required|expired|incorrect|wrong|revoked)/i,
  /unauthorized|authentication[^]{0,20}fail|permission\s+denied/i,
  /鉴权|认证失败|令牌无效|密钥(无效|错误|不正确)|api\s?key\s?错误/,
  /"?code"?\s*[:=]\s*"?(1001|1002|1003|1004)"?/i
];
const R_QUOTA = [
  /insufficient[^]{0,20}(quota|balance|credit|fund)/i,
  /(quota|credit|balance)[^]{0,20}(exceeded|exhausted|insufficient|run\s+out)/i,
  /billing|payment\s+required|欠费|余额不足|额度(已)?用(完|尽)|账户余额/i,
  /"?code"?\s*[:=]\s*"?(1113|1261)"?/i
];
const R_RATE = [/rate[\s_-]?limit/i, /too\s+many\s+requests/i, /请求过于频繁|并发(数)?超限|限流|qps/i,
  /"?code"?\s*[:=]\s*"?(1302|1303|1305)"?/i];
const R_CTX = [/(context|token)[^]{0,30}(length|limit|window)[^]{0,30}(exceed|too\s+long|over)/i,
  /maximum\s+context|too\s+many\s+tokens|reduce\s+the\s+length/i, /上下文(过)?长|超出最大长度/];
const R_SAFETY = [/content[\s_-]?(filter|policy|moderation)/i, /(flagged|blocked|rejected)[^]{0,30}(safety|policy|content)/i,
  /(safety|risk)[^]{0,20}control/i, /内容(安全|审核|风控)|敏感/];
const R_HTMLISH = /^\s*(<!doctype|<html|<\?xml)/i;

const any = (list, s) => list.some(re => re.test(s));

/* ---------------- 主函数 ----------------
   err  : once()/ask() 回来的那个对象 { status, err }，或 { status, raw }
   ai   : 当前这套接口配置
   phase: 'test' | 'fill' | 'translate' —— 影响给什么建议
   返回 : { code, tips:[键名], models:[可点的模型名], vendor, host, url, raw }
   ---------------------------------------- */
export function diagnose(err, ai = {}, phase = 'fill') {
  const status = Number(err?.status) || 0;
  const raw = S1(err?.raw ?? err?.err ?? err?.msg ?? '');
  const s = raw;                       // 正则里都带 i，不用先小写
  const vendor = vendorOf(ai.base);
  const host = hostOf(ai.base);
  const tips = [];
  const models = [];
  let code = 'unknown';

  const addVendorModels = () => {
    /* 先给「去探一探」这条路 —— 名单是接口自己报的，比任何猜测都准 */
    tips.push('dgProbe');
    if (!vendor) { tips.push('dgAnyVision'); return; }
    models.push(...vendor.models);
    tips.push(vendor.local ? 'dgLocalPull' : 'dgVendorTry');
  };

  /* —— 网络层：压根没连上 —— */
  if (!status && /网络错误|failed to fetch|networkerror|load failed|err_/i.test(s)) {
    code = 'network';
    tips.push('dgNetPerm', 'dgNetCors');
    if (vendor?.local || /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(S1(ai.base))) tips.push('dgNetLocal');
    if (/^http:\/\//i.test(S1(ai.base))) tips.push('dgNetHttp');
    return out(code, tips, models, vendor, host, raw);
  }
  if (!status && /超时|timeout|abort/i.test(s)) {
    code = 'timeout';
    tips.push('dgTimeout', 'dgTimeoutSmall');
    return out(code, tips, models, vendor, host, raw);
  }
  /* —— 通了，但模型不按 JSON 回话 —— */
  if (!status && /没给出可用的\s?JSON|不是\s?JSON|没按\s?JSON/i.test(s)) {
    code = 'nojson';
    tips.push('dgJsonTemp', 'dgJsonModel');
    return out(code, tips, models, vendor, host, raw);
  }
  /* —— 通了，但看不了图 —— */
  if (!status && /看不了图片/.test(s)) {
    code = 'novision';
    tips.push('dgVisionWhy');
    addVendorModels();
    tips.push('dgVisionTextOk');
    return out(code, tips, models, vendor, host, raw);
  }

  /* —— 有状态码 —— */
  if (any(R_NOVISION, s)) {
    code = 'novision';
    tips.push('dgVisionWhy');
    if (vendor?.id === 'zhipu' && /\/api\/coding\//i.test(S1(ai.base))) tips.push('dgZhipuCoding');
    addVendorModels();
    tips.push('dgVisionTextOk');
  } else if (any(R_NOMODEL, s)) {
    code = 'nomodel';
    tips.push('dgModelName');
    addVendorModels();
    if ((ai.models || []).length > 1) tips.push('dgModelSaved');
  } else if (status === 401 || any(R_BADKEY, s)) {
    code = 'badkey';
    tips.push('dgKeyCheck', 'dgKeyPaste');
    if (detectFmtMix(ai)) tips.push('dgFmtMix');
    if (vendor) tips.push('dgKeySameVendor');
  } else if (status === 402 || any(R_QUOTA, s)) {
    code = 'quota';
    tips.push('dgQuota');
  } else if (status === 429 || any(R_RATE, s)) {
    code = 'rate';
    tips.push('dgRateWait', 'dgRateConcur');
  } else if (any(R_CTX, s)) {
    code = 'ctx';
    tips.push('dgCtxSmall', 'dgCtxNote');
  } else if (any(R_SAFETY, s)) {
    code = 'safety';
    tips.push('dgSafety');
  } else if (status === 404 || R_HTMLISH.test(s)) {
    code = 'badpath';
    tips.push('dgPathV1', 'dgPathShown');
    if (detectFmtMix(ai)) tips.push('dgFmtMix');
  } else if (status === 403) {
    code = 'forbidden';
    tips.push('dgForbidden', 'dgKeySameVendor');
  } else if (status >= 500) {
    code = 'server';
    tips.push('dgServer', 'dgRetry');
  } else if (status === 400 || status === 422) {
    code = 'badreq';
    tips.push('dgBadReqFmt');
    if (detectFmtMix(ai)) tips.push('dgFmtMix');
    tips.push('dgBadReqTry');
  }

  return out(code, tips, models, vendor, host, raw);
}

/* 地址像 Anthropic 却选了 OpenAI 格式（或反过来）—— 这是最常见的一种「都填了但就是不通」 */
export function detectFmtMix(ai = {}) {
  const b = low(ai.base);
  if (!b) return false;
  const looksAnthropic = /anthropic|\/messages(\/|$)/.test(b);
  const f = S1(ai.fmt) || 'auto';
  if (f === 'auto') return false;
  return (looksAnthropic && f === 'openai') || (!looksAnthropic && f === 'anthropic' && /anthropic/.test(low(ai.model)));
}

function out(code, tips, models, vendor, host, raw) {
  return { code, tips: [...new Set(tips)], models: [...new Set(models)],
           vendor: vendor ? vendor.name : '', vendorId: vendor ? vendor.id : '', host, raw };
}

/* 诊断的严重程度：错在自己这边（改配置能好）还是对面那边（等一等再来） */
export const FIXABLE = ['novision', 'nomodel', 'badkey', 'badpath', 'badreq', 'network', 'nojson'];
export const isFixable = (code) => FIXABLE.includes(code);
