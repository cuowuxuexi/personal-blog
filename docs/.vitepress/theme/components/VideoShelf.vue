<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../videos.data.mjs'
import { resolveVideoPlayer } from '../../video-embed.mjs'

interface Video {
  title: string
  date: string
  duration: string
  cover: string
  url: string
  videoUrl?: string
  reportSlug?: string
  reportCompany?: string
}

const props = withDefaults(
  defineProps<{ limit?: number; title?: string; featured?: boolean }>(),
  { limit: 0, title: '', featured: false },
)

const all = (data || []) as Video[]
const shown = computed(() => (props.limit > 0 ? all.slice(0, props.limit) : all))
const isFeaturedSingle = computed(() => props.featured && shown.value.length === 1)
const showMore = computed(() => !props.title && props.limit > 0 && (props.featured || all.length > props.limit))
const coverSrc = (src: string) => (src.startsWith('/') ? withBase(src) : src)

const mounted = ref(false)
const activeVideo = ref<Video | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)
let lastTrigger: HTMLElement | null = null

const activePlayer = computed(() => (activeVideo.value ? resolveVideoPlayer(activeVideo.value) : null))

function openPlayer(event: MouseEvent, video: Video) {
  if (!mounted.value || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  if (!resolveVideoPlayer(video)) return
  event.preventDefault()
  lastTrigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  activeVideo.value = video
  document.documentElement.style.overflow = 'hidden'
  nextTick(() => closeBtnRef.value?.focus())
}

function closePlayer() {
  if (!activeVideo.value) return
  activeVideo.value = null
  document.documentElement.style.overflow = ''
  lastTrigger?.focus()
  lastTrigger = null
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && activeVideo.value) closePlayer()
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (activeVideo.value) {
    activeVideo.value = null
    document.documentElement.style.overflow = ''
  }
})
</script>

<template>
  <section
    v-if="all.length"
    class="video-shelf"
    :class="{
      'video-shelf--featured': featured,
      'video-shelf--single': isFeaturedSingle,
      'video-shelf--pair': featured && shown.length === 2,
    }"
  >
    <div v-if="!featured" class="video-shelf__rule"></div>
    <div class="sec-head">
      <h1 v-if="title">{{ title }}</h1>
      <h2 v-else>视频</h2>
      <span class="count">{{ all.length }}</span>
      <a v-if="showMore" class="more" :href="withBase('/视频/')">全部视频 →</a>
    </div>
    <div v-if="isFeaturedSingle" class="video-shelf__featured">
      <article class="video-shelf__lead">
        <div class="video-shelf__thumb">
          <img :src="coverSrc(shown[0].cover)" alt="" loading="lazy" />
          <span class="video-shelf__play" aria-hidden="true"></span>
          <span class="video-shelf__dur">{{ shown[0].duration }}</span>
        </div>
        <div class="video-shelf__lead-body">
          <div class="video-shelf__lead-meta">
            <span class="video-shelf__tag">最新视频</span>
            <span class="video-shelf__date"><time :datetime="shown[0].date">{{ shown[0].date }}</time></span>
            <span class="video-shelf__meta-dur"><span class="sep" aria-hidden="true">/</span> 时长 {{ shown[0].duration }}</span>
          </div>
          <h3>
            <a :href="shown[0].url" target="_blank" rel="noopener noreferrer" @click="openPlayer($event, shown[0])">{{ shown[0].title }}</a>
          </h3>
          <div class="video-shelf__lead-foot">
            <span class="video-shelf__cta" aria-hidden="true">站内播放 →</span>
            <span v-if="shown[0].reportSlug" class="video-shelf__rel">
              关联研报：<a :href="withBase(`/html/${shown[0].reportSlug}/index.html`)">{{ shown[0].reportCompany }}</a>
            </span>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="video-shelf__grid">
      <article v-for="v in shown" :key="v.url + v.title" class="video-shelf__card">
        <a :href="v.url" target="_blank" rel="noopener noreferrer" @click="openPlayer($event, v)">
          <div class="video-shelf__thumb">
            <img :src="coverSrc(v.cover)" alt="" loading="lazy" />
            <span class="video-shelf__play" aria-hidden="true"></span>
            <span class="video-shelf__dur">{{ v.duration }}</span>
          </div>
          <h4>{{ v.title }}</h4>
        </a>
        <p>
          {{ v.date }}<template v-if="v.reportSlug"> · 关联研报：<a :href="withBase(`/html/${v.reportSlug}/index.html`)">{{ v.reportCompany }}</a></template>
        </p>
      </article>
    </div>

    <Teleport v-if="mounted && activeVideo && activePlayer" to="body">
      <div
        class="video-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="activeVideo.title"
        @click.self="closePlayer"
      >
        <div class="video-modal__panel">
          <header class="video-modal__head">
            <div class="video-modal__title-wrap">
              <h3 class="video-modal__title">{{ activeVideo.title }}</h3>
              <p class="video-modal__meta">{{ activeVideo.date }} · 时长 {{ activeVideo.duration }}</p>
            </div>
            <button
              ref="closeBtnRef"
              type="button"
              class="video-modal__close"
              aria-label="关闭播放器"
              @click="closePlayer"
            >×</button>
          </header>
          <div class="video-modal__stage">
            <video
              v-if="activePlayer.kind === 'native'"
              :src="activePlayer.src"
              :poster="coverSrc(activeVideo.cover)"
              controls
              autoplay
              playsinline
            ></video>
            <iframe
              v-else
              :src="activePlayer.src"
              :title="activeVideo.title"
              frameborder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen
              referrerpolicy="no-referrer"
            ></iframe>
          </div>
          <footer class="video-modal__foot">
            <span v-if="activeVideo.reportSlug" class="video-modal__rel">
              关联研报：<a :href="withBase(`/html/${activeVideo.reportSlug}/index.html`)" @click="closePlayer">{{ activeVideo.reportCompany }}</a>
            </span>
            <span v-else-if="activePlayer.provider === 'bilibili'" class="video-modal__hint">
              站内嵌入受 B 站画质限制，想看高清或发弹幕可原站打开
            </span>
            <a
              class="video-modal__ext"
              :href="activeVideo.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ activePlayer.provider === 'bilibili' ? '去 B 站看高清 ↗' : '原站打开 ↗' }}</a>
          </footer>
        </div>
      </div>
    </Teleport>
  </section>
  <div v-else-if="title" class="video-shelf video-shelf--empty">
    <div class="sec-head">
      <h1>{{ title }}</h1>
    </div>
    <p class="facts">暂无视频</p>
  </div>
</template>
