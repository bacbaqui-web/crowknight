import { attackPlane } from '../attack_plane_helper.js';
import { attackPoint } from './attack_geometry.js';
import { regionPoints } from '../interaction_swept_region_helper.js';

export function attackFootprint(actor, region, floorY) {
  return regionPoints(region).map((point) => ({
    ...attackPoint(actor, point, 0, attackPlane(actor), region.quarterWeaponAnchor),
    ...(attackPlane(actor) === 'ground' && !region.quarterWeaponAnchor ? { y: floorY } : {}),
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
    const plane = attackPlane(actor);
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
      regionPoints(region).map((p) => ({ x: (p.x - actor.player.x) * facing, y: originY - p.y }))
    );
    entry.samples.push({
      time,
      polygons: localPolygons,
      center: { x: ((left + right) / 2 - actor.player.x) * facing, y: originY - (top + bottom) / 2 },
      ground: attackPoint(actor, { x: (left + right) / 2, y: (top + bottom) / 2 }),
      footprints: raw.map((region) => attackFootprint(actor, region, floorY)),
    });
    // One bounded sequence per actor; keep its start when a long action produces many samples.
    if (entry.samples.length > 64) entry.samples.splice(1, 1);
    return entry;
  }
  return { update, reset: () => entries.clear() };
}
