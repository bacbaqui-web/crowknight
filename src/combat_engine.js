import { requestRuntimeAction } from './action_trigger_engine.js';
import { debugInteractionRuntimeLog } from './interaction_region_engine.js';
import { isRuntimeDebugEnabled } from './runtime_debug_state.js';
import { ACTION_FPS } from './game_config_data.js';

export function updateBattleActorMotion({ actors, playerActor, keys, pressed, world, dt }) {
  updateActorCombatTimers(actors, dt);

  playerActor.player.update(dt, keys, pressed, world);

  actors.slice(1).forEach((actor) => {
    actor.player.updateNpc(dt, playerActor.player, world);
  });
}

export function resolveCombat({ actors, playerActor, world, particleEffects, onPlayerDeath, onPlayerKill }) {
  const regionCache = createInteractionRegionFrameCache();
  resolveCollisionInteractions(actors, regionCache);
  resolveCollisionHurtInteractions({ actors, playerActor, onPlayerDeath, onPlayerKill, regionCache });

  actors.forEach((attacker) => {
    if (attacker.respawning) return;
    const attackRegions = cachedInteractionRegions(regionCache, attacker, 'attack');
    if (!attackRegions.length) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(attacker, target)) return;
      if (target.lastHitSerials[attacker.id] === attacker.player.attackSerial) return;
      const targetHurtRegions = cachedInteractionRegions(regionCache, target, 'hurt');
      const attackRegion = overlappingAttackRegion(attackRegions, targetHurtRegions);
      if (!attackRegion) {
        if (isRuntimeDebugEnabled()) {
          debugInteractionRuntimeLog('attack-hurt-no-overlap', {
            attacker: attacker.id,
            target: target.id,
            attackerAction: attacker.player.actionKey,
            targetAction: target.player.actionKey,
            attackRegions: attackRegions.length,
            hurtRegions: targetHurtRegions?.length || 0,
            hurtByAttack: (targetHurtRegions || []).some((region) => region?.reaction?.hurtByAttack === true),
            reason: 'attack region and hurt region do not overlap',
          });
        }
        return;
      }
      if (isAttackBlocked(attackRegions, cachedInteractionRegions(regionCache, target, 'guard'))) {
        if (isRuntimeDebugEnabled()) {
          debugInteractionRuntimeLog('guard-block', {
            attacker: attacker.id,
            target: target.id,
            attackerAction: attacker.player.actionKey,
            targetAction: target.player.actionKey,
          });
        }
        target.lastHitSerials[attacker.id] = attacker.player.attackSerial;
        return;
      }

      const comboStep = attacker.player.comboStep || 1;
      target.lastHitSerials[attacker.id] = attacker.player.attackSerial;
      triggerWorldAttackCameraShake(world, particleEffects);
      if (isRuntimeDebugEnabled()) {
        debugInteractionRuntimeLog('attack-hurt-overlap', {
          attacker: attacker.id,
          target: target.id,
          attackerAction: attacker.player.actionKey,
          targetAction: target.player.actionKey,
          damage: attackRegion.reaction.damage,
          knockback: attackRegion.reaction.knockback,
        });
      }
      const removed = applyInteractionDamage({
        attacker,
        target,
        damage: attackRegion.reaction.damage,
        invincibleTime: targetHurtInvincibleTime(targetHurtRegions),
        comboStep,
        playerActor,
        particleEffects,
        onPlayerDeath,
        onPlayerKill,
      });
      if (removed) return;

      applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects);
    });
  });
}

function resolveCollisionInteractions(actors, regionCache) {
  for (let aIndex = 0; aIndex < actors.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < actors.length; bIndex += 1) {
      const a = actors[aIndex];
      const b = actors[bIndex];
      if (a.respawning || b.respawning) continue;
      resolveActorCollisionPair(a, b, regionCache);
    }
  }
}

function resolveActorCollisionPair(a, b, regionCache) {
  const aRegion = firstCollisionRegion(cachedInteractionRegions(regionCache, a, 'collision'));
  const bRegion = firstCollisionRegion(cachedInteractionRegions(regionCache, b, 'collision'));
  if (!aRegion || !bRegion || !interactionRegionsOverlap(aRegion, bRegion)) return;
  if (aRegion.reaction.noOverlap === false && bRegion.reaction.noOverlap === false) return;

  const push = collisionPushVector(aRegion, bRegion);
  if (!push) return;

  const aPush = Number(aRegion.reaction.pushPower || 0) * Number(bRegion.reaction.resistance ?? 1);
  const bPush = Number(bRegion.reaction.pushPower || 0) * Number(aRegion.reaction.resistance ?? 1);
  const total = aPush + bPush;
  const aShare = total > 0 ? bPush / total : 0.5;
  const bShare = total > 0 ? aPush / total : 0.5;

  a.player.x -= push.x * aShare;
  a.player.y -= push.y * aShare;
  b.player.x += push.x * bShare;
  b.player.y += push.y * bShare;
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

function firstCollisionRegion(regions = []) {
  return regions.find((region) => region?.active !== false) || null;
}

function collisionPushVector(a, b) {
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

function resolveCollisionHurtInteractions({ actors, playerActor, onPlayerDeath, onPlayerKill, regionCache }) {
  actors.forEach((source) => {
    if (source.respawning) return;
    const collisionRegion = firstCollisionRegion(cachedInteractionRegions(regionCache, source, 'collision'));
    if (!collisionRegion) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(source, target)) return;
      const hurtRegion = overlappingCollisionHurtRegion(
        collisionRegion,
        cachedInteractionRegions(regionCache, target, 'hurt')
      );
      if (!hurtRegion) return;
      if (isRuntimeDebugEnabled()) {
        debugInteractionRuntimeLog('collision-hurt-overlap', {
          source: source.id,
          target: target.id,
          sourceAction: source.player.actionKey,
          targetAction: target.player.actionKey,
          hurtByCollision: hurtRegion.reaction.hurtByCollision,
          damage: 1,
        });
      }
      applyInteractionDamage({
        attacker: source,
        target,
        damage: 1,
        invincibleTime: hurtRegion.reaction.invincibleTime,
        comboStep: 1,
        playerActor,
        particleEffects: null,
        onPlayerDeath,
        onPlayerKill,
      });
    });
  });
}

function createInteractionRegionFrameCache() {
  return new WeakMap();
}

function cachedInteractionRegions(cache, actor, role) {
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

function invalidateCachedInteractionRegions(cache, actor) {
  cache.delete(actor);
}

function readInteractionRegions(actor, role) {
  if (role === 'attack') return actor.player.attackInteractionRegions || [];
  if (role === 'hurt') return actor.player.hurtInteractionRegions || [];
  if (role === 'collision') return actor.player.collisionInteractionRegions || [];
  if (role === 'guard') return actor.player.guardInteractionRegions || [];
  return [];
}

function overlappingCollisionHurtRegion(collisionRegion, hurtRegions) {
  return (hurtRegions || []).find(
    (hurtRegion) =>
      hurtRegion?.reaction?.hurtByCollision === true && interactionRegionsOverlap(collisionRegion, hurtRegion)
  );
}

function overlappingAttackRegion(attackRegions, hurtRegions) {
  return attackRegions.find((attackRegion) =>
    (hurtRegions || []).some(
      (hurtRegion) =>
        hurtRegion?.reaction?.hurtByAttack !== false && interactionRegionsOverlap(attackRegion, hurtRegion)
    )
  );
}

function isAttackBlocked(attackRegions, guardRegions) {
  return (guardRegions || []).some(
    (guardRegion) =>
      guardRegion?.reaction?.block === true &&
      attackRegions.some((attackRegion) => interactionRegionsOverlap(attackRegion, guardRegion))
  );
}

function interactionRegionsOverlap(activeRegion, targetRegion) {
  if (!activeRegion?.points?.length) return rectsOverlap(activeRegion, targetRegion);
  if (!rectsOverlap(activeRegion, targetRegion)) return false;
  return convexPolygonsOverlap(activeRegion.points, regionPoints(targetRegion));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function convexPolygonsOverlap(a, b) {
  return ![a, b].some((points) => {
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const axis = { x: -(next.y - current.y), y: next.x - current.x };
      const projectionA = projectPolygon(a, axis);
      const projectionB = projectPolygon(b, axis);
      if (projectionA.max < projectionB.min || projectionB.max < projectionA.min) return true;
    }
    return false;
  });
}

function regionPoints(region) {
  if (region?.points?.length) return region.points;
  return [
    { x: region.x, y: region.y },
    { x: region.x + region.w, y: region.y },
    { x: region.x + region.w, y: region.y + region.h },
    { x: region.x, y: region.y + region.h },
  ];
}

function projectPolygon(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.y * axis.y);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function maintainEnemyFlow() {
  // Enemy flow is no longer hardcoded. Spawn, despawn, and movement should be data-authored rules.
}

function updateActorCombatTimers(actors, dt) {
  actors.forEach((actor) => {
    actor.hurtCooldown = Math.max(0, actor.hurtCooldown - dt);
    actor.hitStun = Math.max(0, actor.hitStun - dt);
    actor.invulnTime = Math.max(0, actor.invulnTime - dt);
  });
}

function shouldSkipTarget(attacker, target) {
  return (
    target === attacker ||
    target.respawning ||
    target.hurtCooldown > 0 ||
    target.invulnTime > 0 ||
    target.player.isRolling
  );
}

function applyInteractionDamage({
  attacker,
  target,
  damage: rawDamage,
  invincibleTime = 0,
  comboStep,
  playerActor,
  particleEffects,
  onPlayerDeath,
  onPlayerKill,
}) {
  const damage = Math.max(0, Math.round(Number(rawDamage ?? 1)));
  if (damage <= 0) return false;
  target.hpPips = Math.max(0, target.hpPips - damage);
  target.invulnTime = Math.max(target.invulnTime || 0, Number(invincibleTime || 0));
  if (isRuntimeDebugEnabled()) {
    debugInteractionRuntimeLog('damage-applied', {
      attacker: attacker.id,
      target: target.id,
      attackerAction: attacker.player.actionKey,
      targetAction: target.player.actionKey,
      damage,
      targetHp: target.hpPips,
    });
  }
  requestHurtAction(target, attacker);
  if (target.hpPips > 0) return false;

  if (target === playerActor) {
    onPlayerDeath();
    return true;
  }

  if (attacker === playerActor) onPlayerKill();
  particleEffects?.triggerHitImpact(attacker, target, comboStep, true);
  target.respawning = false;
  target.hurtCooldown = 0;
  target.hitStun = 0;
  target.invulnTime = 0;
  target.player.dead = true;
  target.player.updateState();
  return true;
}

function applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects) {
  applyKnockback(attacker, target, attackRegion);
  particleEffects.triggerHitImpact(attacker, target, comboStep);
}

function triggerWorldAttackCameraShake(world, particleEffects) {
  const physics = world?.worldPhysics || {};
  const power = Math.max(0, Number(physics.cameraShakePower || 0));
  const frames = Math.max(0, Number(physics.cameraShakeFrames || 0));
  if (power <= 0 || frames <= 0) return;

  particleEffects?.shakeScreen?.({
    magnitude: power,
    duration: frames / ACTION_FPS,
    direction: 'random',
    decay: Number(physics.cameraShakeDecay ?? 1) >= 0.5,
  });
}

function targetHurtInvincibleTime(hurtRegions) {
  const times = (hurtRegions || []).map((region) => Number(region?.reaction?.invincibleTime || 0));
  return Math.max(0, ...times);
}

function applyKnockback(attacker, target, attackRegion) {
  const knockback = Math.max(0, Number(attackRegion?.reaction?.knockback || 0));
  if (knockback <= 0) return;
  const deltaX = Number(target.player.x || 0) - Number(attacker.player.x || 0);
  const direction = deltaX === 0 ? Number(attacker.player.facing || 1) : Math.sign(deltaX);
  target.player.vx = Number(target.player.vx || 0) + direction * knockback;
}

function requestHurtAction(target, attacker) {
  const facing = Number(attacker?.player?.x || 0) < Number(target.player.x || 0) ? -1 : 1;
  requestRuntimeAction(target.player, 'hurt', facing, 'tap');
}
