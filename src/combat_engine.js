import { requestRuntimeAction } from './action_trigger_engine.js';
import { isActionMirrorEnabled } from './action_mirror_helper.js';
import { resetPlayerActionState } from './actor_state.js';
import { syncActorHealthCapacity } from './actor_tuning_helper.js';
import { isEnemyAiActionRegistered, resolveEnemyAiSettings } from './enemy_ai_settings_helper.js';
import { activeActionFormulaAtProgress } from './formula_runtime_engine.js';
import { debugInteractionRuntimeLog } from './interaction_region_engine.js';
import { isRuntimeDebugEnabled } from './runtime_debug_state.js';
import { ACTION_FPS } from './game_config_data.js';
import { normalizeCharacterGroup } from './character_group_data.js';
import { startDeathRagdoll } from './death_ragdoll_engine.js';
import { timelineFrameCount } from './timeline_playback_helper.js';
import {
  cloneInteractionRegionSnapshot,
  regionPoints,
  sweptInteractionRegion,
} from './interaction_swept_region_helper.js';
import { projectileAttackRegion, removeProjectile } from './projectile_runtime_engine.js';

export function updateBattleActorMotion({ actors, playerActor, keys, pressed, world, dt }) {
  updateActorCombatTimers(actors, dt);

  playerActor.player.update(dt, keys, pressed, world);

  actors
    .filter((actor) => actor !== playerActor)
    .forEach((actor) => {
      if (actor.respawning) return;
      faceNpcActorTowardPlayer(actor, playerActor);
      runEnemyRangeAi(actor, playerActor);
      actor.player.updateNpc(dt, playerActor.player, world);
    });
}

function faceNpcActorTowardPlayer(actor, playerActor) {
  if (!shouldNpcFacePlayer(actor, playerActor)) return;
  const lockedFacing = npcLockFormulaFacing(actor, playerActor);
  if (lockedFacing) {
    actor.player.facing = lockedFacing;
    return;
  }
  const deltaX = Number(playerActor.player.x || 0) - Number(actor.player.x || 0);
  if (Math.abs(deltaX) <= 0.0001) return;
  actor.player.facing = deltaX < 0 ? -1 : 1;
}

function npcLockFormulaFacing(actor, playerActor) {
  const player = actor?.player;
  const targetPlayer = playerActor?.player;
  if (!player || !targetPlayer) return null;
  const settings = player.actionSettings?.[player.actionKey] || {};
  const lock = activeActionFormulaAtProgress(
    settings,
    'lock',
    player.getActionFrameProgress?.() || 0,
    timelineFrameCount(settings)
  );
  if (!lock) return null;
  if (lock.direction === 'away') return oppositeFacingFromPlayer(actor, playerActor);
  if (lock.direction === 'left' || lock.direction === 'right') {
    const originalFacing = lock.direction === 'left' ? -1 : 1;
    const actionFacing = player.customActionFacing || player.facing;
    const mirrorSign = isActionMirrorEnabled(settings) && Number(actionFacing) < 0 ? -1 : 1;
    return originalFacing * mirrorSign;
  }
  return null;
}

function oppositeFacingFromPlayer(actor, playerActor) {
  const deltaX = Number(playerActor?.player?.x || 0) - Number(actor?.player?.x || 0);
  if (Math.abs(deltaX) <= 0.0001) return Number(actor?.player?.facing || 1) < 0 ? -1 : 1;
  return deltaX < 0 ? 1 : -1;
}

function shouldNpcFacePlayer(actor, playerActor) {
  if (!actor?.player || !playerActor?.player || actor === playerActor) return false;
  const group = normalizeCharacterGroup(actor.group, '');
  return group === 'mobs' || group === 'bosses';
}

function runEnemyRangeAi(actor, playerActor) {
  if (!shouldNpcFacePlayer(actor, playerActor)) return;
  if (actor.player.isCustomActionActive) return;

  const distance = Math.abs(Number(playerActor.player.x || 0) - Number(actor.player.x || 0));
  const candidate = enemyRangeActionCandidate(actor, distance);
  if (!candidate) return;

  const started = requestRuntimeAction(actor.player, candidate.key, actor.player.facing, 'tap');
  if (started) startEnemyAiActionCooldown(actor, candidate);
}

function enemyRangeActionCandidate(actor, distance) {
  const cooldowns = actor.aiActionCooldowns || {};
  return (actor.player.actions || [])
    .map((action, index) => ({
      action,
      registered: isEnemyAiActionRegistered(actor.player.actionSettings?.[action.key] || {}),
      ai: resolveEnemyAiSettings(actor.player.actionSettings?.[action.key] || {}),
      index,
    }))
    .filter(({ action, ai, registered }) => {
      if (!registered) return false;
      if (!ai.enabled) return false;
      if (Number(cooldowns[action.key] || 0) > 0) return false;
      if (distance < ai.minRange || distance > ai.maxRange) return false;
      if (ai.chance <= 0) return false;
      return ai.chance >= 100 || Math.random() * 100 <= ai.chance;
    })
    .sort((a, b) => b.ai.priority - a.ai.priority || a.index - b.index)[0]?.action;
}

function startEnemyAiActionCooldown(actor, action) {
  const ai = resolveEnemyAiSettings(actor.player.actionSettings?.[action.key] || {});
  const cooldown = Math.max(0, Number(ai.cooldown || 0));
  if (!cooldown) return;
  actor.aiActionCooldowns ||= {};
  actor.aiActionCooldowns[action.key] = cooldown;
}

export function resolveCombat({
  actors,
  playerActor,
  world,
  particleEffects,
  onPlayerDeath,
  onPlayerKill,
  onEnemyDeath,
}) {
  const regionCache = createInteractionRegionFrameCache();
  resolveCollisionInteractions(actors, regionCache);
  resolveCollisionHurtInteractions({ actors, playerActor, onPlayerDeath, onPlayerKill, onEnemyDeath, regionCache });

  actors.forEach((attacker) => {
    if (attacker.player?.dead) return;
    if (attacker.respawning) return;
    const attackRegions = cachedInteractionRegions(regionCache, attacker, 'attack');
    if (!attackRegions.length) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(attacker, target)) return;
      if (shouldBlockMobBossDamage(attacker, target)) {
        logMobBossDamageBlocked(attacker, target, 'attack-hurt-mob-boss-blocked');
        return;
      }
      if (target.lastHitSerials[attacker.id] === attacker.player.attackSerial) return;
      const targetHurtRegions = cachedInteractionRegions(regionCache, target, 'hurt');
      const guardBlockAttackRegion = overlappingGuardBlockAttackRegion(
        attacker,
        attackRegions,
        cachedInteractionRegions(regionCache, target, 'guard')
      );
      const attackRegion = overlappingAttackRegion(attacker, attackRegions, targetHurtRegions);
      if (!attackRegion && !guardBlockAttackRegion) {
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

      const comboStep = attacker.player.comboStep || 1;
      target.lastHitSerials[attacker.id] = attacker.player.attackSerial;

      if (guardBlockAttackRegion) {
        triggerWorldAttackCameraShake(world, particleEffects);
        if (isRuntimeDebugEnabled()) {
          debugInteractionRuntimeLog('guard-block', {
            attacker: attacker.id,
            target: target.id,
            attackerAction: attacker.player.actionKey,
            targetAction: target.player.actionKey,
            damage: 0,
            knockback: guardBlockAttackRegion.reaction.knockback,
          });
        }
        applyHitReaction(attacker, target, guardBlockAttackRegion, comboStep, particleEffects, world);
        return;
      }

      if (cancelHitByActorRule(target, world)) {
        if (isRuntimeDebugEnabled()) {
          debugInteractionRuntimeLog('hit-cancelled', {
            attacker: attacker.id,
            target: target.id,
            attackerAction: attacker.player.actionKey,
            targetAction: target.player.actionKey,
            chance: enemyActorRuleForActor(world, target).hitCancelChance,
          });
        }
        return;
      }

      triggerWorldAttackCameraShake(world, particleEffects);
      if (isRuntimeDebugEnabled()) {
        debugInteractionRuntimeLog('attack-hurt-overlap', {
          attacker: attacker.id,
          target: target.id,
          attackerAction: attacker.player.actionKey,
          targetAction: target.player.actionKey,
          damage: 1,
          knockback: attackRegion.reaction.knockback,
        });
      }
      const removed = applyInteractionDamage({
        attacker,
        target,
        attackRegion,
        damage: 1,
        invincibleTime: targetHurtInvincibleTime(targetHurtRegions),
        comboStep,
        playerActor,
        particleEffects,
        world,
        onPlayerDeath,
        onPlayerKill,
        onEnemyDeath,
      });
      if (removed) return;

      applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects, world);
    });
  });

  actors.forEach((actor) => syncPreviousAttackRegions(actor, cachedInteractionRegions(regionCache, actor, 'attack')));
}

export function resolveProjectileCombat({
  projectiles = [],
  actors = [],
  playerActor = null,
  world = null,
  particleEffects = null,
  onPlayerDeath = () => {},
  onPlayerKill = () => {},
  onEnemyDeath = () => {},
} = {}) {
  const regionCache = createInteractionRegionFrameCache();
  projectiles.forEach((projectile) => {
    if (!projectile?.active || !projectile.owner) return;
    const attackRegion = projectileAttackRegion(projectile);
    actors.forEach((target) => {
      if (!projectile.active) return;
      if (shouldSkipTarget(projectile.owner, target)) return;
      if (shouldBlockMobBossDamage(projectile.owner, target)) {
        logMobBossDamageBlocked(projectile.owner, target, 'projectile-mob-boss-blocked');
        return;
      }
      if (projectile.hitTargets?.has(target)) return;
      const targetHurtRegions = cachedInteractionRegions(regionCache, target, 'hurt');
      const hurtRegion = overlappingAttackRegion(projectile.owner, [attackRegion], targetHurtRegions);
      if (!hurtRegion) return;

      projectile.hitTargets?.add(target);
      if (cancelHitByActorRule(target, world)) {
        if (isRuntimeDebugEnabled()) {
          debugInteractionRuntimeLog('projectile-hit-cancelled', {
            attacker: projectile.owner.id,
            target: target.id,
            attackerAction: projectile.owner.player.actionKey,
            targetAction: target.player.actionKey,
            chance: enemyActorRuleForActor(world, target).hitCancelChance,
          });
        }
        removeProjectile(projectile);
        return;
      }
      triggerWorldAttackCameraShake(world, particleEffects);
      const removed = applyInteractionDamage({
        attacker: projectile.owner,
        target,
        attackRegion,
        damage: 1,
        invincibleTime: targetHurtInvincibleTime(targetHurtRegions),
        comboStep: 1,
        playerActor,
        particleEffects,
        world,
        onPlayerDeath,
        onPlayerKill,
        onEnemyDeath,
      });
      removeProjectile(projectile);
      if (!removed) applyHitReaction(projectile.owner, target, attackRegion, 1, particleEffects, world);
    });
  });
}

function resolveCollisionInteractions(actors, regionCache) {
  for (let aIndex = 0; aIndex < actors.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < actors.length; bIndex += 1) {
      const a = actors[aIndex];
      const b = actors[bIndex];
      if (a.respawning || b.respawning || a.player?.dead || b.player?.dead) continue;
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

function firstCollisionRegion(regions = []) {
  return regions.find((region) => region?.active !== false) || null;
}

function collisionPushShares(a, b, shares) {
  if (isBossActor(a) && isMobActor(b)) return { aShare: 0, bShare: 1 };
  if (isMobActor(a) && isBossActor(b)) return { aShare: 1, bShare: 0 };
  return shares;
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

function resolveCollisionHurtInteractions({
  actors,
  playerActor,
  onPlayerDeath,
  onPlayerKill,
  onEnemyDeath,
  regionCache,
}) {
  actors.forEach((source) => {
    if (source.player?.dead) return;
    if (source.respawning) return;
    const collisionRegion = firstCollisionRegion(cachedInteractionRegions(regionCache, source, 'collision'));
    if (!collisionRegion) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(source, target)) return;
      if (shouldBlockMobBossDamage(source, target)) {
        logMobBossDamageBlocked(source, target, 'collision-hurt-mob-boss-blocked');
        return;
      }
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
        onEnemyDeath,
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

function overlappingAttackRegion(attacker, attackRegions, hurtRegions) {
  return attackRegions.find((attackRegion) =>
    (hurtRegions || []).some(
      (hurtRegion) =>
        hurtRegion?.reaction?.hurtByAttack !== false && attackRegionOverlaps(attacker, attackRegion, hurtRegion)
    )
  );
}

function overlappingGuardBlockAttackRegion(attacker, attackRegions, guardRegions) {
  return attackRegions.find((attackRegion) =>
    (guardRegions || []).some(
      (guardRegion) =>
        (guardRegion?.reaction?.guard === true || guardRegion?.reaction?.block === true) &&
        attackRegionOverlaps(attacker, attackRegion, guardRegion)
    )
  );
}

function attackRegionOverlaps(attacker, attackRegion, targetRegion) {
  if (interactionRegionsOverlap(attackRegion, targetRegion)) return true;
  if (attackRegion?.reaction?.hitMode !== 'trace') return false;
  const previous = previousAttackRegion(attacker, attackRegion);
  if (!previous) return false;
  return interactionRegionsOverlap(sweptInteractionRegion(previous, attackRegion), targetRegion);
}

function previousAttackRegion(attacker, attackRegion) {
  const currentActionKey = attacker?.player?.actionKey;
  return (attacker?.previousAttackRegions || []).find(
    (region) => region?.key === attackRegion?.key && region?.actionKey === currentActionKey
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

function syncPreviousAttackRegions(actor, attackRegions = []) {
  const actionKey = actor.player.actionKey;
  actor.previousAttackRegions = attackRegions.map((region) => cloneInteractionRegionSnapshot(region, actionKey));
}

function projectPolygon(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.y * axis.y);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function maintainEnemyFlow({ actors = [], playerActor = null, world = null, dt = 0 } = {}) {
  const enemyActors = actors.filter((actor) => shouldNpcFacePlayer(actor, playerActor));
  const byActorId = groupEnemyActorsById(enemyActors);

  byActorId.forEach((actorGroup, actorId) => {
    const rule = resolveEnemyActorSpawnRule(world, actorId);
    const aliveActors = actorGroup.filter((actor) => !actor.respawning && !actor.player?.dead);

    aliveActors.slice(rule.maxAlive).forEach((actor) => hideEnemyActor(actor));
    actorGroup.forEach((actor) => updateEnemyRespawn(actor, playerActor, world, actorGroup, rule, dt));
  });
}

function hideEnemyActor(actor) {
  actor.respawning = true;
  actor.enemyRespawnTimer = null;
  actor.hitCancelFlashTime = 0;
  actor.player.dead = true;
  actor.player.deathRagdoll = null;
  actor.player.vx = 0;
  actor.player.vy = 0;
}

function updateEnemyRespawn(actor, playerActor, world, actorGroup, rule, dt) {
  if (!actor.player?.dead && !actor.respawning) return;

  if (actor.enemyRespawnTimer == null) actor.enemyRespawnTimer = actor.respawning ? 0 : rule.intervalSec;
  actor.enemyRespawnTimer = Math.max(0, Number(actor.enemyRespawnTimer || 0) - Math.max(0, Number(dt || 0)));
  if (actor.enemyRespawnTimer > 0) return;
  if (activeEnemyCount(actorGroup, playerActor) >= rule.maxAlive) return;

  respawnEnemyActor(actor, playerActor, world);
}

function activeEnemyCount(enemyActors, playerActor) {
  return enemyActors.filter(
    (actor) => shouldNpcFacePlayer(actor, playerActor) && !actor.respawning && !actor.player?.dead
  ).length;
}

function groupEnemyActorsById(enemyActors) {
  const groups = new Map();
  enemyActors.forEach((actor) => {
    const actorId = actor?.id || 'enemy';
    if (!groups.has(actorId)) groups.set(actorId, []);
    groups.get(actorId).push(actor);
  });
  return groups;
}

function resolveEnemyActorSpawnRule(world, actorId) {
  const enemyRules = world?.enemyRules || {};
  const actorRule = enemyRules.spawnRulesByActor?.[actorId] || null;
  const poolRule = Array.isArray(enemyRules.pool) ? enemyRules.pool.find((entry) => entry?.actorId === actorId) : null;
  const baseMaxAlive = Math.max(0, Math.round(Number(actorRule?.maxAlive ?? poolRule?.maxAlive ?? 1)));
  const difficultyLevel = Math.max(0, Math.round(Number(world?.runtimeDifficulty?.difficultyLevel || 0)));
  const perLevel = Math.max(0, Number(enemyRules.difficulty?.spawnIncreaseByActor?.[actorId] || 0));
  return {
    maxAlive: Math.max(0, Math.round(baseMaxAlive + difficultyLevel * perLevel)),
    intervalSec: Math.max(0.1, Number(actorRule?.intervalSec ?? enemyRules.spawnRule?.intervalSec ?? 2)),
  };
}

function respawnEnemyActor(actor, playerActor, world) {
  syncActorHealthCapacity(actor, true);
  applyRuntimeDifficultyHealthCapacity(actor, world, true);
  actor.hpPips = actor.maxHpPips;
  actor.respawning = false;
  actor.enemyRespawnTimer = null;
  actor.invulnTime = 0;
  actor.hurtCooldown = 0;
  actor.hitStun = 0;
  actor.hitCancelFlashTime = 0;
  actor.lastHitSerials = {};
  actor.aiActionCooldowns = {};
  actor.runtimeBossKillCounted = false;
  actor.player.dead = false;
  actor.player.deathRagdoll = null;
  actor.player.x = enemyRespawnX(actor, playerActor, world);
  actor.respawnTargetX = actor.player.x;
  actor.player.y = Number(world?.floorY ?? actor.player.y);
  actor.player.vx = 0;
  actor.player.vy = 0;
  actor.player.facing = Number(playerActor?.player?.x || 0) < Number(actor.player.x || 0) ? -1 : 1;
  actor.player.hurtTime = 0;
  resetPlayerActionState(actor.player);
  actor.player.onGround = true;
  actor.player.updateState();
}

function applyRuntimeDifficultyHealthCapacity(actor, world, refill = false) {
  if (!isBossActor(actor)) return;
  const baseMax = runtimeBaseMaxHp(actor);
  const bonus = Math.max(
    0,
    Math.round(Number(actor.runtimeDifficultyHpBonus ?? world?.runtimeDifficulty?.bossHpBonus ?? 0))
  );
  actor.runtimeBaseMaxHpPips = baseMax;
  actor.maxHpPips = baseMax + bonus;
  actor.hpPips = refill
    ? actor.maxHpPips
    : Math.min(actor.maxHpPips, Math.max(0, Math.round(Number(actor.hpPips || 0))));
}

function runtimeBaseMaxHp(actor) {
  const saved = Number(actor.runtimeBaseMaxHpPips);
  if (Number.isFinite(saved) && saved > 0) return Math.round(saved);
  return Math.max(1, Math.round(Number(actor.tuning?.maxHpPips ?? actor.maxHpPips ?? 1)));
}

function enemyRespawnX(actor, playerActor, world) {
  const spawnRule = world?.enemyRules?.spawnRule || {};
  const min = Math.min(Number(spawnRule.cameraOffsetMin ?? 740), Number(spawnRule.cameraOffsetMax ?? 960));
  const max = Math.max(Number(spawnRule.cameraOffsetMin ?? 740), Number(spawnRule.cameraOffsetMax ?? 960));
  const offset = min + Math.random() * Math.max(0, max - min);
  const playerX = Number(playerActor?.player?.x ?? actor.respawnTargetX ?? actor.player.x ?? 0);
  return playerX + offset;
}

function updateActorCombatTimers(actors, dt) {
  actors.forEach((actor) => {
    actor.hurtCooldown = Math.max(0, actor.hurtCooldown - dt);
    actor.hitStun = Math.max(0, actor.hitStun - dt);
    actor.invulnTime = Math.max(0, actor.invulnTime - dt);
    actor.hitCancelFlashTime = Math.max(0, Number(actor.hitCancelFlashTime || 0) - dt);
    updateEnemyAiCooldowns(actor, dt);
  });
}

function updateEnemyAiCooldowns(actor, dt) {
  if (!actor.aiActionCooldowns) return;
  Object.keys(actor.aiActionCooldowns).forEach((key) => {
    actor.aiActionCooldowns[key] = Math.max(0, Number(actor.aiActionCooldowns[key] || 0) - dt);
    if (actor.aiActionCooldowns[key] <= 0) delete actor.aiActionCooldowns[key];
  });
}

function shouldSkipTarget(attacker, target) {
  return (
    target === attacker ||
    target.player?.dead === true ||
    target.respawning ||
    target.hurtCooldown > 0 ||
    target.invulnTime > 0 ||
    target.player.isRolling
  );
}

function shouldBlockMobBossDamage(attacker, target) {
  return isMobActor(attacker) && isBossActor(target);
}

function isMobActor(actor) {
  return normalizeCharacterGroup(actor?.group, '') === 'mobs';
}

function isBossActor(actor) {
  return normalizeCharacterGroup(actor?.group, '') === 'bosses';
}

function logMobBossDamageBlocked(attacker, target, event) {
  if (!isRuntimeDebugEnabled()) return;
  debugInteractionRuntimeLog(event, {
    attacker: attacker?.id,
    target: target?.id,
    attackerGroup: normalizeCharacterGroup(attacker?.group, ''),
    targetGroup: normalizeCharacterGroup(target?.group, ''),
    attackerAction: attacker?.player?.actionKey,
    targetAction: target?.player?.actionKey,
    reason: 'mob attacks do not affect bosses',
  });
}

function cancelHitByActorRule(target, world) {
  const rule = enemyActorRuleForActor(world, target);
  const chance = Math.max(0, Math.min(100, Number(rule.hitCancelChance || 0)));
  if (chance <= 0) return false;
  if (chance < 100 && Math.random() * 100 >= chance) return false;

  target.hitCancelFlashTime = Math.max(
    Number(target.hitCancelFlashTime || 0),
    Math.max(1, Number(rule.hitCancelFlashFrames || 3)) / ACTION_FPS
  );
  return true;
}

function enemyActorRuleForActor(world, actor) {
  const actorId = actor?.runtimeSourceActorId || actor?.id || '';
  const rules = world?.enemyRules?.actorRulesByActor || {};
  return {
    hitCancelChance: Math.max(0, Math.min(100, Number(rules[actorId]?.hitCancelChance || 0))),
    hitCancelFlashFrames: Math.max(1, Math.min(120, Number(rules[actorId]?.hitCancelFlashFrames || 3))),
  };
}

function applyInteractionDamage({
  attacker,
  target,
  attackRegion,
  damage: rawDamage,
  invincibleTime = 0,
  comboStep,
  playerActor,
  particleEffects,
  world,
  onPlayerDeath,
  onPlayerKill,
  onEnemyDeath,
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
  if (target.hpPips > 0) {
    requestHurtAction(target, attacker);
    return false;
  }

  if (target === playerActor) {
    onPlayerDeath();
    return true;
  }

  if (attacker === playerActor) onPlayerKill();
  onEnemyDeath?.(target);
  startDeathRagdoll(target.player, deathRagdollImpulse(attacker, target, attackRegion), world);
  particleEffects?.triggerHitImpact(attacker, target, comboStep, true);
  target.respawning = false;
  target.enemyRespawnTimer = null;
  target.hurtCooldown = 0;
  target.hitStun = 0;
  target.invulnTime = 0;
  target.player.dead = true;
  target.player.updateState();
  return true;
}

function applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects, world) {
  applyKnockback(attacker, target, attackRegion, world);
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

function applyKnockback(attacker, target, attackRegion, world) {
  const knockback = Math.max(0, Number(attackRegion?.reaction?.knockback || 0));
  const knockbackMode = attackRegion?.reaction?.knockbackMode === 'set' ? 'set' : 'add';
  const extraVx = Number(attackRegion?.reaction?.knockbackExtraVx || 0);
  const extraVy = Number(attackRegion?.reaction?.knockbackExtraVy || 0);
  const facingSign = Number(attacker?.player?.facing || 1) < 0 ? -1 : 1;
  const facingAdjustedExtraVx = extraVx * facingSign;
  const beforeX = Number(target.player.x || 0);
  const beforeVx = Number(target.player.vx || 0);
  const beforeVy = Number(target.player.vy || 0);
  const direction =
    knockbackMode === 'add'
      ? knockbackDirection(attacker, target, attackRegion)
      : { x: facingSign, y: 0, source: 'set-mode-facing' };
  const vectorKnockbackX = knockbackMode === 'add' ? direction.x * knockback : facingSign * knockback;
  const vectorKnockbackY = knockbackMode === 'add' ? direction.y * knockback : 0;
  const finalVx = vectorKnockbackX + facingAdjustedExtraVx;
  const finalVy = vectorKnockbackY + extraVy;
  if (Math.abs(finalVx) <= 0.0001 && Math.abs(finalVy) <= 0.0001) return;
  target.player.vx = Number(target.player.vx || 0) + finalVx;
  target.player.vy = Number(target.player.vy || 0) + finalVy;
  target.player.velocityControl = {
    ...(target.player.velocityControl || {}),
    x: Math.abs(finalVx) > 0.0001 || target.player.velocityControl?.x === true,
    y: Math.abs(finalVy) > 0.0001 || target.player.velocityControl?.y === true,
  };
  if (isRuntimeDebugEnabled()) {
    const debug = {
      target: target.id,
      beforeX,
      beforeVx,
      beforeVy,
      afterApplyVx: Number(target.player.vx || 0),
      afterApplyVy: Number(target.player.vy || 0),
      velocityControlX: target.player.velocityControl.x === true,
      velocityControlY: target.player.velocityControl.y === true,
      knockback,
      knockbackMode,
      vectorKnockbackX,
      vectorKnockbackY,
      knockbackExtraVx: extraVx,
      knockbackExtraVy: extraVy,
      facingAdjustedExtraVx,
      finalVx,
      finalVy,
      directionX: direction.x,
      directionY: direction.y,
      directionSource: direction.source,
      inertia: Number(world?.worldPhysics?.inertia ?? 30),
    };
    target.player.knockbackDebug = debug;
    debugInteractionRuntimeLog('knockback-applied', debug);
  }
}

function knockbackDirection(attacker, target, attackRegion) {
  const previous = previousAttackRegion(attacker, attackRegion);
  if (previous) {
    const previousCenter = interactionRegionCenter(previous);
    const currentCenter = interactionRegionCenter(attackRegion);
    const dx = currentCenter.x - previousCenter.x;
    const dy = currentCenter.y - previousCenter.y;
    const length = Math.hypot(dx, dy);
    if (length > 0.0001) return { x: dx / length, y: dy / length, source: 'attack-region-motion' };
  }
  const deltaX = Number(target.player.x || 0) - Number(attacker.player.x || 0);
  const x = deltaX === 0 ? Number(attacker.player.facing || 1) : Math.sign(deltaX);
  return { x, y: 0, source: 'attacker-to-target' };
}

function deathRagdollImpulse(attacker, target, attackRegion) {
  const previous = previousAttackRegion(attacker, attackRegion);
  if (previous) {
    const previousCenter = interactionRegionCenter(previous);
    const currentCenter = interactionRegionCenter(attackRegion);
    const dx = currentCenter.x - previousCenter.x;
    const dy = currentCenter.y - previousCenter.y;
    const speed = Math.hypot(dx, dy);
    if (speed > 0.0001) {
      return {
        x: dx,
        y: dy,
        power: Math.max(0.9, speed / 34 + Number(attackRegion?.reaction?.knockback || 0) / 420),
      };
    }
  }
  const direction = knockbackDirection(attacker, target, attackRegion);
  const power = Math.max(0.9, Number(attackRegion?.reaction?.knockback || 0) / 420);
  return {
    x: direction.x,
    y: direction.y - 0.22,
    power,
  };
}

function interactionRegionCenter(region) {
  const points = regionPoints(region);
  if (points.length) {
    const total = points.reduce(
      (sum, point) => ({
        x: sum.x + Number(point.x || 0),
        y: sum.y + Number(point.y || 0),
      }),
      { x: 0, y: 0 }
    );
    return {
      x: total.x / points.length,
      y: total.y / points.length,
    };
  }
  return {
    x: Number(region?.x || 0) + Number(region?.w || 0) / 2,
    y: Number(region?.y || 0) + Number(region?.h || 0) / 2,
  };
}

function requestHurtAction(target, attacker) {
  const facing = Number(attacker?.player?.x || 0) < Number(target.player.x || 0) ? -1 : 1;
  requestRuntimeAction(target.player, 'hurt', facing, 'tap');
}
