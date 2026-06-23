import { defaultEffectSize } from './animationFrames.js';
import { isMasterPart } from './tuningLabels.js';
import { effectFrameAt } from './tuningNormalize.js';
import { controlGroupPartKeys, imagePartKeys } from './tuningParts.js';
import { clamp } from './utils.js';

function activePlayerEffectAction(player) {
  if (player.jumpAttackTime > 0) {
    return {
      key: 'jumpAttack',
      progress: clamp(player.jumpAttackProgress, 0, 1),
    };
  }

  if (player.attackTime > 0) {
    return {
      key: `attack${player.comboStep || 1}`,
      progress: clamp(player.attackProgress, 0, 1),
    };
  }

  return null;
}

export function drawAttackTrail(ctx, actor, effectAssets) {
  const player = actor.player;
  const active = activePlayerEffectAction(player);
  if (!active) return;

  const { key: effectKey, progress } = active;
  const config = effectFrameAt(actor.tuning, effectKey, progress);
  if (!config || config.image === 'none' || Number(config.opacity ?? 1) <= 0) return;
  const asset = effectAssets[config.image];
  if (!asset) return;

  const cx = player.x;
  const cy = player.y - 70;
  const width = Math.max(1, Number(config.w || defaultEffectSize(effectKey).w));
  const height = Math.max(1, Number(config.h || defaultEffectSize(effectKey).h));
  const flip = player.facing === 1 ? 1 : -1;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  ctx.translate(Number(config.x || 0), Number(config.y || 0));
  ctx.rotate((Number(config.rot || 0) * Math.PI) / 180);
  ctx.globalAlpha = clamp(Number(config.opacity ?? 1), 0, 1);
  ctx.drawImage(
    asset,
    -width / 2 - Number(config.anchorX || 0),
    -height / 2 - Number(config.anchorY || 0),
    width,
    height
  );
  ctx.restore();
}

export function drawSelectedPartGlow(ctx, actor, selectedActor, activePartKeys) {
  if (actor !== selectedActor) return;
  const partKeys = activePartKeys.filter(
    (partKey) =>
      partKey &&
      !isMasterPart(partKey) &&
      !imagePartKeys().includes(partKey) &&
      !controlGroupPartKeys().includes(partKey)
  );
  if (!partKeys.length) return;

  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(124, 195, 162, 0.98)';
  ctx.shadowColor = 'rgba(124, 195, 162, 0.95)';
  ctx.shadowBlur = 12;

  partKeys.forEach((partKey) => {
    const region = actor.player.hitRegions?.find((item) => item.key === partKey);
    if (!region) return;

    if (region.points?.length) {
      ctx.beginPath();
      region.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
    } else if (region.bounds) {
      const b = region.bounds;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  });

  ctx.restore();
}

export function drawHitFlash(ctx, actor) {
  const pulse = 0.42 + Math.sin(actor.hurtCooldown * 80) * 0.12;

  ctx.save();
  ctx.globalAlpha *= pulse;
  ctx.filter =
    'brightness(0) saturate(1) invert(18%) sepia(97%) saturate(7480%) hue-rotate(357deg) brightness(118%) contrast(118%)';
  actor.player.draw(ctx);
  ctx.restore();
}
