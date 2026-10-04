import { mergeInto } from './project_object_merge_helper.js';
export { replaceObject } from './project_object_merge_helper.js';
import { normalizeTimelineModifiers } from './timeline_modifier_data.js';
import {
  normalizeActionNames,
  normalizeActionTriggers,
  normalizeCustomActions,
  normalizeDeletedActionKeys,
} from './action_authoring_data.js';
import { clone } from './common_helper.js';
import {
  normalizeRigInteractionObjectParts,
  normalizeSetupHudAnchors,
  normalizeMovementScalars,
  normalizeMotionSettings,
  migrateSplitRigParts,
  normalizeControlGroups,
  normalizeRigImageAnchors,
  normalizeRigRotations,
  normalizeLayerOrder,
} from './project_rig_normalizer_helper.js';
import {
  normalizeActionSettings,
  migrateNormalizedActionFormulas,
  normalizeActionOffsets,
} from './project_action_normalizer_helper.js';
import { normalizeEffectSettings, normalizeEffectOffsets } from './project_effect_normalizer_helper.js';

export function mergeTuning(base, saved) {
  if (saved) {
    saved = { ...saved, maxHp: saved.maxHp ?? (saved.maxHpPips != null ? saved.maxHpPips * 20 : base.maxHp) };
    delete saved.maxHpPips;
  }
  if (!saved) {
    const fresh = clone(base);
    fresh.actionNames = normalizeActionNames(fresh.actionNames);
    fresh.customActions = normalizeCustomActions(fresh.customActions);
    fresh.deletedActionKeys = normalizeDeletedActionKeys(fresh.deletedActionKeys);
    fresh.actionTriggers = normalizeActionTriggers(fresh.actionTriggers, fresh.customActions);
    fresh.actionOffsets = normalizeActionOffsets(fresh.actionOffsets, fresh.customActions, fresh.deletedActionKeys);
    fresh.actionSettings = normalizeActionSettings(
      fresh.actionSettings,
      base.actionSettings,
      fresh.customActions,
      fresh.deletedActionKeys
    );
    fresh.effectOffsets = normalizeEffectOffsets(fresh.effectOffsets, fresh.customActions, fresh.deletedActionKeys);
    fresh.effectSettings = normalizeEffectSettings(
      fresh.effectSettings,
      base.effectSettings || base.actionSettings,
      fresh.customActions,
      fresh.deletedActionKeys
    );
    fresh.modifiers = normalizeTimelineModifiers(fresh.modifiers);
    migrateNormalizedActionFormulas(fresh);
    normalizeControlGroups(fresh.rig);
    normalizeRigImageAnchors(fresh.rig);
    normalizeRigRotations(fresh.rig, base.rig);
    normalizeMovementScalars(fresh);
    normalizeRigInteractionObjectParts(fresh, base);
    normalizeSetupHudAnchors(fresh, base);
    return fresh;
  }
  const merged = clone(base);
  mergeInto(merged, saved);
  migrateSplitRigParts(merged.rig, saved.rig);
  merged.layerOrder = normalizeLayerOrder(merged.layerOrder, base.layerOrder);
  merged.actionNames = normalizeActionNames(saved.actionNames || merged.actionNames);
  merged.customActions = normalizeCustomActions(saved.customActions || merged.customActions);
  merged.deletedActionKeys = normalizeDeletedActionKeys(saved.deletedActionKeys || merged.deletedActionKeys);
  merged.actionTriggers = normalizeActionTriggers(saved.actionTriggers || merged.actionTriggers, merged.customActions);
  merged.actionOffsets = normalizeActionOffsets(
    saved.actionOffsets || merged.actionOffsets,
    merged.customActions,
    merged.deletedActionKeys
  );
  merged.actionSettings = normalizeActionSettings(
    saved.actionSettings || merged.actionSettings,
    base.actionSettings,
    merged.customActions,
    merged.deletedActionKeys
  );
  merged.effectOffsets = normalizeEffectOffsets(
    saved.effectOffsets || merged.effectOffsets,
    merged.customActions,
    merged.deletedActionKeys
  );
  merged.effectSettings = normalizeEffectSettings(
    saved.effectSettings || merged.effectSettings,
    base.effectSettings || base.actionSettings,
    merged.customActions,
    merged.deletedActionKeys
  );
  merged.modifiers = normalizeTimelineModifiers(saved.modifiers || merged.modifiers);
  migrateNormalizedActionFormulas(merged);
  normalizeControlGroups(merged.rig);
  normalizeRigImageAnchors(merged.rig, saved.rig);
  normalizeRigRotations(merged.rig, base.rig);
  normalizeMotionSettings(merged.motion, base.motion);
  normalizeMovementScalars(merged);
  normalizeRigInteractionObjectParts(merged, base, saved);
  normalizeSetupHudAnchors(merged, base, saved.hudAnchors);
  return merged;
}

export {
  ensureActionOffset,
  ensureActionSettings,
  normalizeActionFrameValue,
  actionKeyframesFor,
  sortActionKeyframes,
  makeActionKeyframeId,
} from './project_action_normalizer_helper.js';

export {
  normalizeEffectOffsets,
  normalizeEffectOffsetForKey,
  normalizeEffectKeyframes,
  ensureEffectOffset,
  ensureEffectSettings,
  effectFrameAt,
  effectKeyframesFor,
} from './project_effect_normalizer_helper.js';
