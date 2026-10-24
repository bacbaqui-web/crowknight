import { attackPlane } from '../attack_plane_helper.js';
import { attackPoint, effectPoint } from './attack_geometry.js';
import { regionPoints } from '../interaction_swept_region_helper.js';

export function attackFootprint(actor, region, floorY) {
  if (region.quarterDirectionalBox)
    return regionPoints(region).map((p) => ({ x: p.x, depth: p.y, y: region.quarterElevation }));
  return regionPoints(region).map((point) => ({
    ...(region.quarterEffectContact
      ? effectPoint(actor, point, region.quarterEffectCenter, undefined, region.quarterEffectRadius)
      : attackPoint(actor, point, 0, attackPlane(actor))),
    ...(attackPlane(actor) === 'ground' ? { y: floorY } : {}),
  }));
}

export function createAttackHistory() {
  const entries = new Map();
  function update(actor, floorY) {
    if (actor.respawning || actor.player.dead) {
      entries.delete(actor);
      return null;
    }
    const raw = actor.quarterAttackRawRegions || actor.player.attackInteractionRegions || [];
    const plane = raw[0]?.quarterDirectionalBox ? 'ground' : attackPlane(actor);
    const key = `${actor.player.attackSerial}:${actor.player.actionKey}:${plane}`;
    let entry = entries.get(actor);
    if (!raw.length) {
      if (entry) entry.active = false;
      return entry || null;
    }
    if (!entry || entry.key !== key) {
      entry = { key, plane, active: true, samples: [] };
      entries.set(actor, entry);
    }
    entry.active = true;
    const time = actor.player.animTime;
    if (entry.samples.at(-1)?.time === time) return entry;
    const points = raw.flatMap(regionPoints);
    const left = Math.min(...points.map((p) => p.x)),
      right = Math.max(...points.map((p) => p.x));
    const top = Math.min(...points.map((p) => p.y)),
      bottom = Math.max(...points.map((p) => p.y));
    const facing = actor.player.facing || 1;
    const originY = plane === 'height' ? floorY : actor.player.y;
    const localPolygons = raw.map((region) =>
      regionPoints(region).map((p) => {
        if (region.quarterDirectionalBox) {
          const dx = p.x - region.quarterBoxOrigin.x,
            dz = p.y - region.quarterBoxOrigin.depth;
          const aim = region.quarterBoxAim;
          return { x: dx * aim.x + dz * aim.z, y: -dx * aim.z + dz * aim.x };
        }
        return { x: (p.x - actor.player.x) * facing, y: originY - p.y };
      })
    );
    entry.samples.push({
      time,
      polygons: localPolygons,
      center: raw[0]?.quarterDirectionalBox
        ? { x: raw[0].quarterBoxLength / 2, y: 0 }
        : { x: ((left + right) / 2 - actor.player.x) * facing, y: originY - (top + bottom) / 2 },
      ground: raw[0]?.quarterDirectionalBox
        ? raw[0].quarterBoxOrigin
        : attackPoint(actor, { x: (left + right) / 2, y: (top + bottom) / 2 }, 0, plane),
      footprints: raw.map((region) => attackFootprint(actor, region, floorY)),
    });
    // One bounded sequence per actor; keep its start when a long action produces many samples.
    if (entry.samples.length > 64) entry.samples.splice(1, 1);
    return entry;
  }
  return { update, reset: () => entries.clear() };
}
