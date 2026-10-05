import { clamp } from './common_helper.js';

// Old saved settings used 20 HP per pip. New saves use maxHp directly.
export function baseHealth(tuning = {}) {
  const value = Number(tuning.maxHp ?? (tuning.maxHpPips != null ? tuning.maxHpPips * 20 : 100));
  return Number.isFinite(value) ? Math.max(1, value) : 100;
}

export function recordHealthDamage(actor) {
  actor.healthTrail = { hp: Math.max(actor.hp, actor.healthTrail?.hp || 0), delay: 0.45 };
}

export function updateHealthTrail(actor, dt) {
  const trail = actor.healthTrail;
  if (!trail) return;
  if (actor.hp >= trail.hp) {
    actor.healthTrail = null;
    return;
  }
  const elapsed = Math.max(0, dt - Math.max(0, trail.delay));
  trail.delay = Math.max(0, trail.delay - dt);
  trail.hp = Math.max(actor.hp, trail.hp - (actor.maxHp * elapsed) / 0.6);
  if (trail.hp <= actor.hp) actor.healthTrail = null;
}

export function drawHealthMeter(ctx, actor, x, y, width) {
  const max = actor.maxHp;
  if (!(max > 0)) return;
  const left = x - width / 2;
  const height = 8;
  const ratio = (hp) => clamp(hp / max, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,.65)';
  ctx.fillRect(left, y, width, height);
  ctx.fillStyle = actor.group === 'mobs' || actor.group === 'bosses' ? '#facc15' : '#ef4444';
  ctx.fillRect(left, y, width * ratio(actor.healthTrail?.hp ?? actor.hp), height);
  ctx.fillStyle = actor.tint;
  ctx.fillRect(left, y, width * ratio(actor.hp), height);
  ctx.strokeStyle = 'rgba(0,0,0,.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let hp = 10; hp < max; hp += 10) {
    const tickX = left + (width * hp) / max;
    ctx.moveTo(tickX, y);
    ctx.lineTo(tickX, y + height);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.strokeRect(left, y, width, height);
}
