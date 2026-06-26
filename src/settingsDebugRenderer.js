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
  if (key === 'roll' && !actor.player.canRollUseWeapon) return;

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
  ctx.fillText(attackHitboxLabel(key), box.x + 4, box.y - 6);
  ctx.restore();
}

function attackHitboxLabel(key) {
  if (key === 'jumpAttack') return '점공';
  if (key === 'roll') return '구르기';
  return `${key.replace('attack', '')}타`;
}

export function drawEffectPreviewBounds(ctx, { cx, cy, width, height, anchorOffsetX, anchorOffsetY }) {
  ctx.save();
  ctx.strokeStyle = 'rgba(124, 195, 162, .92)';
  ctx.fillStyle = 'rgba(124, 195, 162, .92)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - width / 2 - anchorOffsetX, cy - height / 2 - anchorOffsetY, width, height);
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
