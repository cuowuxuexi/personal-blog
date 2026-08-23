/**
 * Hermes 日记：纯解析（可被客户端 posts 引用，无 node:fs）。
 * 实现在 hermes-diary-core.mjs，供 posts.ts / hermes-diary-fs / verifier 共用。
 */

import {
  hermesPostsFromGlob as hermesPostsFromGlobCore,
  hermesSidebarItems as hermesSidebarItemsCore,
  parseFrontmatter as parseFrontmatterCore,
  postFromDayFile as postFromDayFileCore,
  sortHermes as sortHermesCore,
} from './hermes-diary-core.mjs'

/** 与 posts.PostItem 中 hermes 条目字段对齐 */
export interface HermesDiaryPost {
  title: string
  date: string
  category: 'AI与生活'
  type: 'hermes'
  link: string
  description?: string
}

export function parseFrontmatter(raw: string): Record<string, string> {
  return parseFrontmatterCore(raw)
}

export function postFromDayFile(
  stem: string,
  raw: string,
): HermesDiaryPost | null {
  return postFromDayFileCore(stem, raw)
}

/** Vite import.meta.glob 结果 → 日记条目 */
export function hermesPostsFromGlob(
  modules: Record<string, string>,
): HermesDiaryPost[] {
  return hermesPostsFromGlobCore(modules)
}

export function sortHermes(items: HermesDiaryPost[]): HermesDiaryPost[] {
  return sortHermesCore(items)
}

export function hermesSidebarItems(
  diaryPosts: HermesDiaryPost[],
): { text: string; link: string }[] {
  return hermesSidebarItemsCore(diaryPosts)
}
