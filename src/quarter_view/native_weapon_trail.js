import { weaponContactRegion, isProjectileAttack } from './weapon_contact.js';
import { regionPoints } from '../interaction_swept_region_helper.js';
import { depthOf } from './camera.js';
import { screenPoint } from './attack_geometry.js';

// Visual only: native weapon corners are projected exactly like the unchanged character sprite.
export function createNativeWeaponTrail(ctx, world) {
  let entries = new WeakMap();
  const lifetime = 0.24,
    limit = 48;
  function capture(actor, raw) {
    if (actor.player.dead || actor.respawning) {
      entries.delete(actor);
      return;
    }
    if (!raw.length || isProjectileAttack(actor)) return;
    const now = actor.player.animTime;
    let entry = entries.get(actor);
    const key = `${actor.player.attackSerial}:${actor.player.actionKey}:${actor.player.facing}`;
    if (!entry || entry.key !== key) {
      entry = { key, samples: [], lastActive: now };
      entries.set(actor, entry);
    }
    if (entry.samples.at(-1)?.time === now) return;
    const contact = weaponContactRegion(actor, raw[0]);
    if (!contact.quarterWeaponContact) return;
    const points = regionPoints(contact).map((p) => ({ x: p.x, y: p.y, depth: depthOf(actor) }));
    const previous = entry.samples.at(-1);
    const edge =
      previous && now - previous.time < 0.07 ? [previous.points[0], previous.points[1], points[1], points[0]] : points;
    entry.samples.push({ time: now, points, edge });
    entry.lastActive = now;
    // Preserve the complete swing; coalesce older segments instead of shaving its beginning off.
    if (entry.samples.length > limit) {
      entry.samples.splice(1, 1);
      const first = entry.samples[0],
        next = entry.samples[1];
      next.edge = [first.points[0], first.points[1], next.points[1], next.points[0]];
    }
  }
  function draw(actor, view) {
    const entry = entries.get(actor);
    if (!entry || actor.player.dead || actor.respawning) return;
    const age = actor.player.animTime - entry.lastActive;
    if (age < 0 || age > lifetime) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = actor.group === 'players' ? '#83e6ff' : '#ffbd7c';
    ctx.globalAlpha = 0.36 * (1 - age / lifetime);
    ctx.beginPath();
    for (const sample of entry.samples) {
      sample.edge.forEach((p, i) => {
        const q = screenPoint(p, world, view);
        if (i) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  return {
    capture,
    draw,
    reset() {
      entries = new WeakMap();
    },
    samples: (actor) => entries.get(actor)?.samples || [],
  };
}
