/** Completion-based polling: slow requests never overlap; cleanup prevents rescheduling. */
export function startPolling(task: () => Promise<void>, delay = 15_000): () => void {
  let stopped = false
  let timer: number | undefined
  async function run() {
    try {
      await task()
    } catch {
      // A temporary network error must not stop subsequent refreshes.
    } finally {
      if (!stopped) timer = window.setTimeout(() => void run(), delay)
    }
  }
  void run()
  return () => {
    stopped = true
    window.clearTimeout(timer)
  }
}
