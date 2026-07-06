import { ACTION_PART_KEYS } from './game_config_data.js';
import { ensureActionOffset, actionKeyframesFor } from './project_data_normalizer_helper.js';
import { effectFrameValue, frameValue } from './animation_frame_data.js';
import { pasteEffectTimelineFrame, pasteActionTimelineFramePart } from './timeline_keyframe_helper.js';
import { isTimelineFrameId } from './timeline_state.js';

export function createTimelineClipboardState() {
  let copiedFrame = null;
  return {
    clear() {
      copiedFrame = null;
    },
    get() {
      return copiedFrame;
    },
    has() {
      return Boolean(copiedFrame);
    },
    set(copy) {
      copiedFrame = copy;
    },
  };
}

export function copyTimelineFrame({ isOpen, id, keyframes, fallbackFrame = null, createCopy }) {
  if (!isOpen) return null;
  const source = (id ? keyframes.find((frame) => frame.id === id) : null) || fallbackFrame;
  if (!source) return null;
  return createCopy(source, id);
}

export function timelinePasteTargetFrameId({ selection, keyframes, slotToValue, addKeyframe, defaultFrameId = null }) {
  const id = selection.activeKeyframeId || selection.fixedFrame;
  if (isTimelineFrameId(id, keyframes)) return id;
  if (selection.selectedSlot === null) return defaultFrameId;

  const createdId = addKeyframe(slotToValue(selection.selectedSlot));
  selection.activeKeyframeId = createdId;
  selection.fixedFrame = null;
  return createdId;
}

export function copyActiveActionTimelineFrame({
  isOpen,
  activeKeyframeId,
  fixedFrame,
  keyframes,
  tuning,
  actionKey,
  selectedActionParts,
  activeActionPartKey,
}) {
  const id = activeKeyframeId || fixedFrame;
  return copyTimelineFrame({
    isOpen,
    id,
    keyframes,
    createCopy: (reference) =>
      createActionFrameCopy({
        tuning,
        actionKey,
        id,
        reference,
        selectedParts: selectedActionFrameCopyParts(selectedActionParts, activeActionPartKey),
        mode: selectedActionFrameCopyMode(selectedActionParts, activeActionPartKey),
        activeActionPartKey,
      }),
  });
}

export function pasteActionTimelineFrameCopy({
  copiedActionFrame,
  id,
  tuning,
  actionKey,
  selectedActionParts,
  activeActionPartKey,
  ensureKeyframe,
}) {
  if (!copiedActionFrame || !id) return false;
  const pasteParts = actionFramePasteParts(copiedActionFrame, selectedActionParts, activeActionPartKey);

  pasteParts.forEach(({ from, to }) => {
    if (!from || !to || !copiedActionFrame.parts[from]) return;

    ensureActionOffset(tuning, actionKey, to);
    const frames = tuning.actionOffsets[actionKey][to];
    pasteActionTimelineFramePart({
      frames,
      id,
      sourceFrame: copiedActionFrame.parts[from],
      ensureKeyframe,
    });
  });

  return true;
}

export function copyActiveEffectTimelineFrame({ isOpen, effectKey, id, keyframes, fallbackFrame }) {
  return copyTimelineFrame({
    isOpen,
    id,
    keyframes,
    fallbackFrame,
    createCopy: (source) => createEffectFrameCopy(effectKey, source),
  });
}

export function pasteEffectTimelineFrameCopy({ copiedEffectFrame, effect, effectKey, id, ensureKeyframe }) {
  if (!copiedEffectFrame || !id) return false;
  pasteEffectTimelineFrame({
    effect,
    effectKey,
    id,
    sourceFrame: copiedEffectFrame.frame,
    ensureKeyframe,
  });
  return true;
}

export function selectedActionFrameCopyParts(selectedActionParts, activeActionPartKey) {
  if (selectedActionParts.size() > 1) return selectedActionParts.values();
  if (activeActionPartKey) return [activeActionPartKey];
  return ACTION_PART_KEYS;
}

export function selectedActionFrameCopyMode(selectedActionParts, activeActionPartKey) {
  if (selectedActionParts.size() > 1) return 'parts';
  if (activeActionPartKey) return 'part';
  return 'frame';
}

export function createActionFrameCopy({ tuning, actionKey, id, reference, selectedParts, mode, activeActionPartKey }) {
  const copy = {
    mode,
    action: actionKey,
    sourceId: id,
    sourcePart: activeActionPartKey || null,
    sourceParts: selectedParts,
    parts: {},
  };

  selectedParts.forEach((part) => {
    ensureActionOffset(tuning, actionKey, part);
    const frames = tuning.actionOffsets[actionKey][part];
    const source = actionKeyframesFor(frames).find((frame) => frame.id === id);
    copy.parts[part] = frameValue(source || reference);
  });

  return copy;
}

export function actionFramePasteParts(copiedActionFrame, selectedActionParts, activeActionPartKey) {
  if (copiedActionFrame.mode === 'part') {
    return [{ from: copiedActionFrame.sourcePart, to: activeActionPartKey || copiedActionFrame.sourcePart }];
  }

  if (copiedActionFrame.mode === 'parts') {
    const sourceParts = copiedActionFrame.sourceParts || Object.keys(copiedActionFrame.parts || {});
    const targetParts = selectedActionParts.size() > 1 ? selectedActionParts.values() : sourceParts;
    return sourceParts.map((from, index) => ({ from, to: targetParts[index] || from }));
  }

  return ACTION_PART_KEYS.map((part) => ({ from: part, to: part }));
}

export function createEffectFrameCopy(effectKey, source) {
  return {
    effect: effectKey,
    frame: effectFrameValue(source, effectKey),
  };
}
