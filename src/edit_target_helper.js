import { isMasterPart } from './editor_label_helper.js';
import { MASTER_PART_KEY } from './game_config_data.js';

export const EDIT_CONTEXT_SETUP = 'setup';
export const EDIT_CONTEXT_ACTION = 'action';
export const EDIT_CONTEXT_EFFECT = 'effect';

export const EDIT_TARGET_PART = 'part';
export const EDIT_TARGET_GROUP = 'group';
export const EDIT_TARGET_ACTION_PIVOT = 'actionPivot';
export const EDIT_TARGET_FRAME_GROUP = 'frameGroup';
export const EDIT_TARGET_EFFECT = 'effect';

export function resolveEditTarget({
  context,
  activePartKey,
  editFocusPartKey,
  hasFrameTarget,
  selectedActionParts,
  activeActionPartKey,
  fallbackPartKey = MASTER_PART_KEY,
}) {
  if (context === EDIT_CONTEXT_ACTION) {
    return createActionTarget({
      hasFrameTarget,
      selectedActionParts,
      activeActionPartKey,
      fallbackPartKey,
    });
  }

  if (context === EDIT_CONTEXT_EFFECT) {
    return createEditTarget({
      context: EDIT_CONTEXT_EFFECT,
      targetType: EDIT_TARGET_EFFECT,
      targetKey: EDIT_TARGET_EFFECT,
      writeTargetKey: EDIT_TARGET_EFFECT,
    });
  }

  const setupPartKey = editFocusPartKey || activePartKey || fallbackPartKey;
  return createEditTarget({
    context: EDIT_CONTEXT_SETUP,
    targetType: EDIT_TARGET_PART,
    targetKey: setupPartKey,
    writeTargetKey: setupPartKey,
  });
}

function createActionTarget({ hasFrameTarget, selectedActionParts, activeActionPartKey, fallbackPartKey }) {
  const targetType = actionTargetType({ hasFrameTarget, selectedActionParts });

  if (targetType === EDIT_TARGET_GROUP) {
    const targetKeys = selectedPartValues(selectedActionParts).filter((partKey) => partKey && !isMasterPart(partKey));
    return createEditTarget({
      context: EDIT_CONTEXT_ACTION,
      targetType,
      targetKey: EDIT_TARGET_GROUP,
      targetKeys,
      writeTargetKey: EDIT_TARGET_GROUP,
      writeTargetKeys: targetKeys,
    });
  }

  if (targetType === EDIT_TARGET_ACTION_PIVOT) {
    return createEditTarget({
      context: EDIT_CONTEXT_ACTION,
      targetType,
      targetKey: null,
      writeTargetKey: null,
    });
  }

  if (targetType === EDIT_TARGET_FRAME_GROUP) {
    return createEditTarget({
      context: EDIT_CONTEXT_ACTION,
      targetType,
      targetKey: MASTER_PART_KEY,
      writeTargetKey: MASTER_PART_KEY,
    });
  }

  const writeTargetKey = resolvePartWriteTarget(selectedActionParts, activeActionPartKey, fallbackPartKey);
  return createEditTarget({
    context: EDIT_CONTEXT_ACTION,
    targetType,
    targetKey: writeTargetKey,
    writeTargetKey,
  });
}

function actionTargetType({ hasFrameTarget, selectedActionParts }) {
  const selectedCount = selectedPartCount(selectedActionParts);
  if (selectedCount > 1) return EDIT_TARGET_GROUP;
  const hasExplicitPart = selectedCount > 0;
  if (!hasFrameTarget && !hasExplicitPart) return EDIT_TARGET_ACTION_PIVOT;
  if (hasFrameTarget && !hasExplicitPart) return EDIT_TARGET_FRAME_GROUP;
  return EDIT_TARGET_PART;
}

function resolvePartWriteTarget(selectedActionParts, activePartKey, fallbackPartKey) {
  if (selectedPartCount(selectedActionParts) === 1) {
    const selected = selectedPartValues(selectedActionParts)[0];
    if (selected && !isMasterPart(selected)) return selected;
  }
  if (activePartKey && !isMasterPart(activePartKey)) return activePartKey;
  return fallbackPartKey || MASTER_PART_KEY;
}

function selectedPartCount(selectedParts) {
  if (Array.isArray(selectedParts)) return selectedParts.length;
  return selectedParts?.size?.() ?? selectedParts?.size ?? 0;
}

function selectedPartValues(selectedParts) {
  if (Array.isArray(selectedParts)) return selectedParts;
  return selectedParts?.values?.() ?? [];
}

function createEditTarget({ context, targetType, targetKey, targetKeys = [], writeTargetKey, writeTargetKeys = [] }) {
  return {
    context,
    type: targetType,
    targetType,
    targetKey,
    targetKeys,
    writeTargetKey,
    writeTargetKeys,
    isActionPivot: context === EDIT_CONTEXT_ACTION && targetType === EDIT_TARGET_ACTION_PIVOT,
    isFrameGroup: context === EDIT_CONTEXT_ACTION && targetType === EDIT_TARGET_FRAME_GROUP,
    isGroup: targetType === EDIT_TARGET_GROUP,
    isPart: targetType === EDIT_TARGET_PART,
    isEffect: context === EDIT_CONTEXT_EFFECT && targetType === EDIT_TARGET_EFFECT,
  };
}
