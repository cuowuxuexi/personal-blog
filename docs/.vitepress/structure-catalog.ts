/**
 * 投研 / 哲学 / 大问题树：Vite raw glob → 共享投影。
 */
import {
  industryMapDirectory,
  industrySubjectDirectory,
  researchHubRows,
  researchHubSummary,
  topicCards,
  trackedSubjects,
} from '../../content-catalog/index.mjs'
import { siteStructureFromGlob } from './structure-catalog-adapter.mjs'

const researchModules = import.meta.glob<string>('../投资/投研/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const philosophyModules = import.meta.glob<string>('../投资哲学/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const bigQuestionModules = import.meta.glob<string>('../大问题/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export const structureNodes = siteStructureFromGlob({
  research: researchModules,
  philosophy: philosophyModules,
  'big-question': bigQuestionModules,
})

export function hubRows() {
  return researchHubRows(structureNodes)
}

export function hubSummary() {
  return researchHubSummary(structureNodes)
}

export function philosophyCards() {
  return topicCards(structureNodes, 'philosophy')
}

export function bigQuestionCards() {
  return topicCards(structureNodes, 'big-question')
}

export function mapDirectory(industry: string) {
  return industryMapDirectory(structureNodes, industry)
}

export function subjectDirectory(industry: string) {
  return industrySubjectDirectory(structureNodes, industry)
}

export function trackedSubjectRows() {
  return trackedSubjects(structureNodes)
}
