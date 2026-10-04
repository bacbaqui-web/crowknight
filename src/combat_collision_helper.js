import { interactionRegionsOverlap } from './interaction_overlap_helper.js';
import { debugInteractionRuntimeLog } from './interaction_region_engine.js';
import { isRuntimeDebugEnabled } from './runtime_debug_state.js';
import { cachedInteractionRegions, invalidateCachedInteractionRegions } from './combat_cache_helper.js';
import { isMobActor, isBossActor } from './combat_rule_helper.js';

export function resolveCollisionInteractions(actors, regionCache) {
  for (let aIndex = 0; aIndex < actors.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < actors.length; bIndex += 1) {
      const a = actors[aIndex];
      const b = actors[bIndex];
      if (a.respawning || b.respawning || a.player?.dead || b.player?.dead) continue;
      resolveActorCollisionPair(a, b, regionCache);
    }
  }
}

export function resolveActorCollisionPair(a, b, regionCache) {
  const aRegion = firstCollisionRegion(cachedInteractionRegions(regionCache, a, 'collision'));
  const bRegion = firstCollisionRegion(cachedInteractionRegions(regionCache, b, 'collision'));
  if (!aRegion || !bRegion || !interactionRegionsOverlap(aRegion, bRegion)) return;
  if (aRegion.reaction.noOverlap === false && bRegion.reaction.noOverlap === false) return;

  const push = collisionPushVector(aRegion, bRegion);
  if (!push) return;

  const aPush = Number(aRegion.reaction.pushPower || 0) * Number(bRegion.reaction.resistance ?? 1);
  const bPush = Number(bRegion.reaction.pushPower || 0) * Number(aRegion.reaction.resistance ?? 1);
  const total = aPush + bPush;
  const shares = collisionPushShares(a, b, {
    aShare: total > 0 ? bPush / total : 0.5,
    bShare: total > 0 ? aPush / total : 0.5,
  });

  a.player.x -= push.x * shares.aShare;
  a.player.y -= push.y * shares.aShare;
  b.player.x += push.x * shares.bShare;
  b.player.y += push.y * shares.bShare;
  invalidateCachedInteractionRegions(regionCache, a);
  invalidateCachedInteractionRegions(regionCache, b);
  if (isRuntimeDebugEnabled()) {
    debugInteractionRuntimeLog('collision-overlap', {
      a: a.id,
      b: b.id,
      noOverlapA: aRegion.reaction.noOverlap,
      noOverlapB: bRegion.reaction.noOverlap,
      pushPowerA: aRegion.reaction.pushPower,
      pushPowerB: bRegion.reaction.pushPower,
      resistanceA: aRegion.reaction.resistance,
      resistanceB: bRegion.reaction.resistance,
    });
  }
}

export function firstCollisionRegion(regions = []) {
  return regions.find((region) => region?.active !== false) || null;
}

export function collisionPushShares(a, b, shares) {
  if (isBossActor(a) && isMobActor(b)) return { aShare: 0, bShare: 1 };
  if (isMobActor(a) && isBossActor(b)) return { aShare: 1, bShare: 0 };
  return shares;
}

export function collisionPushVector(a, b) {
  const aCenterX = a.x + a.w / 2;
  const aCenterY = a.y + a.h / 2;
  const bCenterX = b.x + b.w / 2;
  const bCenterY = b.y + b.h / 2;
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return null;
  if (overlapX <= overlapY) {
    return { x: aCenterX <= bCenterX ? overlapX : -overlapX, y: 0 };
  }
  return { x: 0, y: aCenterY <= bCenterY ? overlapY : -overlapY };
}
