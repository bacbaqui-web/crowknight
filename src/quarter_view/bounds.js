import { depthOf, normalizeDirection } from './camera.js';

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
    const radius = min + random() * (max - min);
    const angle = ((sector + (random() - 0.5) * 0.8) * Math.PI) / 4;
    sector = (sector + 3) % 8;
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
