// Pure authored-data reads may be shared inside one synchronous game frame only.
// A fresh scope avoids stale results after editor changes, upgrades or a new run.
let frameCache = null;
export function withRuntimeReadCache(callback) {
  const previous = frameCache;
  frameCache = new WeakMap();
  try {
    return callback();
  } finally {
    frameCache = previous;
  }
}
export function runtimeRead(owner, key, compute, copy = false) {
  if (!frameCache || !owner || typeof owner !== 'object') return compute();
  let reads = frameCache.get(owner);
  if (!reads) {
    reads = new Map();
    frameCache.set(owner, reads);
  }
  if (!reads.has(key)) reads.set(key, compute());
  const value = reads.get(key);
  return copy ? { ...value } : value;
}
