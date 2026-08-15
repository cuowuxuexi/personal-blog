export function createVitepressSupervisor({
  checkHealth,
  startProcess,
  intervalMs = 5000,
  startupTimeoutMs = 30000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  onError = () => {},
}) {
  let child = null
  let generation = 0
  let pending = null
  let timer = null
  let stopped = false

  function childAlive() {
    return Boolean(child && child.exitCode == null && !child.killed)
  }

  function track(next) {
    const token = ++generation
    child = next
    const clear = () => {
      if (token === generation) child = null
    }
    next.once?.('exit', clear)
    next.once?.('close', clear)
    next.once?.('error', (error) => {
      clear()
      onError(error)
    })
  }

  function ensureRunning() {
    if (stopped) return Promise.resolve(false)
    if (pending) return pending
    pending = (async () => {
      if (await checkHealth()) return true
      if (!childAlive()) track(startProcess())
      const deadline = Date.now() + startupTimeoutMs
      do {
        if (await checkHealth()) return true
        if (Date.now() >= deadline) return false
        await sleep(Math.min(500, Math.max(0, deadline - Date.now())))
      } while (!stopped)
      return false
    })().finally(() => {
      pending = null
    })
    return pending
  }

  return {
    ensureRunning,
    startMonitoring() {
      if (timer || stopped) return
      timer = setIntervalFn(() => ensureRunning().catch(onError), intervalMs)
    },
    hasOwnedProcess() {
      return childAlive()
    },
    stop() {
      stopped = true
      if (timer) clearIntervalFn(timer)
      timer = null
      generation += 1
      if (childAlive()) child.kill()
      child = null
    },
  }
}
