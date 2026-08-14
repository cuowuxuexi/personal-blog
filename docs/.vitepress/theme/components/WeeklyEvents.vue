<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
  }>(),
  { title: '大事件记录区' },
)
</script>

<template>
  <details class="weekly-events">
    <summary class="weekly-events__summary">{{ title }}</summary>
    <div class="weekly-events__panel">
      <slot />
    </div>
  </details>
</template>
