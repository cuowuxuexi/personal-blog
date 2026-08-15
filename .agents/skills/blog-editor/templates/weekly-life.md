# AI 与生活周记模板

input: 用户提供的主题、封面、主题说明、条目素材（标题 / 标签 / 链接 / 图片 / 原文）  
output: `docs/AI与生活/YYYY-MM-DD.md` + `posts.ts` + `/AI与生活/` 侧栏  
position: blog-editor 的 AI 与生活周记固定骨架；非公开站点内容

参考实例：`docs/AI与生活/2026-08-12.md`  
组件：`docs/.vitepress/theme/components/WeeklyEntry.vue`

## 使用规则

1. 复制下方 Markdown 骨架，替换占位符。
2. `## 看烟花！！！` 只保留一次：它是主题封面区与正文栏目区的分割点，不是每条内容的标题。
3. 栏目下每增加一条内容，就增加一组「隐藏 `###` + `<WeeklyEntry>`」。条目里的长文按普通文章写标题，不必改层级。
4. 无外链就删 `link-href`；无副标题就删 `subtitle`；无主图就删 `image`；无徽标就删 `badge-image` / `badge-alt`。`link-href` 始终挂主标题。副标题默认纯文本；只有用户明确要求时才加 `subtitle-href`。标签由主题显示在标题下方，不要改到右侧。
5. `issue` = 同分类最高期数 + 1（投资与生活各自从 001 起算；开篇约定页不算期数）；`date` 默认当天；文件名默认 `YYYY-MM-DD.md`。标题为 `第NNN期-主题`。「展开 / 收起」右侧显示创建日期。
6. 同步 `docs/.vitepress/posts.ts` 与 `docs/.vitepress/config.mts` 对应年份侧栏。
7. 轻度校正错别字、标点、名称大小写与不顺语句；保留观点、即时语气与 `💡`。
8. 正文连续插图：每张图单独成段（中间空一行）。图间距由主题 CSS 处理，不必手工加空行装饰或 HTML。

## 骨架

```md
---
title: 第NNN期-本期主题
date: YYYY-MM-DD
category: AI与生活
type: weekly
issue: N
description: 本期一句话摘要
pageClass: weekly-post weekly-post--life
---

# 第NNN期-本期主题

<p class="weekly-theme-cover">
  <img src="/images/weekly/封面图片.png" alt="封面图片说明" />
</p>

<p class="weekly-theme-caption">本期主题说明。</p>

<div class="weekly-fireworks-section">

## <img class="weekly-section-icon" src="/images/hero-fireworks.png" alt="" /> 看烟花！！！ {#kan-yanhua}

<div class="weekly-outline-only" aria-hidden="true">

### 第一条内容的标题

</div>

<WeeklyEntry
  tags="标签一/标签二"
  title="第一条内容的标题"
  subtitle="可选副标题文案"
  image="/images/weekly/条目主图.png"
  link-href="https://example.com"
  badge-image="/images/weekly/徽标.png"
  badge-alt="徽标说明"
>

第一条内容的正文。

💡 这里记录想法或判断。

正文中也可以继续插图；连续多张时各自单独成段：

![图片说明 A](/images/weekly/补充图片-a.png)

![图片说明 B](/images/weekly/补充图片-b.png)

</WeeklyEntry>

<div class="weekly-outline-only" aria-hidden="true">

### 第二条内容的标题

</div>

<WeeklyEntry
  tags="标签一/标签二"
  title="第二条内容的标题"
>

第二条内容的正文。

</WeeklyEntry>

</div>
```

## 用户素材最小格式

用户可用自然语言或下列清单交付，不必手写完整 Markdown：

```text
主题：
封面：
主题说明：
摘要：

条目 1：
标题：
标签：
链接：
图片：
原文：

条目 2：
标题：
标签：
原文：
```

## 验收清单

- [ ] frontmatter 完整，`pageClass` 为 `weekly-post weekly-post--life`
- [ ] 整期标题、封面、主题说明齐全
- [ ] 「展开 / 收起」右侧有创建日期 `YYYY年MM月DD日`
- [ ] 只有一个 `## 看烟花！！！` 栏目分割点
- [ ] 每条 `WeeklyEntry` 前有同名隐藏 `###`
- [ ] 可选字段按需省略，无空 props
- [ ] 图片在 `docs/public/images/weekly/`，路径以 `/images/weekly/` 开头
- [ ] 连续插图各自单独成段（空一行分隔），依赖主题图间距
- [ ] `posts.ts` 与 AI 侧栏已同步
- [ ] 错别字/名称/语句已轻度校正，观点未改
- [ ] `pnpm docs:build` 通过
