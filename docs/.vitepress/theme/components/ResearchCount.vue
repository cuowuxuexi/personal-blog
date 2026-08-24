<script setup lang="ts">
import { computed } from 'vue'
import { mapDirectory, subjectDirectory } from '../../structure-catalog'

const props = defineProps<{
  industry: string
  of: 'maps' | 'subjects'
}>()

const text = computed(() => (
  props.of === 'maps'
    ? mapDirectory(props.industry).countText
    : subjectDirectory(props.industry).countText
))
</script>

<template>
  <span>{{ text }}</span>
</template>
