# 参与长廊

谢谢你愿意花时间。这个项目没有构建步骤、没有依赖、没有 CI 门禁，
改一行源码回 `chrome://extensions/` 点刷新就能看见效果——门槛低是刻意的。

## 先跑起来

```bash
git clone https://github.com/yearnst/corridor-newtab.git
```

`chrome://extensions/` → 打开右上角**开发者模式** → **加载已解压的扩展程序** →
选 `corridor-newtab/` 这一层（含 `manifest.json`）。改完源码回这一页点刷新图标，
再开一个新标签页即可。Chrome 110+。

改了 `sw.js`（service worker）的话，刷新之后还要点一下「Service Worker」旁边的
**重新加载**，否则跑的还是旧的那份。

## 哪些贡献最受欢迎

| 类型 | 说明 |
|---|---|
| **作品元数据勘误** | 作者、年代、尺寸、收藏地写错了——请附一个权威出处（美术馆官网、Wikidata 条目） |
| **推荐新作品** | 必须是**确已进入公有领域**的作品，且 Wikimedia Commons 上有高清扫描。见下方「加一幅画」 |
| **显示问题** | 某个分辨率、某个浏览器、某种缩放下排版崩了——请带截图和 `chrome://version` 的前两行 |
| **界面翻译** | `src/i18n.js` 里是界面文案表，欢迎补任何语言 |
| **性能** | 尤其是环形长廊与胶卷的滚动帧率 |

## 加一幅画

作品登记在 `corridor-newtab/data/catalog.json`——一个数组，目前 106 条。
每条记录的字段**一个都不能少**（打包脚本和 CI 都会查）：

```jsonc
{
  "id": "starry-night",                       // 唯一，小写连字符
  "title":  { "zh": "星月夜", "en": "The Starry Night" },
  "artist": { "zh": "文森特·梵高", "en": "Vincent van Gogh" },
  "life":   "1853–1890",                      // 作者生卒，用连接号 – 不是减号
  "year":   "1889",                           // 展签上显示的年代，可以是「10 世纪（宋摹本）」
  "ys":     1889,                             // 用于排序的数字年份
  "medium": { "zh": "布面油画", "en": "Oil on canvas" },
  "dims":   "73.7 × 92.1 cm",                 // 用 × 不是 x
  "museum": { "zh": "纽约现代艺术博物馆", "en": "Museum of Modern Art" },
  "place":  { "zh": "美国 纽约", "en": "New York, USA" },
  "movement": "post-impressionism",           // 流派，取现有 21 种之一
  "region":   "europe",                       // europe | east-asia | americas
  "tags":     ["landscape", "night"],
  "mature":   false,                          // 含裸体等需要默认折叠的内容时为 true
  "format":   "std",                          // std | wide | tall | scroll
  "note": { "zh": "…", "en": "…" },           // 导览正文，两段，\n\n 分段
  "look": { "zh": "…", "en": "…" },           // 一句「看这里」，展签上的提示
  "img": {
    "base":  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/….jpg",
    "name":  "….jpg",
    "full":  "https://upload.wikimedia.org/wikipedia/commons/e/ea/….jpg",
    "w": 44567, "h": 35291, "ar": 1.2628,
    "sizes": [120, 250, 330, 500, 960, 1280, 1920, 3840]
  },
  "src": {
    "file":    "File:Van Gogh - Starry Night - Google Art Project.jpg",
    "page":    "https://commons.wikimedia.org/wiki/File:….jpg",
    "licence": "Public domain"
  },
  "vis": {                                    // 主色与占比，界面取色用
    "accent": "#364b85", "lum": 0.3536, "sat": 0.3518,
    "palette": ["#5a7494", "…"], "weights": [0.2721, "…"],
    "lqip": "data:image/jpeg;base64,…"        // 极小的模糊占位图
  }
}
```

`img` 的尺寸、`vis` 的取色与 `lqip` 都是**算出来的**，不用手填——
在 Issue 里给出 Commons 链接和你写的 `note` / `look`，维护者会跑一遍生成脚本补齐。
想自己动手，照着现有记录的格式填齐即可。

三条硬要求：

1. **公有领域**。作者去世满 70 年，或扫描件本身在 Commons 上标注为 PD。
   `src.licence` 必须能写成 `Public domain`。拿不准就在 PR 里写明判断依据，别猜。
2. **图片走 `upload.wikimedia.org`**。这是 manifest 里已声明的域名，
   换别的域名会触发权限请求，破坏「装上就能用」，CI 也会拦。
   原图宽边建议 2000px 以上，太小了放大看糊。
3. **导览文字必须原创**。`note` 是这个项目的核心——
   **不要从维基百科或美术馆说明牌复制**。写你自己看见的：这幅画在画什么、
   怎么画的、为什么值得停一下。两段，中英各一份。`look` 是一句话，
   指出画面上一个具体位置，让人知道该往哪儿看。

挑画不看名气，看的是**挂在墙上好不好看**：构图要经得起被框住，
主色要能撑起一面墙，细节要经得起按 `Z` 放大。

## 代码风格

没有 linter，也不打算加。照着周围的代码写就行：

- 原生 ES 模块，无框架、无打包器、无 TypeScript
- 缩进 2 空格，单引号
- **注释写中文**，写「为什么」而不是「做了什么」——
  这个项目的注释本身就是文档，源码里那些「原来这么写，有什么毛病，所以改成这样」
  的段落是有意留下的
- 不引入任何运行时依赖。真需要一个小工具函数，就手写进对应文件

## 提 PR 之前

自己过一遍这几条：

- [ ] 五种呈现方式都开一遍，没有报错（`M` 键循环）
- [ ] 控制台干净（新标签页 + 选项页都看一眼）
- [ ] 断网试一次，缓存过的画仍然能显示
- [ ] 没有新增权限。**任何 `manifest.json` 的权限改动都请先开 Issue 讨论**——
      这直接影响商店审核
- [ ] 没有引入 `eval`、`new Function`、远程脚本。CSP 是 `default-src 'none'; script-src 'self'`
- [ ] 改了功能的话，在 `corridor-newtab/README.md` 对应小节里补一句

PR 标题写清楚改了什么，正文说明「原来什么样、有什么问题、现在什么样」。

## 版本号

`manifest.json` 里的 `version` 由维护者在发版时统一改，PR 里**不要动它**。

## 讨论

不确定该不该做，或者想法比较大——先开一个 Issue 聊。
直接甩一个大 PR 过来，最坏的情况是白写了。

安全问题请看 [SECURITY.md](SECURITY.md)，**不要开公开 Issue**。
