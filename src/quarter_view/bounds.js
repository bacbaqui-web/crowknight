import { depthOf, normalizeDirection, QUARTER_PROJECTION } from './camera.js';

export function constrainGroundPosition(actor, world = null) {
  if (world?.quarterView?.unbounded) {
    actor.player.quarterDepth = depthOf(actor);
    return;
  }
  actor.player.x = Math.max(world?.minX ?? -Infinity, Math.min(world?.maxX ?? Infinity, actor.player.x));
  actor.quarterDepth = Math.max(-480, Math.min(480, depthOf(actor)));
  actor.player.quarterDepth = actor.quarterDepth;
}

// Cycle all eight sectors with jitter so a short wave cannot randomly pile up on one side.
export function createSurroundingSpawner(world, random = Math.random) {
  let sector = Math.floor(random() * 8);
  return (actor, target) => {
    const rule = world?.enemyRules?.spawnRule || {};
    const a = Number(rule.cameraOffsetMin ?? 740),
      b = Number(rule.cameraOffsetMax ?? 960);
    const min = Math.max(240, Math.min(a, b)),
      max = Math.max(min, a, b);
    let radius = min + random() * (max - min);
    const angle = ((sector + (random() - 0.5) * 0.8) * Math.PI) / 4;
    sector = (sector + 3) % 8;
    const view = world?.quarterView?.getCameraView?.();
    if (world?.viewW && world?.viewH) {
      const zoom = view?.zoom || 1;
      // Include the sprite above its feet, and the camera's horizontal/jump offset.
      const margin = 220;
      const horizontal = (world.viewW / 2 + margin) / zoom + 110;
      const vertical =
        (world.viewH * 0.58 + margin) / (QUARTER_PROJECTION.slope * zoom) +
        Math.max(0, (world.floorY || 0) - (target.player.y || world.floorY || 0)) / QUARTER_PROJECTION.slope;
      const edge = Math.min(
        horizontal / Math.max(0.001, Math.abs(Math.cos(angle))),
        vertical / Math.max(0.001, Math.abs(Math.sin(angle)))
      );
      radius = Math.max(radius, edge + 50);
    }
    const dx = Math.cos(angle) * radius,
      dz = Math.sin(angle) * radius;
    actor.player.x = target.player.x + dx;
    actor.quarterDepth = depthOf(target) + dz;
    actor.player.quarterDepth = actor.quarterDepth;
    actor.respawnTargetX = actor.player.x;
    actor.quarterAim = normalizeDirection(-dx, -dz);
    actor.player.facing = dx > 0 ? -1 : 1;
    actor.quarterImpulse = null;
  };
}

export function outsideSpawnArea(actor, target, world) {
  const rule = world?.enemyRules?.spawnRule || {};
  const radius = Math.max(240, Number(rule.cameraOffsetMin ?? 740), Number(rule.cameraOffsetMax ?? 960));
  return (
    Math.hypot(actor.player.x - target.player.x, depthOf(actor) - depthOf(target)) >
    Math.max(
      2200,
      radius * 2.5,
      (world.viewW || 0) / (world.quarterView?.getCameraView?.()?.zoom || 1) + 800,
      (world.viewH || 0) / (QUARTER_PROJECTION.slope * (world.quarterView?.getCameraView?.()?.zoom || 1)) + 800
    )
  );
}
