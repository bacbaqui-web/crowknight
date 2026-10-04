import {
  overlappingAttackRegion,
  overlappingCollisionHurtRegion,
  overlappingGuardBlockAttackRegion,
} from './interaction_overlap_helper.js';
import { debugInteractionRuntimeLog } from './interaction_region_engine.js';
import { isRuntimeDebugEnabled } from './runtime_debug_state.js';
import { cloneInteractionRegionSnapshot } from './interaction_swept_region_helper.js';
import { projectileAttackRegion, removeProjectile } from './projectile_runtime_engine.js';
import { resolveCollisionInteractions, firstCollisionRegion } from './combat_collision_helper.js';
import { createInteractionRegionFrameCache, cachedInteractionRegions } from './combat_cache_helper.js';
import {
  shouldBlockMobBossDamage,
  logMobBossDamageBlocked,
  cancelHitByActorRule,
  enemyActorRuleForActor,
} from './combat_rule_helper.js';
import {
  applyInteractionDamage,
  applyHitReaction,
  triggerWorldAttackCameraShake,
  targetHurtInvincibleTime,
} from './combat_reaction_helper.js';

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

export function resolveCollisionHurtInteractions({
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

export function syncPreviousAttackRegions(actor, attackRegions = []) {
  const actionKey = actor.player.actionKey;
  actor.previousAttackRegions = attackRegions.map((region) => cloneInteractionRegionSnapshot(region, actionKey));
}

export function updateActorCombatTimers(actors, dt) {
  actors.forEach((actor) => {
    actor.hurtCooldown = Math.max(0, actor.hurtCooldown - dt);
    actor.hitStun = Math.max(0, actor.hitStun - dt);
    actor.invulnTime = Math.max(0, actor.invulnTime - dt);
    actor.hitCancelFlashTime = Math.max(0, Number(actor.hitCancelFlashTime || 0) - dt);
  });
}

export function shouldSkipTarget(attacker, target) {
  return (
    target === attacker ||
    target.player?.dead === true ||
    target.respawning ||
    target.hurtCooldown > 0 ||
    target.invulnTime > 0 ||
    target.player.isRolling
  );
}
