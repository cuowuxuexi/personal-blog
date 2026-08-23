# 其它内容域路由

仅在投研、投资哲学、大问题或 AI 大事件分支读取。这里列当前发现面和索引副作用；正文结构优先复制同目录最近的兄弟页面，不发明全局模板。

## 投研

新标的放在 `docs/投资/投研/<行业>/<标的>/index.md`，公开 URL 为 `/投资/投研/<行业>/<标的>/`。起草前必须执行 `docs/agents/research-publishing.md` 的 Gate 1 与本地回源协议；发布前执行 Gate 2。

现阶段新增既有行业下的标的需要同步：

1. 新标的目录的 `index.md` 与导航型 `README.md`。
2. 所属行业 `index.md` 的跟踪标的列表。
3. `docs/投资/投研/index.md` 的行业行与手写计数。
4. `docs/投资/index.md` 的跟踪标的卡。
5. `docs/.vitepress/config.mts` 的 `/投资/投研/` sidebar。

投研默认不登记 `docs/.vitepress/posts.ts`，避免进入首页最近更新；只有作者明确改变产品语义时才讨论。新增全新行业还需创建行业 hub / 研究地图入口并接入同一 sidebar。上述发现面过多是 ADR 0002 后续 typed IA 的迁移对象，不要在单篇任务里私建第二套 registry。

## 投资哲学

正文位于 `docs/投资哲学/<主题>/index.md`，总览在 `docs/投资哲学/index.md`。新增、删除或改名主题时同步：

- 新主题目录的 `index.md` 与 `README.md`
- 总览卡片
- `docs/.vitepress/config.mts` 中 nav 与 `/投资哲学/` sidebar
- 现有主题页底部的兄弟主题链接（若该页面族继续采用手写互链）

普通正文修改不动 nav/sidebar，不进入 `posts.ts`。

## 大问题

主题位于 `docs/大问题/<主题>/index.md`，总览在 `docs/大问题/index.md`。新增、删除或改名主题时同步新目录 README、总览卡片，以及 `config.mts` 中 nav 与 `/大问题/` sidebar；普通正文修改不动索引，不进入 `posts.ts`。

## AI 大事件

大事件写在 `docs/AI与生活/大事件/YYYY.md`。在已有年份追加事件只改该年文件；新增年份才同步 `config.mts` 的 AI与生活 sidebar。大事件不写进周记正文，也不进入 `posts.ts`。

## Verification

以上公开内容或索引变化至少运行 `pnpm docs:build`。视觉结构变化再按 `references/site-design.md` 选代表页检查；投研内容还必须满足研究协议的两道人闸。

最后更新：2026-08-22
