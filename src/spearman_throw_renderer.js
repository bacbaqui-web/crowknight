import { QUARTER_PROJECTION } from './quarter_view/camera.js';
import { SPEARMAN_THROW } from './spearman_throw_runtime.js';

export function projectedSpearPoint(ctx, point, project) {
  let result;
  const capture = () => {
    const m = ctx.getTransform();
    result = { x: m.a * point.x + m.c * point.y + m.e, y: m.b * point.x + m.d * point.y + m.f };
  };
  if (project) project(point, capture);
  else capture();
  return result;
}

export function linearSpearCorners(spear) {
  const slope = spear.quarterDepth == null ? 0 : QUARTER_PROJECTION.slope;
  const dx = spear.direction.x * spear.hitboxWidth;
  const dy = (spear.direction.y + spear.direction.z * slope) * spear.hitboxWidth;
  const length = Math.hypot(dx, dy);
  const thickness = Math.max(2, length / 26);
  const nx = length ? ((-dy / length) * thickness) / 2 : 0;
  const ny = length ? ((dx / length) * thickness) / 2 : thickness / 2;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([along, side]) => ({
    x: spear.x + (along * dx) / 2 + side * nx,
    y: spear.y + (along * dy) / 2 + side * ny,
    quarterDepth: spear.quarterDepth,
  }));
}

export function drawLinearSpear(ctx, spear, project) {
  const corners = linearSpearCorners(spear).map((p) => projectedSpearPoint(ctx, p, project));
  const a = corners[0],
    b = corners[1],
    d = corners[3];
  ctx.save();
  ctx.setTransform(b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y, a.x, a.y);
  if (spear.asset) ctx.drawImage(spear.asset, 0, 0, 1, 1);
  ctx.restore();
}

export function drawSpearWarnings(ctx, actors, project) {
  for (const actor of actors) {
    const state = actor.spearmanThrow;
    if (!state?.aim || actor.player.dead || actor.respawning || actor.player.actionKey !== 'spearmanThrow') continue;
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const aim = state.aim;
      const point = {
        x: aim.startX + (aim.targetX - aim.startX) * t,
        y: aim.startY + (aim.targetY - aim.startY) * t,
        quarterDepth: Number(aim.startDepth || 0) + (Number(aim.targetDepth || 0) - Number(aim.startDepth || 0)) * t,
      };
      points.push(projectedSpearPoint(ctx, point, project));
    }
    const locked = state.timer >= SPEARMAN_THROW.lockAfter;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.strokeStyle = locked ? 'rgba(255, 35, 45, .32)' : 'rgba(255, 50, 60, .16)';
    ctx.lineWidth = locked ? 12 : 8;
    ctx.stroke();
    ctx.strokeStyle = locked ? '#ff3946' : 'rgba(255, 70, 80, .75)';
    ctx.lineWidth = locked ? 3 : 2;
    ctx.stroke();
    ctx.restore();
  }
}
