import { ATTACK_HALF_WIDTH, targetLaneRadius } from './attack_geometry.js';
import { depthOf, normalizeDirection } from './camera.js';
import { readInteractionRegions } from '../combat_cache_helper.js';
import { collisionPushShares } from '../combat_collision_helper.js';

export function combatTargetRegions(attacker, target, regions) {
  if (attacker.quarterDepth == null && target.quarterDepth == null) return regions;
  const aim = attacker.quarterAim || { x: attacker.player.facing, z: 0 };
  const dx = target.player.x - attacker.player.x;
  const dz = depthOf(target) - depthOf(attacker);
  // A separate ground lane prevents hitting distant feet through tall sprites.
  const width = ATTACK_HALF_WIDTH + targetLaneRadius(target);
  if (Math.abs(-dx * aim.z + dz * aim.x) > width) return [];
  const projectedX = (dx * aim.x + dz * aim.z) * attacker.player.facing;
  const shift = projectedX - dx;
  return regions.map((region) => ({
    ...region,
    x: region.x + shift,
    ...(region.points ? { points: region.points.map((point) => ({ x: point.x + shift, y: point.y })) } : {}),
  }));
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
