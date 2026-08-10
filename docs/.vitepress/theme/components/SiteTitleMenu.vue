<script setup lang="ts">
import { useRouter } from 'vitepress'

const router = useRouter()

function goHome(e: Event) {
  e.preventDefault()
  router.go('/')
}
</script>

<template>
  <button
    type="button"
    class="site-title-home"
    title="回到首页"
    @click="goHome"
  >
    误君在脑海里放烟花
  </button>
</template>