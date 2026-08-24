<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { useData, withBase } from 'vitepress'

const props = defineProps<{
  href?: string
}>()

const { frontmatter } = useData()
const target = computed(() => {
  const raw = (props.href || String(frontmatter.value.publicHref || '')).trim()
  return raw.replace(/\/+$/, '')
})

onBeforeMount(() => {
  if (!target.value || typeof window === 'undefined') return
  window.location.replace(withBase(target.value))
})
</script>

<template>
  <p v-if="target" class="latest-weekly-redirect">
    正在打开
    <a :href="withBase(target)">完整页</a>…
  </p>
</template>
