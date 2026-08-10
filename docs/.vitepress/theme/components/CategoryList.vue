<script setup lang="ts">
import { computed } from 'vue'
import {
  formatIssue,
  postsByCategory,
  type Category,
  type PostType,
} from '../../posts'

const props = defineProps<{
  category: Category
  type?: PostType
}>()

const items = computed(() => postsByCategory(props.category, props.type))
const catClass = computed(() =>
  props.category === '投资' ? 'is-invest' : 'is-life',
)
</script>

<template>
  <div class="cat-list" :class="catClass">
    <ul v-if="items.length" class="cat-list__ul">
      <li v-for="item in items" :key="item.link" class="cat-list__item">
        <a class="cat-list__link" :href="item.link">
          <div class="cat-list__meta">
            <span v-if="item.issue" class="cat-list__issue">{{ formatIssue(item.issue) }}</span>
            <time class="cat-list__date" :datetime="item.date">{{ item.date }}</time>
          </div>
          <span class="cat-list__title">{{ item.title }}</span>
          <span v-if="item.description" class="cat-list__desc">{{ item.description }}</span>
        </a>
      </li>
    </ul>
    <p v-else class="cat-list__empty">暂无内容。</p>
  </div>
</template>
