---
name: 误君墨纸 Ink Paper
colors:
  primary: "#1C2127"
  secondary: "#6E7681"
  tertiary: "#E66700"
  neutral: "#F7F5F1"
  surface: "#FFFFFF"
  invest: "#2949A4"
  life: "#0D7A5F"
  seal: "#B23A2E"
typography:
  display:
    fontFamily: Source Han Serif CN
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.05em
  title-md:
    fontFamily: Source Han Serif CN
    fontSize: 1.25rem
    fontWeight: 650
    lineHeight: 1.4
  body-md:
    fontFamily: Source Han Serif CN
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.8
  label-mono:
    fontFamily: Fira Code
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.08em
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  pill: 999px
spacing:
  base: 8px
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 20px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    padding: 9px 12px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.xs}"
    padding: 9px 20px
  button-seal:
    backgroundColor: "{colors.seal}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xs}"
    padding: 9px 20px
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.xs}"
    padding: 9px 16px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
  chip-active-invest:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.invest}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
  chip-active-life:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.life}"
    typography: "{typography.label-mono}"
    rounded: "{rounded.pill}"
    padding: 6px 14px
---

# 误君墨纸 Ink Paper — 发布面板设计系统

博客「误君在脑海里放烟花」的本地发布面板专用。面板是博客的后台，气质必须与博客正文同源。

## Overview

一页正在排版的周刊校样（galley proof），不是 SaaS 控制台。

作者在这里写周记、传图、润色、落印发布。界面应该像编辑部的工作台：
米白纸面、细墨线分栏、衬线标题、等宽字母眉标，安静克制，信息密度优先。
参照博客首页的「墨纸编辑向」手法：点阵稿纸底纹、细线分区、mono 小字导语、
橙色只出现在可交互处。不要任何「产品感」装饰。

## Colors

- **Primary (#1C2127)：** 墨。标题、正文、主按钮底色。整个界面的骨架色。
- **Secondary (#6E7681)：** 石墨灰。字段标签、元信息、次要说明。
- **Tertiary (#E66700)：** 烟花橙，与博客正文外链同色。**唯一的交互驱动色**——
  焦点框、悬停、激活态、链接、AI 建议标记。橙色出现即表示「可以点 / 正在编辑」。
- **Neutral (#F7F5F1)：** 纸面。页面底色，比纯白温一度，像未涂布的书纸。
- **Surface (#FFFFFF)：** 卡纸。表单卡、输入框、条目列表的底。
- **Invest (#2949A4) / Life (#0D7A5F)：** 栏目色，与博客文章页的分类色一致。
  只用于「投资周记 / AI与生活」栏目切换的激活态与成功提示（life 绿兼作 ok 色）。
- **Seal (#B23A2E)：** 印章红。只给「确认发布」一个按钮用——发布即落印，
  这是面板里唯一不可随意点的动作。不要把它当普通 danger 色到处使用。

边线不设 token：一律用 primary 的 12%–16% 透明度细线（1px），像稿纸的格线。

## Typography

- **display / title-md：** 思源宋体 CN（博客自托管 `/fonts/SourceHanSerifCN-VF.woff2`）。
  页头「发布面板」、当期刊头用它，字距略放（0.05em），像刊名题字。
- **body-md：** 同为思源宋体。正文输入框必须用它——作者在面板里写的字，
  和读者在博客上读到的字是同一副面孔，行高 1.8 对齐博客阅读排版。
- **label-mono：** Fira Code（`/fonts/FiraCode-VF.woff2`）。眉标、字段标签、
  日期、期数、状态行等一切「排版旁注」。小号、加字距、灰色，像校样页边的批注。

## Layout

- 内容最大宽 1120px 居中；8px 网格，卡片内边距 20px，卡片间距 20px。
- 双栏：左侧 240px 当期条目索引，右侧编辑区。880px 以下单栏堆叠。
- 页头是刊头（masthead）：mono 眉标 + 宋体大标 + 右下状态行，底部一根整宽墨线。
- 页面底纹沿用博客首页：28px 点阵 + 居中一根竖向格线，向下渐隐。装饰仅此一处。

## Elevation & Depth

纸的层级用「线」而不是「影」表达。卡片默认只有 1px 墨线；
阴影最多 `0 1px 2px rgba(28,33,39,0.05)`，悬停可至 `0 8px 24px rgba(28,33,39,0.08)`。
禁止彩色阴影、发光、玻璃态模糊。

## Shapes

- 卡片、输入框、按钮：2–6px 小圆角，纸质印刷物的克制感。
- 栏目切换 chip、标签：999px 胶囊，对齐博客文章页的分类胶囊。
- 图片缩略图：4px。

## Components

- **card：** 白卡纸 + 1px 墨线 + 4px 圆角。编辑区、条目栏、刊头卡都是它。
- **input：** 白底、1px 墨线、2px 圆角。焦点态：边线换 tertiary 橙，
  外加 3px 的 `rgba(230,103,0,0.15)` 光环。占位文字用 secondary。
- **button-primary（保存并预览）：** 墨底白字，是最常按的动作。
- **button-seal（确认发布）：** 印章红底白字。整个界面唯一一处红。
- **button-ghost：** 白底墨字 + 1px 墨线，悬停边线转橙。次要动作一律 ghost。
- **chip（栏目 / 模式切换）：** 胶囊。默认灰字白底；激活态用所属栏目色的
  10% 底 + 栏目色描边与文字（投资蓝 / 生活绿），模式类 chip 激活用墨色。

## Do's and Don'ts

- Do：留白、细墨线分区、mono 眉标、衬线正文；橙色只做交互信号。
- Do：状态与提示用文字说清楚，不靠图标和弹跳动画。
- Don't：渐变按钮、玻璃拟态、彩色阴影、深色主题、大圆角（>8px）。
- Don't：把 seal 红用在发布以外的任何地方；不要引入第二种强调色。
- Don't：装饰性 emoji、插画、loading 骨架屏——校样纸上没有这些。
