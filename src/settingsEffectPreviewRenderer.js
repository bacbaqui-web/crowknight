import { defaultEffectSize } from './animationFrames.js';
import { createEffectEditHandleInfo } from './editHandleGeometry.js';
import { drawEffectPreviewBounds } from './settingsDebugRenderer.js';
import { effectFrameAt } from './tuningNormalize.js';
import { clamp } from './utils.js';

export function drawEffectSettingsPreview(ctx, actor, key, effectAssets) {
  const frame = effectFrameAt(actor.tuning, key, effectPreviewTime(actor, key));
  if (!frame || frame.image === 'none' || Number(frame.opacity ?? 1) <= 0) return null;

  const metrics = effectPreviewMetrics(actor, key, frame);
  const asset = effectAssets[frame.image];

  ctx.save();
  ctx.translate(metrics.cx, metrics.cy);
  const placementMatrix = ctx.getTransform();
  ctx.rotate((Number(frame.rot || 0) * Math.PI) / 180);
  const editHandle = createEffectEditHandleInfo(ctx, frame, key, placementMatrix);
  ctx.globalAlpha = clamp(Number(frame.opacity ?? 1), 0, 1) * 0.88;
  if (asset) {
    ctx.drawImage(
      asset,
      -metrics.width / 2 - metrics.anchorOffsetX,
      -metrics.height / 2 - metrics.anchorOffsetY,
      metrics.width,
      metrics.height
    );
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height);
  }
  ctx.restore();

  drawEffectPreviewBounds(ctx, metrics);
  return editHandle;
}

function effectPreviewTime(actor, key) {
  const preview = actor.player.effectPreview;
  let t = Number.isFinite(preview?.t) ? preview.t : 0;
  if (preview?.key !== key || !preview.playing) return t;

  const settings = actor.tuning.effectSettings?.[key] || {};
  const duration = Math.max(0.05, Number(settings.duration || 0.3) / Math.max(0.1, Number(settings.playbackRate || 1)));
  const elapsed = (performance.now() - Number(preview.startedAt || performance.now())) / 1000;
  if (settings.playback === 'loop') {
    const cycle = (elapsed % (duration * 2)) / duration;
    t = cycle <= 1 ? cycle : 2 - cycle;
  } else {
    t = clamp(elapsed / duration, 0, 1);
  }
  return t;
}

function effectPreviewMetrics(actor, key, frame) {
  return {
    width: Math.max(1, Number(frame.w || defaultEffectSize(key).w)),
    height: Math.max(1, Number(frame.h || defaultEffectSize(key).h)),
    cx: actor.player.x + Number(frame.x || 0),
    cy: actor.player.y - 70 + Number(frame.y || 0),
    anchorOffsetX: Number(frame.anchorX || 0),
    anchorOffsetY: Number(frame.anchorY || 0),
  };
}
