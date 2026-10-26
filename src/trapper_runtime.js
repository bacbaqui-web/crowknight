import { requestRuntimeAction } from './action_trigger_engine.js';

export const TRAPPER = Object.freeze({ interval: 4, armTime: 0.55, lifetime: 18, limit: 3, damage: 15, root: 1 });
export function updateTrapperAi(actor, target, world, dt) {
  const p = actor.player;
  if (!p.actionSettings?.trapSet) return false;
  if (p.dead || actor.respawning) return true;
  const s = (p.trapperState ||= { nextSet: 1.2, age: 0, placed: false });
  s.age += dt;
  if (p.isCustomActionActive) {
    if (p.actionKey === 'trapWalk' && s.retreat) p.facing = p.x < target.player.x ? -1 : 1;
    return true;
  }
  if (actor.hitStun > 0 || p.runParryStun > 0) return true;
  const distance = world?.quarterView?.distance(actor, target) ?? Math.abs(p.x - target.player.x);
  if (distance < 420 && s.age >= s.nextSet) {
    if (requestRuntimeAction(p, 'trapSet', p.facing)) {
      s.placed = false;
      s.nextSet = s.age + TRAPPER.interval;
    }
  } else if (distance < 170 || distance > 300) {
    s.retreat = distance < 170;
    if (s.retreat) p.facing *= -1;
    requestRuntimeAction(p, 'trapWalk', p.facing);
  }
  return true;
}
export function collectTraps(actor, world, pool) {
  const p = actor.player,
    s = p.trapperState;
  if (
    !s ||
    p.dead ||
    actor.respawning ||
    !p.onGround ||
    p.actionKey !== 'trapSet' ||
    p.customActionElapsed < 0.55 ||
    s.placed
  )
    return [];
  s.placed = true;
  const existing = pool.filter(
    (t) => t.ratTrap && t.owner === actor && t.active && ['arming', 'armed'].includes(t.phase)
  );
  if (existing.length >= TRAPPER.limit) return [];
  return [makeTrap(actor, world)];
}
export function makeTrap(actor, world) {
  const p = actor.player;
  return {
    ratTrap: true,
    active: true,
    owner: actor,
    ownerId: actor.id,
    x: p.x,
    y: p.y,
    targetY: p.y,
    targetX: p.x,
    quarterDepth: actor.quarterDepth || 0,
    targetDepth: actor.quarterDepth || 0,
    quarterPlane: 'ground',
    phase: 'arming',
    age: 0,
    phaseTime: 0,
    damage: TRAPPER.damage,
    radius: 22,
    assets: p.assets,
    worldFloor: world?.floorY,
  };
}
export function advanceTrap(t, dt) {
  if (!t.ratTrap) return false;
  t.age += dt;
  t.phaseTime += dt;
  if (t.phase === 'arming' && t.age >= TRAPPER.armTime) {
    t.phase = 'armed';
    t.phaseTime = 0;
  }
  if (t.age >= TRAPPER.lifetime || (['broken', 'closed'].includes(t.phase) && t.phaseTime >= 1.2)) t.active = false;
  return true;
}
export function closeTrap(t, phase) {
  t.phase = phase;
  t.phaseTime = 0;
}
export function canStepOnTrap(t, actor, quarter) {
  const p = actor?.player;
  if (
    !p ||
    p.dead ||
    actor.respawning ||
    !p.onGround ||
    p.isRolling ||
    p.runEvadeTime > 0 ||
    actor.invulnTime > 0 ||
    actor.hurtCooldown > 0 ||
    p.trapImmunity > 0 ||
    p.trapRootTime > 0
  )
    return false;
  if (Math.abs(p.y - t.y) > 10) return false;
  return quarter
    ? Math.hypot(p.x - t.x, (actor.quarterDepth || 0) - t.quarterDepth) <= t.radius
    : Math.abs(p.x - t.x) <= t.radius;
}
export function rootInTrap(actor) {
  const p = actor.player;
  p.trapRootTime = TRAPPER.root;
  p.trapImmunity = TRAPPER.root + 0.5;
  p.trapAnchor = { x: p.x, y: p.y, depth: actor.quarterDepth || 0 };
  if (p.actionSettings?.[p.actionKey]?.group === 'movement') {
    p.customActionKey = null;
    p.customActionTime = 0;
  }
  enforceTrapRoot(actor);
}
export function enforceTrapRoot(actor) {
  const p = actor.player,
    a = p.trapAnchor;
  if (!(p.trapRootTime > 0) || !a || p.dead) return;
  p.x = a.x;
  p.y = a.y;
  p.vx = 0;
  p.vy = 0;
  p.onGround = true;
  actor.quarterDepth = a.depth;
  p.quarterDepth = a.depth;
  actor.quarterImpulse = null;
  actor.quarterAirVelocity = null;
  p.customActionTargetMove = null;
}
export function updateTrapTimers(p, dt) {
  p.trapRootTime = Math.max(0, (p.trapRootTime || 0) - dt);
  p.trapImmunity = Math.max(0, (p.trapImmunity || 0) - dt);
  if (!p.trapRootTime) p.trapAnchor = null;
}
