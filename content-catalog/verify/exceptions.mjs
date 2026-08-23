/**
 * 单一已知例外表。历史兼容只能写在这里并带理由；测试不得散落 skip。
 * 匹配的失败降为 warning，不阻断 live 对等。
 */
export const CONTENT_PARITY_EXCEPTIONS = Object.freeze([
])

export function exceptionFor(failure) {
  return CONTENT_PARITY_EXCEPTIONS.find((row) => {
    if (row.code && row.code !== failure.code) return false
    if (row.kindId && row.kindId !== failure.kindId) return false
    if (row.link && row.link !== failure.link) return false
    if (row.file && row.file !== failure.file) return false
    return true
  }) || null
}
