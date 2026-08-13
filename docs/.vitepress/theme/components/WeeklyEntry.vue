<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  /** 单标签（兼容旧写法） */
  tag?: string
  /** 多标签：数组，或用 `/`、`,`、`，` 分隔的字符串 */
  tags?: string | string[]
  title: string
  image?: string
  imageAlt?: string
  /**
   * 外链：无副标题时挂在主标题上；有副标题时挂在副标题上。
   * 样式追加橙色 ↗
   */
  linkHref?: string
  /** 主标题下的副标题文案（可与 linkHref 组成「副标题 + 链接」） */
  subtitle?: string
  /** 标题下展示图（不带链接，仅装饰/说明） */
  badgeImage?: string
  badgeAlt?: string
}>()

const tagList = computed(() => {
  if (Array.isArray(props.tags)) {
    return props.tags.map((t) => String(t).trim()).filter(Boolean)
  }
  if (typeof props.tags === 'string' && props.tags.trim()) {
    return props.tags
      .split(/[/|,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
  }
  if (props.tag?.trim()) return [props.tag.trim()]
  return []
})

const PREVIEW_HEIGHT = 28 * 6

const expanded = ref(false)
const overflow = ref(false)
const collapsedHeight = ref(PREVIEW_HEIGHT)
const bodyRef = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null

function getCollapsedHeight(el: HTMLElement) {
  const bodyTop = el.getBoundingClientRect().top

  for (const child of Array.from(el.children) as HTMLElement[]) {
    const rect = child.getBoundingClientRect()
    const top = rect.top - bodyTop
    const bottom = rect.bottom - bodyTop
    const isVisualBlock = child.matches('figure, pre, table')
      || child.querySelector('img, video, iframe, pre, table') !== null

    if (isVisualBlock && top < PREVIEW_HEIGHT && bottom > PREVIEW_HEIGHT) {
      return Math.max(0, top)
    }
  }
  return PREVIEW_HEIGHT
}

async function measure() {
  await nextTick()
  const el = bodyRef.value
  if (!el) {
    overflow.value = false
    return
  }
  if (expanded.value) {
    // 收起态才能量是否超行；展开时保留 overflow，以便显示「收起」
    return
  }

  const nextHeight = getCollapsedHeight(el)
  if (collapsedHeight.value !== nextHeight) {
    collapsedHeight.value = nextHeight
    await nextTick()
  }
  overflow.value = el.scrollHeight > el.clientHeight + 1
}

function handleBodyLoad(event: Event) {
  if (event.target instanceof HTMLImageElement) void measure()
}

onMounted(() => {
  void measure()
  if (typeof ResizeObserver !== 'undefined' && bodyRef.value) {
    ro = new ResizeObserver(() => {
      void measure()
    })
    ro.observe(bodyRef.value)
  }
  bodyRef.value?.addEventListener('load', handleBodyLoad, true)
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  bodyRef.value?.removeEventListener('load', handleBodyLoad, true)
  window.removeEventListener('resize', measure)
})

watch(
  () => [props.image, props.title, props.subtitle, props.tag, props.tags, props.linkHref],
  () => {
    expanded.value = false
    void measure()
  },
)

function toggle() {
  expanded.value = !expanded.value
  if (!expanded.value) void measure()
}
</script>

<template>
  <article class="weekly-entry">
    <header class="weekly-entry__head">
      <h3 class="weekly-entry__title">
        <a
          v-if="linkHref"
          class="weekly-entry__title-link"
          :href="linkHref"
          target="_blank"
          rel="noopener noreferrer"
        >{{ title }}</a>
        <template v-else>{{ title }}</template>
      </h3>
      <div v-if="tagList.length" class="weekly-entry__tags">
        <span
          v-for="item in tagList"
          :key="item"
          class="weekly-entry__tag"
        >{{ item }}</span>
      </div>
    </header>

    <p v-if="subtitle" class="weekly-entry__subtitle">
      <a
        v-if="linkHref"
        class="weekly-entry__subtitle-link"
        :href="linkHref"
        target="_blank"
        rel="noopener noreferrer"
      >{{ subtitle }}</a>
      <template v-else>{{ subtitle }}</template>
    </p>

    <p v-if="badgeImage" class="weekly-entry__badge">
      <img
        class="weekly-entry__badge-image"
        :src="badgeImage"
        :alt="badgeAlt || ''"
        loading="lazy"
      />
    </p>

    <div v-if="image" class="weekly-entry__media">
      <img
        class="weekly-entry__image"
        :src="image"
        :alt="imageAlt || title"
        loading="lazy"
      />
    </div>

    <div
      ref="bodyRef"
      class="weekly-entry__body"
      :class="{ 'is-clamped': !expanded }"
      :style="!expanded ? { '--weekly-preview-height': `${collapsedHeight}px` } : undefined"
    >
      <slot />
    </div>

    <button
      v-if="overflow || expanded"
      type="button"
      class="weekly-entry__toggle"
      :aria-expanded="expanded ? 'true' : 'false'"
      @click="toggle"
    >
      {{ expanded ? '收起' : '展开' }}
    </button>
  </article>
</template>
