# html

先做好的独立 HTML，拷进本目录后即可嵌进文章、也可单独打开。发布面板不上传 HTML。

## 怎么放

每个作品一个子目录，入口必须叫 `index.html`，图片和它放一起：

```text
docs/public/html/<名字>/
  index.html
  *.png
```

公开地址是 `/html/<名字>`，例如 `docs/public/html/pi-shortcuts/` → `/html/pi-shortcuts`。

已有的 Pi / Grok 图解仍在 `docs/public/journey-guides/`，地址保持 `/journey-guides/...`。新作品用本目录。

## 怎么嵌进文章

```md
<StandaloneHtml src="/html/<名字>" title="说明" />
```

「单独打开完整页」会新开标签打开这份 HTML。侧栏或标题要直达完整页时，在对应篇章 frontmatter 写 `publicHref: /html/<名字>`（历程具名篇章、投研 HTML 章节和投资哲学 HTML 主题都走这条）。不要把 `/html/...` 当成普通 Markdown 文章路由，也不要再套一层 iframe。

## 约定

- 不要做成 `docs/` 下的 Markdown 页。
- 相对图片即可；开发预览会补 `<base href>`。需要的话也可以自己写绝对路径。
- `#pi` 会被 `<base href="/html/cli-hub/">` 解析成 `/html/cli-hub/#pi`，不是 `/html/cli-hub/pi`。查链接用解析后的 hash，不要把目录页存在当成锚点存在。
- 子目录名用英文或数字短名，不要空格。
- 新增目录时在本 README 登记一行。
- 面包屑祖先指向站内父页；改完跑 `pnpm check:html`。

| 路径 | 说明 |
| --- | --- |
| `grok-skills/` | Grok Build 自带技能图解（旧整页，cli篇已改走 cli-hub） |
| `cli-hub/` | cli篇目录：Pi / Grok / Antigravity / Herdr / Orca |
| `hengrui-business-model/` | 恒瑞医药生意模型画布；章节标题直达 `/html/hengrui-business-model` |
| `hengrui-sales-expense/` | 恒瑞医药销售费用五年变化与同业对照；章节标题直达 `/html/hengrui-sales-expense` |
| `hengrui-zou-narrative/` | 邹佩轩《叙事经济学》恒瑞案例学习层提取；章节标题直达 `/html/hengrui-zou-narrative` |
| `tencent-business-model/` | 腾讯生意模型画布；章节标题直达 `/html/tencent-business-model` |
| `knowledge-search/` | 全站公开内容的独立关键词检索页；静态快照，不替换 VitePress 搜索 |
| `pharma-tech-waves/` | 医药技术浪潮与投资框架交互画布；对应研究地图节点「技术浪潮与投资框架」 |
| `bd-wealth-effect-check/` | 假说 2「BD 均值回归」的公开数据对照页；从技术浪潮假说区卡片进入 |
| `golden-decade-check/` | 假说 1「黄金新十年」的公开数据对照页；从技术浪潮假说区卡片进入 |
| `intl-device-check/` | 假说 3「国际原创器械显化」的公开数据对照页；从技术浪潮假说区卡片进入 |
| `four-focus-check/` | 假说 4「四个关注方向」的公开数据对照页；从技术浪潮假说区卡片进入 |
| `dcf-eli5/` | DCF 到底怎么用 · 知识画布（ELI5 版）；投资哲学档 → 框架页 `邹佩轩投资哲学框架` → `DCF` 直达 `/html/dcf-eli5` |
| `zou-narrative-map/` | 邹佩轩叙事框架 · 总览（关系图 / 派生概念 / 作者术语速查；骨架与阅读路径在框架页）；同组 `叙事框架总览` 直达 `/html/zou-narrative-map` |
| `zou-endgame/` | 邹佩轩叙事框架 1/5 · 空间叙事与终局（解析解表、反算隐含叙事、景气度陷阱）；同组 `空间叙事与终局` 直达 `/html/zou-endgame` |
| `zou-discount-rate/` | 邹佩轩叙事框架 2/5 · 折现率与分母端（10% 取值、内生性、利率下行谁受益）；同组 `折现率与分母端` 直达 `/html/zou-discount-rate` |
| `zou-auction/` | 邹佩轩叙事框架 3/5 · 拍卖机制（预期分布、中线 + 截距、流动性定价、中芯国际案例）；同组 `拍卖机制` 直达 `/html/zou-auction` |
| `zou-alpha/` | 邹佩轩叙事框架 4/5 · 叙事变化与超额收益（P₁/P₀ = 1 + r、三种走势、隆基三轮）；同组 `叙事变化与超额收益` 直达 `/html/zou-alpha` |
| `zou-method/` | 邹佩轩叙事框架 5/5 · 研究方法论（推理 vs 归纳、三圆五偏误、显著性、贝叶斯）；同组 `研究方法论` 直达 `/html/zou-method` |

最后更新：2026-09-10
