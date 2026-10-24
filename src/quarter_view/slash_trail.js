import { attackPlane } from '../attack_plane_helper.js';
import { regionPoints } from '../interaction_swept_region_helper.js';
import { attackPoint, screenPoint } from './attack_geometry.js';
import { isProjectileAttack } from './weapon_contact.js';

export const TRAIL_LIMIT = 24;
export const TRAIL_LIFETIME = 0.18;
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function createSlashTrails(ctx, world) {
  let entries = new WeakMap();
  const buckets = [[], [], [], []];
  const stats = { captured: 0, drawn: 0, projected: 0 };
  let projectionView,
    projectionRevision = 0;
  function prune(entry, now) {
    while (entry.samples.length && now - entry.samples[0].time > TRAIL_LIFETIME) entry.samples.shift();
  }
  function capture(actor, raw) {
    if (actor.respawning || actor.player.dead) {
      entries.delete(actor);
      return;
    }
    if (!raw.length || isProjectileAttack(actor)) return;
    let entry = entries.get(actor);
    if (!entry) {
      entry = { samples: [], time: null };
      entries.set(actor, entry);
    }
    const now = actor.player.animTime;
    if (entry.time === now) return;
    entry.time = now;
    prune(entry, now);
    const plane = attackPlane(actor);
    for (let index = 0; index < Math.min(2, raw.length); index++) {
      const region = raw[index];
      const p = regionPoints(region);
      if (p.length < 4) continue;
      const wide = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) >= Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y);
      const base = wide ? mid(p[0], p[3]) : mid(p[0], p[1]);
      const tip = wide ? mid(p[1], p[2]) : mid(p[3], p[2]);
      const root = { x: base.x + (tip.x - base.x) * 0.35, y: base.y + (tip.y - base.y) * 0.35 };
      const rootPoint = attackPoint(actor, root, 0, plane),
        tipPoint = attackPoint(actor, tip, 0, plane);
      if (plane === 'ground') rootPoint.y = tipPoint.y = world.floorY;
      entry.samples.push({
        time: now,
        key: `${actor.player.attackSerial}:${plane}:${region.key}`,
        root: rootPoint,
        tip: tipPoint,
        screenRoot: {},
        screenTip: {},
      });
      stats.captured++;
    }
    if (entry.samples.length > TRAIL_LIMIT) entry.samples.splice(0, entry.samples.length - TRAIL_LIMIT);
  }
  function draw(actor, view, hero = false) {
    const entry = entries.get(actor);
    if (!entry) return;
    if (actor.respawning || actor.player.dead) {
      entries.delete(actor);
      return;
    }
    const now = actor.player.animTime;
    prune(entry, now);
    if (!entry.samples.length) return;
    buckets.forEach((bucket) => {
      bucket.length = 0;
    });
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    if (!projectionView || ['width', 'height', 'x', 'depth', 'zoom'].some((key) => projectionView[key] !== view[key])) {
      projectionView = { ...view };
      projectionRevision++;
    }
    for (const sample of entry.samples) {
      if (sample.projectionRevision !== projectionRevision) {
        Object.assign(sample.screenRoot, screenPoint(sample.root, world, view));
        Object.assign(sample.screenTip, screenPoint(sample.tip, world, view));
        sample.projectionRevision = projectionRevision;
        stats.projected += 2;
      }
      const a = sample.screenRoot,
        b = sample.screenTip;
      left = Math.min(left, a.x, b.x);
      right = Math.max(right, a.x, b.x);
      top = Math.min(top, a.y, b.y);
      bottom = Math.max(bottom, a.y, b.y);
    }
    if (right < -50 || left > view.width + 50 || bottom < -50 || top > view.height + 50) return;
    for (let i = 1; i < entry.samples.length; i++) {
      const b = entry.samples[i];
      let a = null;
      for (let j = i - 1; j >= 0 && j >= i - 2; j--)
        if (entry.samples[j].key === b.key) {
          a = entry.samples[j];
          break;
        }
      if (!a || b.time - a.time > 0.065) continue;
      if (Math.hypot(b.screenTip.x - a.screenTip.x, b.screenTip.y - a.screenTip.y) > 350 * b.screenTip.scale) continue;
      const bucket = Math.min(3, Math.floor(((now - b.time) / TRAIL_LIFETIME) * 4));
      buckets[bucket].push(a, b);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = ctx.lineCap = 'round';
    const color = hero ? '#65dcff' : '#ffad6c';
    for (let age = 3; age >= 0; age--) {
      const pairs = buckets[age];
      if (!pairs.length) continue;
      ctx.globalAlpha = [0.3, 0.18, 0.08, 0.025][age];
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < pairs.length; i += 2) {
        const a = pairs[i],
          b = pairs[i + 1];
        ctx.moveTo(a.screenRoot.x, a.screenRoot.y);
        ctx.lineTo(a.screenTip.x, a.screenTip.y);
        ctx.lineTo(b.screenTip.x, b.screenTip.y);
        ctx.lineTo(b.screenRoot.x, b.screenRoot.y);
        ctx.closePath();
      }
      ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < pairs.length; i += 2) {
        const a = pairs[i].screenTip,
          b = pairs[i + 1].screenTip;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#f3fcff';
      ctx.globalAlpha *= 1.4;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      stats.drawn += pairs.length / 2;
    }
    // A short tip-to-root highlight also shows thrusts and the first active sample.
    const last = entry.samples.at(-1);
    ctx.globalAlpha = Math.max(0, 1 - (now - last.time) / TRAIL_LIFETIME) * 0.8;
    ctx.strokeStyle = '#e9fbff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(last.screenRoot.x, last.screenRoot.y);
    ctx.lineTo(last.screenTip.x, last.screenTip.y);
    ctx.stroke();
    ctx.restore();
  }
  return {
    capture,
    draw,
    reset() {
      entries = new WeakMap();
    },
    stats,
    samples: (actor) => entries.get(actor)?.samples || [],
  };
}
