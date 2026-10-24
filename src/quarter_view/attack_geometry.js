import { attackPlane } from '../attack_plane_helper.js';
import { effectLayoutFor } from './effect_layout.js';
import { effectDirection } from './effect_directions.js';
import { groundPoint, depthOf, QUARTER_PROJECTION } from './camera.js';
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
// Image and collision corners share this projection, including visible thickness at depth-only height attacks.
export function effectPoint(actor, point, center, plane = attackPlane(actor), radius) {
  const aim = effectDirection(actor),
    facing = actor.player.facing || 1;
  if (radius != null) {
    const layout = effectLayoutFor(actor, aim.key);
    // Work in authored right-facing coordinates, then reflect the left half.
    // The chosen source anchor stays at the arrow tip through rotation and scaling.
    const u = ((point.x - center.x) * facing - (layout.anchorX || 0)) * layout.width;
    const v = (center.y - point.y - (layout.anchorY || 0)) * layout.height;
    const angle = ((layout.rotation || 0) * Math.PI) / 180;
    const forward = u * Math.cos(angle) - v * Math.sin(angle);
    const cross = u * Math.sin(angle) + v * Math.cos(angle);
    const mirror = aim.x < 0 ? -1 : 1;
    const lateral = ((plane === 'ground' ? cross : 0) + layout.side) * mirror;
    radius = Math.max(0, radius + layout.distance);
    return {
      x:
        actor.player.x +
        aim.x * (radius + forward) -
        aim.z * lateral +
        (plane === 'height' && Math.abs(aim.x) < 0.1 ? -aim.z * 0.2 * forward : 0),
      depth: depthOf(actor) + aim.z * (radius + forward) + aim.x * lateral,
      y: plane === 'height' ? center.y - cross + (layout.elevation || 0) : (actor.quarterFloorY ?? actor.player.y),
    };
  }
  const directed = { ...actor, quarterAim: aim };
  const result = attackPoint(directed, point, 0, plane);
  if (plane === 'height' && Math.abs(aim.x) < 0.1) result.x += -aim.z * 0.2 * (point.x - center.x) * facing;
  return result;
}
export function screenPoint(point, world, view) {
  const p = groundPoint(point.x, point.depth, view);
  return { x: p.x, y: p.y - (world.floorY - point.y) * p.scale, scale: p.scale };
}
// Choose ground X/depth or authored forward/height without changing the character pose.
export function groundAttackRegions(actor, regions) {
  const plane = attackPlane(actor);
  const flat = regions.map((region) => {
    if (region.quarterDirectionalBox || region.quarterNativeWeapon) return region;
    if (region.quarterEffectContact && plane === 'height') {
      const points = regionPoints(region).map((point) => {
        const p = effectPoint(actor, point, region.quarterEffectCenter, plane, region.quarterEffectRadius);
        return { x: p.x, y: p.y + p.depth * QUARTER_PROJECTION.slope };
      });
      const xs = points.map((p) => p.x),
        ys = points.map((p) => p.y);
      return {
        ...region,
        quarterPlane: 'effect-height',
        quarterOrigin: { ...attackOrigin(actor), aim: effectDirection(actor) },
        points,
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      };
    }
    if (plane === 'height') return { ...region, quarterPlane: plane, quarterOrigin: attackOrigin(actor) };
    const points = regionPoints(region).map((point) => {
      const p = region.quarterEffectContact
        ? effectPoint(actor, point, region.quarterEffectCenter, plane, region.quarterEffectRadius)
        : attackPoint(actor, point, 0, plane);
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
  actor.quarterAttackPosition = { x: actor.player.x, y: actor.player.y, depth: depthOf(actor) };
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
    return actor.quarterAttackRegions.map((region) => {
      const origin = actor.quarterAttackPosition;
      if (!region.quarterDirectionalBox || !origin) return region;
      const dx = actor.player.x - origin.x,
        dz = depthOf(actor) - origin.depth;
      return {
        ...region,
        x: region.x + dx,
        y: region.y + dz,
        quarterElevation: region.quarterElevation + actor.player.y - origin.y,
        points: region.points.map((p) => ({ x: p.x + dx, y: p.y + dz })),
      };
    });
  return groundAttackRegions(actor, actor.player.attackInteractionRegions || []);
}

export function attackRegionPoint(actor, point, region, floorY) {
  if (region.quarterPlane === 'effect-height') return { x: point.x, depth: 0, y: point.y };
  if (region.quarterPlane === 'height') return attackPoint(actor, point, 0, 'height');
  return { x: point.x, depth: point.y, y: region.quarterElevation ?? floorY };
}
