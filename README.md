<div align="center">

# 长廊 Corridor

**打开新标签页，看见一幅画。**

[![license](https://img.shields.io/badge/license-MIT-1a1a1a?style=flat-square)](LICENSE)
[![manifest](https://img.shields.io/badge/Manifest-V3-1a1a1a?style=flat-square)](corridor-newtab/manifest.json)
[![chrome](https://img.shields.io/badge/Chrome-110+-1a1a1a?style=flat-square)](https://www.google.com/chrome/)
[![offline](https://img.shields.io/badge/offline-yes-1a1a1a?style=flat-square)](#隐私)

106 幅公有领域杰作（默认展出 93 幅）· 双语策展导览 · 五种呈现方式 · 装上就离线可用

配置可整份导出导入 · 密钥能用口令加密 · 一键暂歇换成常去的站点

[安装](#安装) · [它能做什么](#它能做什么) · [完整手册](corridor-newtab/README.md) · [隐私](PRIVACY.md) · [更新记录](CHANGELOG.md) · [English](#english)

<img src="media/1-wall.png" width="760" alt="美术馆展墙模式">

</div>

---

## 这是什么

长廊把 Chrome 的新标签页换成一面美术馆的墙。

不是一张随机壁纸——**是一幅挂好的画**：墙有颜色和材质，画有画框和卡纸留白，
顶上有射灯，画在墙上投下影子，右下角一张展签写着标题、作者、年代、收藏地，
再加一句为这幅画原创撰写的导览。106 幅作品，从《千里江山图》到《星月夜》——办公模式默认开着，
含裸体的 13 幅不参与轮换，所以装上先看到的是 93 幅，在设置里关掉就全都来。

图片抓回来就存在本地，断网照样看。没有服务器，没有账号，没有一行统计代码。

<table>
<tr>
<td width="50%"><img src="media/9-metal.png" alt="金箔背景板"></td>
<td width="50%"><img src="media/6-carousel.png" alt="环形长廊"></td>
</tr>
<tr>
<td width="50%"><img src="media/7-film.png" alt="胶卷模式"></td>
<td width="50%"><img src="media/5-settings.png" alt="设置 · 墙色与色调"></td>
</tr>
<tr>
<td width="50%"><img src="media/11-pause.png" alt="暂歇 · 展签墙"></td>
<td width="50%"><img src="media/12-portfolio.png" alt="今日画夹"></td>
</tr>
</table>

## 它能做什么

| | |
|---|---|
| **五种呈现方式** | 美术馆展墙 · 沉浸式 · 瀑布流 · 环形长廊 · 胶卷 |
| **11 种画框** | 从描金老框到极简黑框，也可以不要框。线脚照着实物建模，光影事先渲染好，不是拍来的照片 |
| **墙面** | 15 种颜色 + 自定义色板，31 种材质分五组，饱和度与色温可再拧 |
| **射灯** | 几盏、多亮、偏哪边、冷还是暖——角度一变，投影与受光跟着走 |
| **随画取色** | 每幅画读出六个主色，排成一条色卡，点一下复制色号；展签与按钮的点缀色也跟着这幅画换 |
| **每日新作** | 每天从 Wikimedia Commons 补几幅公有领域名作，数量自己定；新到的收在顶栏的「今日画夹」里 |
| **挂你自己的画** | 本机文件夹（可加多个）或在线图库网址，每个来源各带一套筛选 |
| **藏品库** | 全部 · 收藏夹 · 浏览历史 · 每日新作，按流派、国家地区、题材、色系筛选，也能直接搜 |
| **去除** | 不想再看到的那一幅按 `X`，它就不再轮换，藏品库里也不再列出；五秒内可撤销，设置里随时放回 |
| **暂歇** | 不想看画的时候按 `Q`，新标签页换成常去的站点：自己钉的、Chrome 常访问的、此刻开着的标签页。三种排版，展签可以拖着排 |
| **展签翻面** | 正面母语、背面外语，点一下翻过来，像一张语言闪卡；作品详情页也能一键换成另一种语言 |
| **接你自己的模型** | 可选、默认关闭。填一个 OpenAI / Anthropic 兼容接口，本机的 Ollama、LM Studio 也行。模型可看图补全作品信息，或把整套界面与导览译成 78 种语言里的任意两种 |
| **备份与恢复** | 设置、接口、收藏导出成一个 `.json`，重装或换机器后导回来；密钥可以不带、用口令加密，或明文保存 |
| **完全离线** | 图片缓存在 IndexedDB，断网可用 |

**快捷键**　`← →` 换画 · `F` 收藏 · `X` 去除 · `Z` 高清 · `I` 作品信息 · `L` 藏品库 · `M` 换模式 · `C` 时钟 · `D` 下载 · `Q` 暂歇 · `S` 设置 · `Space` 暂停 · `Esc` 关闭

右下角的键盘按钮，鼠标移上去就能看到全部键位。

## 安装

### 从 Chrome 网上应用店（推荐）

**[▸ 从 Chrome 网上应用店安装](https://chromewebstore.google.com/detail/mnllopjjkbkoeljonbgmlabijamcjlam)**

装完打开一个新标签页就行，不需要下面那些步骤。

### 开发者模式加载（想改源码时用）

```bash
git clone https://github.com/yearnst/corridor-newtab.git
```

1. 打开 Chrome，地址栏输入 `chrome://extensions/` 回车
2. 右上角打开 **开发者模式**
3. 点 **加载已解压的扩展程序**
4. 选择仓库里的 **`corridor-newtab/`** 文件夹（就是含 `manifest.json` 的那一层）
5. 打开一个新标签页

Edge / Brave / Arc 等 Chromium 内核浏览器同样适用，需要 Chrome 110 及以上。

## 目录结构

```
corridor-newtab/          扩展本体（加载已解压的扩展程序就选这一层）
├── manifest.json         MV3 清单
├── newtab.html           新标签页
├── options.html          选项页
├── src/
│   ├── app.js            主逻辑、展墙与沉浸式
│   ├── modes.js          瀑布流 / 环形长廊 / 胶卷
│   ├── gallery.css       全部样式，含画框渲染
│   ├── store.js          IndexedDB 缓存与设置
│   ├── daily.js          每日新作（Wikimedia）
│   ├── pause.js          暂歇
│   ├── backup.js         备份与恢复
│   ├── ai.js             可选的模型接口
│   ├── localnet.js       本机模型（Ollama 等）的连接
│   ├── diag.js           接口报错诊断
│   ├── translate.js      多语言：作品译文与界面语言包
│   ├── local.js          本机文件夹与在线图库
│   ├── i18n.js           界面文案
│   ├── langs.js          78 种语言表
│   ├── tone.js           墙色与色调
│   ├── options.js        选项页
│   └── sw.js             service worker
├── _locales/             商店名称与简介（zh_CN / en）
├── data/catalog.json     106 幅作品的元数据与导览文字
├── assets/frames/        10 种画框贴图
├── assets/tex/           31 种墙面材质贴图
├── icons/                16 / 32 / 48 / 128
└── README.md             完整手册（很长，什么都写了）

media/                    README 与项目主页用的截图（12 张 1280×800）
```

## 开发

没有构建步骤，没有依赖，没有 node_modules——改完源码，回 `chrome://extensions/`
点一下刷新就生效。

想自己打一个 zip（比如上传到商店），把扩展那一层压起来就行——
包里只放扩展真正要用的东西，README 与系统垃圾文件排除在外：

```bash
cd corridor-newtab
zip -r -X ../corridor-newtab.zip . -x 'README.md' '.DS_Store' '*/.DS_Store' '._*'
```

`manifest.json` 必须在 zip 的根目录，不要多套一层文件夹。

## 隐私

没有服务器、没有账号、没有统计代码。设置、收藏、缓存全部存在你自己这台电脑上。

主动发出的网络请求只有三类，且都可关：

1. 向 `upload.wikimedia.org` 取画作图片
2. 向 `commons.wikimedia.org` / `www.wikidata.org` 查每日新作的元数据
3. 向**你自己填写的那个地址**发 AI 请求或取在线图库——不填就一个请求都不发

你填的 API 密钥只作为请求头发往你自己填的地址，别处一概不发。
自定义图库里的本机图片不复制、不上传、不进缓存，只在显示那一刻读一次。

暂歇要读常访问站点和打开的标签页，用的是两个可选权限（`topSites`、`tabs`）：
装上时不申请，开启那一项时才问你，随时能撤回。读到的只有站点名和网址，
不离开这台电脑；这一屏也不取站点图标，不发任何网络请求。

完整说明见 **[PRIVACY.md](PRIVACY.md)**。

## 图片来源与版权

作品图片全部来自 [Wikimedia Commons](https://commons.wikimedia.org) 的公有领域高清扫描，
每幅的来源与收藏地记录在 `data/catalog.json` 里。这些图片不受本仓库许可证约束。

**导览文字是为这个项目原创撰写的**，不是从百科抄的，与代码同样适用 MIT License。

## 参与

欢迎提 Issue 和 PR，尤其是这几类：

- 发现某幅画的元数据有误（作者、年代、收藏地）
- 推荐值得收进来的公有领域作品
- 某种浏览器 / 分辨率下的显示问题
- 界面文案的其他语言翻译

动手前请先读 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题请走 [SECURITY.md](SECURITY.md)，别开公开 Issue。

## 许可

代码与导览文字 [MIT](LICENSE) · 作品图片为公有领域

作者 **Charles Chern**（[@yearnst](https://github.com/yearnst)）· achillesmars@gmail.com

---

## English

**Open a new tab. See a painting.**

Corridor turns Chrome's new tab into a wall of a museum — 106 public-domain
masterpieces (93 on show by default), each hung properly: a textured wall, a rendered frame, a mount,
adjustable spotlights, a drop shadow, and a label in the corner carrying the
title, artist, date, collection, and a curated note written for this project.

Five ways to hang them (wall, immersive, masonry, carousel, filmstrip),
11 offline-rendered frames, 31 wall finishes, and a daily trickle of new works
from Wikimedia Commons, gathered in a small portfolio in the top bar.
Images are cached locally, so it works with no connection.

Press `Q` to pause the gallery: the new tab becomes a quiet page of the sites
you actually use — the ones you pin, Chrome's most-visited list, and the tabs
you have open, grouped by site. The last two need optional permissions
(`topSites`, `tabs`), asked for only when you switch them on; the page fetches
no favicons and makes no network requests. Settings, endpoints and favourites
export to a single JSON file, with API keys left out, encrypted with a
passphrase, or kept in plain text.

No server, no account, no analytics. Any API key you enter is sent only to the
endpoint you typed in. Point it at any OpenAI- or Anthropic-compatible endpoint
(a local Ollama or LM Studio works too) and a model can translate the whole
interface and every note into any two of 78 languages — one native, one
foreign — with the wall label flipping between them.

**Install:** [get it on the Chrome Web Store](https://chromewebstore.google.com/detail/mnllopjjkbkoeljonbgmlabijamcjlam) — then open a new tab.
To run it from source instead, clone this repository, open `chrome://extensions/`,
enable Developer mode, choose **Load unpacked**, and select the `corridor-newtab/`
folder. Chrome 110+.

Code and curated notes are MIT licensed. Artwork images are public domain,
sourced from Wikimedia Commons, and not covered by that licence.
Full manual: [corridor-newtab/README.md](corridor-newtab/README.md) ·
Privacy: [PRIVACY.md](PRIVACY.md)
