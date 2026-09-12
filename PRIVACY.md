# 隐私政策 · Privacy Policy

**长廊 Corridor · 艺术新标签页**
最后更新：2026-09-10 · Last updated: 10 September 2026

---

## 中文

### 一句话

长廊不收集你的任何信息，没有服务器，没有账号，没有统计代码。所有数据都存在你自己这台电脑上。

### 它到底存了什么，存在哪

| 存了什么 | 存在哪 | 会不会离开你的电脑 |
|---|---|---|
| 设置（呈现方式、画框、语言等） | `chrome.storage.local` | 不会 |
| 收藏与浏览记录 | `chrome.storage.local` | 不会 |
| 画作图片缓存 | 浏览器分给本扩展的 IndexedDB | 不会 |
| 自定义图库的文件夹句柄 | IndexedDB | 不会 |
| 你填的 API 密钥 | `chrome.storage.local` | 只发往**你自己填的那个接口地址**，别处一概不发 |
| AI 生成的译文与作品信息 | `chrome.storage.local` | 不会 |

**开发者看不到上面任何一项。** 长廊没有后端，作者没有任何途径读到你的数据。

### 它会往外发请求吗

只在这几种情况，且都是你主动开启的功能：

1. **取画作图片** —— 向 `upload.wikimedia.org` 请求公有领域画作的图片文件。这是扩展默认就有的能力，请求里不带任何身份信息。
2. **每日新作**（默认开启）—— 向 `commons.wikimedia.org` 与 `www.wikidata.org` 查询公有领域画作的元数据。
3. **AI 补全 / 多语言**（默认关闭，需要你自己填接口）—— 把图片缩成不超过 1024px 的 JPEG，连同提示词发往**你自己填写的那个接口地址**。你不填，一个请求都不会发。
4. **在线图库**（默认关闭，需要你自己填网址）—— 向**你自己填写的那个网址**请求页面与图片。第一次使用时浏览器会弹窗向你要这个域名的权限。

除此之外没有任何网络请求。没有分析、没有埋点、没有广告、没有第三方 SDK。

### 关于你的 API 密钥

- 密钥保存在 `chrome.storage.local`，只在这台电脑上。
- 密钥**只**作为请求头（`Authorization: Bearer` 或 `x-api-key`）发往你填的那个接口地址。
- 扩展不会把密钥发给作者、发给任何第三方、或写进任何日志。
- 界面上默认打码显示，点「显示」才看明文。
- 你可以随时在设置里清空。

### 关于本机文件夹

- 用的是浏览器标准的 File System Access API。你选哪个文件夹，扩展就只能读哪个文件夹。
- **图片不复制、不上传、不进缓存库**，只在显示那一刻读一次。
- 只有当你主动打开「AI 补全」并把「补自定义图库」勾上时，这些图片才会被缩图后发往你自己填的接口。有私人照片的话，请想清楚再开。
- 在设置里删掉这个来源，扩展就再也读不到它；你的文件一个都不会动。

### 权限为什么要这些

| 权限 | 干什么用的 |
|---|---|
| `storage` | 存设置、收藏、历史 |
| `unlimitedStorage` | 图片缓存可能到几百 MB，默认配额不够 |
| `alarms` | 「每日新作」与「定时补全」要按时唤醒后台 |
| `downloads` | 「导出图片」把缓存里的画作存到你的下载目录 |
| `upload.wikimedia.org` 等三个域名 | 取公有领域画作的图片与元数据 |
| 其他所有域名（可选权限） | **不会预先索取**。只有当你填了自己的 AI 接口或在线图库网址、并点下按钮时，浏览器才会就那一个域名向你确认 |

### 变更

政策若有变更，会在扩展的版本更新说明与本页同步说明。

### 联系

Charles Chern · achillesmars@gmail.com

---

## English

### In one line

Corridor collects nothing. There is no server, no account, and no analytics. Everything lives on your own computer.

### What is stored, and where

| What | Where | Does it leave your computer? |
|---|---|---|
| Settings (mode, frame, language…) | `chrome.storage.local` | No |
| Saved works and history | `chrome.storage.local` | No |
| Cached artwork images | IndexedDB allocated to this extension | No |
| Folder handles for your custom library | IndexedDB | No |
| Any API key you enter | `chrome.storage.local` | Only to **the endpoint you typed in**, nowhere else |
| AI-generated translations and fields | `chrome.storage.local` | No |

**The developer cannot see any of it.** Corridor has no backend.

### When does it make network requests?

Only in these cases, all of which you control:

1. **Artwork images** — requests to `upload.wikimedia.org` for public-domain paintings. No identifying information is attached.
2. **Daily additions** (on by default) — metadata queries to `commons.wikimedia.org` and `www.wikidata.org`.
3. **AI enrichment / multilingual** (off by default, needs your own endpoint) — sends a JPEG downscaled to at most 1024px, plus the prompt, to **the endpoint address you entered**. Leave it blank and not a single request is made.
4. **Online gallery sources** (off by default, needs a URL from you) — requests the page and images from **the URL you entered**. Chrome asks you for permission for that host the first time.

Nothing else. No analytics, no telemetry, no ads, no third-party SDKs.

### About your API key

- Stored in `chrome.storage.local`, on this computer only.
- Sent **only** as a request header (`Authorization: Bearer` or `x-api-key`) to the endpoint you entered.
- Never sent to the developer, never to a third party, never written to any log.
- Masked in the interface by default.
- Clearable at any time in settings.

### About local folders

- Uses the browser's standard File System Access API. The extension can read only the folder you picked.
- Images are **never copied, uploaded, or cached** — they are read at the moment they are displayed.
- They are sent to your own endpoint only if you turn on AI enrichment *and* enable it for the custom library. If the folder holds private photos, think twice before enabling it.
- Remove the source in settings and the extension loses access. Your files are never modified.

### Why each permission

| Permission | What it is for |
|---|---|
| `storage` | Settings, saved works, history |
| `unlimitedStorage` | The image cache can reach several hundred MB |
| `alarms` | Waking the background worker for daily additions and scheduled enrichment |
| `downloads` | The "export images" feature writes cached artworks to your Downloads folder |
| Three Wikimedia hosts | Fetching public-domain artwork images and metadata |
| All other hosts (optional) | **Never requested up front.** Only when you enter your own AI endpoint or gallery URL and press a button does Chrome ask you about that one host |

### Changes

Any change to this policy will be noted in the extension's release notes and on this page.

### Contact

Charles Chern · achillesmars@gmail.com

---

<sub>本页公开地址：https://github.com/yearnst/corridor-newtab/blob/main/PRIVACY.md<br>
This page is published at the URL above and is the privacy policy referenced in the
Chrome Web Store listing for 长廊 Corridor · 艺术新标签页.</sub>
