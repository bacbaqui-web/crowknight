import { updatePostRollInvulnerability, resetPlayerActionState } from './actorState.js';
import { getCameraX } from './cameraView.js';
import { attackBoxOverlapsHitbox } from './combatGeometry.js';

export function updateBattleActorMotion({ actors, playerActor, keys, pressed, world, dt }) {
  updateActorCombatTimers(actors, dt);

  if (playerActor.hitStun > 0) updateStunnedActor(playerActor, dt, world);
  else playerActor.player.update(dt, keys, pressed, world);
  updatePostRollInvulnerability(playerActor);

  actors.slice(1).forEach((actor) => {
    if (actor.respawning) updateRespawningEnemy(actor, dt, { world, playerActor });
    else if (actor.hitStun > 0) updateStunnedActor(actor, dt, world);
    else actor.player.updateNpc(dt, playerActor.player, world);
    updatePostRollInvulnerability(actor);
  });
}

export function resolveCombat({ actors, playerActor, world, particleEffects, onPlayerDeath, onPlayerKill }) {
  actors.forEach((attacker) => {
    if (attacker.respawning) return;
    const box = attacker.player.attackBox;
    if (!box) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(attacker, target)) return;
      if (target.lastHitSerials[attacker.id] === attacker.player.attackSerial) return;
      if (!attackBoxOverlapsHitbox(box, target.player.hitbox)) return;

      const comboStep = attacker.player.comboStep || 1;
      target.lastHitSerials[attacker.id] = attacker.player.attackSerial;
      if (target.player.isGuarding) {
        const broken = target.player.registerGuardBlock();
        particleEffects.triggerGuardImpact(attacker, target, broken);
        return;
      }

      const removed = applyHitDamage({
        attacker,
        target,
        comboStep,
        playerActor,
        world,
        particleEffects,
        onPlayerDeath,
        onPlayerKill,
      });
      if (removed) return;

      applyHitReaction(attacker, target, comboStep, particleEffects);
    });
  });
}

export function maintainEnemyFlow({ actors, playerActor, world, particleEffects }) {
  const cameraX = getCameraX(playerActor, world);
  actors.slice(1).forEach((actor) => {
    if (actor.respawning) return;
    if (actor.player.x < cameraX - 360) {
      queueEnemyRespawn(actor, { playerActor, world, particleEffects, withDeathBurst: false });
    }
  });
}

function updateActorCombatTimers(actors, dt) {
  actors.forEach((actor) => {
    actor.hurtCooldown = Math.max(0, actor.hurtCooldown - dt);
    actor.hitStun = Math.max(0, actor.hitStun - dt);
    actor.invulnTime = Math.max(0, actor.invulnTime - dt);
  });
}

function updateStunnedActor(actor, dt, world) {
  const player = actor.player;
  player.hurtTime = Math.max(player.hurtTime || 0, actor.hitStun);
  player.animTime += dt;
  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.vx *= 0.88;
  player.x = Math.max(world.minX, Math.min(world.maxX, player.x));

  if (player.y >= world.floorY) {
    player.y = world.floorY;
    player.vy = 0;
    player.onGround = true;
  }

  player.attackTime -= dt;
  player.dashTime -= dt;
  player.dashCooldown -= dt;
  player.attackCooldown -= dt;
  player.jumpHoldTime = 0;
  player.glideActive = false;
  player.updateState();
}

function updateRespawningEnemy(actor, dt, { world, playerActor }) {
  const player = actor.player;
  const direction = Math.sign(actor.respawnTargetX - player.x) || 1;
  player.animTime += dt;
  player.facing = direction;
  player.vx = direction * Math.max(95, player.speed * 0.72);
  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.attackTime = 0;
  player.dashTime = 0;
  player.attackCooldown = 0;
  resetPlayerActionState(player);
  player.dashCooldown = 0;

  if (player.y >= world.floorY) {
    player.y = world.floorY;
    player.vy = 0;
    player.onGround = true;
  }

  if ((direction > 0 && player.x >= actor.respawnTargetX) || (direction < 0 && player.x <= actor.respawnTargetX)) {
    actor.respawning = false;
    player.x = actor.respawnTargetX;
    player.x = Math.max(world.minX, Math.min(world.maxX, player.x));
    player.vx = 0;
    player.facing = actor.respawnTargetX < playerActor.player.x ? 1 : -1;
    player.aiTimer = 0.3;
  }

  player.updateState();
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

function applyHitDamage({
  attacker,
  target,
  comboStep,
  playerActor,
  world,
  particleEffects,
  onPlayerDeath,
  onPlayerKill,
}) {
  target.hpPips = Math.max(0, target.hpPips - 1);
  if (target.hpPips > 0) return false;

  if (target.id === 'player') {
    onPlayerDeath();
    return true;
  }

  if (attacker.id === 'player') onPlayerKill();
  const reaction = attackReaction(attacker, comboStep);
  particleEffects.triggerHitImpact(attacker, target, comboStep, true);
  queueEnemyRespawn(target, {
    playerActor,
    world,
    particleEffects,
    deathBurst: {
      x: attacker.player.facing * Number(reaction.knockbackX || 0),
      y: -Number(reaction.knockbackY || 0),
      power: Number(reaction.deathBurst ?? 1),
    },
  });
  return true;
}

function applyHitReaction(attacker, target, comboStep, particleEffects) {
  const reaction = attackReaction(attacker, comboStep);
  target.hurtCooldown = Math.max(0.18, reaction.stun);
  target.hitStun = reaction.stun;
  target.invulnTime = Math.max(target.invulnTime, target.tuning.invulnerability.hurt);
  target.player.hurtTime = reaction.stun;
  target.player.vx = attacker.player.facing * reaction.knockbackX;
  target.player.vy = -reaction.knockbackY;
  target.player.onGround = false;
  particleEffects.triggerHitImpact(attacker, target, comboStep);
}

function attackReaction(attacker, comboStep) {
  const attackKey = attacker.player.poseKey === 'jumpAttack' ? 'jumpAttack' : `attack${comboStep}`;
  return attacker.tuning.attackBoxes[attackKey] || attacker.tuning.attackBoxes.attack1;
}

function queueEnemyRespawn(
  actor,
  { playerActor, world, particleEffects, withDeathBurst = true, deathBurst = actor.player.facing }
) {
  const fromLeft = false;
  if (withDeathBurst) particleEffects.spawnEnemyDeathBurst(actor, deathBurst);
  actor.hpPips = actor.maxHpPips;
  actor.hurtCooldown = 0;
  actor.hitStun = 0;
  actor.respawning = true;
  actor.invulnTime = 0;
  actor.wasRolling = false;
  const cameraX = getCameraX(playerActor, world);
  actor.respawnTargetX = fromLeft
    ? Math.max(world.minX + 40, cameraX + 120 + Math.random() * 150)
    : cameraX + world.viewW - 220 + Math.random() * 220;
  actor.lastHitSerials = {};
  actor.rollGhosts = [];
  actor.rollGhostTimer = 0;
  actor.player.x = fromLeft ? cameraX - 90 : cameraX + world.viewW + 140;
  actor.player.y = world.floorY;
  actor.player.vx = 0;
  actor.player.vy = 0;
  actor.player.facing = fromLeft ? 1 : -1;
  actor.player.attackTime = 0;
  actor.player.dashTime = 0;
  actor.player.dashCooldown = 0;
  actor.player.attackCooldown = 0;
  actor.player.attackCarrySpeed = 0;
  actor.player.airFlapCooldownTime = 0;
  actor.player.hurtTime = 0;
  resetPlayerActionState(actor.player);
  actor.player.onGround = true;
  actor.player.updateState();
}
