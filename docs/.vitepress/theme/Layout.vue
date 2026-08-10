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
      !target.closest('.post-cover')
    ) {
      openZoom(target as HTMLImageElement)
    }
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeZoom()
  })
}

/* ---------- 右侧大纲激活项自动滚动 ---------- */

function scrollActiveOutlineIntoView() {
  const active = document.querySelector<HTMLElement>(
    '.VPDocAsideOutline .outline-link.active',
  )
  if (!active) return
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

onMounted(() => {
  if (!inBrowser) return
  setupImageZoom()
  setupOutlineAutoScroll()
})

watch(
  () => route.path,
  () => {
    if (!inBrowser) return
    closeZoom()
    nextTick(scrollActiveOutlineIntoView)
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
