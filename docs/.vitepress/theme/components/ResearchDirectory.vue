<script setup lang="ts">
import { withBase } from 'vitepress'
import { hubRows, hubSummary } from '../../structure-catalog'

const rows = hubRows()
const summary = hubSummary()
</script>

<template>
  <section class="research-directory" aria-labelledby="research-industries">
    <header class="research-section-head">
      <div><p>INDUSTRIES / 行业</p><h2 id="research-industries">行业目录</h2></div>
      <span>{{ summary.text }}</span>
    </header>

    <a
      v-for="row in rows"
      :key="row.link"
      class="industry-row"
      :href="withBase(row.link)"
    >
      <div class="industry-row__index">{{ row.index }}</div>
      <div class="industry-row__main">
        <strong>{{ row.title }}</strong>
        <span>{{ row.description }}</span>
      </div>
      <div class="industry-row__subjects">{{ row.subjects }}</div>
      <span class="industry-row__arrow">→</span>
    </a>
  </section>
</template>
