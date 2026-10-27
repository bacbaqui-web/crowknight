import { canHitBalloon, isBalloonBomber, popBalloon } from './balloon_bomber_runtime.js';
import { trySkillParry } from './parry_skill_helper.js';
import { progressionEffects } from './skill_progression_effects.js';
import { runSkillDamageMultiplier } from './skill_runtime_helper.js';
import { recordHealthDamage } from './actor_health_helper.js';
import { requestRuntimeAction } from './action_trigger_engine.js';
import { previousAttackRegion } from './interaction_overlap_helper.js';
import { debugInteractionRuntimeLog } from './interaction_region_engine.js';
import { isRuntimeDebugEnabled } from './runtime_debug_state.js';
import { ACTION_FPS } from './game_config_data.js';
import { startDeathRagdoll } from './death_ragdoll_engine.js';
import { regionPoints } from './interaction_swept_region_helper.js';

export function applyInteractionDamage({
  attacker,
  target,
  attackRegion,
  damage: rawDamage,
  allowParry = true,
  preserveAction = false,
  guarded = false,
  hitSound,
  invincibleTime = 0,
  comboStep,
  playerActor,
  particleEffects,
  world,
  onPlayerDeath,
  onPlayerKill,
  onEnemyDeath,
}) {
  if (!canHitBalloon(attacker, target)) return false;
  if (isBalloonBomber(target.player)) {
    return popBalloon(target, () => {
      if (attacker === playerActor) onPlayerKill?.(target);
      onEnemyDeath?.(target);
      particleEffects?.triggerHitImpact?.(attacker, target, comboStep, true);
      target.enemyRespawnTimer = null;
      target.respawning = false;
    });
  }
  if (target.player.runEvadeTime > 0) return false;
  const blocking = Boolean(
    target.player.runSkills &&
    (guarded ||
      (target.player.runSkillActions?.guard && target.player.customActionKey === target.player.runSkillActions.guard))
  );
  if (blocking) {
    if (allowParry && trySkillParry(attacker, target, world)) return false;
    world?.combatSounds?.contact('block', attacker, target);
  }
  const damage = Math.max(
    0,
    Number(rawDamage ?? 20) *
      (blocking ? 0.2 : 1) *
      (attacker.player.runUpgrades?.damage || 1) *
      runSkillDamageMultiplier(attacker.player) *
      progressionEffects(attacker.player).damage *
      progressionEffects(target.player).armor
  );
  if (!Number.isFinite(damage) || damage <= 0) return false;
  recordHealthDamage(target);
  const actualDamage = Math.min(target.hp, damage);
  target.hp = Math.max(0, target.hp - damage);
  if (actualDamage > 0) world?.quarterView?.showDamage?.(target, actualDamage);
  const lifeSteal = progressionEffects(attacker.player).lifeSteal;
  if (lifeSteal && attacker.hp > 0 && !attacker.player.dead) {
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + actualDamage * lifeSteal);
  }
  if (!blocking) world?.combatSounds?.contact('hit', attacker, target, hitSound);
  target.invulnTime = Math.max(target.invulnTime || 0, Number(invincibleTime || 0));
  if (isRuntimeDebugEnabled()) {
    debugInteractionRuntimeLog('damage-applied', {
      attacker: attacker.id,
      target: target.id,
      attackerAction: attacker.player.actionKey,
      targetAction: target.player.actionKey,
      damage,
      targetHp: target.hp,
    });
  }
  if (target.hp > 0) {
    if (!preserveAction && !blocking && target.player.actionKey !== 'tankCharge' && !target.player.bossStunned)
      requestHurtAction(target, attacker);
    return false;
  }

  if (target === playerActor) {
    world?.combatSounds?.event?.('playerDeath', target);
    onPlayerDeath();
    return true;
  }

  if (attacker === playerActor) onPlayerKill(target);
  onEnemyDeath?.(target);
  startDeathRagdoll(target.player, { ...deathRagdollImpulse(attacker, target, attackRegion), shatter: target.group === 'bosses' }, world);
  if(target.group === 'bosses') particleEffects?.shakeScreen?.({magnitude: 9,duration:0.4,direction:'random',decay:true});
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

export function applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects, world) {
  if (
    target.player.runEvadeTime > 0 ||
    (target.player.runSkills && target.player.customActionKey === target.player.runSkillActions.guard)
  )
    return;
  if (target.player.actionKey === 'tankCharge' || target.player.bossStunned) return;
  applyKnockback(attacker, target, attackRegion, world);
  particleEffects.triggerHitImpact(attacker, target, comboStep);
}

export function triggerWorldAttackCameraShake(world, particleEffects) {
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

export function targetHurtInvincibleTime(hurtRegions) {
  const times = (hurtRegions || []).map((region) => Number(region?.reaction?.invincibleTime || 0));
  return Math.max(0, ...times);
}

export function applyKnockback(attacker, target, attackRegion, world) {
  if (world?.quarterView?.applyKnockback) return world.quarterView.applyKnockback(attacker, target, attackRegion);
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
  const multiplier = (attacker.player.runUpgrades?.knockback || 1) * (target.player.runUpgrades?.resistance || 1);
  const finalVx = (vectorKnockbackX + facingAdjustedExtraVx) * multiplier;
  const finalVy = (vectorKnockbackY + extraVy) * multiplier;
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

export function knockbackDirection(attacker, target, attackRegion) {
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

export function deathRagdollImpulse(attacker, target, attackRegion) {
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

export function interactionRegionCenter(region) {
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

export function requestHurtAction(target, attacker) {
  const facing = Number(attacker?.player?.x || 0) < Number(target.player.x || 0) ? -1 : 1;
  requestRuntimeAction(target.player, 'hurt', facing, 'tap');
}
