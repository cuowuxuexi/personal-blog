# Handoff: Phase 2 research UI / content design (Cursor)

This file is an agent/operator handoff. It is under `docs/agents/` and is excluded from the public VitePress site via `srcExclude`.

## Copy-paste prompt for Cursor

```text
你在 personal-blog 仓库继续 Phase 2：药明康德投研前端本地实验的「版面 + 内容设计」。

## 你是谁 / 目标
- 目标：在本地把医药研究地图 + 药明康德档案的第一版做得更好看、更好读、更好帮我梳理思路。
- 这是实验，不是永久信息架构。预览后可以拆分、合并、改名。
- 记录价值 > 展示价值；但版面质量要够用，不能像未排版草稿。

## 必读（先读再改）
1. RESEARCH-FRONTEND.md（Phase 2 设计落档与现状）
2. CONTEXT.md
3. docs/adr/0001-research-authority-and-publication-boundary.md
4. docs/agents/research-publishing.md
5. 当前页面：
   - docs/投资/投研/医药/index.md
   - docs/投资/投研/医药/研究地图/index.md
   - docs/投资/投研/医药/研究地图/创新药研发全流程/index.md
   - docs/投资/投研/医药/研究地图/CXO与CRDMO/index.md
   - docs/投资/投研/医药/药明康德/index.md
6. 样式：docs/.vitepress/theme/style.css（搜索 map-index / process-map / relation-map / known-unknown / learning-path）
7. 侧栏：docs/.vitepress/config.mts 中 `/投资/投研/` sidebar

## 已实现的本地 v1
目录与路由：
- /投资/投研/医药/
- /投资/投研/医药/研究地图/
- /投资/投研/医药/研究地图/创新药研发全流程/
- /投资/投研/医药/研究地图/CXO与CRDMO/
- /投资/投研/医药/药明康德/

三页职责（实验）：
1. 创新药研发全流程：阶段地图 + 已知/未知 + 后续问题
2. CXO与CRDMO：角色关系 + CRDMO 商业直觉 + 已知/未知
3. 药明康德主页：为什么研究、当前阶段、学习路径、开放问题；不写完整公司结论

视觉组件（HTML/CSS，无 mermaid）：
- .process-map
- .relation-map
- .map-stage-card
- .known-unknown
- .learning-path
- .revision-table

本地预览：
pnpm docs:dev
# 若 5173 拒绝连接，说明 dev server 未启动

## 权威与边界（硬约束）
- 私有投研指挥系统 = 研究事实权威；博客 = 呈现与学习路径权威
- 所有投资周记/投研内容都需要两道人工门：讨论结构 → 本地实现/预览 → 明确批准后才能 push/deploy
- 本轮默认：只做本地设计与内容打磨，不要 push / deploy / 发布
- 不要把 D:\投资系统\... 或本机绝对路径写进 docs 公开正文
- 不要自动同步指挥部
- 不要引入图数据库/通用知识图谱引擎
- 不要写买卖建议、目标价、持仓信息
- docs/agents/** 与 docs/adr/** 已被 srcExclude，不要为了“方便预览”再公开它们

## 本地回源（如需加深内容）
- 本机文件 research-sources.local.yaml（gitignored）
- source_root = D:/投资系统
- 相对路径以 指挥部/... 为基准（与 00_项目登记表.json 一致）
- command_id = CMD-000003（药明康德）
- 主要材料：知识图谱 00/01/02/03/04
- 若索引缺失：从 D:/投资系统/指挥部/00_项目登记表.json 重新定位，不要编造研究结论

## 你的任务范围
优先做版面与内容设计，而不是扩成完整公司尽调：

A. 版面
- 信息层级、留白、节奏、移动端
- 流程/关系图是否足够清晰
- 与现有 research-index / subject-index 视觉语言统一
- 必要时重构 CSS class，但保持可维护、少抽象

B. 内容
- 让“学习中”状态更清楚
- 强化“已确认基础 / 当前理解 / 未解决问题”区分
- 压缩空话，保留能帮助继续研究的结构
- 可小幅重写文案，但不要伪装成已完成的公司研究结论
- 三页拆分可调整，但先说明为什么

C. 导航
- 侧栏、面包屑、互相链接是否顺手
- 医药行业页入口是否清楚

## 明确不做
- 不写完整药明康德研究报告
- 不自动从指挥部批量导入
- 不改部署配置/Secrets
- 不把 Phase 2 实验固化成全站永久规范（那是 Phase 3）
- 不提交前未经用户要求的 push

## 验收方式
1. pnpm docs:dev 可预览上述 5 个路由
2. pnpm docs:build 通过
3. 公开 markdown 无本机绝对路径
4. 页面仍清楚标注实验/学习中
5. 交付时说明：
   - 改了哪些文件
   - 版面决策（为什么这样排）
   - 内容取舍
   - 仍待用户拍板的点
   - 是否建议进入发布第二道门（默认否）

## 建议工作顺序
1. 先本地 dev 打开 5 个页面，截取/记录当前问题
2. 先定版面问题清单，再改 CSS/结构
3. 再打磨文案与信息密度
4. build 验证
5. 用简短中文汇报，等用户决定是否 commit / 是否继续第三阶段

开始前用 3-6 条列出你的改版假设，再动手。
```

## Operator notes

- Phase 1 governance is already committed: `85fe2cd`
- Phase 2 page/style changes may still be uncommitted when this handoff is written; include them in the working tree before switching to Cursor
- Local index `research-sources.local.yaml` will not appear in git and must exist on the author's machine
- Public deploy remains human-gated

最后更新：2026-08-10
