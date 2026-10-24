import { attackPlane } from '../attack_plane_helper.js';
import { groundPoint, depthOf, QUARTER_PROJECTION } from './camera.js';
import { regionPoints, sweptInteractionRegion } from '../interaction_swept_region_helper.js';
import { previousAttackRegion } from '../interaction_overlap_helper.js';

export function attackPoint(actor, point, lateral = 0, plane = attackPlane(actor), anchor = null) {
  if (anchor || plane === 'weapon') return { x: point.x, depth: depthOf(actor), y: point.y };
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
    if (region.quarterWeaponContact) {
      const points = regionPoints(region).map((point) => ({
        x: point.x,
        y: point.y + depthOf(actor) * QUARTER_PROJECTION.slope,
      }));
      const xs = points.map((point) => point.x),
        ys = points.map((point) => point.y);
      return {
        ...region,
        quarterPlane: 'weapon',
        quarterOrigin: attackOrigin(actor),
        points,
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      };
    }
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

// Weapon collision coordinates already include the actor's projected ground depth.
export function attackRegionPoint(actor, point, region, floorY) {
  if (region.quarterPlane === 'weapon') return { x: point.x, depth: 0, y: point.y };
  if (region.quarterPlane === 'height') return attackPoint(actor, point, 0, 'height');
  return { x: point.x, depth: point.y, y: region.quarterElevation ?? floorY };
}
