<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { formatDateZh, formatIssue, type Category } from '../../posts'

const { frontmatter, page } = useData()

const date = computed(() => (frontmatter.value.date as string | undefined) || '')
const category = computed(
  () => (frontmatter.value.category as Category | undefined) || '',
)
const issue = computed(() => Number(frontmatter.value.issue || 0))
const type = computed(() => (frontmatter.value.type as string | undefined) || '')
const description = computed(
  () => (frontmatter.value.description as string | undefined) || '',
)
const cover = computed(
  () => (frontmatter.value.cover as string | undefined) || '',
)

/** 仅文章页展示（有 date 或 category，且非首页/纯导航页） */
const show = computed(() => {
  if (page.value.isNotFound) return false
  // 周记标题已包含期数，左栏承担日期索引；保持参考周刊的简洁文章开头。
  if (type.value === 'weekly') return false
  return Boolean(date.value || category.value)
})

const categoryClass = computed(() => {
  if (category.value === '投资') return 'is-invest'
  if (category.value === 'AI与生活') return 'is-life'
  return ''
})
</script>

<template>
  <div v-if="show" class="post-meta-wrap">
    <div v-if="cover" class="post-cover">
      <img :src="cover" :alt="(frontmatter.title as string) || ''" />
    </div>

    <div class="post-meta">
      <time v-if="date" class="post-meta__date" :datetime="date">
        {{ formatDateZh(date) }}
      </time>
      <span v-if="issue" class="post-meta__issue">{{ formatIssue(issue) }}</span>
      <span
        v-if="category"
        class="post-meta__cat"
        :class="categoryClass"
      >
        {{ category }}<template v-if="type === 'weekly'">周记</template>
      </span>
    </div>

    <p v-if="description" class="post-meta__desc">
      {{ description }}
    </p>
  </div>
</template>
