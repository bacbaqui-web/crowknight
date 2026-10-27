import { interactionReactionFromValue } from './interaction_region_engine.js';

export function makeBossHazard(actor, target, world, kind, options = {}) {
  const x = actor.player.x,
    z = actor.quarterDepth || 0,
    floor = world.floorY;
  const tx = options.x ?? target.player.x,
    tz = options.z ?? (target.quarterDepth || 0);
  const dx = tx - x,
    dz = tz - z,
    length = Math.hypot(dx, dz) || 1;
  const radius = { roller: 75, giant: 155, barrel: 125, mine: 80, fireball: 70, rain: 65, missile: 85, punch: 45 }[
    kind
  ];
  return {
    bossHazard: kind,
    powderBomb: true,
    active: true,
    owner: actor,
    ownerId: actor.id,
    originalOwner: actor,
    x,
    y: floor,
    quarterDepth: z,
    startX: x,
    startDepth: z,
    startY: actor.player.y - 75,
    targetX: tx,
    targetDepth: tz,
    targetY: floor,
    quarterPlane: 'ground',
    quarterAim: { x: dx / length, z: dz / length },
    age: 0,
    phase: 'flight',
    phaseTime: 0,
    radius,
    damage: kind === 'barrel' ? 65 : kind === 'giant' ? 35 : kind === 'punch' ? 15 : 20,
    fuse:
      kind === 'missile'
        ? 2.4
        : kind === 'barrel'
          ? 5
          : kind === 'roller'
            ? 3
            : kind === 'mine'
              ? 3
              : kind === 'punch'
                ? 0.12
                : kind === 'rain'
                  ? 1.25
                  : 1.8,
    asset: kind === 'mine' ? null : actor.player.assets?.[kind === 'barrel' ? 'backpack' : 'weapon'],
    hitTargets: new Set(),
    reaction: interactionReactionFromValue({ active: 1, attack: 1, knockback: 1, hitMode: 'box' }),
  };
}
export function advanceBossHazard(h, dt, target) {
  if (!h.bossHazard) return false;
  h.age += Math.max(0, dt);
  const kind = h.bossHazard,
    t = Math.min(1, h.age / h.fuse);
  if (h.phase === 'blast') {
    h.phaseTime += dt;
    if (h.phaseTime > 0.4) h.damageSpent = true;
    if (h.phaseTime > (kind === 'punch' ? 0.4 : 1.2)) h.active = false;
    return true;
  }
  if (kind === 'roller' || kind === 'barrel') {
    const speed = kind === 'roller' ? 240 : 180;
    h.x += h.quarterAim.x * speed * dt;
    h.quarterDepth += h.quarterAim.z * speed * dt;
    h.y = h.targetY - (kind === 'roller' ? Math.abs(Math.sin(h.age * 11)) * 25 : 0);
    h.targetX = h.x;
    h.targetDepth = h.quarterDepth;
  } else if (kind === 'giant' || kind === 'rain') {
    const travel = kind === 'giant' ? Math.min(1, t / 0.45) : 1;
    h.x = h.startX + (h.targetX - h.startX) * travel;
    h.quarterDepth = h.startDepth + (h.targetDepth - h.startDepth) * travel;
    h.y =
      kind === 'giant'
        ? h.startY + (h.targetY - h.startY) * t - 650 * Math.sin(t * Math.PI)
        : h.targetY - 650 * (1 - t * t);
  } else if (kind === 'missile') {
    const falling = Math.max(0, (t - 0.35) / 0.65);
    h.x = h.startX + (h.targetX - h.startX) * falling;
    h.quarterDepth = h.startDepth + (h.targetDepth - h.startDepth) * falling;
    h.y = t < 0.35 ? h.startY - (750 * t) / 0.35 : h.targetY - 800 * (1 - falling * falling);
  } else if (kind === 'fireball') {
    h.x = h.startX + (h.targetX - h.startX) * t;
    h.quarterDepth = h.startDepth + (h.targetDepth - h.startDepth) * t;
    h.y = h.startY + (h.targetY - h.startY) * t - 80 * Math.sin(t * Math.PI);
  } else if (kind === 'mine') {
    h.x = h.targetX;
    h.quarterDepth = h.targetDepth;
    h.y = h.targetY;
  } else if (kind === 'punch') {
    h.x = h.startX + h.quarterAim.x * 75;
    h.quarterDepth = h.startDepth + h.quarterAim.z * 75;
    h.targetX = h.x;
    h.targetDepth = h.quarterDepth;
  }
  const victim = h.reflected ? h.originalOwner : target;
  const contact =
    (kind === 'mine' || kind === 'roller' || kind === 'fireball' || (kind === 'barrel' && h.reflected)) &&
    victim &&
    !victim.player.dead &&
    Math.hypot(h.x - victim.player.x, h.quarterDepth - (victim.quarterDepth || 0)) < 38 &&
    Math.abs(h.y - victim.player.y) < 65;
  if (h.age >= h.fuse || contact) {
    h.phase = 'blast';
    h.phaseTime = 0;
    h.y = h.targetY;
    h.targetX = h.x;
    h.targetDepth = h.quarterDepth;
  }
  return true;
}
export function reflectBarrel(h, playerActor) {
  if (h.bossHazard !== 'barrel' || h.phase === 'blast' || h.reflected) return false;
  h.quarterAim = { x: -h.quarterAim.x, z: -h.quarterAim.z };
  h.owner = playerActor;
  h.ownerId = playerActor.id;
  h.reflected = true;
  h.hitTargets.clear();
  return true;
}
