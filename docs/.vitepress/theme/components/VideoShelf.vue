<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../videos.data.mjs'

interface Video {
  title: string
  date: string
  duration: string
  cover: string
  url: string
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
            <a :href="shown[0].url" target="_blank" rel="noopener noreferrer">{{ shown[0].title }}</a>
          </h3>
          <div class="video-shelf__lead-foot">
            <span class="video-shelf__cta" aria-hidden="true">观看视频 →</span>
            <span v-if="shown[0].reportSlug" class="video-shelf__rel">
              关联研报：<a :href="withBase(`/html/${shown[0].reportSlug}/index.html`)">{{ shown[0].reportCompany }}</a>
            </span>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="video-shelf__grid">
      <article v-for="v in shown" :key="v.url + v.title" class="video-shelf__card">
        <a :href="v.url" target="_blank" rel="noopener noreferrer">
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
  </section>
  <div v-else-if="title" class="video-shelf video-shelf--empty">
    <div class="sec-head">
      <h1>{{ title }}</h1>
    </div>
    <p class="facts">暂无视频</p>
  </div>
</template>
