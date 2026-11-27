/**
 * 站内视频播放器解析（纯函数，无 Node 依赖，供前端组件与单测共用）。
 * 优先走自托管直链（videoUrl → 原生 <video>），其次识别 B 站 / YouTube 外链走官方嵌入播放器。
 */

const BILIBILI_RE = /^https?:\/\/(?:www\.|m\.)?bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i

function parseYouTubeId(url) {
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.replace(/^\/+/, '').split('/')[0]
    return /^[0-9A-Za-z_-]{11}$/.test(id) ? id : ''
  }
  if (/^(?:www\.|m\.)?youtube\.com$/i.test(url.hostname)) {
    const v = url.searchParams.get('v') || ''
    if (/^[0-9A-Za-z_-]{11}$/.test(v)) return v
    const m = url.pathname.match(/^\/(?:embed|shorts)\/([0-9A-Za-z_-]{11})/)
    if (m) return m[1]
  }
  return ''
}

export function resolveVideoPlayer(video) {
  if (!video || typeof video !== 'object') return null

  if (typeof video.videoUrl === 'string' && /^https:\/\/[^/\s]/.test(video.videoUrl)) {
    return {
      kind: 'native',
      provider: 'self',
      src: video.videoUrl,
    }
  }

  if (typeof video.url !== 'string') return null

  const bili = video.url.match(BILIBILI_RE)
  if (bili) {
    let page = 1
    try {
      const p = Number(new URL(video.url).searchParams.get('p'))
      if (Number.isInteger(p) && p >= 1) page = p
    } catch {
      page = 1
    }
    const params = new URLSearchParams({
      bvid: bili[1],
      page: String(page),
      high_quality: '1',
      danmaku: '0',
      autoplay: '1',
    })
    return {
      kind: 'iframe',
      provider: 'bilibili',
      src: `https://player.bilibili.com/player.html?${params.toString()}`,
    }
  }

  try {
    const parsed = new URL(video.url)
    const ytId = parseYouTubeId(parsed)
    if (ytId) {
      return {
        kind: 'iframe',
        provider: 'youtube',
        src: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`,
      }
    }
  } catch {
    return null
  }

  return null
}
