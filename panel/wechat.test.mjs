import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { buildWechatClipboardPayload, embedWechatClipboardImages, renderWechatPreview } from './lib/wechat.mjs'
import { serializeEntry } from './lib/weekly.mjs'

function weeklySource({
  title = '第007期-测试周记',
  date = '2026-08-16',
  description = '一段安全的摘要。',
  chrome = true,
  entry = '',
} = {}) {
  return [
    '---',
    `title: ${title}`,
    `date: ${date}`,
    'type: weekly',
    `description: ${description}`,
    '---',
    '',
    `# ${title}`,
    '',
    chrome ? '<p class="weekly-theme-cover">' : '',
    chrome ? '  <img src="/images/cover.png" alt="封面图" />' : '',
    chrome ? '</p>' : '',
    chrome ? '' : '',
    chrome ? '<p class="weekly-theme-caption">测试题注</p>' : '',
    '',
    '## <img class="weekly-section-icon" src="/images/section.png" alt="" /> 看烟花！！！ {#kan-yanhua}',
    '',
    entry,
    '',
  ].filter((line) => line !== false).join('\n')
}

const richEntry = `<WeeklyEntry
  tags="AI/生活"
  title="标题 & <危险>"
  subtitle="副标题"
  subtitle-href="https://example.com/sub?a=1&b=2"
  image="/images/weekly/header.png"
  image-alt="头图 & 引号"
  link-href="https://example.com/main?a=1&b=2"
  badge-image="/images/weekly/badge.png"
  badge-alt="徽章"
>

正文 **加粗**、*强调* 和 [外链](https://example.net/page?q=1&x=2)。

![站内图](/images/weekly/body.png)

#### 小标题

- 项目一
- 项目二

> 引用内容

\`inline <code>\`

\`\`\`js
const escaped = "<tag> & safe"
\`\`\`

| 名称 | 值 |
| --- | --- |
| A | 1 |

---

\\[
\\text{现金} \\rightarrow \\begin{cases}
\\text{训练模型}\\\\
\\text{提供推理}
\\end{cases}
\\]

</WeeklyEntry>`

test('renders life theme, links, image pairs, markdown, formulas, and date fallback', () => {
  const result = renderWechatPreview({
    source: weeklySource({ entry: richEntry }),
    kind: 'life',
    productionOrigin: 'https://blog.example.com/',
    jobId: 'job 7/unsafe',
  })

  assert.equal(result.title, '第007期-测试周记')
  assert.equal(result.description, '一段安全的摘要。')
  assert.match(result.articleHtml, /#0d7a5f/)
  assert.match(result.articleHtml, /#607fa6/)
  assert.match(result.articleHtml, /本周随记/)
  assert.match(result.articleHtml, /Noto Sans SC/)
  assert.match(result.articleHtml, /Noto Serif SC/)
  assert.match(result.articleHtml, /JetBrains Mono/)
  assert.doesNotMatch(result.articleHtml, /#e66700/)
  assert.match(result.articleHtml, />标题 &amp; &lt;危险&gt;<\/h3>/)
  assert.match(result.articleHtml, />https:\/\/example\.com\/main\?a=1&amp;b=2 ↗<\/a>/)
  assert.match(result.articleHtml, />副标题<\/p>/)
  assert.match(result.articleHtml, />https:\/\/example\.com\/sub\?a=1&amp;b=2 ↗<\/a>/)
  assert.match(result.articleHtml, /src="\/wechat-preview-assets\/job%207%2Funsafe\/images\/weekly\/header\.png"/)
  assert.match(result.articleHtml, /data-online-src="https:\/\/blog\.example\.com\/images\/weekly\/header\.png"/)
  assert.match(result.articleHtml, /src="\/wechat-preview-assets\/job%207%2Funsafe\/images\/weekly\/body\.png"/)
  assert.deepEqual(result.assetUrls, [
    'https://blog.example.com/images/cover.png',
    'https://blog.example.com/images/section.png',
    'https://blog.example.com/images/weekly/header.png',
    'https://blog.example.com/images/weekly/badge.png',
    'https://blog.example.com/images/weekly/body.png',
  ])
  assert.match(result.articleHtml, /<strong[^>]*>加粗<\/strong>/)
  assert.match(result.articleHtml, /<ul[^>]*>/)
  assert.match(result.articleHtml, /<blockquote[^>]*>/)
  assert.match(result.articleHtml, /<code[^>]*>inline &lt;code&gt;<\/code>/)
  assert.match(result.articleHtml, /<pre[^>]*>/)
  assert.match(result.articleHtml, /<table[^>]*>/)
  assert.match(result.articleHtml, /2026年08月16日/)
  assert.match(result.articleHtml, /\\text\{现金\}/)
  assert.match(result.articleHtml, /\\begin\{cases\}/)
  assert.doesNotMatch(result.articleHtml, /MathJax|mjx-container/)
})

test('renders investment accent and preserves a legacy disclaimer before the first entry', () => {
  const source = weeklySource({
    chrome: false,
    entry: [
      '> **非投资建议**：本文为个人记录模板与写作约定，不构成任何投资建议。据此决策风险自负。',
      '',
      '## 阅读说明',
      '',
      '以下记录用于复盘，引用数据请以原始披露为准。',
      '',
      '<WeeklyEntry title="投资条目" tags="财报/研究" date="2026-08-15">',
      '',
      '投资正文。',
      '',
      '</WeeklyEntry>',
    ].join('\n'),
  })
  const result = renderWechatPreview({
    source,
    kind: 'invest',
    productionOrigin: 'https://blog.example.com',
    jobId: 'invest-job',
  })

  assert.match(result.articleHtml, /#2949a4/)
  assert.match(result.articleHtml, /本周随记/)
  assert.match(result.articleHtml, /src="\/wechat-preview-assets\/invest-job\/images\/hero-fireworks\.png"/)
  assert.match(result.articleHtml, /烟花朵朵开，想法自然来。/)
  assert.match(result.articleHtml, /<blockquote[^>]*>[\s\S]*非投资建议[\s\S]*不构成任何投资建议[\s\S]*风险自负[\s\S]*<\/blockquote>/)
  assert.match(result.articleHtml, /<h2[^>]*>阅读说明<\/h2>/)
  assert.match(result.articleHtml, /以下记录用于复盘，引用数据请以原始披露为准。/)
  assert.doesNotMatch(result.articleHtml, /<h1[^>]*>写在投资笔记开始之前<\/h1>[\s\S]*<h1[^>]*>写在投资笔记开始之前<\/h1>/)
  assert.doesNotMatch(result.articleHtml, /weekly-theme-cover|weekly-theme-caption|weekly-section-icon|kan-yanhua/)
  assert.match(result.articleHtml, /2026年08月15日/)
})

test('verifies external HTTP images without rewriting their preview src', () => {
  const externalImage = 'https://cdn.example.com/chart.png?size=large&theme=dark'
  const result = renderWechatPreview({
    source: weeklySource({
      entry: `<WeeklyEntry title="外部图片" image="${externalImage}">\n\n![外部正文图](${externalImage})\n\n</WeeklyEntry>`,
    }),
    kind: 'life',
    productionOrigin: 'https://blog.example.com',
    jobId: 'external-job',
  })

  const escapedExternalImage = externalImage.replace(/&/g, '&amp;')
  assert.equal(result.articleHtml.split(`src="${escapedExternalImage}"`).length - 1, 2)
  assert.doesNotMatch(result.articleHtml, /data-online-src="https:\/\/cdn\.example\.com\/chart\.png/)
  assert.deepEqual(result.assetUrls, [
    'https://blog.example.com/images/cover.png',
    'https://blog.example.com/images/section.png',
    externalImage,
  ])
  assert.deepEqual(result.externalAssetUrls, [externalImage])
})

test('applies an actual crop style for cover entry images', () => {
  const result = renderWechatPreview({
    source: weeklySource({
      entry: `<WeeklyEntry title="裁切图" image="/images/weekly/crop.png" image-fit="cover">\n\n正文。\n\n</WeeklyEntry>`,
    }),
    kind: 'life',
    productionOrigin: 'https://blog.example.com',
    jobId: 'cover-job',
  })

  assert.match(result.articleHtml, /height:400px;max-height:50vh;object-fit:cover;object-position:center;/)
})

test('embeds local snapshot images as JPEG data URIs in the clipboard payload', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wechat-embed-'))
  const images = path.join(root, 'docs', 'public', 'images')
  const weekly = path.join(images, 'weekly')
  fs.mkdirSync(weekly, { recursive: true })
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  fs.writeFileSync(path.join(weekly, 'cover.webp'), await sharp(png).webp().toBuffer())
  fs.writeFileSync(path.join(images, 'hero-fireworks.png'), png)
  fs.writeFileSync(path.join(images, 'section.png'), png)

  const result = renderWechatPreview({
    source: weeklySource({
      chrome: false,
      entry: `<WeeklyEntry title="WebP" image="/images/weekly/cover.webp">\n\n正文。\n\n</WeeklyEntry>`,
    }),
    kind: 'life',
    productionOrigin: 'https://blog.example.com',
    jobId: 'webp-job',
  })
  const clipboard = await embedWechatClipboardImages(result.articleHtml, {
    snapshotDir: root,
    jobId: 'webp-job',
  })
  assert.match(clipboard.html, /src="data:image\/jpeg;base64,/)
  assert.doesNotMatch(clipboard.html, /wechat-preview-assets|\.webp/)
  assert.match(result.articleHtml, /data-online-src="https:\/\/blog\.example\.com\/images\/weekly\/cover\.webp"/)
})

test('builds clipboard HTML with production image src and no data-online-src', () => {
  const previewArticle = [
    '<section id="article">',
    '<img src="/wechat-preview-assets/job/images/local.png" data-online-src="https://blog.example.com/images/local.png" alt="本地图" />',
    '<img src="https://cdn.example.com/external.png" alt="外部图" />',
    '</section>',
  ].join('')

  const payload = buildWechatClipboardPayload(previewArticle)

  assert.equal(payload.html, [
    '<section>',
    '<img src="https://blog.example.com/images/local.png" alt="本地图" />',
    '<img src="https://cdn.example.com/external.png" alt="外部图" />',
    '</section>',
  ].join(''))
  assert.equal(payload.text, '')
  assert.doesNotMatch(payload.html, /data-online-src/)
  assert.doesNotMatch(payload.html, /wechat-preview-assets/)
})

test('renders panel-serialized attributes exactly once and keeps query URLs intact', () => {
  const serialized = serializeEntry({
    title: 'A & B "测试"',
    subtitle: '副标题 & 更多',
    linkHref: 'https://example.com/main?a=1&b=2',
    subtitleHref: 'https://example.com/sub?x=3&y=4',
    imageAlt: '图片 & 说明',
    tags: ['AI & 生活'],
    body: '正文。',
  })
  const result = renderWechatPreview({
    source: weeklySource({ entry: serialized }),
    kind: 'life',
    productionOrigin: 'https://blog.example.com',
    jobId: 'serialized-job',
  })

  assert.match(result.articleHtml, />A &amp; B &quot;测试&quot;<\/h3>/)
  assert.match(result.articleHtml, />副标题 &amp; 更多<\/p>/)
  assert.match(result.articleHtml, /href="https:\/\/example\.com\/main\?a=1&amp;b=2"/)
  assert.match(result.articleHtml, />https:\/\/example\.com\/main\?a=1&amp;b=2 ↗<\/a>/)
  assert.match(result.articleHtml, /href="https:\/\/example\.com\/sub\?x=3&amp;y=4"/)
  assert.doesNotMatch(result.articleHtml, /&amp;amp;/)
})

test('escapes metadata and rejects unsafe URL protocols and raw active HTML', () => {
  const source = weeklySource({
    title: '<img src=x onerror=alert(1)>',
    description: '</script><script>alert(1)</script>',
    entry: `<WeeklyEntry title="&quot; onmouseover=&quot;alert(1)" link-href="javascript:alert(1)">\n\n<script>alert('body')</script>\n<img src="javascript:alert(2)" onerror="alert(3)">\n\n</WeeklyEntry>`,
  })
  const result = renderWechatPreview({
    source,
    kind: 'life',
    productionOrigin: 'https://blog.example.com',
    jobId: '</script><script>alert(4)</script>',
  })

  assert.doesNotMatch(result.articleHtml, /<script\b|<img[^>]+onerror=|<[^>]+onmouseover=|href="javascript:|src="javascript:/i)
  const disguisedRelative = renderWechatPreview({
    source: weeklySource({
      entry: `<WeeklyEntry title="相对链接" link-href="/\\evil.example/path">\n\n正文。\n\n</WeeklyEntry>`,
    }),
    kind: 'life',
    productionOrigin: 'https://blog.example.com',
    jobId: 'relative-job',
  })
  assert.doesNotMatch(disguisedRelative.articleHtml, /href="[^"']*evil\.example|\/\\evil\.example\/path/i)
  assert.match(result.articleHtml, /&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.doesNotMatch(result.html, /<title><img/i)
  assert.doesNotMatch(result.html, /<script>alert\(4\)<\/script>/)
})

test('journey uses the life theme and keeps journey image assets', () => {
  const source = [
    '---',
    'title: 基础设施篇',
    'type: journey',
    'description: 一篇历程。',
    '---',
    '',
    '# 基础设施篇',
    '',
    '<p class="weekly-theme-cover">',
    '  <img src="/images/journey/cover.png" alt="封面" />',
    '</p>',
    '',
    '<WeeklyEntry title="本地模型" image="/images/journey/entry.png">',
    '',
    '![正文图](/images/journey/body.png)',
    '',
    '</WeeklyEntry>',
  ].join('\n')
  const result = renderWechatPreview({
    source,
    kind: 'journey',
    productionOrigin: 'https://blog.example.com',
    jobId: 'journey-job',
  })

  assert.match(result.articleHtml, /#0d7a5f/)
  assert.match(result.articleHtml, /历程随记/)
  assert.doesNotMatch(result.articleHtml, /本周随记/)
  assert.doesNotMatch(result.articleHtml, /#2949a4/)
  assert.match(result.articleHtml, /src="\/wechat-preview-assets\/journey-job\/images\/journey\/cover\.png"/)
  assert.match(result.articleHtml, /data-online-src="https:\/\/blog\.example\.com\/images\/journey\/body\.png"/)
  assert.deepEqual(result.assetUrls, [
    'https://blog.example.com/images/journey/cover.png',
    'https://blog.example.com/images/hero-fireworks.png',
    'https://blog.example.com/images/journey/entry.png',
    'https://blog.example.com/images/journey/body.png',
  ])
  assert.doesNotMatch(result.title, /周记/)
})

test('missing title falls back to a generic label instead of 周记', () => {
  const result = renderWechatPreview({
    source: '---\ntype: journey\n---\n\n只有正文。\n',
    kind: 'journey',
  })
  assert.equal(result.title, '未命名')
  assert.doesNotMatch(result.html, /公众号版 · 周记/)
})

test('keeps toolbar outside article and emits copy gating script', () => {
  const result = renderWechatPreview({
    source: weeklySource({
      entry: `<WeeklyEntry title="复制测试">\n\n正文。\n\n</WeeklyEntry>`,
    }),
    kind: 'life',
    productionOrigin: 'https://blog.example.com',
    jobId: 'copy-job',
  })

  assert.doesNotMatch(result.articleHtml, /toolbar|复制全文到公众号|copyAllowed/)
  assert.match(result.html, /<button[^>]+disabled[^>]*>复制全文到公众号<\/button>/)
  assert.match(result.html, /\/api\/publish\/jobs\//)
  assert.match(result.html, /wechatPreview\.copyAllowed/)
  assert.match(result.html, /var clipboardHtml = /)
  assert.match(result.html, /https:\/\/blog\.example\.com\/images\/cover\.png/)
  assert.match(result.html, /holder\.innerHTML = html; document\.body\.appendChild\(holder\)/)
  assert.match(result.html, /ClipboardItem/)
  assert.match(result.html, /copyWithSelection\(clipboardHtml\)/)
  assert.match(result.html, /execCommand\(['"]copy['"]\)/)
  assert.ok(result.html.indexOf('class="toolbar"') < result.html.indexOf('id="article"'))
})
