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

「单独打开完整页」会新开标签打开这份 HTML。不要手写普通站内链接去点它：VitePress 会当成缺失文章。

## 约定

- 不要做成 `docs/` 下的 Markdown 页。
- 相对图片即可；开发预览会补 `<base href>`。需要的话也可以自己写绝对路径。
- 子目录名用英文或数字短名，不要空格。
- 新增目录时在本 README 登记一行。

| 路径 | 说明 |
| --- | --- |
| （尚无） | 新作品从这里开始 |

最后更新：2026-08-23
