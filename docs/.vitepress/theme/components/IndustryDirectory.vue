<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { mapDirectory, subjectDirectory } from '../../structure-catalog'

const props = defineProps<{
  industry: string
  section: 'maps' | 'subjects'
  headingId: string
}>()

const maps = computed(() => mapDirectory(props.industry))
const subjects = computed(() => subjectDirectory(props.industry))
</script>

<template>
  <section
    v-if="section === 'maps'"
    class="subject-directory"
    :aria-labelledby="headingId"
  >
    <header class="research-section-head">
      <div>
        <p>{{ industry === '医药' ? 'KNOWLEDGE GRAPH / 知识图谱' : 'RESEARCH MAPS / 研究地图' }}</p>
        <h2 :id="headingId">{{ industry === '医药' ? '医药知识图谱' : '研究地图' }}</h2>
      </div>
      <span>{{ maps.countText }}</span>
    </header>

    <a v-if="maps.hub" class="subject-row" :href="withBase(maps.hub.link)">
      <div>
        <span class="subject-row__ticker">{{ maps.hub.ticker }}</span>
        <strong>{{ maps.hub.title }}</strong>
      </div>
      <p>{{ maps.hub.lead }}</p>
      <span class="subject-row__status">{{ maps.hub.status }}</span>
      <span class="subject-row__arrow">→</span>
    </a>
  </section>

  <section
    v-else
    class="subject-directory"
    :aria-labelledby="headingId"
    style="margin-top:2rem;"
  >
    <header class="research-section-head">
      <div><p>SUBJECTS / 标的</p><h2 :id="headingId">跟踪标的</h2></div>
      <span>{{ subjects.countText }}</span>
    </header>

    <a
      v-for="item in subjects.items"
      :key="item.link"
      class="subject-row"
      :href="withBase(item.link)"
    >
      <div>
        <span class="subject-row__ticker">{{ item.ticker }}</span>
        <strong>{{ item.title }}</strong>
      </div>
      <p>{{ item.lead }}</p>
      <span class="subject-row__status">{{ item.status }}</span>
      <span class="subject-row__arrow">→</span>
    </a>

    <div v-if="!subjects.items.length" class="research-note">
      <strong>空状态</strong>
      <span>尚无{{ industry }}行业标的档案。确定跟踪对象后，在此建立学习路径主页。</span>
    </div>
  </section>
</template>
