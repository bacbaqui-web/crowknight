export function healthTickSpacing(max, width) {
  return 10 * Math.max(1, Math.ceil(max / 10 / Math.max(1, Math.floor(width / 3))));
}
export function createHealthTickCache(
  createPath = () => (typeof globalThis.Path2D === 'function' ? new globalThis.Path2D() : null),
  limit = 32
) {
  const paths = new Map();
  return (max, width) => {
    const key = `${max}:${width}`;
    if (paths.has(key)) return paths.get(key);
    const path = createPath();
    if (!path) return null;
    const step = healthTickSpacing(max, width);
    for (let hp = step; hp < max; hp += step) {
      const x = (width * hp) / max;
      path.moveTo(x, 0);
      path.lineTo(x, 8);
    }
    if (paths.size >= limit) paths.delete(paths.keys().next().value);
    paths.set(key, path);
    return path;
  };
}
export const healthTickPath = createHealthTickCache();
