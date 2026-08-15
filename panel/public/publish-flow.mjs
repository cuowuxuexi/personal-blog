export function singleFlight(task) {
  let pending = null
  return (...args) => {
    if (pending) return pending
    const result = Promise.resolve(task(...args))
    const current = result.finally(() => {
      if (pending === current) pending = null
    })
    pending = current
    return current
  }
}
