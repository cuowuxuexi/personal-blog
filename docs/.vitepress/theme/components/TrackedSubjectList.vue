<script setup lang="ts">
import { withBase } from 'vitepress'
import { trackedSubjectRows } from '../../structure-catalog'

const rows = trackedSubjectRows()
</script>

<template>
  <a
    v-for="row in rows"
    :key="row.link"
    class="tracked-subject"
    :href="withBase(row.link)"
  >
    <span>{{ row.industry }}</span>
    <strong>{{ row.title }}</strong>
    <small>{{ row.ticker }}</small>
    <em>建立档案 →</em>
  </a>
</template>
