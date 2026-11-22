// Return a cancellation function bound to the same timer host as the callback.
export function scheduleTimeout(callback: () => void, delayMs: number): () => void {
  if (typeof window !== 'undefined') {
    const id = window.setTimeout(callback, delayMs);
    return () => window.clearTimeout(id);
  }
  const timers = { setTimeout, clearTimeout };
  const id = timers.setTimeout(callback, delayMs);
  return () => timers.clearTimeout(id);
}
