<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()
const isHome = computed(() => frontmatter.value.layout === 'home')
</script>

<template>
  <p v-if="!isHome" class="site-beian">
    <a
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >闽ICP备2026032381号-1</a>
    <a
      class="beian-mps"
      href="https://beian.mps.gov.cn/#/query/webSearch?code=35018302000421"
      target="_blank"
      rel="noopener noreferrer"
    ><img class="beian-mps__icon" src="/images/beian-mps.png" width="14" height="16" alt="" />闽公网安备35018302000421号</a>
  </p>
</template>
