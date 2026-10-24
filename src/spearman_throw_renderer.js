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

export function drawLinearSpear(ctx, spear, project) {
  const half = spear.hitboxWidth / 2;
  const ends = [-half, half].map((distance) =>
    projectedSpearPoint(
      ctx,
      {
        x: spear.x + spear.direction.x * distance,
        y: spear.y + spear.direction.y * distance,
        quarterDepth: Number(spear.quarterDepth || 0) + spear.direction.z * distance,
      },
      project
    )
  );
  const dx = ends[1].x - ends[0].x,
    dy = ends[1].y - ends[0].y;
  const width = Math.hypot(dx, dy);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate((ends[0].x + ends[1].x) / 2, (ends[0].y + ends[1].y) / 2);
  ctx.rotate(Math.atan2(dy, dx));
  if (spear.asset) ctx.drawImage(spear.asset, -width / 2, -Math.max(2, width / 26) / 2, width, Math.max(2, width / 26));
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
