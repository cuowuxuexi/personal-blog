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

const props = withDefaults(defineProps<{ limit?: number; title?: string }>(), { limit: 0, title: '' })

const all = (data || []) as Video[]
const shown = computed(() => (props.limit > 0 ? all.slice(0, props.limit) : all))
const showMore = computed(() => !props.title && props.limit > 0 && all.length > props.limit)
const coverSrc = (src: string) => (src.startsWith('/') ? withBase(src) : src)
</script>

<template>
  <section v-if="all.length" class="video-shelf">
    <div class="video-shelf__rule"></div>
    <div class="sec-head">
      <h1 v-if="title">{{ title }}</h1>
      <h2 v-else>视频</h2>
      <span class="count">{{ all.length }}</span>
      <a v-if="showMore" class="more" :href="withBase('/视频/')">全部视频 →</a>
    </div>
    <div class="video-shelf__grid">
      <article v-for="v in shown" :key="v.url + v.title" class="video-shelf__card">
        <a :href="v.url" target="_blank" rel="noopener noreferrer">
          <div class="video-shelf__thumb">
            <img :src="coverSrc(v.cover)" alt="" loading="lazy" />
            <span class="video-shelf__play"></span>
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
