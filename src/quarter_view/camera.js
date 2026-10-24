const SLOPE = Math.sin((18 * Math.PI) / 180);
export const QUARTER_PROJECTION = Object.freeze({ slope: SLOPE });

// Keep the existing low camera angle with a constant orthographic scale.
export function groundPoint(x, depth, view) {
  return {
    x: view.width / 2 + (x - view.x) * view.zoom,
    y: view.height * 0.58 + (depth - view.depth) * SLOPE * view.zoom,
    scale: view.zoom,
  };
}
export function groundFromScreen(x, y, view) {
  return {
    x: view.x + (x - view.width / 2) / view.zoom,
    depth: view.depth + (y - view.height * 0.58) / (SLOPE * view.zoom),
  };
}
export function normalizeDirection(x, z) {
  const length = Math.hypot(x, z);
  return length > 0.00001 ? { x: x / length, z: z / length } : null;
}
export const depthOf = (entity) => Number(entity?.quarterDepth || 0);
