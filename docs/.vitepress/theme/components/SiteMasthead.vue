<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../research-reports.data.mjs'
import { data as videos } from '../../videos.data.mjs'

const reportDates = ((data.reports || []) as { updatedDate: string }[]).map((r) => r.updatedDate)
const videoList = (videos || []) as { date: string }[]
const count = reportDates.length
const videoCount = videoList.length
const latest = [...reportDates, ...videoList.map((v) => v.date)].reduce((max, d) => (d > max ? d : max), '')
</script>

<template>
  <header class="site-masthead">
    <section class="hero">
      <div class="hero-text">
        <p class="kicker">看，烟花！</p>
        <h1><span class="line">逻辑自洽不等于现实，</span><span class="line">市场只为<em>事实</em>买单。</span></h1>
        <p class="sub"><span>承认有限与可错，</span><span>以事实为起点，</span><span>把好公司、好价格与好投资分开算账。</span></p>
        <p class="stats">
          研报 <b>{{ count }}</b> 篇<template v-if="videoCount">　·　视频 <b>{{ videoCount }}</b> 期</template><template v-if="latest">　·　最近 <b>{{ latest }}</b></template>
        </p>
      </div>
      <div class="hero-art">
        <div class="art-stage">
          <img class="art-img" :src="withBase('/images/hero-fireworks.png')" alt="机械手指向烟花" />
        </div>
      </div>
    </section>
  </header>
</template>
