import { attackPlane } from '../attack_plane_helper.js';
import { groundPoint, depthOf } from './camera.js';
import { regionPoints, sweptInteractionRegion } from '../interaction_swept_region_helper.js';
import { previousAttackRegion } from '../interaction_overlap_helper.js';

// Rotate combat geometry only; the character and weapon sprites keep their native pose.
export function attackPoint(actor, point, lateral = 0, plane = attackPlane(actor)) {
  const facing = actor.player.facing || 1;
  const aim = actor.quarterAim || { x: facing, z: 0 };
  const forward = (point.x - actor.player.x) * facing;
  if (plane === 'ground') lateral += (actor.player.y - point.y) * facing;
  return {
    x: actor.player.x + aim.x * forward - aim.z * lateral,
    depth: depthOf(actor) + aim.z * forward + aim.x * lateral,
    y: plane === 'height' ? point.y : (actor.quarterFloorY ?? actor.player.y),
  };
}
export function screenPoint(point, world, view) {
  const p = groundPoint(point.x, point.depth, view);
  return { x: p.x, y: p.y - (world.floorY - point.y) * p.scale, scale: p.scale };
}
// Choose ground X/depth or authored forward/height without changing the character pose.
export function groundAttackRegions(actor, regions) {
  const plane = attackPlane(actor);
  const flat = regions.map((region) => {
    if (plane === 'height') return { ...region, quarterPlane: plane, quarterOrigin: attackOrigin(actor) };
    const points = regionPoints(region).map((point) => {
      const p = attackPoint(actor, point, 0, plane);
      return { x: p.x, y: p.depth };
    });
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const x = Math.min(...xs),
      y = Math.min(...ys);
    return {
      ...region,
      quarterPlane: plane,
      points,
      x,
      y,
      w: Math.max(...xs) - x,
      h: Math.max(...ys) - y,
    };
  });
  return flat;
}
export function attackOrigin(actor) {
  return {
    x: actor.player.x,
    depth: depthOf(actor),
    facing: actor.player.facing || 1,
    aim: { ...(actor.quarterAim || { x: actor.player.facing || 1, z: 0 }) },
  };
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

export function attackRegionPoint(actor, point, region, floorY) {
  if (region.quarterPlane === 'height') return attackPoint(actor, point, 0, 'height');
  return { x: point.x, depth: point.y, y: region.quarterElevation ?? floorY };
}
