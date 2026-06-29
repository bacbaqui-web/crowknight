import { defaultEffectSize } from './animationFrames.js';
import { EFFECT_EDIT_HANDLE_KEY, createEffectEditHandleInfo } from './editHandleGeometry.js';
import { createEditableTransform, editableTransformDrawRect } from './editableObjectModel.js';
import {
  activeAttackSettingsKey,
  activeEffectSettingsKey,
  isCollisionSectionOpen,
  isSettingsPanelOpen,
} from './settingsPanelState.js';
import {
  drawEditableInteractionTarget,
  drawEffectPreviewBounds,
  drawFallbackAttackRegionPreview,
} from './settingsDebugRenderer.js';
import { effectFrameAt } from './tuningNormalize.js';
import {
  COLLISION_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  ATTACK_INTERACTION_OBJECT_KEY,
  interactionObjectPartKeysForEditFocus,
} from './tuningInteractionObjects.js';
import { clamp } from './utils.js';

export function drawTuningPanelDebugBoxes(
  ctx,
  selectedActor,
  effectAssets,
  { activeSetupPartKey = null, activePosePartKey = null } = {}
) {
  if (!isSettingsPanelOpen()) return;

  if (isCollisionSectionOpen()) {
    drawSetupFallbackInteractionPreview(ctx, selectedActor, activeSetupPartKey);
  }

  const activePoseFallbackInteractionKeys = editHandleFallbackInteractionKeysForPosePart(activePosePartKey);
  activePoseFallbackInteractionKeys.forEach((boxKey) =>
    drawSetupFallbackInteractionPreview(ctx, selectedActor, boxKey)
  );

  const attackKey = activeAttackSettingsKey();
  if (attackKey && !activePoseFallbackInteractionKeys.length) {
    drawFallbackAttackRegionPreview(ctx, selectedActor, attackKey);
  }

  const effectKey = activeEffectSettingsKey();
  if (!effectKey) return;

  drawEffectSettingsPreview(ctx, selectedActor, effectKey, effectAssets);
}

function editHandleFallbackInteractionKeysForPosePart(partKey) {
  return interactionObjectPartKeysForEditFocus(partKey);
}

function drawSetupFallbackInteractionPreview(ctx, actor, activeSetupPartKey) {
  if (activeSetupPartKey === COLLISION_INTERACTION_OBJECT_KEY) {
    drawEditableInteractionTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(105, 183, 229, 0.16)',
      stroke: 'rgba(105, 183, 229, 0.96)',
    });
  } else if (activeSetupPartKey === HURT_INTERACTION_OBJECT_KEY) {
    drawEditableInteractionTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(255, 64, 64, 0.16)',
      stroke: 'rgba(255, 92, 92, 0.95)',
    });
  } else if (activeSetupPartKey === ATTACK_INTERACTION_OBJECT_KEY) {
    drawEditableInteractionTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(255, 224, 72, 0.18)',
      stroke: 'rgba(255, 224, 72, 0.95)',
    });
  } else if (activeSetupPartKey === GUARD_INTERACTION_OBJECT_KEY) {
    drawEditableInteractionTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(124, 207, 146, 0.16)',
      stroke: 'rgba(124, 207, 146, 0.96)',
    });
  }
}

function drawEffectSettingsPreview(ctx, actor, key, effectAssets) {
  const frame = effectFrameAt(actor.tuning, key, effectPreviewTime(actor, key));
  if (!frame || frame.image === 'none' || Number(frame.opacity ?? 1) <= 0) return null;

  const metrics = effectPreviewMetrics(actor, key, frame);
  const asset = effectAssets[frame.image];
  const transform = effectMetricsTransform(metrics, frame);
  const drawRect = editableTransformDrawRect(transform);

  ctx.save();
  ctx.translate(transform.x, transform.y);
  const placementMatrix = ctx.getTransform();
  ctx.rotate((transform.rot * Math.PI) / 180);
  const editHandle = createEffectEditHandleInfo(ctx, frame, EFFECT_EDIT_HANDLE_KEY, placementMatrix, drawRect);
  if (actor.player?.editHandles) actor.player.editHandles[EFFECT_EDIT_HANDLE_KEY] = editHandle;
  ctx.globalAlpha = clamp(Number(frame.opacity ?? 1), 0, 1) * 0.88;
  if (asset) {
    ctx.drawImage(asset, drawRect.x, drawRect.y, drawRect.w, drawRect.h);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(drawRect.x, drawRect.y, drawRect.w, drawRect.h);
  }
  ctx.restore();

  drawEffectPreviewBounds(ctx, metrics);
  return editHandle;
}

function effectMetricsTransform(metrics, frame) {
  return createEditableTransform({
    x: metrics.cx,
    y: metrics.cy,
    w: metrics.width,
    h: metrics.height,
    ax: frame.ax,
    ay: frame.ay,
    rot: frame.rot,
  });
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
  const width = Math.max(1, Number(frame.w || defaultEffectSize(key).w));
  const height = Math.max(1, Number(frame.h || defaultEffectSize(key).h));
  return {
    width,
    height,
    cx: actor.player.x + Number(frame.x || 0),
    cy: actor.player.y - 70 + Number(frame.y || 0),
    ax: Number(frame.ax ?? width / 2),
    ay: Number(frame.ay ?? height / 2),
  };
}
