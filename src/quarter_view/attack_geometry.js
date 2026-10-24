import { attackPlane } from '../attack_plane_helper.js';
import { groundPoint, depthOf } from './camera.js';
import { regionPoints, sweptInteractionRegion } from '../interaction_swept_region_helper.js';
import { previousAttackRegion } from '../interaction_overlap_helper.js';

export function attackPoint(actor, point, lateral = 0, plane = attackPlane(actor), anchor = null) {
  const aim = actor.quarterAim || { x: actor.player.facing || 1, z: 0 };
  const origin = plane === 'ground' && anchor ? anchor : actor.player;
  const forward = (point.x - origin.x) * (actor.player.facing || 1);
  // Preserve the weapon's handedness when rotating its mirrored side pose onto the floor.
  if (plane === 'ground') lateral += (origin.y - point.y) * (actor.player.facing || 1);
  return {
    x: origin.x + aim.x * forward - aim.z * lateral,
    depth: depthOf(actor) + aim.z * forward + aim.x * lateral,
    y: plane === 'height' ? point.y : (anchor?.y ?? actor.quarterFloorY ?? actor.player.y),
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
      const p = attackPoint(actor, point, 0, plane, region.quarterWeaponAnchor);
      return { x: p.x, y: p.depth };
    });
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const x = Math.min(...xs),
      y = Math.min(...ys);
    return {
      ...region,
      quarterPlane: plane,
      quarterElevation: region.quarterWeaponAnchor?.y,
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
