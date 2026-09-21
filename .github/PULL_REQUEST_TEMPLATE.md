## What changed · 改了什么

<!-- One sentence. · 一句话说清楚 -->

## Why · 为什么

<!-- What it was like before, what was wrong with it, and so what it is now.
     Comments and docs in this project follow that structure, and PRs do too.
     原来是什么样、有什么毛病、所以改成什么样。
     这个项目的注释和文档都是这个结构，PR 也照着写。 -->

## How you tested it · 怎么验的

<!-- What you actually clicked, and in which browser. · 你实际点了哪些地方、在什么浏览器上 -->

---

## Checklist · 自查

- [ ] Opened all five display modes with no errors (cycle with `M`) · 五种呈现方式都开过一遍，没有报错
- [ ] The consoles of the new tab page and the options page are clean · 新标签页和选项页的控制台都是干净的
- [ ] Tried it offline; cached works still show · 断网试过，缓存过的画仍然显示
- [ ] **No changes to the permissions in `manifest.json`** (open an issue to discuss first) · **没有改动权限**（要改请先开 Issue 讨论）
- [ ] No `eval`, `new Function`, remote scripts or runtime dependencies added · 没有引入 `eval`、`new Function`、远程脚本或任何运行时依赖
- [ ] `version` in `manifest.json` left alone (the maintainer changes it at release time) · 没有动 `version`（发版时由维护者统一改）
- [ ] If a feature changed, the matching section of the manual is updated (`corridor-newtab/README.md`; the Chinese `README.zh-CN.md` too, if you can) · 改了功能的话，已在手册对应小节补了说明

## Related issue · 关联 Issue

<!-- Closes #… -->
