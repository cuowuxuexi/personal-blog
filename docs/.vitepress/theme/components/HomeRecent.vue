<script setup lang="ts">
import { recentPosts, formatDateZh } from '../../posts'

const items = recentPosts(8)

function catClass(category: string) {
  if (category === '投资') return 'is-invest'
  if (category === 'AI与生活') return 'is-life'
  return ''
}
</script>

<template>
  <section class="home-recent" aria-labelledby="home-recent-title">
    <div class="home-recent__inner">
      <header class="home-recent__head">
        <h2 id="home-recent-title">最近更新</h2>
        <p class="home-recent__sub">按日期倒序 · 跨板块</p>
      </header>

      <ul v-if="items.length" class="home-recent__list">
        <li v-for="item in items" :key="item.link" class="home-recent__item">
          <a class="home-recent__link" :href="item.link">
            <div class="home-recent__row">
              <time class="home-recent__date" :datetime="item.date">
                {{ formatDateZh(item.date) }}
              </time>
              <span
                class="home-recent__cat"
                :class="catClass(item.category)"
              >
                {{ item.category }}
              </span>
            </div>
            <div class="home-recent__title">{{ item.title }}</div>
            <p v-if="item.description" class="home-recent__desc">
              {{ item.description }}
            </p>
          </a>
        </li>
      </ul>

      <p v-else class="home-recent__empty">暂无文章，写第一篇即可出现在这里。</p>

      <div class="home-recent__actions">
        <a class="home-recent__cta" href="/投资/">投资板块</a>
        <a class="home-recent__cta home-recent__cta--alt" href="/AI与生活/">
          AI与生活
        </a>
      </div>
    </div>
  </section>
</template>
