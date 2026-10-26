import { interactionReactionFromValue } from './interaction_region_engine.js';
import { blastEllipse } from './powder_bomb_runtime.js';

export const MAGE_FIRE = Object.freeze({
  count: 8,
  interval: 0.16,
  windup: 0.75,
  first: 80,
  spacing: 60,
  flight: 0.34,
  lifetime: 3,
  fade: 0.45,
  radius: 28,
  height: 54,
  hitCooldown: 0.65,
  damage: 10,
});

export function collectMageFire(actor, target, world, dt = 0) {
  const player = actor?.player;
  if (actor?.id !== 'fire_mage') return [];
  if (actor.bossPattern && actor.bossPattern.mode !== 'line') {
    actor.mageFireRuntime = null;
    return [];
  }
  if (
    !player ||
    player.dead ||
    actor.respawning ||
    player.actionKey !== 'mageFire' ||
    player.hurtTime > 0 ||
    target?.player?.dead
  ) {
    actor.mageFireRuntime = null;
    return [];
  }
  const elapsed = Math.max(0, Number(player.customActionElapsed || 0));
  let state = actor.mageFireRuntime;
  if (!state || state.serial !== player.attackSerial || elapsed < state.elapsed) {
    const dx = Number(target?.player?.x ?? player.x + player.facing) - player.x;
    const dz = world?.quarterView ? Number(target?.quarterDepth || 0) - Number(actor.quarterDepth || 0) : 0;
    const length = Math.hypot(dx, dz) || 1;
    state = actor.mageFireRuntime = {
      serial: player.attackSerial,
      elapsed: 0,
      emitted: 0,
      x: player.x,
      depth: Number(actor.quarterDepth || 0),
      floorY: Number(world?.floorY ?? player.y),
      direction: { x: dx || dz ? dx / length : player.facing || 1, z: dz / length },
      quarter: Boolean(world?.quarterView),
    };
  }
  state.elapsed = elapsed;
  const result = [];
  while (state.emitted < MAGE_FIRE.count && elapsed >= MAGE_FIRE.windup + state.emitted * MAGE_FIRE.interval) {
    const index = state.emitted++;
    const aim = mageFireLanding(state, index);
    const start = mageMouthPosition(player);
    const age = Math.max(0, elapsed - MAGE_FIRE.windup - index * MAGE_FIRE.interval - dt);
    result.push({
      mageFire: true,
      active: true,
      owner: actor,
      ownerId: actor.id,
      actionKey: 'mageFire',
      imageKey: 'effect_ground_fire',
      x: start.x,
      y: start.y,
      startX: start.x,
      startY: start.y,
      targetX: aim.x,
      targetY: state.floorY,
      age,
      phase: 'flight',
      phaseTime: 0,
      flight: MAGE_FIRE.flight + index * 0.025,
      seed: index * 1.73,
      radius: MAGE_FIRE.radius,
      hitboxWidth: 56,
      hitboxHeight: 54,
      hitTargets: new Set(),
      damage: MAGE_FIRE.damage,
      hitCooldown: MAGE_FIRE.hitCooldown,
      ...(state.quarter
        ? {
            quarterPlane: 'ground',
            quarterDepth: Number(actor.quarterDepth || 0),
            startDepth: Number(actor.quarterDepth || 0),
            targetDepth: aim.depth,
          }
        : {}),
      reaction: interactionReactionFromValue({ active: 1, attack: 1, knockback: 0, hitMode: 'box' }),
    });
  }
  return result;
}

export function mageFireLanding(state, index) {
  const distance = MAGE_FIRE.first + index * MAGE_FIRE.spacing;
  return { x: state.x + distance * state.direction.x, depth: state.depth + distance * state.direction.z };
}

export function mageMouthPosition(player) {
  const rig = player.rig.head;
  const master = player.getPartOffset('master');
  const angle = ((master.rot || 0) * Math.PI) / 180;
  const x = rig.x + rig.w * 0.62,
    y = rig.y + rig.h * 0.88;
  const scale = Number(player.transform.scale || 1);
  return {
    x: player.x + ((master.x || 0) + x * Math.cos(angle) - y * Math.sin(angle)) * scale * player.facing,
    y: player.y + ((master.y || 0) + x * Math.sin(angle) + y * Math.cos(angle)) * scale,
  };
}

export function advanceMageFire(fire, dt) {
  fire.age += Math.max(0, Number(dt || 0));
  const t = Math.min(1, fire.age / fire.flight);
  fire.x = fire.startX + (fire.targetX - fire.startX) * t;
  fire.y = fire.startY + (fire.targetY - fire.startY) * t - 28 * 4 * t * (1 - t);
  if (fire.startDepth != null) fire.quarterDepth = fire.startDepth + (fire.targetDepth - fire.startDepth) * t;
  fire.phase = t < 1 ? 'flight' : 'burn';
  fire.phaseTime = Math.max(0, fire.age - fire.flight);
  fire.active = fire.phaseTime < MAGE_FIRE.lifetime;
}

export function mageFireAttackRegion(fire) {
  const r = fire.radius,
    h = MAGE_FIRE.height;
  return {
    key: fire.key,
    role: 'attack',
    active: fire.active && fire.phase === 'burn' && fire.phaseTime < MAGE_FIRE.lifetime - MAGE_FIRE.fade,
    x: fire.x - r,
    y: fire.targetY - h,
    w: r * 2,
    h,
    points: blastEllipse(fire.x, fire.targetY - h / 2, r, h / 2),
    reaction: fire.reaction,
  };
}
