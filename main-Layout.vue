<script setup lang="ts">
import { onMounted, watch, nextTick } from 'vue'
import Theme from 'vitepress/theme-without-fonts'
import { useRoute, inBrowser } from 'vitepress'
import PostMeta from './components/PostMeta.vue'
import HomeHeroCta from './components/HomeHeroCta.vue'
import HomeRecent from './components/HomeRecent.vue'
import SiteTitleMenu from './components/SiteTitleMenu.vue'

const { Layout } = Theme
const route = useRoute()

/* ---------- 图片点击放大 ---------- */

let zoomOverlay: HTMLDivElement | null = null

function closeZoom() {
  if (zoomOverlay) {
    zoomOverlay.remove()
    zoomOverlay = null
    document.documentElement.style.overflow = ''
  }
}

function openZoom(img: HTMLImageElement) {
  closeZoom()
  const overlay = document.createElement('div')
  overlay.className = 'blog-zoom-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-label', '图片预览')

  const clone = document.createElement('img')
  clone.src = img.currentSrc || img.src
  clone.alt = img.alt || ''
  overlay.appendChild(clone)

  overlay.addEventListener('click', closeZoom)
  document.body.appendChild(overlay)
  document.documentElement.style.overflow = 'hidden'
  zoomOverlay = overlay
}

function setupImageZoom() {
  document.addEventListener('click', (e) => {
    if (zoomOverlay) return
    const target = e.target as HTMLElement
    if (
      target.tagName === 'IMG' &&
      target.closest('.vp-doc') &&
      !target.closest('.blog-zoom-overlay') &&
      !target.closest('.post-cover') &&
      !target.closest('.weekly-entry__badge') &&
      !target.classList.contains('weekly-section-icon') &&
      !target.classList.contains('weekly-entry__badge-image')
    ) {
      openZoom(target as HTMLImageElement)
    }
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeZoom()
  })
}

/* ---------- 右侧大纲：条目可折叠，只听点击，不跟滚动展开 ---------- */

const outlineFoldState = new Map<string, boolean>()
let outlineDecorateRunning = false
let outlineDecorateQueued = false

function outlineItemKey(link: HTMLElement) {
  return link.getAttribute('href') || link.textContent?.trim() || ''
}

function isInsideCollapsedOutline(el: HTMLElement) {
  const collapsed = el.closest('li.is-collapsed')
  return Boolean(collapsed && collapsed.querySelector(':scope > ul')?.contains(el))
}

function scrollActiveOutlineIntoView() {
  const active = document.querySelector<HTMLElement>(
    '.VPDocAsideOutline .outline-link.active',
  )
  if (!active || isInsideCollapsedOutline(active)) return
  const aside = active.closest<HTMLElement>('.VPDocAside')
  if (!aside) return
  const r = active.getBoundingClientRect()
  const c = aside.getBoundingClientRect()
  if (r.top < c.top + 72 || r.bottom > c.bottom - 72) {
    aside.scrollTop += r.top - c.top - c.height / 2
  }
}

function setupOutlineAutoScroll() {
  let ticking = false
  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      scrollActiveOutlineIntoView()
      ticking = false
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
}

function decorateOutlineFolds() {
  if (outlineDecorateRunning) {
    outlineDecorateQueued = true
    return
  }
  outlineDecorateRunning = true
  try {
    const root = document.querySelector('.weekly-post .VPDocAsideOutline .root')
    if (!root) return
    root.querySelectorAll(':scope li').forEach((li) => {
      const childList = li.querySelector(':scope > ul')
      const link = li.querySelector<HTMLElement>(':scope > .outline-link')
      if (!childList || !link) return
      li.classList.add('has-outline-children')
      const key = outlineItemKey(link)
      const parentLi = li.parentElement?.closest('li')
      const underSection = Boolean(parentLi?.parentElement?.classList.contains('root'))
      const collapsed = outlineFoldState.has(key)
        ? Boolean(outlineFoldState.get(key))
        : underSection
      if (li.classList.contains('is-collapsed') !== collapsed) {
        li.classList.toggle('is-collapsed', collapsed)
      }
      const existing = li.querySelector<HTMLButtonElement>(':scope > .outline-fold')
      if (existing) {
        existing.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
        return
      }
      const btn = document.createElement('button')
      btn.className = 'outline-fold'
      btn.type = 'button'
      btn.setAttribute('aria-label', '展开或收起')
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
      btn.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const next = !li.classList.contains('is-collapsed')
        li.classList.toggle('is-collapsed', next)
        outlineFoldState.set(key, next)
        btn.setAttribute('aria-expanded', next ? 'false' : 'true')
      })
      link.before(btn)
    })
  } finally {
    outlineDecorateRunning = false
    if (outlineDecorateQueued) {
      outlineDecorateQueued = false
      scheduleDecorateOutlineFolds()
    }
  }
}

function scheduleDecorateOutlineFolds() {
  requestAnimationFrame(() => decorateOutlineFolds())
}

function setupOutlineFolds() {
  decorateOutlineFolds()
  const aside = document.querySelector('.VPDocAside')
  if (!aside || aside.dataset.outlineFoldBound === '1') return
  aside.dataset.outlineFoldBound = '1'
  const observer = new MutationObserver(() => scheduleDecorateOutlineFolds())
  observer.observe(aside, {
    childList: true,
    subtree: true,
  })
}

onMounted(() => {
  if (!inBrowser) return
  setupImageZoom()
  setupOutlineAutoScroll()
  setupOutlineFolds()
})

watch(
  () => route.path,
  () => {
    if (!inBrowser) return
    closeZoom()
    outlineFoldState.clear()
    nextTick(() => {
      decorateOutlineFolds()
      scrollActiveOutlineIntoView()
    })
  },
)
</script>

<template>
  <Layout>
    <template #nav-bar-title-before>
      <SiteTitleMenu />
    </template>
    <template #doc-before>
      <PostMeta />
    </template>
    <template #home-hero-actions-after>
      <HomeHeroCta />
    </template>
    <template #home-features-after>
      <HomeRecent />
    </template>
  </Layout>
</template>
