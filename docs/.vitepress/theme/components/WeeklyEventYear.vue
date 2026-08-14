<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <details class="weekly-events__year">
    <summary class="weekly-events__year-summary">{{ title }}</summary>
    <div class="weekly-events__year-body">
      <slot />
    </div>
  </details>
</template>
