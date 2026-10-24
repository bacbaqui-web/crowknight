// Use unmodified requestAnimationFrame timestamps, never the simulation's clamped dt.
export function createFramePerformance(windowMs = 1000) {
  let previous = null;
  const samples = [];
  return {
    reset() {
      previous = null;
      samples.length = 0;
    },
    record(now, workMs, rendered = true) {
      if (!Number.isFinite(now)) return;
      const delta = previous == null ? 0 : now - previous;
      previous = now;
      if (!(delta > 0)) return;
      samples.push({ delta, workMs: Math.max(0, workMs || 0), rendered, at: now });
      while (samples.length > 1 && (samples[0].at < now - windowMs || samples.length > 1024)) samples.shift();
    },
    snapshot() {
      if (!samples.length) return null;
      const elapsed = samples.reduce((sum, s) => sum + s.delta, 0);
      const rendered = samples.filter((s) => s.rendered).length;
      return {
        fps: (rendered * 1000) / elapsed,
        frameMs: elapsed / samples.length,
        workMs: samples.reduce((sum, s) => sum + s.workMs, 0) / samples.length,
        rendered,
        samples: samples.length,
      };
    },
  };
}
