---
status: accepted
date: 2026-08-22
---

# Content authority and build-time projections

Public content identity and prose are owned by Markdown/frontmatter; navigation groups, curated order, hub relationships, lifecycle, and visibility are owned by a typed information-architecture declaration. A shared `ContentKind` module exposes those facts through adapters, while `posts`, sidebars, latest-issue queries, structural lists, and counts are derived during development/build instead of being independently maintained.

This replaces the current long-term model of manually synchronizing Markdown, `posts.ts`, `config.mts`, hub markup, and publishing-panel string edits. Migration is incremental and behavior-preserving: parity tests come first, public URLs remain stable, and the publishing panel stops writing index source files only after the derived catalog is proven equivalent.
