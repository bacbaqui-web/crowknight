import { isBalloonBomber } from '../balloon_bomber_runtime.js';
import { blastEllipse } from '../powder_bomb_runtime.js';
import { linearSpearCorners } from '../spearman_throw_renderer.js';
import { attackPlane } from '../attack_plane_helper.js';
import { constrainGroundPosition } from './bounds.js';
import { attackOrigin } from './attack_geometry.js';
import { depthOf, normalizeDirection, QUARTER_PROJECTION } from './camera.js';
import { readInteractionRegions, cachedInteractionRegions } from '../combat_cache_helper.js';
import { collisionPushShares } from '../combat_collision_helper.js';

export function combatTargetRegions(attacker, target, regions, source = null) {
  if (attacker.quarterDepth == null && target.quarterDepth == null) return regions;
  if (isBalloonBomber(target.player) && !source?.quarterHeightRange && Number.isFinite(source?.quarterElevation)) {
    const elevation = source.quarterElevation;
    regions = regions.filter((region) => region.y < elevation + 40 && region.y + region.h > elevation - 40);
  }
  if (source?.quarterHeightRange) {
    const [top, bottom] = source.quarterHeightRange;
    regions = regions.filter((region) => region.y < bottom && region.y + region.h > top);
  }
  const plane = source?.quarterPlane || attackPlane(attacker);
  if (plane === 'effect-height') {
    const origin = source.quarterOrigin || attackOrigin(attacker);
    const dx = target.player.x - origin.x,
      dz = depthOf(target) - origin.depth;
    const lateral = -dx * origin.aim.z + dz * origin.aim.x;
    return regions
      .filter((region) => Math.abs(lateral) <= 16 + Math.max(8, Math.min(70, region.w / 2)))
      .map((region) => ({
        ...region,
        y: region.y + depthOf(target) * QUARTER_PROJECTION.slope,
        ...(region.points
          ? { points: region.points.map((p) => ({ x: p.x, y: p.y + depthOf(target) * QUARTER_PROJECTION.slope })) }
          : {}),
      }));
  }
  if (plane === 'height') {
    const origin = source?.quarterOrigin || attackOrigin(attacker);
    const dx = target.player.x - origin.x,
      dz = depthOf(target) - origin.depth;
    const lateral = -dx * origin.aim.z + dz * origin.aim.x;
    const forward = (dx * origin.aim.x + dz * origin.aim.z) * origin.facing;
    return regions
      .filter((region) => Math.abs(lateral) <= 16 + Math.max(8, Math.min(70, region.w / 2)))
      .map((region) => {
        const shift = origin.x + forward - target.player.x;
        return {
          ...region,
          x: region.x + shift,
          ...(region.points ? { points: region.points.map((p) => ({ x: p.x + shift, y: p.y })) } : {}),
        };
      });
  }
  return regions.map((region) => {
    const radius = Math.max(8, Math.min(70, region.w / 2));
    return { ...region, y: depthOf(target) - radius, h: radius * 2, points: null };
  });
}
export function groundProjectileRegion(projectile, region) {
  if (projectile.powderBomb || projectile.mageFire) {
    return {
      ...region,
      quarterPlane: 'ground',
      y: depthOf(projectile) - projectile.radius,
      h: projectile.radius * 2,
      points: blastEllipse(projectile.x, depthOf(projectile), projectile.radius, projectile.radius),
      quarterHeightRange: [
        projectile.targetY - (projectile.mageFire ? region.h : projectile.radius),
        projectile.targetY,
      ],
    };
  }
  if (projectile.linearSpear) {
    const points = linearSpearCorners(projectile).map((p) => ({
      x: p.x,
      y: p.y + depthOf(projectile) * QUARTER_PROJECTION.slope,
    }));
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    return {
      ...region,
      points,
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
      quarterHeightRange: [
        projectile.y - (Math.abs(projectile.direction.y) * projectile.hitboxWidth + projectile.hitboxHeight) / 2,
        projectile.y + (Math.abs(projectile.direction.y) * projectile.hitboxWidth + projectile.hitboxHeight) / 2,
      ],
      quarterPlane: 'effect-height',
      quarterOrigin: { x: projectile.x, depth: depthOf(projectile), facing: 1, aim: { x: 1, z: 0 } },
    };
  }
  if (projectile.quarterPlane === 'height') {
    const shift = depthOf(projectile) * QUARTER_PROJECTION.slope;
    return {
      ...region,
      y: region.y + shift,
      ...(region.points ? { points: region.points.map((p) => ({ x: p.x, y: p.y + shift })) } : {}),
      quarterPlane: 'effect-height',
      quarterOrigin: {
        x: projectile.x,
        depth: depthOf(projectile),
        facing: 1,
        aim: { x: 1, z: 0 },
      },
    };
  }
  return { ...region, quarterPlane: 'ground', y: depthOf(projectile) - 16, h: 32, points: null };
}

export function resolveGroundCollision(a, b, dimensions = null, world = null) {
  const dx = b.player.x - a.player.x,
    dz = depthOf(b) - depthOf(a);
  const distance = Math.hypot(dx, dz);
  // The exact collision radius below is capped at 80, regardless of authored scale.
  if (distance >= 80) return;
  const ar = (
      dimensions ? cachedInteractionRegions(dimensions, a, 'collision') : readInteractionRegions(a, 'collision')
    )[0],
    br = (
      dimensions ? cachedInteractionRegions(dimensions, b, 'collision') : readInteractionRegions(b, 'collision')
    )[0];
  if (!ar || !br || (ar.reaction.noOverlap === false && br.reaction.noOverlap === false)) return;
  if (Math.abs(a.player.y - b.player.y) > (ar.h + br.h) / 2) return;
  const radius = Math.min(80, (ar.w + br.w) / 2);
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
  constrainGroundPosition(a, world);
  constrainGroundPosition(b, world);
}
export function sameGroundContact(a, b) {
  return Math.abs(depthOf(a) - depthOf(b)) <= 35;
}
