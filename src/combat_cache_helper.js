export function createInteractionRegionFrameCache() {
  return new WeakMap();
}

export function cachedInteractionRegions(cache, actor, role) {
  let actorCache = cache.get(actor);
  if (!actorCache) {
    actorCache = {};
    cache.set(actor, actorCache);
  }
  if (actorCache[role]) return actorCache[role];
  const regions = readInteractionRegions(actor, role);
  actorCache[role] = regions;
  return regions;
}

export function invalidateCachedInteractionRegions(cache, actor) {
  cache.delete(actor);
}

export function readInteractionRegions(actor, role) {
  if (role === 'attack') return actor.player.attackInteractionRegions || [];
  if (role === 'hurt') return actor.player.hurtInteractionRegions || [];
  if (role === 'collision') return actor.player.collisionInteractionRegions || [];
  if (role === 'guard') return actor.player.guardInteractionRegions || [];
  return [];
}
