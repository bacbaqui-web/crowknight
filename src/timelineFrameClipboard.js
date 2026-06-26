import { POSE_PART_KEYS } from './gameConfig.js';
import { ensurePoseOffset, poseKeyframesFor } from './tuningNormalize.js';
import { effectFrameValue, frameValue } from './animationFrames.js';
import { pasteEffectTimelineFrame, pastePoseTimelineFramePart } from './timelineKeyframeMutations.js';
import { isTimelineFrameId } from './timelineState.js';

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

export function copyActivePoseTimelineFrame({
  isOpen,
  activeKeyframeId,
  fixedFrame,
  keyframes,
  tuning,
  poseKey,
  selectedPosePartKeys,
  activePosePartKey,
}) {
  const id = activeKeyframeId || fixedFrame;
  return copyTimelineFrame({
    isOpen,
    id,
    keyframes,
    createCopy: (reference) =>
      createPoseFrameCopy({
        tuning,
        poseKey,
        id,
        reference,
        selectedParts: selectedPoseFrameCopyParts(selectedPosePartKeys, activePosePartKey),
        mode: selectedPoseFrameCopyMode(selectedPosePartKeys, activePosePartKey),
        activePosePartKey,
      }),
  });
}

export function pastePoseTimelineFrameCopy({
  copiedPoseFrame,
  id,
  tuning,
  poseKey,
  selectedPosePartKeys,
  activePosePartKey,
  ensureKeyframe,
}) {
  if (!copiedPoseFrame || !id) return false;
  const pasteParts = poseFramePasteParts(copiedPoseFrame, selectedPosePartKeys, activePosePartKey);

  pasteParts.forEach(({ from, to }) => {
    if (!from || !to || !copiedPoseFrame.parts[from]) return;

    ensurePoseOffset(tuning, poseKey, to);
    const frames = tuning.poseOffsets[poseKey][to];
    pastePoseTimelineFramePart({
      frames,
      id,
      sourceFrame: copiedPoseFrame.parts[from],
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

export function selectedPoseFrameCopyParts(selectedPosePartKeys, activePosePartKey) {
  if (selectedPosePartKeys.size > 1) return [...selectedPosePartKeys];
  if (activePosePartKey) return [activePosePartKey];
  return POSE_PART_KEYS;
}

export function selectedPoseFrameCopyMode(selectedPosePartKeys, activePosePartKey) {
  if (selectedPosePartKeys.size > 1) return 'parts';
  if (activePosePartKey) return 'part';
  return 'frame';
}

export function createPoseFrameCopy({ tuning, poseKey, id, reference, selectedParts, mode, activePosePartKey }) {
  const copy = {
    mode,
    pose: poseKey,
    sourceId: id,
    sourcePart: activePosePartKey || null,
    sourceParts: selectedParts,
    parts: {},
  };

  selectedParts.forEach((part) => {
    ensurePoseOffset(tuning, poseKey, part);
    const frames = tuning.poseOffsets[poseKey][part];
    const source = poseKeyframesFor(frames).find((frame) => frame.id === id);
    copy.parts[part] = frameValue(source || reference);
  });

  return copy;
}

export function poseFramePasteParts(copiedPoseFrame, selectedPosePartKeys, activePosePartKey) {
  if (copiedPoseFrame.mode === 'part') {
    return [{ from: copiedPoseFrame.sourcePart, to: activePosePartKey || copiedPoseFrame.sourcePart }];
  }

  if (copiedPoseFrame.mode === 'parts') {
    const sourceParts = copiedPoseFrame.sourceParts || Object.keys(copiedPoseFrame.parts || {});
    const targetParts = selectedPosePartKeys.size > 1 ? [...selectedPosePartKeys] : sourceParts;
    return sourceParts.map((from, index) => ({ from, to: targetParts[index] || from }));
  }

  return POSE_PART_KEYS.map((part) => ({ from: part, to: part }));
}

export function createEffectFrameCopy(effectKey, source) {
  return {
    effect: effectKey,
    frame: effectFrameValue(source, effectKey),
  };
}
