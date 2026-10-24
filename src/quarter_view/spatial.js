import { depthOf, normalizeDirection } from './camera.js';
import { readInteractionRegions } from '../combat_cache_helper.js';
import { collisionPushShares } from '../combat_collision_helper.js';

export function combatTargetRegions(attacker, target, regions) {
  if (attacker.quarterDepth == null && target.quarterDepth == null) return regions;
  return regions.map((region) => {
    const radius = Math.max(8, Math.min(70, region.w / 2));
    return { ...region, y: depthOf(target) - radius, h: radius * 2, points: null };
  });
}
export function groundProjectileRegion(projectile, region) {
  return { ...region, y: depthOf(projectile) - 16, h: 32, points: null };
}

export function resolveGroundCollision(a, b) {
  const ar = readInteractionRegions(a, 'collision')[0],
    br = readInteractionRegions(b, 'collision')[0];
  if (!ar || !br || (ar.reaction.noOverlap === false && br.reaction.noOverlap === false)) return;
  if (Math.abs(a.player.y - b.player.y) > (ar.h + br.h) / 2) return;
  const dx = b.player.x - a.player.x,
    dz = depthOf(b) - depthOf(a);
  const distance = Math.hypot(dx, dz),
    radius = Math.min(80, (ar.w + br.w) / 2);
  if (distance >= radius) return;
  const normal = normalizeDirection(dx, dz) || { x: 1, z: 0 };
  const aPush = Number(ar.reaction.pushPower || 0) * Number(br.reaction.resistance ?? 1);
  const bPush = Number(br.reaction.pushPower || 0) * Number(ar.reaction.resistance ?? 1);
  const shares = collisionPushShares(a, b, {
    aShare: aPush + bPush ? bPush / (aPush + bPush) : 0.5,
    bShare: aPush + bPush ? aPush / (aPush + bPush) : 0.5,
  });
  const overlap = radius - distance;
  a.player.x -= normal.x * overlap * shares.aShare;
  a.quarterDepth -= normal.z * overlap * shares.aShare;
  b.player.x += normal.x * overlap * shares.bShare;
  b.quarterDepth += normal.z * overlap * shares.bShare;
}
export function sameGroundContact(a, b) {
  return Math.abs(depthOf(a) - depthOf(b)) <= 35;
}
