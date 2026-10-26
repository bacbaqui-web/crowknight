const SLOPE = Math.sin((26 * Math.PI) / 180);
export const QUARTER_PROJECTION = Object.freeze({ slope: SLOPE });

// Use a higher quarter-view camera angle with a constant orthographic scale.
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

export function createJumpCameraFollow() {
  let subject,
    lastTime,
    height = 0;
  return (actor, floorY) => {
    const time = actor.player.animTime;
    const target = Math.max(0, floorY - actor.player.y);
    if (subject !== actor || time < lastTime) {
      subject = actor;
      lastTime = time;
      height = target;
      return height;
    }
    const dt = Math.max(0, Math.min(0.1, time - lastTime));
    lastTime = time;
    height += (target - height) * (1 - Math.exp(-dt / 0.08));
    if (Math.abs(target - height) < 0.05) height = target;
    return height;
  };
}
