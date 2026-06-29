import { updatePostRollInvulnerability, resetPlayerActionState } from './actorState.js';
import { getCameraX } from './cameraView.js';

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
  resolveCollisionInteractions(actors, world);

  actors.forEach((attacker) => {
    if (attacker.respawning) return;
    const attackRegions = attacker.player.attackInteractionRegions || [];
    if (!attackRegions.length) return;

    actors.forEach((target) => {
      if (shouldSkipTarget(attacker, target)) return;
      if (target.lastHitSerials[attacker.id] === attacker.player.attackSerial) return;
      const attackRegion = overlappingAttackRegion(attackRegions, target.player.hurtInteractionRegions);
      if (!attackRegion) return;

      const comboStep = attacker.player.comboStep || 1;
      target.lastHitSerials[attacker.id] = attacker.player.attackSerial;
      if (isGuardingAttack(target, attackRegion)) {
        const broken = target.player.registerGuardBlock();
        particleEffects.triggerGuardImpact(attacker, target, broken);
        return;
      }

      const removed = applyHitDamage({
        attacker,
        target,
        attackRegion,
        comboStep,
        playerActor,
        world,
        particleEffects,
        onPlayerDeath,
        onPlayerKill,
      });
      if (removed) return;

      applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects);
    });
  });
}

function overlappingAttackRegion(attackRegions, hurtRegions) {
  return attackRegions.find((attackRegion) =>
    (hurtRegions || []).some((hurtRegion) => interactionRegionsOverlap(attackRegion, hurtRegion))
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

function isGuardingAttack(target, attackRegion) {
  if (!target.player.isGuarding) return false;
  const guardRegions = target.player.guardInteractionRegions || [];
  if (!guardRegions.length) return true;
  return guardRegions.some((guardRegion) => interactionRegionsOverlap(attackRegion, guardRegion));
}

function resolveCollisionInteractions(actors, world) {
  for (let leftIndex = 0; leftIndex < actors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < actors.length; rightIndex += 1) {
      resolveActorCollision(actors[leftIndex], actors[rightIndex], world);
    }
  }
}

function resolveActorCollision(left, right, world) {
  if (left.respawning || right.respawning) return;
  const leftRegion = overlappingCollisionRegion(
    left.player.collisionInteractionRegions,
    right.player.collisionInteractionRegions
  );
  if (!leftRegion) return;

  const direction = Math.sign((right.player.x || 0) - (left.player.x || 0)) || 1;
  const push = collisionPushAmount(leftRegion.a, leftRegion.b);
  if (push <= 0) return;

  left.player.x = clampWorldX((left.player.x || 0) - direction * push, world);
  right.player.x = clampWorldX((right.player.x || 0) + direction * push, world);
}

function overlappingCollisionRegion(leftRegions = [], rightRegions = []) {
  for (const leftRegion of leftRegions) {
    const rightRegion = rightRegions.find((region) => interactionRegionsOverlap(leftRegion, region));
    if (rightRegion) return { a: leftRegion, b: rightRegion };
  }
  return null;
}

function collisionPushAmount(a, b) {
  const power = Math.max(Number(a?.reaction?.pushPower || 0), Number(b?.reaction?.pushPower || 0));
  return Math.min(12, power / 60);
}

function clampWorldX(value, world) {
  return Math.max(world.minX, Math.min(world.maxX, value));
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
  attackRegion,
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
  const reaction = interactionReaction(attackRegion);
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

function applyHitReaction(attacker, target, attackRegion, comboStep, particleEffects) {
  const reaction = interactionReaction(attackRegion);
  target.hurtCooldown = Math.max(0.18, reaction.stun);
  target.hitStun = reaction.stun;
  target.invulnTime = Math.max(target.invulnTime, target.tuning.invulnerability.hurt);
  target.player.hurtTime = reaction.stun;
  target.player.vx = attacker.player.facing * reaction.knockbackX;
  target.player.vy = -reaction.knockbackY;
  target.player.onGround = false;
  particleEffects.triggerHitImpact(attacker, target, comboStep);
}

function interactionReaction(attackRegion) {
  return attackRegion?.reaction || fallbackAttackEffect();
}

function fallbackAttackEffect() {
  return { stun: 0.22, knockbackX: 330, knockbackY: 110, deathBurst: 1 };
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
