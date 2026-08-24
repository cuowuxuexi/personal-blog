<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { bigQuestionCards, philosophyCards } from '../../structure-catalog'

const props = defineProps<{
  kind: 'philosophy' | 'big-question'
}>()

const cards = computed(() => (
  props.kind === 'philosophy' ? philosophyCards() : bigQuestionCards()
))
const wrapClass = computed(() => (
  props.kind === 'philosophy' ? 'invest-paths philosophy-paths' : 'invest-paths'
))
</script>

<template>
  <section :class="wrapClass" :aria-label="kind === 'philosophy' ? '哲学主题入口' : '开放问题入口'">
    <a
      v-for="card in cards"
      :key="card.link"
      class="invest-path"
      :href="withBase(card.link)"
    >
      <span class="invest-path__index">{{ card.hubIndex }}</span>
      <h2>{{ card.title }}</h2>
      <p>{{ card.hubLead }}</p>
      <strong>阅读本页 →</strong>
    </a>
  </section>
</template>
