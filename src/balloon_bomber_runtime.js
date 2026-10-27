import { startDeathRagdoll, updateDeathRagdoll } from './death_ragdoll_engine.js';
import { interactionReactionFromValue } from './interaction_region_engine.js';

export const BALLOON_BOMBER = Object.freeze({
  altitude: 60,
  speed: 58,
  firstDrop: 1.2,
  interval: 1.8,
  radius: 50,
  fallGravity: 1000,
});
export function isBalloonBomber(player) {
  return Boolean(player?.actionSettings?.balloonHover);
}
export function canHitBalloon(attacker, target) {
  if (!isBalloonBomber(target?.player)) return true;
  const p = attacker?.player;
  return (
    target.player.balloonState?.phase === 'hover' &&
    p?.onGround === false &&
    p.actionSettings?.[p.actionKey]?.group === 'attack'
  );
}
export function updateBalloonPlayer(player, dt, target, world) {
  if (!isBalloonBomber(player)) return false;
  dt = Math.max(0, Number(dt || 0));
  const floor = Number(world?.floorY ?? player.floorY ?? player.y);
  const state = (player.balloonState ||= { phase: 'hover', age: 0, nextDrop: BALLOON_BOMBER.firstDrop });
  player.animTime += dt;
  player.stateTime += dt;
  state.age += dt;
  player.floorY = floor;
  player.vx = 0;
  player.vy = 0;
  if (state.phase === 'hover') {
    if (player.dead) return true;
    const dx = Number(target?.x ?? player.x) - player.x;
    const dz = world?.quarterView ? Number(target?.quarterDepth || 0) - Number(player.quarterDepth || 0) : 0;
    if (Math.hypot(dx, dz) > 80 && !target?.dead) player.x += BALLOON_BOMBER.speed * dt * (player.facing || 1);
    player.x = Math.max(world?.minX ?? -Infinity, Math.min(world?.maxX ?? Infinity, player.x));
    player.y = floor - BALLOON_BOMBER.altitude + Math.sin(state.age * 2.4) * 5;
    player.onGround = false;
  } else if (state.phase === 'falling') {
    state.fallTime += dt;
    // The inverted head is 20 units below the rotation pivot at impact.
    const impactY = floor - 20 * (player.transform.scale || 1);
    player.y = Math.min(
      impactY,
      state.startY + 0.5 * BALLOON_BOMBER.fallGravity * Math.max(0, state.fallTime - 0.3) ** 2
    );
    if (player.y >= impactY && state.fallTime >= 0.55) {
      state.phase = 'impact';
      state.impactTime = 0;
      player.dead = true;
      player.onGround = true;
      startDeathRagdoll(player, { x: 0, y: -1, power: 0.65 }, world);
      const excluded = new Set(['cape', 'backpack', 'weapon', 'shield'].map((key) => player.assets[key]));
      player.deathRagdoll.parts = player.deathRagdoll.parts.filter((part) => !excluded.has(part.image));
      for (const part of player.deathRagdoll.parts) {
        part.x = player.x * 2 - part.x;
        part.y = Math.min(floor - part.h * 0.18, 2 * (player.y - 55 * (player.transform.scale || 1)) - part.y);
        part.rot += Math.PI;
      }
      const finish = state.onImpact;
      state.onImpact = null;
      finish?.();
      player.updateState?.();
    }
  } else {
    state.impactTime += dt;
    updateDeathRagdoll(player, dt, world);
  }
  return true;
}
export function popBalloon(target, onImpact) {
  const p = target.player,
    s = p.balloonState;
  if (!s || s.phase !== 'hover') return false;
  Object.assign(s, { phase: 'falling', fallTime: 0, startY: p.y, popX: p.x, popY: p.y, onImpact });
  p.customActionKey = null;
  p.customActionTime = 0;
  p.vx = 0;
  p.vy = 0;
  target.hp = 0;
  return true;
}
export function collectBalloonBombs(actor, world) {
  const p = actor?.player,
    s = p?.balloonState;
  if (!isBalloonBomber(p) || !s || s.phase !== 'hover' || p.dead || actor.respawning || s.age < s.nextDrop) return [];
  // Do not queue a burst after a stalled tab resumes.
  s.nextDrop = s.age + BALLOON_BOMBER.interval;
  const hand = p.weaponAnchorTransform?.();
  const x = hand?.e ?? p.x + 36 * (p.facing || 1),
    y = hand ? hand.f + 9 : p.y - 48;
  const floor = Number(world?.floorY ?? p.floorY ?? p.y);
  return [
    {
      active: true,
      powderBomb: true,
      balloonBomb: true,
      owner: actor,
      ownerId: actor.id,
      actionKey: 'balloonHover',
      x,
      y,
      startX: x,
      startY: y,
      targetX: x,
      targetY: floor,
      arcHeight: 0,
      flightFrames: 6,
      elapsedFrames: 0,
      phase: 'flight',
      phaseTime: 0,
      radius: BALLOON_BOMBER.radius,
      asset: p.assets.weapon,
      hitTargets: new Set(),
      damage: 15,
      quarterPlane: 'ground',
      ...(world?.quarterView
        ? {
            quarterDepth: actor.quarterDepth || 0,
            startDepth: actor.quarterDepth || 0,
            targetDepth: actor.quarterDepth || 0,
          }
        : {}),
      reaction: interactionReactionFromValue({ active: 1, attack: 1, knockback: 12, hitMode: 'box' }),
    },
  ];
}
