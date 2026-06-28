import { drawPolygon } from './editHandleDrawing.js';
import { ATTACK_INTERACTION_BOX_KEY } from './tuningInteractionBoxes.js';

export function drawEditableInteractionBoxTarget(ctx, actor, partKey, { fill, stroke }) {
  const target = actor.player.editHandles?.[partKey]?.target;
  if (!target) return null;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= Number(target.opacity ?? 1);
  drawInteractionBoxRect(ctx, target, { fill, stroke });
  ctx.restore();
  return target;
}

function drawInteractionBoxRect(ctx, target, { fill, stroke }) {
  if (target.points?.length) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    drawPolygon(ctx, target.points, true);
    drawPolygon(ctx, target.points, false);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.translate(target.x + target.w / 2, target.y + target.h / 2);
  ctx.rotate((Number(target.rot || 0) * Math.PI) / 180);
  ctx.fillRect(-target.w / 2, -target.h / 2, target.w, target.h);
  ctx.strokeRect(-target.w / 2, -target.h / 2, target.w, target.h);
  ctx.restore();
}

export function drawAttackInteractionBoxPreview(ctx, actor, key) {
  if (key === 'roll' && !actor.player.canRollUseWeapon) return;

  const active = Number(actor.player.getPartOffset?.(ATTACK_INTERACTION_BOX_KEY)?.active || 0) >= 0.5;
  const target = drawEditableInteractionBoxTarget(ctx, actor, ATTACK_INTERACTION_BOX_KEY, {
    fill: active ? 'rgba(255, 224, 72, 0.28)' : 'rgba(255, 224, 72, 0.10)',
    stroke: active ? 'rgba(255, 224, 72, 0.98)' : 'rgba(255, 224, 72, 0.48)',
  });
  if (!target) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(255, 244, 168, 0.95)';
  ctx.font = '12px sans-serif';
  ctx.fillText(attackInteractionBoxLabel(key), target.bounds.x + 4, target.bounds.y - 6);
  ctx.restore();
}

function attackInteractionBoxLabel(key) {
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
