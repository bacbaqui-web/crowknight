import { defaultEffectSize } from './animationFrames.js';
import { effectFrameAt } from './tuningNormalize.js';
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
