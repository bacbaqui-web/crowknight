import { weaponContactRegion, isProjectileAttack } from './weapon_contact.js';
import { regionPoints } from '../interaction_swept_region_helper.js';
import { depthOf } from './camera.js';
import { screenPoint } from './attack_geometry.js';

// Visual only: native weapon corners are projected exactly like the unchanged character sprite.
export function createNativeWeaponTrail(ctx, world) {
  let entries = new WeakMap();
  const lifetime = 0.14,
    limit = 14;
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
      entry = { key, samples: [] };
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
    while (entry.samples.length > limit || now - entry.samples[0].time > lifetime) entry.samples.shift();
  }
  function draw(actor, view) {
    const entry = entries.get(actor);
    if (!entry || actor.player.dead || actor.respawning) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = actor.group === 'players' ? '#83e6ff' : '#ffbd7c';
    for (const sample of entry.samples) {
      const age = actor.player.animTime - sample.time;
      if (age < 0 || age > lifetime) continue;
      ctx.globalAlpha = 0.35 * (1 - age / lifetime);
      ctx.beginPath();
      sample.edge.forEach((p, i) => {
        const q = screenPoint(p, world, view);
        if (i) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.fill();
    }
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
