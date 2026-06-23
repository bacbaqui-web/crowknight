import { drawPolygon } from './editHandleDrawing.js';

export function drawBodyHitbox(ctx, actor) {
  const h = actor.player.hitbox;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 64, 64, 0.16)';
  ctx.strokeStyle = 'rgba(255, 92, 92, 0.95)';
  ctx.lineWidth = 2;
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.strokeRect(h.x, h.y, h.w, h.h);
  ctx.restore();
}

export function drawAttackHitboxPreview(ctx, actor, key) {
  const box = actor.player.weaponAttackBox(actor.tuning.attackBoxes?.[key]);
  if (!box) return;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 224, 72, 0.18)';
  ctx.strokeStyle = 'rgba(255, 224, 72, 0.95)';
  ctx.lineWidth = 2;
  drawPolygon(ctx, box.points, true);
  drawPolygon(ctx, box.points, false);
  ctx.fillStyle = 'rgba(255, 244, 168, 0.95)';
  ctx.font = '12px sans-serif';
  ctx.fillText(key === 'jumpAttack' ? '점공' : `${key.replace('attack', '')}타`, box.x + 4, box.y - 6);
  ctx.restore();
}
