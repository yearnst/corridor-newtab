# 安全策略 · Security Policy

## 受支持的版本

只维护最新一个次版本。发现问题请先升级到 Chrome Web Store 上的最新版再复现。

| 版本 | 支持状态 |
|---|---|
| 1.19.x | ✅ |
| < 1.19 | ❌ 请升级 |

## 报告漏洞

**请不要用公开 Issue 报告安全问题。**

发邮件到 **achillesmars@gmail.com**，标题写 `[Corridor Security]`。请尽量包含：

- 受影响的版本号（见 `chrome://extensions` 或设置页底部）
- 复现步骤
- 你认为可能造成的后果
- 如果方便，一段最小复现代码或截图

我会在 **72 小时内**回复确认收到，并在评估后告诉你修复计划。修复发布后，
如果你愿意，会在 CHANGELOG 里署名致谢。

## 这个项目的攻击面

长廊没有后端、没有账号系统，所以值得关注的地方比较集中：

| 位置 | 关注点 |
|---|---|
| `src/ai.js` | 用户填写的 API 密钥是否只发往用户自己填的 endpoint |
| `src/local.js` | File System Access 句柄的权限范围是否被扩大 |
| `src/daily.js` | 从 Wikimedia 拉回的元数据是否被当作 HTML 插入 |
| `manifest.json` CSP | 是否出现 `unsafe-eval` / `unsafe-inline` 的 script-src |
| 可选权限 | 是否存在未经用户手势就调用 `chrome.permissions.request()` 的路径 |

## 不属于安全问题的情况

- 用户自己填入的 AI 接口地址被自己的机器访问到——这是功能本身
- 公有领域画作的版权疑问——请走普通 Issue
- 扩展占用磁盘较多——图片缓存可在设置里限额
