import { defaultEffectSize } from './animation_frame_data.js';
import { drawPolygon } from './edit_handle_drawing_helper.js';
import { EFFECT_EDIT_HANDLE_KEY, createEffectEditHandleInfo } from './edit_handle_geometry_helper.js';
import { createEditableTransform, editableTransformDrawRect } from './editable_object_model_helper.js';
import {
  activeAttackSettingsKey,
  activeEffectSettingsKey,
  isCollisionSectionOpen,
  isSettingsPanelOpen,
} from './settings_panel_state.js';
import { effectFrameAt } from './project_data_normalizer_helper.js';
import { actionFormula } from './formula_runtime_engine.js';
import { timelinePlaybackProgress } from './timeline_playback_helper.js';
import {
  COLLISION_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  ATTACK_INTERACTION_OBJECT_KEY,
  interactionObjectPartKeysForEditFocus,
} from './interaction_object_editor_controller.js';
import { clamp } from './common_helper.js';
import { resolveEffectAsset } from './asset_loader_helper.js';

export function drawTuningPanelDebugBoxes(
  ctx,
  selectedActor,
  effectAssets,
  {
    activeSetupPartKey = null,
    activeActionPartKey = null,
    activeActionKey = null,
    activeWorkflowSession = null,
    stageAiGuide = null,
  } = {}
) {
  if (!isSettingsPanelOpen()) return;

  drawActionRangeFormulaGuide(ctx, selectedActor, activeActionKey);
  drawActionProjectileFormulaGuide(ctx, selectedActor, activeActionKey);
  if (activeWorkflowSession === 'stage') drawStageAiRangeGuide(ctx, stageAiGuide);

  if (isCollisionSectionOpen()) {
    drawSetupFallbackInteractionPreview(ctx, selectedActor, activeSetupPartKey);
  }

  const activeActionFallbackInteractionKeys = editHandleFallbackInteractionKeysForActionPart(activeActionPartKey);
  activeActionFallbackInteractionKeys.forEach((boxKey) =>
    drawSetupFallbackInteractionPreview(ctx, selectedActor, boxKey)
  );

  const attackKey = activeAttackSettingsKey();
  if (attackKey && !activeActionFallbackInteractionKeys.length) {
    drawFallbackAttackRegionPreview(ctx, selectedActor, attackKey);
  }

  const effectKey = activeEffectSettingsKey();
  if (!effectKey) return;

  drawEffectSettingsPreview(ctx, selectedActor, effectKey, effectAssets);
}

function drawStageAiRangeGuide(ctx, guide) {
  if (!guide?.actor?.player) return;
  const minRange = Math.max(0, Number(guide.minRange || 0));
  const maxRange = Math.max(minRange, Number(guide.maxRange || 0));
  const x = Number(guide.actor.player.x || 0);
  const y = Number(guide.actor.player.y || 0);

  ctx.save();
  ctx.fillStyle = 'rgba(105, 183, 229, 0.08)';
  ctx.strokeStyle = 'rgba(105, 183, 229, 0.92)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, maxRange, 0, Math.PI * 2);
  ctx.arc(x, y, minRange, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, maxRange, 0, Math.PI * 2);
  ctx.stroke();
  if (minRange > 0) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(245, 247, 251, 0.72)';
    ctx.beginPath();
    ctx.arc(x, y, minRange, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawActionRangeFormulaGuide(ctx, actor, actionKey) {
  if (!actor?.player || !actionKey) return;
  const formula = actionFormula(actor.tuning?.actionSettings?.[actionKey] || {}, 'range');
  if (!formula?.enabled) return;

  const minRange = Math.max(0, Number(formula.minRange || 0));
  const maxRange = Math.max(minRange, Number(formula.maxRange || 0));
  const x = Number(actor.player.x || 0);
  const y = Number(actor.player.y || 0);

  ctx.save();
  ctx.fillStyle = 'rgba(124, 195, 162, 0.08)';
  ctx.strokeStyle = 'rgba(124, 195, 162, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, maxRange, 0, Math.PI * 2);
  ctx.arc(x, y, minRange, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, maxRange, 0, Math.PI * 2);
  ctx.stroke();
  if (minRange > 0) {
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(245, 247, 251, 0.72)';
    ctx.beginPath();
    ctx.arc(x, y, minRange, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawActionProjectileFormulaGuide(ctx, actor, actionKey) {
  if (!actor?.player || !actionKey) return;
  const formula = actionFormula(actor.tuning?.actionSettings?.[actionKey] || {}, 'projectile');
  if (!formula?.enabled) return;

  const facing = Number(actor.player.facing || 1) < 0 ? -1 : 1;
  const startX = Number(actor.player.x || 0) + Number(formula.offsetX || 0) * facing;
  const startY = Number(actor.player.y || 0) + Number(formula.offsetY || 0);
  const targetX = startX + facing * 260;
  const targetY = Number(actor.player.y || 0);
  const arcHeight = Math.max(0, Number(formula.arcHeight || 0));
  const hitboxWidth = Math.max(1, Number(formula.hitboxWidth || 1));
  const hitboxHeight = Math.max(1, Number(formula.hitboxHeight || 1));

  ctx.save();
  ctx.strokeStyle = 'rgba(245, 247, 251, 0.82)';
  ctx.fillStyle = 'rgba(245, 247, 251, 0.16)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  for (let index = 0; index <= 24; index += 1) {
    const t = index / 24;
    const x = lerp(startX, targetX, t);
    const y = lerp(startY, targetY, t) - arcHeight * 4 * t * (1 - t);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(124, 195, 162, 0.92)';
  ctx.beginPath();
  ctx.arc(startX, startY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(124, 195, 162, 0.16)';
  ctx.strokeStyle = 'rgba(124, 195, 162, 0.92)';
  ctx.strokeRect(startX - hitboxWidth / 2, startY - hitboxHeight / 2, hitboxWidth, hitboxHeight);
  ctx.fillRect(startX - hitboxWidth / 2, startY - hitboxHeight / 2, hitboxWidth, hitboxHeight);
  ctx.restore();
}

function editHandleFallbackInteractionKeysForActionPart(partKey) {
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

function drawEditableInteractionTarget(ctx, actor, partKey, { fill, stroke }) {
  const target = actor.player.editHandles?.[partKey]?.target;
  if (!target) return null;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= Number(target.opacity ?? 1);
  drawInteractionTargetRect(ctx, target, { fill, stroke });
  ctx.restore();
  return target;
}

function drawInteractionTargetRect(ctx, target, { fill, stroke }) {
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

function drawFallbackAttackRegionPreview(ctx, actor, key) {
  if (key === 'roll' && !actor.player.canRollUseWeapon) return;

  const active = Number(actor.player.getPartOffset?.(ATTACK_INTERACTION_OBJECT_KEY)?.active || 0) >= 0.5;
  const target = drawEditableInteractionTarget(ctx, actor, ATTACK_INTERACTION_OBJECT_KEY, {
    fill: active ? 'rgba(255, 224, 72, 0.28)' : 'rgba(255, 224, 72, 0.10)',
    stroke: active ? 'rgba(255, 224, 72, 0.98)' : 'rgba(255, 224, 72, 0.48)',
  });
  if (!target) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(255, 244, 168, 0.95)';
  ctx.font = '12px sans-serif';
  ctx.fillText(fallbackAttackRegionLabel(key), target.bounds.x + 4, target.bounds.y - 6);
  ctx.restore();
}

function fallbackAttackRegionLabel(key) {
  if (key === 'jumpAttack') return '점공';
  if (key === 'roll') return '구르기';
  return `${key.replace('attack', '')}타`;
}

function drawEffectSettingsPreview(ctx, actor, key, effectAssets) {
  const frame = effectFrameAt(actor.tuning, key, effectPreviewTime(actor, key));
  if (!frame || frame.image === 'none' || Number(frame.opacity ?? 1) <= 0) return null;

  const metrics = effectPreviewMetrics(actor, key, frame);
  const asset = resolveEffectAsset(effectAssets, frame.image, actor?.id);
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

function drawEffectPreviewBounds(ctx, { cx, cy, width, height, ax, ay }) {
  ctx.save();
  ctx.strokeStyle = 'rgba(124, 195, 162, .92)';
  ctx.fillStyle = 'rgba(124, 195, 162, .92)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - ax, cy - ay, width, height);
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  t = timelinePlaybackProgress(elapsed / duration, settings.playback);
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

function lerp(a, b, t) {
  return Number(a || 0) + (Number(b || 0) - Number(a || 0)) * t;
}
