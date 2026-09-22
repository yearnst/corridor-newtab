# Changelog · 更新记录

Version numbers follow [Semantic Versioning](https://semver.org/). Dates are packaging dates.
For how each feature works, see the [manual](corridor-newtab/README.md).

How each version is written: a one-line summary → Added → Fixes and improvements. When a release really does touch permissions or security, it gets one more section, “Privacy and permissions”.
Every entry is in English first; the Chinese text is folded under **中文**.

<details>
<summary markdown="span">中文</summary>

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。日期是打包日期。
每一项功能怎么用，见[使用手册](corridor-newtab/README.zh-CN.md)。

每一版的写法：一句话摘要 → 新增 → 修复与优化。确实涉及权限或安全时，再加一节「隐私与权限」。
每一版先写英文，中文收在「中文」折叠里。

</details>

---

## [1.23.1] — 2026-09-22

One more English name brought in line with the rest: the settings group where you add your own folders and gallery URLs is now called Custom sources.

* It holds several sources and sits on the Sources tab, so “Custom library” read oddly there.
  The pictures you add are called My library throughout (the tab in the Library already had that name), and the buttons now say “Remove source” and “Remove all sources”.
* The count beside the heading no longer says “1 sources”; it reads “Sources: 1 · Images: 0”.

The Chinese interface is unchanged.

<details>
<summary markdown="span">中文</summary>

英文界面又统一了一个叫法：添加自己的文件夹与在线图库的那一组，从 Custom library 改叫 Custom sources。

* 这一组里本来就能放好几个来源，又在 Sources 那一页下，叫 “Custom library” 读着别扭。
  加进来的图，英文里统一叫 My library（藏品库里那一页原来就叫这个）；按钮也改成 “Remove source” 和 “Remove all sources”。
* 标题旁边的计数不再写成 “1 sources”，改成 “Sources: 1 · Images: 0”。

中文界面没有变化。

</details>

## [1.23.0] — 2026-09-22

English users now get an English interface out of the box, and the English interface uses the same names as the docs.

### Added

* **A new install follows your browser's language**
  A browser set to Chinese gets a Chinese interface, with English as the second language; any other browser gets English, with Chinese as the second language.
  Existing setups stay as they are. To change it, go to “Settings → Display → Language · Clock”.

### Fixes and improvements

* **English names now match the docs**
  Gallery Wall (was Wall), Circular Gallery (was Carousel), Pause Gallery (was Pause), Today's Selection (was Today's portfolio) and Library (was Collection).
  Favorites replace Save / Saved, so taking a work out of your favorites no longer shares the word Remove with Remove Artwork;
  the settings tab for image sources is now called Sources, so it no longer shares a name with the Library.

* **The English interface uses US spelling**, and dates follow your browser's region (September 22 in the US, 22 September in the UK).

* **Reset leaves your languages alone**: your two languages, and which one the interface uses, stay as they were.

* Fixed Chinese counter words (“1盏”, “8个”) showing up after the number of lamps and in “How many to show” in the English interface.

* The tab title of the new tab page and of the options page follows the interface language (Corridor in English).

* In browsers set to a language other than Simplified Chinese or English, Chrome now shows the extension's name and description in English (it used to fall back to Chinese).

<details>
<summary markdown="span">中文</summary>

英文用户装上就是英文界面；英文界面里的叫法也和文档对齐了。

### 新增

* **新装时界面语言跟着浏览器**
  浏览器是中文，界面就是中文、外语配英文；其他语言的浏览器，界面是英文、外语配中文。
  已经在用的配置不会变；想换，还是在「设置 → 呈现 → 语言 · 时钟」。

### 修复与优化

* **英文界面的叫法和文档统一**
  展墙叫 Gallery Wall（原来是 Wall），环形长廊叫 Circular Gallery（原来是 Carousel），暂歇叫 Pause Gallery（原来是 Pause），今日画夹叫 Today's Selection（原来是 Today's portfolio），藏品库叫 Library（原来是 Collection）。
  收藏改叫 Favorite / Favorites，取消收藏不再和「去除作品」共用 Remove 一个词；
  设置里的「图库」页英文改叫 Sources，免得和藏品库同名。

* **英文界面改用美式拼写**，日期跟着浏览器的地区排（美国是 September 22，英国是 22 September）。

* **重置不再动语言**：母语、外语和界面跟哪一种走，重置后保持原样。

* 修复英文界面里灯数和「最多显示几个」后面冒出中文量词（「1盏」「8个」）的问题。

* 新标签页和选项页在标签栏上的标题跟着界面语言走（英文是 Corridor）。

* 浏览器语言既不是简体中文也不是英文时，Chrome 里显示的扩展名和简介改用英文（原来会退回中文）。

</details>

## [1.22.2] — 2026-09-21

Fixed a layout problem in Today's Selection: its three works now lie side by side in one row.

* Each card in the portfolio carried an extra strip of blank space on both sides. At common window widths such as 1280 and 1440, the three works often squeezed onto two rows, with the third one half hidden behind the footer. That space is gone, so all three can lie side by side; the cards also get a little more room between them, so two tilted cards no longer touch at the corners.

<details>
<summary markdown="span">中文</summary>

修了今日画夹的一处排版：三幅作品现在能摊在同一排。

* 画夹里每张卡片两侧原本多出一截空白，在 1280、1440 这类常见的窗口宽度下，三幅常常挤成两排，第三幅被页脚挡住一半。现在去掉了这截空白，三幅可以并排摊开；卡片之间也多留了一点缝，斜着摆的两张不会碰到角。

</details>

## [1.22.1] — 2026-09-20

Two defaults changed, so a fresh install looks a little cleaner.

* Image fit in Immersive mode now defaults to “Fill screen” instead of “Smart”.
* Under “Hide interface when idle”, “Highlight” and “Palette” are no longer checked by default.

This only affects new installs, or settings after a “Reset”; configurations already in use are not changed.

<details>
<summary markdown="span">中文</summary>

调了两处默认值，让新装后的画面更干净一些。

* 沉浸式的画面适配，默认从「智能」改为「铺满屏幕」。
* 「静止时隐藏界面」中的「看点」和「色条」，默认不再勾选。

只影响新安装，或执行过「重置」后的设置；已经在用的配置不会改变。

</details>

## [1.22.0] — 2026-09-20

Several small refinements: the details page can switch language, keyboard shortcuts get their own button, the portfolio can have its own background color, and labels can be dragged into order.

### Added

* **The artwork details page can switch language**
  A new language button at the top right switches the language of the current details page with one click.
  It only affects that page; close it and open it again, and it follows the main interface language once more.

* **Keyboard shortcuts get their own button**
  A new keyboard button next to “About this work” at the bottom right; hover over it to see every key.

* **Today's Selection can have its own background color**
  Choose “Follow the wall”, “Dark”, or a color of its own; the custom color uses the same swatches as the wall.

* **Pause Gallery labels can be dragged into order**
  When sites are grouped, you can reorder them within a group; when they aren't, you can drag them anywhere on the wall.

### Fixes and improvements

* **Fixed the region filter in the English interface**
  Places in daily additions sometimes carry an extra description, such as “France (Western Front)”, which previously couldn't be matched to a region.
  Place names are now tidied up before the lookup; countries that still can't be recognized all go under “Other”.

* **“Removed sites” no longer disappear for good**
  When a site is removed, its rank and tab count at that moment are recorded. If it later ranks higher, or more of its tabs are open, it comes back on its own.
  The old “Block all of these” button is gone; sites you really never want to see again can still be put into “Never again” one by one.

* **Fixed a focus warning when the settings panel closes**
  Focus is now handed back to the settings button before the panel closes, so the browser no longer leaves an extension warning about focus sitting inside a hidden area.

<details>
<summary markdown="span">中文</summary>

几个细节更新：详情页可切换语言，快捷键有了入口，画夹能配底色，展签也可以拖着排。

### 新增

* **作品详情页可以切换语言**
  右上角新增语言按钮，点一下即可切换当前详情页的语言。
  只影响这一页；关闭后再次打开，仍然跟随主界面语言。

* **快捷键有了入口**
  右下角「作品信息」旁新增快捷键按钮，鼠标悬停即可查看完整键位说明。

* **今日画夹可以单独配底色**
  可选「跟随展墙」「深色」或独立配色；独立配色沿用展墙同一套色卡。

* **暂歇展签可以拖着排**
  分组时可以在同一组内调整顺序；不分组时，则可以在整面墙上自由拖动。

### 修复与优化

* **修复英文界面的地区筛选**
  每日新作里的地点有时会带上额外描述，例如「法国（西线战场）」，此前无法直接匹配地区。
  现在会先整理地点名称再查找；仍然无法识别的国家统一归到「其他」。

* **「已移除的站点」不再永久消失**
  移除时会记下它当时的排名和标签页数量。以后如果它排得更靠前，或打开的标签页更多，就会自动回来。
  原来的「全部永不再现」已经移除；确实不想再看到的站点，仍然可以逐条放进「永不再现」。

* **修复设置面板关闭时的焦点警告**
  关闭前会先把焦点交还给设置按钮，避免浏览器因为焦点仍停留在隐藏区域而留下扩展警告。

</details>

## [1.21.0] — 2026-09-16

Added Pause Gallery: put the gallery away with one click and leave the new tab to the sites you visit most.

### Added

* **Pause Gallery**
  A new switch next to the settings button in the top bar, shortcut `Q`. Turn it on and the artwork gives way to your frequent sites; press it again to return to the exhibition.
  The state syncs across tabs and survives a browser restart.

* **Three layouts**
  Pause Gallery comes in three layouts: “Wall of labels”, “Closed notice” and “Index”.
  The wall of labels has two paper styles, “Plain” and “Swatches”; the notice and the index can have a light or dark background.

* **Three site sources**
  Show the sites you've pinned yourself, Chrome's most-visited list (`topSites`), and the tabs you have open right now (`tabs`).
  The last two are optional permissions, requested only when needed and revocable at any time; when several sources are on, they are shown in groups.

* **Tabs are gathered by site**
  When several tabs from the same site are open, they merge into one label with a count; the more tabs are open, the higher it ranks.

* **Sites can be tidied up**
  Every label can be removed on its own from its top-right corner; in “Tidy” you can select several and handle them together, or close the selected tabs directly.

* **Pin a site right where you are**
  “＋ Pin a site” at the end of the wall of labels lets you add one without leaving the page.

* “About” now links to the project homepage and to GitHub.

* Pause Gallery doesn't fetch site icons, so it makes no network requests for them.

### Fixes and improvements

* Fixed the frame in Today's Selection showing white edges on only three sides, with the work sticking out past the mat.

* Fixed the startup overlay never going away when the browser started in Pause Gallery, leaving only “CORRIDOR” on the page.

* “How many to show” no longer caps the sites you pin by hand; before, once the cap was reached, adding another gave no feedback at all.

* Site names are trimmed more cleanly; for example, “GitHub · Build and ship software on a single,
  collaborative platform” now shows as “GitHub”.

<details>
<summary markdown="span">中文</summary>

新增「暂歇」：一键收起长廊，把新标签页留给常去的站点。

### 新增

* **暂歇**
  顶栏设置按钮旁新增开关，快捷键 `Q`。开启后不再展画，改为显示常用站点；再按一次，就回到展出。
  状态会在标签页之间同步，重启浏览器后也会保留。

* **三种排版**
  暂歇页面提供「展签墙」「闭馆告示」「目录索引」三种布局。
  展签墙有简约和彩签两种纸面；告示和索引可选浅色或深色底。

* **三种站点来源**
  可以显示自己钉的站点、Chrome 常访问榜（`topSites`），以及当前打开的标签页（`tabs`）。
  后两项都是可选权限，需要时才申请，也可以随时撤回；多个来源同时启用时会分组展示。

* **标签页会按站点收拢**
  同一个站点打开了多个标签页时，会合成一张展签，并标出数量；开得越多，排得越靠前。

* **站点可以整理了**
  每张展签右上角都可以单独移除；进入「整理」后，可以多选批量处理，也可以直接关闭选中的标签页。

* **就地钉一个站点**
  展签墙末尾增加「＋ 钉一个站点」，不用离开当前页面就能添加。

* 「关于」里补上了项目主页和 GitHub 链接。

* 暂歇页面不获取站点图标，也不会因此发出网络请求。

### 修复与优化

* 修复今日画夹画框只剩三边白边、作品顶出卡纸的问题。

* 修复浏览器一启动就处于暂歇状态时，启动遮罩不消失、页面只剩「CORRIDOR」的问题。

* 「最多显示几个」不再限制手动钉选的站点，避免钉满以后继续添加却没有反馈。

* 站点名称会收得更干净一些，例如「GitHub · Build and ship software on a single,
  collaborative platform」现在会显示成「GitHub」。

</details>

## [1.20.0] — 2026-09-15

Local models now connect, and this release adds Remove Artwork and backup and restore.

### Added

* **Backup and restore**
  In “Settings → Storage” you can export your configuration as a `.json` file and import it again on a new machine or after a reinstall.
  Choose item by item what to take with you; when importing, choose whether to replace or merge.

* **Keys can be backed up too**
  API keys can be left out, saved in plain text, or encrypted with a passphrase. Encryption uses `PBKDF2 + AES-GCM`, with no third-party library.

* **Remove Artwork**
  Shortcut `X`. A removed work no longer takes part in the rotation and isn't listed in the Library.
  You have 5 seconds to undo, and you can put it back from settings at any time.

### Fixes and improvements

* **Ollama local models now connect properly**
  The `403` or “unknown error” seen before came mainly from Ollama's check on `Origin`, not from the key or model permissions. Corridor now adjusts the request origin for local addresses.
  If it still can't connect, the diagnostic card gives you an `OLLAMA_ORIGINS` command for your system, ready to copy.

* Local models no longer ask for an API key; if the address is `0.0.0.0` or `::1`, you're prompted to use `127.0.0.1` instead.

* Today's Selection now scrolls all the way to the bottom when it holds many works or a tall portrait-format work.

* The shortcut list in “About” now includes `M` (mode), `D` (download) and `Esc` (close panel).

* A few statements corrected: there are **106** built-in works; Work-safe mode is on by default; **93** works are on display by default.

<details>
<summary markdown="span">中文</summary>

本机模型接通了；这次还新增了「去除」和「备份恢复」。

### 新增

* **备份与恢复**
  在「设置 → 存储」里可以把配置导出成 `.json`，换机器或重装后再导回来。
  要带走哪些内容可以逐项选择；导入时可选择覆盖或合并。

* **密钥也可以一起备份**
  接口密钥可以不导出、明文保存，或使用口令加密。加密采用 `PBKDF2 + AES-GCM`，不依赖第三方库。

* **去除作品**
  快捷键 `X`。去除后，这幅作品不再参与轮换，也不会进入藏品库。
  操作后有 5 秒可以撤销，也可以随时在设置里放回来。

### 修复与优化

* **Ollama 本机模型现在可以正常连接**
  此前出现的 `403` 或「未知错误」，主要来自 Ollama 对 `Origin` 的校验，并非密钥或模型权限问题。长廊现在会针对本机地址调整请求来源。
  如果仍然无法连接，诊断卡会根据系统给出可直接复制的 `OLLAMA_ORIGINS` 配置命令。

* 本机模型不再询问接口密钥；地址填写为 `0.0.0.0` 或 `::1` 时，会提示改用 `127.0.0.1`。

* 今日画夹作品较多，或遇到较高的竖幅作品时，现在可以正常滚动到底。

* 「关于」里的快捷键说明补上了 `M`（模式）、`D`（下载）和 `Esc`（关闭面板）。

* 订正几处说明：内置作品为 **106 幅**；办公模式默认开启；默认参与展出的作品为 **93 幅**。

</details>

## [1.19.1] — 2026-09-12

Three interactions that didn't respond.

- With no endpoint set up yet, AI enrichment couldn't create its first endpoint profile
- Pressing `L` to open the Library typed that `l` into the search box, which takes focus right away
- Following on from that: with text in the box, the first Esc only left the input and didn't close the panel, so the letter shortcuts seemed broken as well

<details>
<summary markdown="span">中文</summary>

三处点了没反应的交互。

- 一个接口都没有时，AI 补全里建不出第一个接口档
- 按 `L` 打开藏品库，那个 `l` 会被打进随即聚焦的搜索框
- 承上：框里有字时第一下 Esc 只退出输入，面板不关，字母快捷键跟着一起像失灵

</details>

## [1.19.0] — 2026-09-10

This release is all about the wall.

**Added**

- Set your own wall color: swatches plus a custom color picker
- Fine-tune the wall color's saturation and color temperature
- Lighting: brightness, angle, warmth, and number of lights (0–4)
- Wall finishes rebuilt from scratch, with a new set of metal panels

<details>
<summary markdown="span">中文</summary>

这一版全部围绕「墙」。

**新增**

- 墙面颜色可以自己配：色卡加自定义色板
- 墙色的饱和度与色温可微调
- 灯光：亮度、角度、冷暖、灯数（0–4）
- 墙面材质推倒重做，新增金属背景板一组

</details>

## [1.18.0] — 2026-09-10

Security and copy cleanup before the store launch.

- Fixed three places where HTML wasn't escaped
- CSP tightened from two directives to ten
- 53 pieces of text reworked

<details>
<summary markdown="span">中文</summary>

上架前的安全与文案整理。

- 修复三处 HTML 漏转义
- CSP 从两条收紧到十条
- 53 处文案返工

</details>

## [1.17.0] — 2026-09-10

The custom library goes from “one folder” to “a list of sources”.

- Add several local folders, and also **URLs of online galleries** (directory listings, gallery pages, JSON manifests,
  text files with one URL per line, and single images are all recognized)
- Each source has its own set of filters: Include / Exclude (wildcards or regular expressions), Formats, Min. side

<details>
<summary markdown="span">中文</summary>

自定义图库从「一个文件夹」变成「一串来源」。

- 可加多个本机文件夹，也可加**在线图库的网址**（目录页、图库页、JSON 清单、
  一行一个网址的文本、单张图片都认）
- 每个来源各带一套筛选：只要 / 排除（通配符或正则）、格式、最小边长

</details>

## [1.16.0] — 2026-09-10

- “Can this model see images?” is now tested by actually sending a request, instead of being guessed from the model name
- Text (translation) and vision (enrichment) can each use their own endpoint

<details>
<summary markdown="span">中文</summary>

- 「这个模型能不能识图」改成真发一次请求实测，不再靠模型名判断
- 文字（翻译）和识图（补全）可以各配各的接口

</details>

## [1.15.0] — 2026-09-10

- Endpoint errors are no longer passed on raw; they now say what's wrong and how to fix it
- Language is now set in two slots: “native + foreign”

<details>
<summary markdown="span">中文</summary>

- 接口报错不再原样抛出，改成说明哪里不对、该怎么改
- 语言改成「母语 + 外语」两个位置

</details>

## [1.14.4] — 2026-09-09

- Fixed: the hover tooltips on the row of buttons at the bottom fell off the screen, leaving only their top half visible; they now show above the buttons

<details>
<summary markdown="span">中文</summary>

- 修复：底部那排按钮的悬停提示落在屏幕外，只看得见上半截，改成往上显示

</details>

## [1.14.3] — 2026-09-09

- Fixed: flipping the wall label to the other language pushed the artwork from side to side (the label now keeps a slot of constant width)
- Clicking the wall label now really flips it over

<details>
<summary markdown="span">中文</summary>

- 修复：翻墙签语言时画作被推着左右晃（给墙签留了一格恒定宽度的位置）
- 墙签点一下是真的翻面

</details>

## [1.14.2] — 2026-09-09

- The four controls in the settings title bar now share one size and corner radius, and are reordered by how often they're used
- The settings scope now defaults to “This mode” and is saved with your settings (it used to be forgotten when the tab closed)

<details>
<summary markdown="span">中文</summary>

- 设置标题栏那一排四个控件统一尺寸与圆角，按使用频率重排
- 「设置范围」默认改成「当前」，并且存进设置（以前关掉标签页就忘）

</details>

## [1.14.1] — 2026-09-09

- Added: one endpoint can hold several keys and several models; the number of works added each day is adjustable;
  “Hide interface when idle” is split into individual items; wall labels flip over; a settings scope switch
- Removed the “master switch” from v1.14.0. Chrome doesn't let an extension temporarily give up the new tab page,
  so “off” could only mean rendering a blank page of its own — a half-finished feature. Pause Gallery in v1.21.0 is how this is done now

<details>
<summary markdown="span">中文</summary>

- 新增：一个接口下可存多把密钥与多个模型；每日几幅可调；
  「静止时隐藏」拆到单项；墙签翻面；设置范围开关
- 撤掉 v1.14.0 的「插件总开关」。Chrome 不允许扩展临时摘掉新标签页接管，
  所谓「关闭」只能自己渲染一张留白页，是个半成品。v1.21.0 的「暂歇」是这件事的做法

</details>

## [1.13.1] — 2026-08-31

- The settings panel can switch to light
- Failed enrichment can be retried, and a single image can be redone on its own
- Fixed: a duplicate divider above “About”

<details>
<summary markdown="span">中文</summary>

- 设置面板能切浅色
- 补全失败可以重试，也能只重来某一张
- 修复：「关于」上面多出一条重复的分隔线

</details>

## [1.13.0] — 2026-08-31

- Settings drawer rebuilt: five tabs, collapsible groups, and search
- Several endpoint setups can be saved; schedules and image counts accept custom values

<details>
<summary markdown="span">中文</summary>

- 设置抽屉重做：五页、每组可折叠、能搜
- 接口可以存好几套；定时与张数都能填自定义值

</details>

## [1.12.1] — 2026-08-31

- Enrichment progress is visible: a per-image list showing how many fields each image gained and at which step any failed
- The three prompts are laid out in full and can be edited

<details>
<summary markdown="span">中文</summary>

- 补全过程看得见：逐张清单，哪张补了几项、哪张失败在哪一步
- 三份提示词摊开来可改

</details>

## [1.12.0] — 2026-08-31

- Added AI enrichment: connect your own multimodal model to fill in the empty fields of “Daily additions” and the “Custom library”
- Famous paintings and ordinary pictures each get their own prompt. With only one, the model would call a kitchen photo a “Dutch Golden Age still life”

<details>
<summary markdown="span">中文</summary>

- 新增 AI 补全：接你自己的多模态模型，把「每日新作」和「自定义图库」的空字段补上
- 名作与普通图片各用一套提示词。只写一套的话，模型会把厨房照片说成「荷兰黄金时代静物」

</details>

## [1.11.14] — 2026-08-30

- Fixed: Masonry was blurry for a moment on entry. It always cycles through a fixed 72 works, so lazy loading made no sense; it now fetches them all at once

<details>
<summary markdown="span">中文</summary>

- 修复：瀑布流进场先糊一会儿。它固定 72 幅循环，懒加载没有意义，改成一次全取

</details>

## [1.11.13] — 2026-08-30

- Fixed: a blank area at the top after entering Masonry (the placeholder was attached to a hidden `<img>` and vanished along with it)

<details>
<summary markdown="span">中文</summary>

- 修复：刚进瀑布流时上面一片空白（占位图挂在被隐藏的 `<img>` 上，跟着一起没了）

</details>

## [1.11.12] — 2026-08-30

- Descriptions in settings shortened across the board, in Chinese and English alike

<details>
<summary markdown="span">中文</summary>

- 设置里的说明文字整体收短，中英同步

</details>

## [1.11.11] — 2026-08-29

- Fixed: in Filmstrip only the middle few frames looked right; the ones to the left and right were cut up by overlaps

<details>
<summary markdown="span">中文</summary>

- 修复：胶卷只有中间几幅正常，左右被重叠切割

</details>

## [1.11.10] — 2026-08-29

- Filmstrip curve redone as a single valley shape, back to one smooth, continuous strip

<details>
<summary markdown="span">中文</summary>

- 胶卷曲线重做成单程山谷形，回到一条平滑连续的片子

</details>

## [1.11.9] — 2026-08-29

- Filmstrip goes back to a single focus frame, with about 9–10 frames visible on screen

<details>
<summary markdown="span">中文</summary>

- 胶卷回到一幅焦点图，屏内可见约 9–10 幅

</details>

## [1.11.8] — 2026-08-29

- Filmstrip reshaped as “three flat frames on top + a steep, curling drop”

<details>
<summary markdown="span">中文</summary>

- 胶卷改成「三格平顶 + 陡降卷曲」

</details>

## [1.11.7] — 2026-08-29

- Filmstrip rearranged after classic film-strip clip art: an arched pose, a glossy black base, and white frame lines around each picture

<details>
<summary markdown="span">中文</summary>

- 胶卷按经典胶卷剪贴画重摆：拱形姿态、亮黑光泽片基、画格白色帧线

</details>

## [1.11.6] — 2026-08-29

- Filmstrip gains several curls and a near–far rhythm

<details>
<summary markdown="span">中文</summary>

- 胶卷有了多重卷曲与远近节奏

</details>

## [1.11.5] — 2026-08-29

- Filmstrip rearranged to match the real thing: the stretch at the film gate is perfectly level with no rotation, and the focus frame is a strictly flat rectangle

<details>
<summary markdown="span">中文</summary>

- 胶卷按真实形态重摆：片门那一段完全水平、零转角，焦点图是严格的平面矩形

</details>

## [1.11.4] — 2026-08-23

- Filmstrip gets a focus frame: the one at the film gate is closest to the eye and the largest

<details>
<summary markdown="span">中文</summary>

- 胶卷有了焦点图：片门那一格离眼睛最近、也最大

</details>

## [1.11.3] — 2026-08-23

- Filmstrip no longer stutters: 150 ms → 16.7 ms per frame (full frame rate)
- The pictures and the film base are now one piece, more like real film

<details>
<summary markdown="span">中文</summary>

- 胶卷不卡了：每帧 150ms → 16.7ms（满帧）
- 画面和片基长在一起，更像真胶片

</details>

## [1.11.2] — 2026-08-23

- Filmstrip made truly continuous: the strip is cut into thin slices positioned by arc length, while each picture stays a whole, undistorted frame

<details>
<summary markdown="span">中文</summary>

- 胶卷做成真正连续的：片身切成薄片按弧长摆位，画仍是整格，不变形

</details>

## [1.11] — 2026-08-23

- Filmstrip becomes one continuous multi-curve strip: it snakes all the way along, and both ends recede into the dark

<details>
<summary markdown="span">中文</summary>

- 胶卷改成连续多曲：整条带子一路蛇行，两端退进黑里

</details>

## [1.10.1] — 2026-08-23

- Filmstrip goes back to the v1.9.1 approach. v1.10 looked more like the real thing in still screenshots, but was worse to use

<details>
<summary markdown="span">中文</summary>

- 胶卷退回 v1.9.1 的做法。v1.10 在静态截图上更像实物，用起来更糟

</details>

## [1.10.0] — 2026-08-23 · Rolled back

- Filmstrip rebuilt from scratch (the slicing approach)

<details>
<summary markdown="span">中文</summary>

- 胶卷推翻重做（切片方案）

</details>

## [1.9.1] — 2026-08-23

- Filmstrip redone after the real thing: the rotation is no longer even; it is almost flat near the film gate, and past that stretch it twists quickly into the distance

<details>
<summary markdown="span">中文</summary>

- 胶卷参照实物重做：转角不再均匀，片门附近几乎是平的，出了这一段迅速拧向纵深

</details>

## [1.9] — 2026-08-22

- Filmstrip now runs along a curved path, with the sprocket holes and film base part of each frame itself

<details>
<summary markdown="span">中文</summary>

- 胶卷改成曲面走带，齿孔与片基长在每一格自己身上

</details>

## [1.8] — 2026-08-22

- Added Filmstrip mode; the display order is now Gallery Wall → Circular Gallery → Filmstrip → Immersive → Masonry
- Gallery Wall labels now include the original title (the Chinese interface adds the title in its original language, the English interface adds the Chinese title)
- Checked every Chinese translated title and name, and corrected 5 mistranslations

<details>
<summary markdown="span">中文</summary>

- 新增「胶卷」模式，呈现顺序改为 展墙 → 环形长廊 → 胶卷 → 沉浸式 → 瀑布流
- 展墙墙签补上原名（中文界面排原文名，英文界面排中文名）
- 核对全部中文译名，改掉 5 处误译

</details>
