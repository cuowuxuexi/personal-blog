<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { bigQuestionCards, philosophyCards } from '../../structure-catalog'

const props = defineProps<{
  kind: 'philosophy' | 'big-question'
  navGroup?: string
  variant?: 'cards' | 'list'
}>()

const cards = computed(() => (
  props.kind === 'philosophy'
    ? philosophyCards(props.navGroup)
    : bigQuestionCards(props.navGroup)
))
const isList = computed(() => props.variant === 'list')
const wrapClass = computed(() => {
  if (isList.value) return 'reading-list'
  return props.kind === 'philosophy' ? 'invest-paths philosophy-paths' : 'invest-paths'
})
const label = computed(() => (
  props.navGroup || (props.kind === 'philosophy' ? '哲学主题入口' : '开放问题入口')
))
</script>

<template>
  <section :class="wrapClass" :aria-label="label">
    <a
      v-for="card in cards"
      :key="card.link"
      :class="isList ? 'reading-list__item' : 'invest-path'"
      :href="withBase(card.link)"
    >
      <span :class="isList ? 'reading-list__index' : 'invest-path__index'">{{ card.hubIndex }}</span>
      <div v-if="isList" class="reading-list__body">
        <h2>{{ card.sidebarText }}</h2>
        <p v-if="card.sidebarText !== card.title" class="reading-list__full-title">{{ card.title }}</p>
        <p v-if="card.hubLead">{{ card.hubLead }}</p>
      </div>
      <template v-else>
        <h2>{{ card.title }}</h2>
        <p>{{ card.hubLead }}</p>
        <strong>阅读本页 →</strong>
      </template>
    </a>
  </section>
</template>
