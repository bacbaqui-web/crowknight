import { groundPoint, depthOf } from './camera.js';
import { sweptInteractionRegion } from '../interaction_swept_region_helper.js';
import { previousAttackRegion } from '../interaction_overlap_helper.js';

export const ATTACK_HALF_WIDTH = 16;
export function targetLaneRadius(target) {
  return Math.max(32, Math.min(70, (target.player.transform?.scale || 1) * 42)) - ATTACK_HALF_WIDTH;
}
export function attackPoint(actor, point, lateral = 0) {
  const aim = actor.quarterAim || { x: actor.player.facing || 1, z: 0 };
  const forward = (point.x - actor.player.x) * (actor.player.facing || 1);
  return {
    x: actor.player.x + aim.x * forward - aim.z * lateral,
    depth: depthOf(actor) + aim.z * forward + aim.x * lateral,
    y: point.y,
  };
}
export function screenPoint(point, world, view) {
  const p = groundPoint(point.x, point.depth, view);
  return { x: p.x, y: p.y - (world.floorY - point.y) * p.scale, scale: p.scale };
}
export function captureAttackRegions(actor, regions) {
  actor.quarterAttackRawRegions = regions;
  actor.quarterAttackRegions = regions.map((region) => {
    const previous = region.reaction?.hitMode === 'trace' ? previousAttackRegion(actor, region) : null;
    return previous ? sweptInteractionRegion(previous, region) : region;
  });
  actor.quarterAttackSerial = actor.player.attackSerial;
}
export function currentAttackRegions(actor) {
  if (actor.respawning || actor.player.dead) return [];
  if (actor.quarterAttackSerial === actor.player.attackSerial && actor.quarterAttackRegions)
    return actor.quarterAttackRegions;
  return actor.player.attackInteractionRegions || [];
}
