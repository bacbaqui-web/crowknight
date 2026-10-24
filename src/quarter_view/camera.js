const SLOPE = Math.sin((22 * Math.PI) / 180);
const COSINE = Math.cos((22 * Math.PI) / 180);
const DISTANCE = 4200;
export const QUARTER_PROJECTION = Object.freeze({ slope: SLOPE, cosine: COSINE, distance: DISTANCE });

// Simulation coordinates stay independent of the camera and perspective.
export function groundPoint(x, depth, view) {
  const z = depth - view.depth;
  const scale = DISTANCE / (DISTANCE - z * COSINE);
  return {
    x: view.width / 2 + (x - view.x) * view.zoom * scale,
    y: view.height * 0.58 + z * SLOPE * view.zoom * scale,
    scale: scale * view.zoom,
  };
}
export function groundFromScreen(x, y, view) {
  const screenZ = (y - view.height * 0.58) / view.zoom;
  const z = (screenZ * DISTANCE) / (SLOPE * DISTANCE + screenZ * COSINE);
  const scale = DISTANCE / (DISTANCE - z * COSINE);
  return { x: view.x + (x - view.width / 2) / (view.zoom * scale), depth: view.depth + z };
}
export function normalizeDirection(x, z) {
  const length = Math.hypot(x, z);
  return length > 0.00001 ? { x: x / length, z: z / length } : null;
}
export const depthOf = (entity) => Number(entity?.quarterDepth || 0);
