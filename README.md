<div align="center">

# 长廊 Corridor

**打开新标签页，看见一幅画。**

[![license](https://img.shields.io/badge/license-MIT-1a1a1a?style=flat-square)](LICENSE)
[![manifest](https://img.shields.io/badge/Manifest-V3-1a1a1a?style=flat-square)](corridor-newtab/manifest.json)
[![chrome](https://img.shields.io/badge/Chrome-110+-1a1a1a?style=flat-square)](https://www.google.com/chrome/)
[![offline](https://img.shields.io/badge/offline-yes-1a1a1a?style=flat-square)](#隐私)

一幅画作，一份记忆。<br>
一款墙色，一个心情。<br>
一束灯光，一种氛围。

[安装](#安装) · [它能做什么](#它能做什么) · [完整手册](corridor-newtab/README.md) · [隐私](PRIVACY.md) · [更新记录](CHANGELOG.md) · [English](#english)

<img src="media/1-wall.png" width="760" alt="美术馆展墙模式">

</div>

---

## 这是什么

「长廊 Corridor」把 Chrome 的新标签页变成一面安静的美术馆展墙。

106 幅公有领域杰作，从《千里江山图》到《星月夜》，在桌面与你相伴。你可以欣赏名作、了解艺术，
也可以挂上自己和家人的照片与作品，让熟悉的瞬间重新回到眼前。

每一幅都配了为这个项目原创撰写的导览。办公模式默认开着，含裸体的 13 幅不参与轮换，
所以装上先看到的是 93 幅，在设置里关掉就全都来。

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

### 五种呈现方式

- **展墙**：像真实美术馆一样，把作品挂在墙上
- **沉浸式**：满屏一幅，可选缓慢推移
- **瀑布流**：一整墙的画，随手翻看
- **环形长廊**：像走过一条弧形的展廊
- **胶卷**：一格一格走带，看得见片边文字与格号

### 逼真可调的展陈

- 11 种画框，依据真实线脚制作，以离线光照渲染呈现，不是简单贴图
- 5 种留白方式：油画配亚麻内衬，纸本配卡纸，「随画框」自动选择
- 15 种墙面颜色，并支持自定义色板；饱和度与色温也可微调
- 31 种墙面材质：展墙、织物包墙、数字展厅、石材与硬装、金属背景板
- 射灯可调数量、亮度、方向与冷暖；角度变化，投影与受光也会随之改变
- 自动读取作品的六个主色，排成一条色卡，点一下复制色号；展签与按钮的点缀色也随画而变

### 办一个自己的画展

- 添加本机文件夹或在线图库，就能把自己的照片与作品挂进「长廊 Corridor」：旅行图册、家庭欢乐时光、爸妈的旧照片、孩子画的宇宙……
- 支持多个图库来源，并可分别按文件名、格式或正则表达式筛选

照片不必一直躺在文件夹里。有些记忆，值得被挂起来。

### 双语展览与 AI 辅助

- 展签轻点即可翻面：正面母语，背面外语，像一张藏在画边的语言闪卡；作品详情页也能单独切换语言
- AI 辅助可选、默认关闭：支持 OpenAI、Anthropic 兼容接口，以及 Ollama、LM Studio 等本地模型
- AI 可辅助补全作品信息，并将界面与导览扩展至 78 种语言中的任意两种

### 今日画夹

- 每天从 Wikimedia Commons 遇见几幅新作品，让藏品持续生长；新到的收在顶栏的「今日画夹」里
- 每日数量可自定义；配合 AI 辅助，作品信息与双语导览也可自动完善

### 暂歇

- 按 `Q` 一键收起画廊，回到常用站点：自己固定的站点、Chrome 常访问、当前打开的标签页
- 展签墙、闭馆告示、目录索引三种呈现方式，展签可以拖拽整理

### 藏品库、去除与备份

- **藏品库**：全部 · 收藏夹 · 浏览历史 · 每日新作，按流派、国家地区、题材、色系筛选，也能直接搜
- **去除**：不想再遇见的画可以拿下墙，五秒内可撤销，设置里随时恢复
- **备份与恢复**：设置、收藏与接口配置整份导出成 `.json`，换机器或重装后导回来；API 密钥可不导出、明文或口令加密

### 离线与隐私

- 没有项目服务器、没有账号、没有统计代码
- API 密钥只发送到你自己填写的接口地址
- 设置、收藏与缓存保存在本机，已缓存作品可离线浏览
- 自定义图库中的本机图片不复制、不上传，仅在展示时读取

**快捷键**　`← →` 切换 · `F` 收藏 · `X` 去除 · `Z` 高清 · `I` 信息 · `L` 藏品库 · `M` 模式 · `C` 时钟 · `D` 下载 · `Q` 暂歇 · `S` 设置 · `Space` 暂停 · `Esc` 关闭

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

没有项目服务器、没有账号、没有统计代码。设置、收藏与缓存保存在本机，已缓存的作品断网照样看。

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

**Open a new tab. See a work of art.**

One artwork, one memory.<br>
One wall color, one mood.<br>
One beam of light, one atmosphere.

**Corridor** turns Chrome's new tab page into a quiet museum wall. It comes with
106 public-domain masterpieces, from *A Thousand Li of Rivers and Mountains* to
*The Starry Night*. Discover great works, learn a little more about art, or hang
your own photos and creations on the wall — bringing familiar moments back into view.

- **Five viewing modes**: Gallery Wall, Immersive, Masonry, Circular Gallery and Filmstrip
- **A gallery you can truly shape**: 11 frame styles modeled from real mouldings and rendered with offline lighting, 5 matting options, 15 wall colors plus custom color control, 31 wall materials, and adjustable spotlights whose shadows follow the light
- **Curate your own exhibition**: add local folders or online galleries and hang travel journals, family memories, old photos of your parents, your child's drawings — each source with its own filters
- **Bilingual exhibitions**: tap a label to flip it between your two languages; optional AI assistance (OpenAI- or Anthropic-compatible APIs, or local models through Ollama and LM Studio) can complete artwork information and extend the interface and notes to any two of 78 languages
- **Today's Selection**: a few new public-domain works from Wikimedia Commons each day, so the collection keeps growing
- **Pause Gallery**: press `Q` to step out of the gallery and return to your pinned sites, Chrome's most visited sites and the tabs you have open
- **Remove, back up, restore**: take a work off the wall with undo; export settings, favorites and API configuration to one JSON file, with keys left out, in plain text or protected by a passphrase
- **Offline and private**: no project server, no account, no analytics; API keys go only to the endpoint you provide, and local images are never copied or uploaded

Photos do not have to stay buried in folders. Some memories deserve to be hung on a wall.

Pause Gallery reads Chrome's most-visited list and your open tabs through two optional
permissions (`topSites`, `tabs`), requested only when you turn them on; the page fetches
no favicons and makes no network requests.

**Install:** [get it on the Chrome Web Store](https://chromewebstore.google.com/detail/mnllopjjkbkoeljonbgmlabijamcjlam) — then open a new tab.
To run it from source instead, clone this repository, open `chrome://extensions/`,
enable Developer mode, choose **Load unpacked**, and select the `corridor-newtab/`
folder. Chrome 110+.

Code and curated notes are MIT licensed. Artwork images are public domain,
sourced from Wikimedia Commons, and not covered by that license.
Full manual: [corridor-newtab/README.md](corridor-newtab/README.md) ·
Privacy: [PRIVACY.md](PRIVACY.md)
