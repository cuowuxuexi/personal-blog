<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from '../../research-reports.data.mjs'

interface ReportPage {
  text: string
  href: string
}
interface Report {
  slug: string
  company: string
  code: string
  industry: string
  stance: string
  tone: string
  priceDate: string
  updatedAt: string
  updatedDate: string
  finalPrice: string
  marketCap: string
  thesis: string
  pages: ReportPage[]
}
interface Item {
  kind: string
  priceDate: string
  updatedAt: string
  updatedDate: string
  finalPrice: string
  marketCap: string
  title: string
  slug: string
  code: string
  industry: string
  stance: string
  tone: string
  thesis: string
  pages: ReportPage[]
}

withDefaults(defineProps<{ title?: string }>(), { title: '' })

const reports = (data.reports || []) as Report[]

// 顺序由 research-reports.mjs 的 sortReports 在构建期定好（更新时间降序）；并入别的来源时按同一口径排序
const items: Item[] = reports
  .map((r) => ({
    kind: '研报',
    priceDate: r.priceDate,
    updatedAt: r.updatedAt,
    updatedDate: r.updatedDate,
    finalPrice: r.finalPrice,
    marketCap: r.marketCap,
    title: r.company,
    slug: r.slug,
    code: r.code,
    industry: r.industry,
    stance: r.stance,
    tone: r.tone,
    thesis: r.thesis,
    pages: r.pages,
  }))

const industries = (() => {
  const count = new Map<string, number>()
  items.forEach((i) => count.set(i.industry, (count.get(i.industry) || 0) + 1))
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .map(([name, total]) => ({ name, total }))
})()

const mounted = ref(false)
const selected = ref('')

const shown = computed(() => (selected.value ? items.filter((i) => i.industry === selected.value) : items))

function pick(industry: string) {
  selected.value = industry
  const url = new URL(window.location.href)
  if (industry) url.searchParams.set('industry', industry)
  else url.searchParams.delete('industry')
  window.history.replaceState(window.history.state, '', url.toString())
}

// 行业标签是普通链接（无 JS 时打开 ?industry= 仍是完整列表）；挂载后拦截点击，等同点筛选条
function onTag(event: MouseEvent, industry: string) {
  if (!mounted.value || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  pick(industry)
}

onMounted(() => {
  const wanted = new URLSearchParams(window.location.search).get('industry') || ''
  if (wanted && industries.some((i) => i.name === wanted)) selected.value = wanted
  mounted.value = true
})

const reportHref = (slug: string, file: string) => withBase(`/html/${slug}/${file}`)
const tagHref = (industry: string) => `?industry=${encodeURIComponent(industry)}`
const pad2 = (n: number) => String(n).padStart(2, '0')
// 底栏列数（宽屏）：≤7 页一行排满；更多页时按尽量均匀的行数换行（8→4、9→5、12→6）
const tocCols = (n: number) => (n <= 7 ? n : Math.ceil(n / Math.ceil(n / 6)))
</script>

<template>
  <div class="research-desk-root">
    <div class="sec-head">
      <h1 v-if="title">{{ title }}</h1>
      <h2 v-else>研报</h2>
      <span class="count">{{ items.length }}</span>
      <div v-if="mounted" class="filters" role="group" aria-label="按行业筛选">
        <span class="label">按行业</span>
        <button
          type="button"
          data-filter=""
          :class="{ 'is-active': selected === '' }"
          :aria-pressed="selected === ''"
          @click="pick('')"
        >全部<sup>{{ items.length }}</sup></button>
        <button
          v-for="item in industries"
          :key="item.name"
          type="button"
          :data-filter="item.name"
          :class="{ 'is-active': selected === item.name }"
          :aria-pressed="selected === item.name"
          @click="pick(item.name)"
        >{{ item.name }}<sup>{{ item.total }}</sup></button>
      </div>
    </div>

    <div class="research-desk__list">
      <article
        v-for="r in shown"
        :key="r.slug"
        class="research-desk__entry"
        :class="`is-${r.tone}`"
        data-row="report"
        :data-kind="r.kind"
        :data-industry="r.industry"
      >
        <header class="research-desk__head">
          <div class="research-desk__meta">
            <a class="ind" :href="tagHref(r.industry)" @click="onTag($event, r.industry)">{{ r.industry }}</a>
            <span v-if="r.updatedAt" class="date"><span class="sep" aria-hidden="true">/</span> 更新 <time :datetime="r.updatedAt">{{ r.updatedDate }}</time></span>
            <span class="date"><span class="sep" aria-hidden="true">/</span> 收盘价 <time :datetime="r.priceDate">{{ r.priceDate }}</time></span>
          </div>
          <span class="stance" :class="`stance--${r.tone}`"><i class="dot" aria-hidden="true"></i>{{ r.stance }}</span>
        </header>
        <div class="research-desk__body">
          <div class="research-desk__main">
            <div class="research-desk__title">
              <h3><a :href="reportHref(r.slug, 'index.html')">{{ r.title }}</a></h3>
              <span class="code">{{ r.code }}</span>
            </div>
            <p class="judge">{{ r.thesis }}</p>
          </div>
          <dl class="research-desk__metrics">
            <div class="metric"><dt>终审价</dt><dd>{{ r.finalPrice }}<small>元</small></dd></div>
            <div class="metric"><dt>总市值</dt><dd>{{ r.marketCap }}<small>亿元</small></dd></div>
          </dl>
        </div>
        <nav class="research-desk__toc" aria-label="各页直达" :style="{ '--toc-cols': tocCols(r.pages.length) }">
          <a v-for="(p, n) in r.pages" :key="p.href" :href="reportHref(r.slug, p.href)"><span>{{ pad2(n + 1) }}</span>{{ p.text }}</a>
        </nav>
      </article>
      <p v-if="!items.length" class="research-desk__empty">暂无</p>
      <p v-else-if="!shown.length" class="research-desk__empty">该行业暂无</p>
    </div>
  </div>
</template>
