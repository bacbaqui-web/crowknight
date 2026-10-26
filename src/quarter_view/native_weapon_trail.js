import { weaponContactRegion, isProjectileAttack } from './weapon_contact.js';
import { regionPoints } from '../interaction_swept_region_helper.js';
import { depthOf, QUARTER_PROJECTION } from './camera.js';
import { screenPoint } from './attack_geometry.js';

// Visual only: native weapon corners are projected exactly like the unchanged character sprite.
export function createNativeWeaponTrail(ctx, world) {
  let entries = new WeakMap();
  const lifetime = 0.24,
    limit = 48;
  function capture(actor, raw, hitRegions = []) {
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
    entry.samples.push({
      time: now,
      points: regionPoints(contact).map((p) => ({ ...p, depth: depthOf(actor) })),
      anchor: { ...contact.quarterWeaponAnchor, depth: depthOf(actor) },
    });
    entry.lastActive = now;
    if (entry.samples.length > limit) entry.samples.splice(1, 1);
    entry.ribbon = orientCrescentAtHitbox(crescentRibbon(entry.samples), hitRegions[0], actor.player.facing);
  }

  function draw(actor, view) {
    const entry = entries.get(actor);
    if (!entry || actor.player.dead || actor.respawning) return;
    const age = actor.player.animTime - entry.lastActive;
    if (age < 0 || age > lifetime) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = actor.group === 'players' ? '#83e6ff' : '#ffbd7c';
    const fade = 1 - age / lifetime;
    ctx.globalAlpha = 0.42 * fade * fade * (3 - 2 * fade);
    ctx.beginPath();
    const ribbon = entry.ribbon;
    if (ribbon?.outer.length) {
      smoothBoundary(
        ctx,
        ribbon.outer.map((p) => screenPoint(p, world, view)),
        true
      );
      smoothBoundary(ctx, ribbon.inner.map((p) => screenPoint(p, world, view)).reverse(), false);
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

// Interpolate blade rotation around its moving grip, not straight chords between sparse animation frames.
export function crescentRibbon(samples) {
  if (samples.length < 2) return { outer: [], inner: [] };
  const arc = [];
  let previous;
  for (const sample of samples) {
    const tip = { x: (sample.points[1].x + sample.points[2].x) / 2, y: (sample.points[1].y + sample.points[2].y) / 2 };
    const dx = tip.x - sample.anchor.x,
      dy = tip.y - sample.anchor.y;
    let angle = Math.atan2(dy, dx);
    if (previous) {
      while (angle - previous.angle > Math.PI) angle -= Math.PI * 2;
      while (angle - previous.angle < -Math.PI) angle += Math.PI * 2;
    }
    const current = { ...sample.anchor, angle, radius: Math.hypot(dx, dy) };
    const steps = previous ? Math.max(1, Math.ceil(Math.abs(angle - previous.angle) / 0.12)) : 1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const a = previous || current;
      const lerp = (key) => a[key] + (current[key] - a[key]) * t;
      arc.push({ x: lerp('x'), y: lerp('y'), depth: lerp('depth'), angle: lerp('angle'), radius: lerp('radius') });
    }
    previous = current;
  }
  const distances = [0];
  for (let i = 1; i < arc.length; i++)
    distances.push(distances[i - 1] + Math.abs(arc[i].angle - arc[i - 1].angle) * arc[i].radius);
  const total = distances.at(-1);
  if (total < 2) return { outer: [], inner: [] };
  const outer = [],
    inner = [];
  arc.forEach((p, i) => {
    const taper = Math.pow(Math.sin((Math.PI * distances[i]) / total), 0.8);
    const thickness = 2 * Math.min(26, p.radius * 0.22) * taper;
    // Keep the outer edge on the blade tip and taper the crescent inward.
    const radius = p.radius;
    const point = (r) => ({ x: p.x + Math.cos(p.angle) * r, y: p.y + Math.sin(p.angle) * r, depth: p.depth });
    outer.push(point(radius));
    inner.push(point(Math.max(0, radius - thickness)));
  });
  return { outer, inner };
}

function smoothBoundary(ctx, points, start) {
  if (!points.length) return;
  if (start) ctx.moveTo(points[0].x, points[0].y);
  else ctx.lineTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)],
      b = points[i],
      c = points[i + 1],
      d = points[Math.min(points.length - 1, i + 2)];
    ctx.bezierCurveTo(
      b.x + (c.x - a.x) / 6,
      b.y + (c.y - a.y) / 6,
      c.x - (d.x - b.x) / 6,
      c.y - (d.y - b.y) / 6,
      c.x,
      c.y
    );
  }
}

// Rotate the completed crescent rigidly in projected space, then place its outer midpoint at the strike edge.
export function orientCrescentAtHitbox(ribbon, region, facing = 1) {
  if (!region?.quarterDirectionalBox || !ribbon.outer.length) return ribbon;
  const slope = QUARTER_PROJECTION.slope;
  const aim = region.quarterBoxAim,
    origin = region.quarterBoxOrigin;
  const angle = Math.atan2(aim.z * slope, aim.x) - (facing < 0 ? Math.PI : 0);
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const middle = ribbon.outer[Math.floor(ribbon.outer.length / 2)];
  const centerY = middle.y + middle.depth * slope;
  const targetX = origin.x + aim.x * region.quarterBoxLength;
  const targetY = origin.y + (origin.depth + aim.z * region.quarterBoxLength) * slope;
  const transform = (p) => {
    const x = p.x - middle.x,
      y = p.y + p.depth * slope - centerY;
    return { x: targetX + x * c - y * s, y: targetY + x * s + y * c - origin.depth * slope, depth: origin.depth };
  };
  return { outer: ribbon.outer.map(transform), inner: ribbon.inner.map(transform) };
}
