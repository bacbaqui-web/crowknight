import {
  activeAttackSettingsKey,
  activeEffectSettingsKey,
  isCollisionSectionOpen,
  isSettingsPanelOpen,
} from './settingsPanelState.js';
import { drawAttackHitboxPreview, drawBodyHitbox } from './settingsDebugRenderer.js';
import { drawEffectSettingsPreview } from './settingsEffectPreviewRenderer.js';

export function drawTuningPanelDebugBoxes(ctx, selectedActor, effectAssets) {
  if (!isSettingsPanelOpen()) return { hasEffectHandleUpdate: false, effectHandle: null };

  if (isCollisionSectionOpen()) {
    drawBodyHitbox(ctx, selectedActor);
  }

  const attackKey = activeAttackSettingsKey();
  if (attackKey) {
    drawAttackHitboxPreview(ctx, selectedActor, attackKey);
  }

  const effectKey = activeEffectSettingsKey();
  if (!effectKey) return { hasEffectHandleUpdate: false, effectHandle: null };

  return {
    hasEffectHandleUpdate: true,
    effectHandle: drawEffectSettingsPreview(ctx, selectedActor, effectKey, effectAssets),
  };
}
