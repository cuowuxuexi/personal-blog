<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{
  src: string
  title?: string
  openLabel?: string
}>()

const href = computed(() => withBase(props.src))
const label = computed(() => props.openLabel?.trim() || '单独打开完整页')
</script>

<template>
  <p class="standalone-html__open">
    <a :href="href" target="_blank" rel="noopener">{{ label }}</a>
  </p>
  <iframe
    class="journey-html-embed standalone-html__frame"
    :src="href"
    :title="title || label"
    loading="lazy"
  />
</template>
