# 隐私政策 · Privacy Policy

**长廊 Corridor · 艺术新标签页**
最后更新：2026-09-21 · Last updated: 21 September 2026

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
| 暂歇里自己钉的站点、摘掉的站点、展签顺序 | `chrome.storage.local` | 不会 |
| 备份文件（你点导出时才有） | 你在「另存为」里选的位置 | 由你保管；密钥默认不写进去 |

**开发者看不到上面任何一项。** 长廊没有后端，作者没有任何途径读到你的数据。

### 它会往外发请求吗

只在这几种情况，且都是你主动开启的功能：

1. **取画作图片** —— 向 `upload.wikimedia.org` 请求公有领域画作的图片文件。这是扩展默认就有的能力，请求里不带任何身份信息。
2. **每日新作**（默认开启）—— 向 `commons.wikimedia.org` 与 `www.wikidata.org` 查询公有领域画作的元数据。
3. **AI 补全 / 多语言**（默认关闭，需要你自己填接口）—— 把图片缩成不超过 1024px 的 JPEG，连同提示词发往**你自己填写的那个接口地址**。你不填，一个请求都不会发。
4. **在线图库**（默认关闭，需要你自己填网址）—— 向**你自己填写的那个网址**请求页面与图片。第一次使用时浏览器会弹窗向你要这个域名的权限。

暂歇那一屏不发任何网络请求，也不取站点图标。接的如果是本机模型（`localhost` 这类地址），请求不出这台电脑。

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

### 关于暂歇读到的站点

暂歇那一屏可以显示三处来的站点：你自己钉的、Chrome 的常访问榜、此刻开着的标签页。

- 后两处要用可选权限 `topSites` 与 `tabs`。装上时不申请，你在暂歇的设置里打开那一项时才问你，同一个面板里随时能撤回。
- `topSites` 读到的只有站点名与网址；`tabs` 读到的只有此刻开着的标签页的标题与网址，读完立刻按站点并成一条。读不到浏览历史和页面内容，也不往任何页面里注入脚本。
- 这些只用来在这一屏上画出展签，不上传，也不发给任何人。存下来的只有你自己的操作：钉了哪些站点、摘掉了哪些（连同摘掉那一刻它排第几、开着几个标签页，用来判断它什么时候该回来）、展签怎么排，都在 `chrome.storage.local`。
- 「关掉所选标签页」只关你在整理模式里亲手勾中的那几个。

### 关于备份文件

- 备份只在你点「导出」时生成，存到你在「另存为」里选的地方。扩展不会把它传到任何地方。
- 接口密钥默认**不写进**备份。要带的话，可以用口令加密（浏览器自带的 Web Crypto：PBKDF2 + AES-GCM），也可以明文；选明文的话，这份文件请像密码本一样收好。
- 导入只读你亲手选的那个文件。

### 权限为什么要这些

| 权限 | 干什么用的 |
|---|---|
| `storage` | 存设置、收藏、历史 |
| `unlimitedStorage` | 图片缓存可能到几百 MB，默认配额不够 |
| `alarms` | 「每日新作」与「定时补全」要按时唤醒后台 |
| `downloads` | 「导出图片」把缓存里的画作存到你的下载目录；下载当前作品；保存备份文件 |
| `declarativeNetRequestWithHostAccess` | 只用于本机模型：把扩展自己发往本机地址（`localhost`、`127.0.0.1` 等）的请求的 `Origin` 头改成那个地址本身，好让 Ollama 这类服务放行。只在你已授权的地址上生效，发往公网的请求一个字不改 |
| `topSites`（可选权限） | 暂歇显示 Chrome 常访问的站点。装上时不申请，打开那一项时才问你 |
| `tabs`（可选权限） | 暂歇显示此刻开着的标签页，以及整理模式里的「关掉所选标签页」。同样是用到时才问你 |
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
| Sites you pin or remove in Pause, and the order of their labels | `chrome.storage.local` | No |
| Backup files (only when you export one) | Wherever you choose in the Save As dialog | Kept by you; API keys are left out by default |

**The developer cannot see any of it.** Corridor has no backend.

### When does it make network requests?

Only in these cases, all of which you control:

1. **Artwork images** — requests to `upload.wikimedia.org` for public-domain paintings. No identifying information is attached.
2. **Daily additions** (on by default) — metadata queries to `commons.wikimedia.org` and `www.wikidata.org`.
3. **AI enrichment / multilingual** (off by default, needs your own endpoint) — sends a JPEG downscaled to at most 1024px, plus the prompt, to **the endpoint address you entered**. Leave it blank and not a single request is made.
4. **Online gallery sources** (off by default, needs a URL from you) — requests the page and images from **the URL you entered**. Chrome asks you for permission for that host the first time.

The Pause screen makes no network requests and fetches no site icons. If your model runs on your own machine (`localhost` and the like), its requests never leave that machine.

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

### About the sites shown in Pause

Pause can list sites from three places: the ones you pin yourself, Chrome's most-visited list, and the tabs you have open right now.

- The last two use the optional permissions `topSites` and `tabs`. Neither is requested at install; Chrome asks you only when you turn that source on in the Pause settings, and you can revoke it from the same panel.
- `topSites` gives only site names and URLs. `tabs` is used to read the titles and URLs of the tabs open at that moment, which are folded into one entry per site straight away. Browsing history and page content are never read, and nothing is injected into any page.
- All of this is used only to draw the labels on that screen. Nothing is uploaded or sent to anyone. The only things stored are your own actions: the sites you pinned, the ones you removed (with the rank and tab count at that moment, used to decide when a site should come back), and the order of the labels — all in `chrome.storage.local`.
- "Close selected tabs" closes only the tabs you ticked yourself in tidy mode.

### About backup files

- A backup is created only when you press Export, and saved wherever you choose. The extension never sends it anywhere.
- API keys are **left out** by default. You can include them encrypted with a passphrase (the browser's built-in Web Crypto: PBKDF2 + AES-GCM) or in plain text — if you choose plain text, keep the file as carefully as a password list.
- Import reads only the file you pick.

### Why each permission

| Permission | What it is for |
|---|---|
| `storage` | Settings, saved works, history |
| `unlimitedStorage` | The image cache can reach several hundred MB |
| `alarms` | Waking the background worker for daily additions and scheduled enrichment |
| `downloads` | The "export images" feature writes cached artworks to your Downloads folder; downloading the current work; saving backup files |
| `declarativeNetRequestWithHostAccess` | Local models only: rewrites the `Origin` header on the extension's own requests to an address on your machine (`localhost`, `127.0.0.1`…) so that services such as Ollama accept them. It works only on addresses you have granted, and requests to public endpoints are left untouched |
| `topSites` (optional) | Showing Chrome's most-visited sites in Pause. Not requested at install; asked for when you turn it on |
| `tabs` (optional) | Showing your open tabs in Pause, and "Close selected tabs" in tidy mode. Also asked for only when needed |
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
