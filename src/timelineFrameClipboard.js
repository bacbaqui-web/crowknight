import { POSE_PART_KEYS } from './gameConfig.js';
import { ensurePoseOffset, poseKeyframesFor } from './tuningNormalize.js';
import { effectFrameValue, frameValue } from './animationFrames.js';

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
