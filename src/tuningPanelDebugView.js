import {
  activeAttackSettingsKey,
  activeEffectSettingsKey,
  isCollisionSectionOpen,
  isSettingsPanelOpen,
} from './settingsPanelState.js';
import { drawEditableInteractionTarget, drawFallbackAttackRegionPreview } from './settingsDebugRenderer.js';
import { drawEffectSettingsPreview } from './settingsEffectPreviewRenderer.js';
import {
  COLLISION_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  ATTACK_INTERACTION_OBJECT_KEY,
  interactionObjectPartKeysForEditFocus,
} from './tuningInteractionObjects.js';

export function drawTuningPanelDebugBoxes(
  ctx,
  selectedActor,
  effectAssets,
  { activeSetupPartKey = null, activePosePartKey = null } = {}
) {
  if (!isSettingsPanelOpen()) return { hasEffectHandleUpdate: false, effectHandle: null };

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
  if (!effectKey) return { hasEffectHandleUpdate: false, effectHandle: null };

  return {
    hasEffectHandleUpdate: true,
    effectHandle: drawEffectSettingsPreview(ctx, selectedActor, effectKey, effectAssets),
  };
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
