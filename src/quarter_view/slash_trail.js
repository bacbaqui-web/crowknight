import { attackPlane } from '../attack_plane_helper.js';
import { regionPoints, sweptInteractionRegion } from '../interaction_swept_region_helper.js';
import { attackPoint, screenPoint, groundAttackRegions, attackRegionPoint } from './attack_geometry.js';
import { isProjectileAttack, weaponTrailRegion } from './weapon_contact.js';

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
    while (entry.samples.length && (now < entry.samples[0].time || now - entry.samples[0].time > TRAIL_LIFETIME))
      entry.samples.shift();
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

    for (const region of raw.slice(0, 2)) {
      const contact = weaponTrailRegion(actor, region),
        p = regionPoints(contact);
      const plane = attackPlane(actor);
      if (p.length < 4) continue;
      const project = (point) => {
        const result = attackPoint(actor, point, 0, plane);
        if (plane === 'ground') result.y = world.floorY;
        return result;
      };
      const polygon = p.map(project);
      const wide = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) >= Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y);
      const root = project(wide ? mid(p[0], p[3]) : mid(p[0], p[1]));
      const tip = project(wide ? mid(p[1], p[2]) : mid(p[3], p[2]));
      const aim = actor.quarterAim;
      const key = `${actor.player.attackSerial}:${actor.player.actionKey}:${plane}:${region.key}:${actor.player.facing}:${aim?.x}:${aim?.z}`;
      const previous = entry.samples.findLast((sample) => sample.key === key && now - sample.time <= 0.065);
      // Use the exact captured collision sweep, including its active-frame boundaries.
      const captured =
        actor.quarterAttackSerial === actor.player.attackSerial
          ? actor.quarterAttackRegions?.find((item) => item.key === region.key)
          : null;
      const collision = groundAttackRegions(actor, [contact])[0];
      const swept = captured || (previous ? sweptInteractionRegion(previous.collision, collision) : collision);
      const sweep = regionPoints(swept).map((point) => attackRegionPoint(actor, point, swept, world.floorY));
      entry.samples.push({
        time: now,
        key,
        root,
        tip,
        polygon,
        nativePolygon: p,
        collision,
        sweep,
        screenRoot: {},
        screenTip: {},
        screenPolygon: [],
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
    if (!projectionView || ['width', 'height', 'x', 'depth', 'zoom'].some((key) => projectionView[key] !== view[key])) {
      projectionView = { ...view };
      projectionRevision++;
    }
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    for (const sample of entry.samples) {
      if (sample.projectionRevision !== projectionRevision) {
        Object.assign(sample.screenRoot, screenPoint(sample.root, world, view));
        Object.assign(sample.screenTip, screenPoint(sample.tip, world, view));
        sample.screenPolygon = sample.sweep.map((point) => screenPoint(point, world, view));
        sample.projectionRevision = projectionRevision;
        stats.projected += sample.sweep.length + 2;
      }
      for (const point of sample.screenPolygon) {
        left = Math.min(left, point.x);
        right = Math.max(right, point.x);
        top = Math.min(top, point.y);
        bottom = Math.max(bottom, point.y);
      }
      buckets[Math.min(3, Math.floor(((now - sample.time) / TRAIL_LIFETIME) * 4))].push(sample);
    }
    if (right < -50 || left > view.width + 50 || bottom < -50 || top > view.height + 50) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = ctx.lineCap = 'round';
    const color = hero ? '#65dcff' : '#ffad6c';
    for (let age = 3; age >= 0; age--) {
      if (!buckets[age].length) continue;
      ctx.globalAlpha = [0.3, 0.18, 0.08, 0.025][age];
      ctx.fillStyle = color;
      ctx.beginPath();
      for (const sample of buckets[age]) {
        sample.screenPolygon.forEach((point, index) => {
          if (index) ctx.lineTo(point.x, point.y);
          else ctx.moveTo(point.x, point.y);
        });
        ctx.closePath();
      }
      ctx.fill();
      stats.drawn += buckets[age].length;
    }
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
    forget: (actor) => entries.delete(actor),
    samples: (actor) => entries.get(actor)?.samples || [],
  };
}
