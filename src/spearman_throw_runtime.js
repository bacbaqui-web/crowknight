import { requestRuntimeAction } from './action_trigger_engine.js';
import { interactionReactionFromValue } from './interaction_region_engine.js';
import { ACTION_FPS } from './game_config_data.js';

export const SPEARMAN_THROW = Object.freeze({
  survival: 10,
  cooldown: 10,
  meleeRange: 170,
  warning: 1,
  lockAfter: 0.6,
  speed: 900,
  range: 1300,
});
const ACTION = 'spearmanThrow';

export function resetSpearmanThrow(actor) {
  if (!actor?.spearmanThrow) return;
  actor.spearmanThrow = null;
}

export function updateSpearmanThrow(actor, target, dt, world) {
  if (actor?.id !== 'spearman' || !actor.player?.actionSettings?.[ACTION]) return false;
  const player = actor.player;
  if (player.dead || actor.respawning || target?.player?.dead) {
    if (actor.spearmanThrow) {
      actor.spearmanThrow.aim = null;
      actor.spearmanThrow.pending = null;
      actor.spearmanThrow.phase = 'cancelled';
    }
    return false;
  }
  const state = (actor.spearmanThrow ||= { age: 0, phase: 'waiting', thrown: false, timer: 0 });
  state.age += Math.max(0, dt);
  if (state.phase === 'aiming') {
    if (player.actionKey !== ACTION || player.hurtTime > 0 || actor.hitStun > 0 || player.runParryStun > 0) {
      state.phase = 'waiting';
      state.aim = null;
      state.retryAt = state.age + 1;
      return false;
    }
    const previousTime = state.timer;
    state.timer += Math.max(0, dt);
    if (previousTime < SPEARMAN_THROW.lockAfter) state.aim = createAim(actor, target, world);
    player.facing = state.aim.facing;
    player.vx = 0;
    player.vxInertia = 0;
    if (state.timer >= SPEARMAN_THROW.warning) {
      state.pending = createThrownSpear(actor, state.aim);
      state.nextThrowAt = state.age + SPEARMAN_THROW.cooldown;
      state.phase = 'waiting';
      state.aim = null;
    }
    return true;
  }
  if (state.age < Math.max(SPEARMAN_THROW.survival, state.nextThrowAt || 0, state.retryAt || 0)) return false;
  const distance = Math.hypot(
    target.player.x - player.x,
    world?.quarterView ? (target.quarterDepth || 0) - (actor.quarterDepth || 0) : 0
  );
  if (distance <= SPEARMAN_THROW.meleeRange) return false;
  if (player.isCustomActionActive || !player.onGround || player.hurtTime > 0 || actor.hitStun > 0) return false;
  if (!requestRuntimeAction(player, ACTION, player.facing, 'tap')) return false;
  state.phase = 'aiming';
  state.timer = 0;
  state.aim = createAim(actor, target, world);
  player.vx = 0;
  player.vxInertia = 0;
  return true;
}

export function takeSpearmanProjectile(actor) {
  const state = actor?.spearmanThrow;
  const pending = state?.pending;
  if (state) state.pending = null;
  return actor?.player?.dead || actor?.respawning ? null : pending;
}

function createAim(actor, target, world) {
  const player = actor.player;
  const facing = target.player.x < player.x ? -1 : 1;
  const scale = Number(player.transform?.scale || 1);
  const startX = player.x + 20 * scale * facing;
  const startY = player.y - 65 * scale;
  const dx = target.player.x - startX;
  const dy = target.player.y - 50 * Number(target.player.transform?.scale || 1) - startY;
  const depth = Number(actor.quarterDepth || 0);
  const dz = world?.quarterView ? Number(target.quarterDepth || 0) - depth : 0;
  const length = Math.hypot(dx, dy, dz) || 1;
  const distance = SPEARMAN_THROW.range;
  return {
    startX,
    startY,
    targetX: startX + (dx / length) * distance,
    targetY: startY + (dy / length) * distance,
    facing,
    direction: { x: dx / length, y: dy / length, z: dz / length },
    ...(world?.quarterView
      ? {
          startDepth: depth,
          targetDepth: depth + (dz / length) * distance,
          quarterAim: { x: dx / (Math.hypot(dx, dz) || 1), z: dz / (Math.hypot(dx, dz) || 1) },
        }
      : {}),
  };
}

function createThrownSpear(actor, aim) {
  return {
    ...aim,
    active: true,
    owner: actor,
    ownerId: actor.id,
    actionKey: ACTION,
    asset: actor.player.assets.weapon,
    linearSpear: true,
    x: aim.startX,
    y: aim.startY,
    previousX: aim.startX,
    previousY: aim.startY,
    ...(aim.startDepth != null ? { quarterDepth: aim.startDepth, quarterPlane: 'ground' } : {}),
    elapsedFrames: 0,
    flightFrames: (SPEARMAN_THROW.range / SPEARMAN_THROW.speed) * ACTION_FPS,
    arcHeight: 0,
    hitboxWidth: 145,
    hitboxHeight: 11,
    hitTargets: new Set(),
    angle: Math.atan2(aim.targetY - aim.startY, aim.targetX - aim.startX),
    reaction: interactionReactionFromValue({ active: 1, attack: 1, knockback: 35, hitMode: 'box' }),
  };
}
