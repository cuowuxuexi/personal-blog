# blog-editor

项目级博客编辑 Skill：统一处理公开内容、页面设计、导航索引与主题样式。主文件只做意图路由；分支细节按需从 templates / references 加载。

## 文件索引

| 文件 | 说明 |
| --- | --- |
| `SKILL.md` | 正式路由、公共规则、风险门禁与验证入口 |

## 子目录

| 子目录 | 说明 |
| --- | --- |
| `templates/` | 两类周记的可复制内容骨架；非公开站点内容 |
| `references/` | 周记/历程、其它内容域与站点设计的按分支补充规则；独立 HTML 约定指向 `docs/public/html/README.md` |

## 平台入口

| 路径 | 作用 |
| --- | --- |
| `.cursor/skills/blog-editor/SKILL.md` | Cursor 发现入口，转向本目录 |
| `.claude/skills/blog-editor/SKILL.md` | Claude 发现入口，转向本目录 |
| `AGENTS.md` | 项目级自动路由 |

最后更新：2026-08-23
