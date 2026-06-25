import { POSE_PART_KEYS } from './gameConfig.js';
import { ensurePoseOffset, poseKeyframesFor } from './tuningNormalize.js';
import { effectFrameValue, frameValue } from './animationFrames.js';
import { pasteEffectTimelineFrame, pastePoseTimelineFramePart } from './timelineKeyframeMutations.js';

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
  if (!isOpen) return null;
  const id = activeKeyframeId || fixedFrame;
  if (!id) return null;

  const reference = keyframes.find((frame) => frame.id === id);
  if (!reference) return null;

  const selectedParts = selectedPoseFrameCopyParts(selectedPosePartKeys, activePosePartKey);
  return createPoseFrameCopy({
    tuning,
    poseKey,
    id,
    reference,
    selectedParts,
    mode: selectedPoseFrameCopyMode(selectedPosePartKeys, activePosePartKey),
    activePosePartKey,
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
  if (!isOpen) return null;
  const source = id ? keyframes.find((frame) => frame.id === id) : fallbackFrame;
  if (!source) return null;
  return createEffectFrameCopy(effectKey, source);
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
