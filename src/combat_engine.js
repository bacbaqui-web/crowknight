import { reflectBarrel } from './boss_hazard_runtime.js';
import { canHitBalloon, isBalloonBomber } from './balloon_bomber_runtime.js';
import { resolveMovementSkills } from './movement_skill_combat.js';
import { resolveParryRelease } from './parry_release_controller.js';
import { updateHealthTrail } from './actor_health_helper.js';
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
  parryRelease = false,
  actors,
  playerActor,
  world,
  particleEffects,
  onPlayerDeath,
  onPlayerKill,
  onEnemyDeath,
}) {
  resolveMovementSkills({ actors, playerActor, world, particleEffects, onPlayerDeath, onPlayerKill, onEnemyDeath });
  if (parryRelease)
    resolveParryRelease({ actors, playerActor, world, particleEffects, onPlayerDeath, onPlayerKill, onEnemyDeath });
  const regionCache = createInteractionRegionFrameCache();
  resolveCollisionInteractions(actors, regionCache, world);
  resolveCollisionHurtInteractions({
    actors,
    playerActor,
    onPlayerDeath,
    onPlayerKill,
    onEnemyDeath,
    regionCache,
    world,
  });

  // Snapshot ground polygons before reactions can change another actor's facing/action.
  const attacks = new Map();
  if (world?.quarterView)
    actors.forEach((actor) => {
      const native = cachedInteractionRegions(regionCache, actor, 'attack');
      const raw = world.quarterView.prepareAttackRegions?.(actor, native) ?? native;
      const regions = world.quarterView.attackRegions?.(actor, raw) ?? raw;
      world.quarterView.captureAttackRegions?.(actor, raw, regions);
      attacks.set(actor, regions);
    });
  actors.forEach((attacker) => {
    if (attacker.player?.dead || attacker.player.runParryStun > 0) return;
    if (attacker.respawning) return;
    const attackRegions = attacks.get(attacker) ?? cachedInteractionRegions(regionCache, attacker, 'attack');
    if (!attackRegions.length) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(attacker, target)) return;
      if (shouldBlockMobBossDamage(attacker, target)) {
        logMobBossDamageBlocked(attacker, target, 'attack-hurt-mob-boss-blocked');
        return;
      }
      if (target.lastHitSerials[attacker.id] === attacker.player.attackSerial) return;
      const rawHurtRegions = cachedInteractionRegions(regionCache, target, 'hurt');
      const targetHurtRegions =
        world?.quarterView?.targetRegions(attacker, target, rawHurtRegions, attackRegions[0]) ?? rawHurtRegions;
      const guardBlockAttackRegion = overlappingGuardBlockAttackRegion(
        attacker,
        attackRegions,
        world?.quarterView?.targetRegions(
          attacker,
          target,
          cachedInteractionRegions(regionCache, target, 'guard'),
          attackRegions[0]
        ) ?? cachedInteractionRegions(regionCache, target, 'guard')
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
        if (target.player.runSkills) {
          applyInteractionDamage({
            attacker,
            target,
            attackRegion: guardBlockAttackRegion,
            damage: 20,
            guarded: true,
            invincibleTime: targetHurtInvincibleTime(targetHurtRegions),
            comboStep,
            playerActor,
            world,
            particleEffects,
            onPlayerDeath,
            onPlayerKill,
            onEnemyDeath,
          });
          return;
        }
        world?.combatSounds?.contact('block', attacker, target);
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
          damage: 20,
          knockback: attackRegion.reaction.knockback,
        });
      }
      const removed = applyInteractionDamage({
        attacker,
        target,
        attackRegion,
        damage: 20,
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

  actors.forEach((actor) =>
    syncPreviousAttackRegions(actor, attacks.get(actor) ?? cachedInteractionRegions(regionCache, actor, 'attack'))
  );
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
    if (
      projectile.bossHazard === 'barrel' &&
      !projectile.reflected &&
      projectile.phase !== 'blast' &&
      playerActor &&
      !playerActor.player.dead
    ) {
      const native = cachedInteractionRegions(regionCache, playerActor, 'attack');
      const prepared = world?.quarterView?.prepareAttackRegions?.(playerActor, native) ?? native;
      const attacks = world?.quarterView?.attackRegions?.(playerActor, prepared) ?? prepared;
      const raw = { ...projectileAttackRegion(projectile), active: true, role: 'hurt' };
      const barrel = world?.quarterView?.projectileRegion?.({ ...projectile, radius: 30 }, raw) ?? raw;
      if (overlappingAttackRegion(playerActor, attacks, [barrel])) reflectBarrel(projectile, playerActor);
    }
    const rawAttackRegion = projectileAttackRegion(projectile);
    if (!rawAttackRegion.active) return;
    const attackRegion = world?.quarterView?.projectileRegion?.(projectile, rawAttackRegion) ?? rawAttackRegion;
    actors.forEach((target) => {
      if (!projectile.active) return;
      if (isBalloonBomber(target.player)) return;
      if (projectile.mageFire && target.player.groundFireHurtTime > 0) return;
      if (shouldSkipTarget(projectile.owner, target)) return;
      if (shouldBlockMobBossDamage(projectile.owner, target)) {
        logMobBossDamageBlocked(projectile.owner, target, 'projectile-mob-boss-blocked');
        return;
      }
      if (projectile.hitTargets?.has(target)) return;
      const rawHurtRegions = cachedInteractionRegions(regionCache, target, 'hurt');
      const targetHurtRegions =
        world?.quarterView?.targetRegions(projectile.owner, target, rawHurtRegions, attackRegion) ?? rawHurtRegions;
      const hurtRegion = overlappingAttackRegion(projectile.owner, [attackRegion], targetHurtRegions);
      if (!hurtRegion) return;

      if (!projectile.mageFire) projectile.hitTargets?.add(target);
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
      if (projectile.mageFire) target.player.groundFireHurtTime = projectile.hitCooldown;
      triggerWorldAttackCameraShake(world, particleEffects);
      const removed = applyInteractionDamage({
        attacker: projectile.owner,
        target,
        attackRegion,
        damage: projectile.damage ?? 20,
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
      if (!removed) {
        applyHitReaction(projectile.owner, target, attackRegion, 1, particleEffects, world);
      }
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
  world = null,
}) {
  actors.forEach((source) => {
    if (source.player?.dead || source.player.runParryStun > 0) return;
    if (source.respawning) return;
    const collisionRegion = firstCollisionRegion(cachedInteractionRegions(regionCache, source, 'collision'));
    if (!collisionRegion) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(source, target)) return;
      if (world?.quarterView && !world.quarterView.sameGroundContact(source, target)) return;
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
          damage: 20,
        });
      }
      applyInteractionDamage({
        attacker: source,
        allowParry: false,
        target,
        damage: 20,
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
    updateHealthTrail(actor, dt);
    actor.player.groundFireHurtTime = Math.max(0, (actor.player.groundFireHurtTime || 0) - dt);
    actor.player.runParryStun = Math.max(0, (actor.player.runParryStun || 0) - dt);
    if (actor.player.runParryPulse) actor.player.runParryPulse.time = Math.max(0, actor.player.runParryPulse.time - dt);
    actor.hurtCooldown = Math.max(0, actor.hurtCooldown - dt);
    actor.hitStun = Math.max(0, actor.hitStun - dt);
    actor.invulnTime = Math.max(0, actor.invulnTime - dt);
    actor.hitCancelFlashTime = Math.max(0, Number(actor.hitCancelFlashTime || 0) - dt);
  });
}

export function shouldSkipTarget(attacker, target) {
  return (
    !canHitBalloon(attacker, target) ||
    target === attacker ||
    target.player?.dead === true ||
    target.respawning ||
    target.hurtCooldown > 0 ||
    target.invulnTime > 0 ||
    target.player.isRolling
  );
}
