<script setup lang="ts">
import { withBase } from 'vitepress'
import { data } from '../../research-reports.data.mjs'
import { bigQuestionCards, trackedSubjectRows } from '../../structure-catalog'
import { postsByCategory } from '../../posts'

interface Row {
  sub?: boolean
  title: string
  href: string
  date?: string
  code?: string
  industry?: string
  lead?: string
  reportHref?: string
}
interface Section {
  name: string
  rows: Row[]
  more?: { text: string; href: string }
}

const reports = (data.reports || []) as Array<{ slug: string; code: string }>
const slugByCode = new Map(reports.map((r) => [r.code.trim(), r.slug]))
const reportSlugFor = (ticker?: string) =>
  (ticker || '')
    .split('/')
    .map((t) => t.trim())
    .map((t) => slugByCode.get(t))
    .find(Boolean) || ''

const weekly = (category: '投资' | 'AI与生活'): Row[] =>
  postsByCategory(category, 'weekly')
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((p) => ({ title: p.title, href: p.link, date: p.date }))

const aiWeekly = weekly('AI与生活')

const sections: Section[] = [
  {
    name: '旧版投研',
    rows: trackedSubjectRows().map((r) => {
      const slug = reportSlugFor(r.ticker)
      return {
        title: r.title,
        href: r.link,
        code: r.ticker,
        industry: r.industry,
        reportHref: slug ? `/html/${slug}/index.html` : '',
      }
    }),
    more: { text: '旧版目录 →', href: '/投资/投研/' },
  },
  {
    name: 'AI下的生活',
    rows: [
      { title: 'AI与生活', href: '/AI与生活/' },
      { title: '我的AI历程', href: '/AI与生活/我的AI历程/' },
      { title: '大事件 · 2026', href: '/AI与生活/大事件/2026' },
      { title: 'Hermes日记', href: '/AI与生活/Hermes日记/' },
      ...(aiWeekly.length ? [{ sub: true, title: 'AI与生活周记', href: '' }, ...aiWeekly] : []),
    ],
  },
  { name: '投资周记', rows: weekly('投资') },
  {
    name: '大问题',
    rows: bigQuestionCards().map((c) => ({ title: c.title, href: c.link, lead: c.hubLead })),
    more: { text: '大问题总览 →', href: '/大问题/' },
  },
  { name: '检索', rows: [{ title: '知识检索', href: '/html/knowledge-search' }] },
]
</script>

<template>
  <div class="archive-index-root">
    <h1 class="archive-index__title">归档</h1>
    <section v-for="s in sections" :key="s.name" class="archive-index__section">
      <h2 class="archive-index__heading">{{ s.name }}</h2>
      <template v-for="r in s.rows" :key="r.sub ? `sub:${r.title}` : r.href">
        <h3 v-if="r.sub" class="archive-index__sub">{{ r.title }}</h3>
        <div v-else class="archive-index__row" data-row="archive" :data-section="s.name">
          <span v-if="r.date" class="archive-index__date">{{ r.date }}</span>
          <a class="archive-index__link" :href="withBase(r.href)">{{ r.title }}</a>
          <span v-if="r.code" class="archive-index__code">{{ r.code }}</span>
          <span v-if="r.industry" class="archive-index__meta">{{ r.industry }}</span>
          <span v-if="r.lead" class="archive-index__lead">{{ r.lead }}</span>
          <a v-if="r.reportHref" class="archive-index__has-report" :href="withBase(r.reportHref)">已有研报 →</a>
        </div>
      </template>
      <a
        v-if="s.more"
        class="archive-index__more"
        data-row="archive"
        :data-section="s.name"
        :href="withBase(s.more.href)"
      >{{ s.more.text }}</a>
    </section>
  </div>
</template>
