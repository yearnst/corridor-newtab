# Security Policy · 安全策略

**English** · [中文](#中文)

## Supported versions

Only the latest minor release is maintained. If you find a problem, please update to the latest version on the Chrome Web Store first and try to reproduce it there.

| Version | Supported |
|---|---|
| Latest minor release | ✅ |
| Older | ❌ Please update |

## Reporting a vulnerability

**Please do not report security problems in public issues.**

Email **achillesmars@gmail.com** with the subject `[Corridor Security]`. If you can, include:

- The affected version (see `chrome://extensions` or the bottom of the settings panel)
- Steps to reproduce
- What you think the impact could be
- If convenient, a minimal reproduction or a screenshot

I'll confirm receipt **within 72 hours** and, once I've assessed it, tell you the plan for a fix. When the fix is released,
you'll be credited in the CHANGELOG if you'd like.

## Attack surface of this project

Corridor has no backend and no account system, so the places worth watching are fairly concentrated:

| Location | What to look at |
|---|---|
| `src/ai.js` | Whether the API key the user enters is sent only to the endpoint the user entered |
| `src/local.js` | Whether the scope of File System Access handles is ever widened |
| `src/daily.js` | Whether metadata fetched from Wikimedia is ever inserted as HTML |
| `manifest.json` CSP | Whether `unsafe-eval` / `unsafe-inline` ever shows up in script-src |
| Optional permissions | Whether any path calls `chrome.permissions.request()` without a user gesture |

## Not security issues

- Your own machine reaching an AI endpoint address you entered yourself — that is the feature
- Copyright questions about public-domain paintings — please open a normal issue
- The extension using a lot of disk space — the image cache can be capped in settings

---

## 中文

### 受支持的版本

只维护最新一个次版本。发现问题请先升级到 Chrome Web Store 上的最新版再复现。

| 版本 | 支持状态 |
|---|---|
| 最新的次版本 | ✅ |
| 更早的版本 | ❌ 请升级 |

### 报告漏洞

**请不要用公开 Issue 报告安全问题。**

发邮件到 **achillesmars@gmail.com**，标题写 `[Corridor Security]`。请尽量包含：

- 受影响的版本号（见 `chrome://extensions` 或设置页底部）
- 复现步骤
- 你认为可能造成的后果
- 如果方便，一段最小复现代码或截图

我会在 **72 小时内**回复确认收到，并在评估后告诉你修复计划。修复发布后，
如果你愿意，会在 CHANGELOG 里署名致谢。

### 这个项目的攻击面

长廊没有后端、没有账号系统，所以值得关注的地方比较集中：

| 位置 | 关注点 |
|---|---|
| `src/ai.js` | 用户填写的 API 密钥是否只发往用户自己填的 endpoint |
| `src/local.js` | File System Access 句柄的权限范围是否被扩大 |
| `src/daily.js` | 从 Wikimedia 拉回的元数据是否被当作 HTML 插入 |
| `manifest.json` CSP | 是否出现 `unsafe-eval` / `unsafe-inline` 的 script-src |
| 可选权限 | 是否存在未经用户手势就调用 `chrome.permissions.request()` 的路径 |

### 不属于安全问题的情况

- 用户自己填入的 AI 接口地址被自己的机器访问到——这是功能本身
- 公有领域画作的版权疑问——请走普通 Issue
- 扩展占用磁盘较多——图片缓存可在设置里限额
