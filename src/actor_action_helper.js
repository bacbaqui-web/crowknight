import { advanceCustomActionRuntime, updateActionTriggerRuntime } from './action_trigger_engine.js';
import { timelineFrameDelta } from './timeline_playback_helper.js';

export function updatePuppetPlayer(player, dt, keys, pressed, world) {
  advanceActorClock(player, dt);
  updateActionTriggerRuntime(player, dt, keys, pressed);
  advanceCustomActionRuntime(player, dt);
  applyWorldPhysics(player, dt, world);
  updatePuppetPlayerState(player);
}

export function updatePuppetNpc(player, dt, target, world, bounds = null) {
  void target;
  void bounds;
  advanceActorClock(player, dt);
  advanceCustomActionRuntime(player, dt);
  applyWorldPhysics(player, dt, world);
  updatePuppetPlayerState(player);
}

export function updatePuppetPlayerState(player) {
  const fallbackActionKey = player.resolveFallbackActionKey?.() || 'idle';
  player.fallbackActionKey = fallbackActionKey;
  if (player.state !== fallbackActionKey) {
    player.state = fallbackActionKey;
    player.stateTime = 0;
    return;
  }
  player.state = fallbackActionKey;
}

export function getPuppetJumpRiseProgress() {
  return 1;
}

export function canPuppetAirFlap() {
  return false;
}

export function isPuppetGliding(player) {
  player.glideActive = false;
  return false;
}

export function tryPuppetAttack() {
  return false;
}

export function updatePuppetGuardInput(player) {
  player.guardActive = false;
  player.guardHits = 0;
  player.guardLockedUntilRelease = false;
}

export function registerPuppetGuardBlock() {
  return false;
}

function advanceActorClock(player, dt) {
  player.animTime += dt;
  player.stateTime += dt;
  player.hurtTime = 0;
  player.guardBlockTime = 0;
  player.guardBreakTime = 0;
  player.dashTime = 0;
  player.dashCooldown = 0;
  player.attackTime = 0;
  player.jumpAttackTime = 0;
  player.attackCooldown = 0;
  player.comboTimer = 0;
  player.airFlapCooldownTime = 0;
  player.jumpHoldTime = 0;
  player.glideTime = 0;
  player.glideActive = false;
}

function applyWorldPhysics(player, dt, world) {
  if (!world) return;
  const physics = normalizeRuntimeWorldPhysics(world.worldPhysics);
  const frameDelta = timelineFrameDelta(dt);
  const floorY = Number.isFinite(world.floorY) ? world.floorY : player.floorY;
  const velocityControl = player.velocityControl || {};
  player.floorY = Number.isFinite(floorY) ? floorY : player.y;

  if (Number.isFinite(player.floorY) && player.y < player.floorY) player.onGround = false;
  player.vx = velocityControl.x ? Number(player.vx || 0) : applyInertia(player, 'vx', physics.inertia, frameDelta);
  player.vy =
    player.onGround && !velocityControl.y
      ? 0
      : velocityControl.y
        ? Number(player.vy || 0)
        : applyInertia(player, 'vy', physics.inertia, frameDelta);
  if (player.vy < -0.0001) player.onGround = false;
  if (!player.onGround) player.vy += physics.gravity * frameDelta;

  player.x += player.vx * frameDelta;
  player.y += player.vy * frameDelta;

  if (Number.isFinite(player.floorY) && player.y >= player.floorY) {
    player.y = player.floorY;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  player.x = Math.max(world.minX ?? player.x, Math.min(world.maxX ?? player.x, player.x));
  player.velocityControl = null;
}

function normalizeRuntimeWorldPhysics(value = {}) {
  return {
    gravity: Math.max(0, Number(value.gravity ?? 1)),
    inertia: Math.max(0, Number(value.inertia ?? 30)),
  };
}

function applyInertia(player, prop, inertiaFrames, frameDelta) {
  const value = Number(player[prop] || 0);
  const stateKey = `${prop}Inertia`;
  const absValue = Math.abs(value);
  const sign = Math.sign(value);
  if (absValue <= 0.0001) {
    player[stateKey] = null;
    return 0;
  }
  if (inertiaFrames <= 0) {
    player[stateKey] = null;
    return 0;
  }

  const state = player[stateKey] || {};
  const startAbs = state.sign !== sign || absValue > Number(state.startAbs || 0) ? absValue : Number(state.startAbs);
  const decrement = (startAbs / inertiaFrames) * frameDelta;
  const nextAbs = Math.max(0, absValue - decrement);
  player[stateKey] = nextAbs > 0 ? { sign, startAbs } : null;
  return nextAbs * sign;
}
