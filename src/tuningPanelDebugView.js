import {
  activeAttackSettingsKey,
  activeEffectSettingsKey,
  isCollisionSectionOpen,
  isSettingsPanelOpen,
} from './settingsPanelState.js';
import { drawAttackInteractionBoxPreview, drawEditableInteractionBoxTarget } from './settingsDebugRenderer.js';
import { drawEffectSettingsPreview } from './settingsEffectPreviewRenderer.js';
import {
  COLLISION_INTERACTION_BOX_KEY,
  HURT_INTERACTION_BOX_KEY,
  GUARD_INTERACTION_BOX_KEY,
  ATTACK_INTERACTION_BOX_KEY,
  interactionBoxPartKeysForParent,
  isInteractionBoxPartKey,
} from './tuningInteractionBoxes.js';

export function drawTuningPanelDebugBoxes(
  ctx,
  selectedActor,
  effectAssets,
  { activeSetupPartKey = null, activePosePartKey = null } = {}
) {
  if (!isSettingsPanelOpen()) return { hasEffectHandleUpdate: false, effectHandle: null };

  if (isCollisionSectionOpen()) {
    drawSetupInteractionBoxPreview(ctx, selectedActor, activeSetupPartKey);
  }

  const activePoseInteractionBoxKeys = editHandleInteractionBoxKeysForPosePart(activePosePartKey);
  activePoseInteractionBoxKeys.forEach((boxKey) => drawSetupInteractionBoxPreview(ctx, selectedActor, boxKey));

  const attackKey = activeAttackSettingsKey();
  if (attackKey && !activePoseInteractionBoxKeys.length) {
    drawAttackInteractionBoxPreview(ctx, selectedActor, attackKey);
  }

  const effectKey = activeEffectSettingsKey();
  if (!effectKey) return { hasEffectHandleUpdate: false, effectHandle: null };

  return {
    hasEffectHandleUpdate: true,
    effectHandle: drawEffectSettingsPreview(ctx, selectedActor, effectKey, effectAssets),
  };
}

function editHandleInteractionBoxKeysForPosePart(partKey) {
  if (isInteractionBoxPartKey(partKey)) return [partKey];
  return interactionBoxPartKeysForParent(partKey);
}

function drawSetupInteractionBoxPreview(ctx, actor, activeSetupPartKey) {
  if (activeSetupPartKey === COLLISION_INTERACTION_BOX_KEY) {
    drawEditableInteractionBoxTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(105, 183, 229, 0.16)',
      stroke: 'rgba(105, 183, 229, 0.96)',
    });
  } else if (activeSetupPartKey === HURT_INTERACTION_BOX_KEY) {
    drawEditableInteractionBoxTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(255, 64, 64, 0.16)',
      stroke: 'rgba(255, 92, 92, 0.95)',
    });
  } else if (activeSetupPartKey === ATTACK_INTERACTION_BOX_KEY) {
    drawEditableInteractionBoxTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(255, 224, 72, 0.18)',
      stroke: 'rgba(255, 224, 72, 0.95)',
    });
  } else if (activeSetupPartKey === GUARD_INTERACTION_BOX_KEY) {
    drawEditableInteractionBoxTarget(ctx, actor, activeSetupPartKey, {
      fill: 'rgba(124, 207, 146, 0.16)',
      stroke: 'rgba(124, 207, 146, 0.96)',
    });
  }
}
