import assert from 'node:assert/strict'
import test from 'node:test'
import { assertPublishReady, publishBlockingPaths } from './publish-guonei.mjs'

test('publish:guonei blocks dirty docs/panel/catalog, allows planning notes', () => {
  assert.deepEqual(publishBlockingPaths([
    ' M docs/投资/投研/医药/恒瑞医药/index.md',
    '?? .planning/投研标的上线/方案.md',
    ' M research-sources.local.yaml',
  ].join('\n')), [
    'docs/投资/投研/医药/恒瑞医药/index.md',
  ])
  assert.deepEqual(publishBlockingPaths('?? package.json\n'), ['package.json'])
  assert.doesNotThrow(() => assertPublishReady('?? .planning/投研标的上线/方案.md\n'))
  assert.throws(
    () => assertPublishReady(' M docs/投资/周记/2026-08-24.md\n'),
    /未提交的站点改动/,
  )
})
