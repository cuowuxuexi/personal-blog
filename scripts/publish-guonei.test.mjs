import assert from 'node:assert/strict'
import test from 'node:test'
import { uncommittedSitePaths } from './publish-guonei.mjs'

test('publish:guonei 只把没提交的站点文件列出来提示，不再拦截', () => {
  assert.deepEqual(uncommittedSitePaths([
    ' M docs/投资/投研/医药/恒瑞医药/index.md',
    '?? .planning/投研标的上线/方案.md',
    ' M research-sources.local.yaml',
  ].join('\n')), [
    'docs/投资/投研/医药/恒瑞医药/index.md',
  ])
  assert.deepEqual(uncommittedSitePaths('?? package.json\n'), ['package.json'])
  assert.deepEqual(uncommittedSitePaths('R  docs/a.md -> docs/b.md\n'), ['docs/b.md'])
  assert.deepEqual(uncommittedSitePaths(''), [])
})
