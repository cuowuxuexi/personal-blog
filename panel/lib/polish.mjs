import { DEFAULT_MODEL, PINNED_MODELS } from './paths.mjs'

// 投资周记 4k 字 + gpt-5.6-terra 实测约 52s，60s 会误杀。
export const POLISH_TIMEOUT_MS = 180000

export function polishErrorMessage(error) {
  const message = error?.message || String(error)
  if (
    error?.name === 'TimeoutError'
    || error?.name === 'AbortError'
    || /aborted due to timeout/i.test(message)
  ) {
    return '润色超时了。长文或慢模型（如 gpt-5.6-terra）可能要一两分钟，可换 grok-4.5，或把正文拆短再试。'
  }
  return message
}

const SYSTEM = `你是个人博客「误君在脑海里放烟花」的轻度文字助手。
只做这些事：
- 纠正错别字、标点、病句
- 统一常见产品/模型名称大小写（如 Grok Bot、Cursor、GitHub、Hermes、DeepSeek）
- 理顺不流畅的句子，去掉明显重复用词
- 保留作者观点、立场、即时语气，以及 💡 想法标记
- 不要改写成正式复盘、总结报告或第三人称评测
- 不要大幅改写；核心判断句保持作者立场
- 不要发明作者没写的事实

同时根据正文，从「历史标签」里挑 1–2 个最贴切的标签；没有合适的可以新造一个很短的中文标签。

只返回 JSON，不要 markdown 围栏：
{"title":"...","body":"...","suggestedTags":["..."]}`

export function sortModels(ids) {
  const rest = ids.filter((id) => !PINNED_MODELS.includes(id)).sort((a, b) => a.localeCompare(b))
  return [...PINNED_MODELS.filter((id) => ids.includes(id)), ...rest]
}

export async function listModels({ baseUrl, apiKey }) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    throw new Error(`clipro 模型列表失败：${response.status}`)
  }
  const payload = await response.json()
  const ids = (payload.data || []).map((item) => item.id).filter(Boolean)
  return sortModels(ids.length ? ids : PINNED_MODELS)
}

export async function polishEntry({
  baseUrl,
  apiKey,
  model = DEFAULT_MODEL,
  title,
  body,
  tags = [],
  historicalTags = [],
}) {
  const user = [
    `标题：${title}`,
    `已有标签：${tags.join(' / ') || '（无）'}`,
    `历史标签：${historicalTags.slice(0, 40).join('、') || '（无）'}`,
    '',
    '正文：',
    body,
  ].join('\n')

  let response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(POLISH_TIMEOUT_MS),
    })
  } catch (error) {
    throw new Error(polishErrorMessage(error))
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`润色失败：${response.status} ${text.slice(0, 200)}`)
  }
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content || ''
  const json = extractJson(content)
  return {
    title: json.title || title,
    body: json.body || body,
    suggestedTags: Array.isArray(json.suggestedTags) ? json.suggestedTags.filter(Boolean) : [],
  }
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (fenced ? fenced[1] : text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('模型没有返回 JSON')
  return JSON.parse(raw.slice(start, end + 1))
}
