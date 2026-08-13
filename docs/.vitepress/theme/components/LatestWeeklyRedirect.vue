<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { useRouter } from 'vitepress'
import { formatIssue, postsByCategory, type Category } from '../../posts'

const props = defineProps<{
  category: Category
}>()

const router = useRouter()
const latest = computed(() => postsByCategory(props.category, 'weekly')[0] ?? null)

onBeforeMount(() => {
  if (latest.value?.link) router.go(latest.value.link)
})
</script>

<template>
  <p v-if="latest" class="latest-weekly-redirect">
    正在打开
    <a :href="latest.link">{{ formatIssue(latest.issue) || latest.title }}</a>…
  </p>
  <p v-else class="latest-weekly-redirect">暂无周记。</p>
</template>
