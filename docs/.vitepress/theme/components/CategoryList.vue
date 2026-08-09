<script setup lang="ts">
import { computed } from 'vue'
import {
  postsByCategory,
  type Category,
} from '../../posts'

const props = defineProps<{
  category: Category
}>()

const items = computed(() => postsByCategory(props.category))

const catClass = computed(() =>
  props.category === '投资' ? 'is-invest' : 'is-life',
)
</script>

<template>
  <div class="cat-list" :class="catClass">
    <ul v-if="items.length" class="cat-list__ul">
      <li v-for="item in items" :key="item.link" class="cat-list__item">
        <a class="cat-list__link" :href="item.link">
          <time class="cat-list__date" :datetime="item.date">
            {{ item.date }}
          </time>
          <span class="cat-list__title">{{ item.title }}</span>
          <span v-if="item.description" class="cat-list__desc">
            {{ item.description }}
          </span>
        </a>
      </li>
    </ul>
    <p v-else class="cat-list__empty">本板块暂无文章。</p>
  </div>
</template>
