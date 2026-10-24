import { groundPoint, depthOf } from './camera.js';
import { regionPoints, sweptInteractionRegion } from '../interaction_swept_region_helper.js';
import { previousAttackRegion } from '../interaction_overlap_helper.js';

export function attackPoint(actor, point, lateral = 0) {
  const aim = actor.quarterAim || { x: actor.player.facing || 1, z: 0 };
  const forward = (point.x - actor.player.x) * (actor.player.facing || 1);
  lateral += actor.player.y - point.y;
  return {
    x: actor.player.x + aim.x * forward - aim.z * lateral,
    depth: depthOf(actor) + aim.z * forward + aim.x * lateral,
    y: actor.quarterFloorY ?? actor.player.y,
  };
}
export function screenPoint(point, world, view) {
  const p = groundPoint(point.x, point.depth, view);
  return { x: p.x, y: p.y - (world.floorY - point.y) * p.scale, scale: p.scale };
}
// The combat engine's XY polygon operations now operate on ground X/depth in quarter view.
export function groundAttackRegions(actor, regions) {
  const flat = regions.map((region) => {
    const points = regionPoints(region).map((point) => {
      const p = attackPoint(actor, point);
      return { x: p.x, y: p.depth };
    });
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const x = Math.min(...xs),
      y = Math.min(...ys);
    return { ...region, points, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  });
  return flat;
}
export function captureAttackRegions(actor, regions, flat = groundAttackRegions(actor, regions)) {
  actor.quarterAttackRawRegions = regions;
  actor.quarterAttackRegions = flat.map((region) => {
    const previous = region.reaction?.hitMode === 'trace' ? previousAttackRegion(actor, region) : null;
    return previous ? sweptInteractionRegion(previous, region) : region;
  });
  actor.quarterAttackSerial = actor.player.attackSerial;
}
export function currentAttackRegions(actor) {
  if (actor.respawning || actor.player.dead) return [];
  if (actor.quarterAttackSerial === actor.player.attackSerial && actor.quarterAttackRegions)
    return actor.quarterAttackRegions;
  return groundAttackRegions(actor, actor.player.attackInteractionRegions || []);
}
