<script setup lang="ts">
/**
 * 首页 Hero 唯一 CTA：直达最新一篇（与板块导航解耦）。
 * 不用 VPButton：默认胶囊/实心品牌色与首页墨纸气质冲突。
 */
import { recentPosts } from '../../posts'

const latest = recentPosts(1)[0]
</script>

<template>
  <div v-if="latest" class="home-hero-cta">
    <a class="home-hero-cta__link" :href="latest.link">
      <span class="home-hero-cta__kicker">LATEST</span>
      <span class="home-hero-cta__text">读最新一篇</span>
      <span class="home-hero-cta__arrow" aria-hidden="true">→</span>
    </a>
  </div>
</template>