import { frameValue, interpolateEffectFrameValues } from './animation_frame_data.js';
import {
  effectKeyframesFor,
  ensureEffectOffset,
  ensurePoseOffset,
  poseKeyframesFor,
} from './project_data_normalizer.js';

export function currentPoseTimelineFrame({
  tuning,
  poseKey,
  part,
  activeKeyframeId,
  fixedFrame,
  isMasterPart,
  ensureKeyframe,
}) {
  ensurePoseOffset(tuning, poseKey, part);
  const frames = tuning.poseOffsets[poseKey][part];

  if (activeKeyframeId) return ensureKeyframe(frames, activeKeyframeId);
  if (!fixedFrame) return isMasterPart ? frames : frames.start || frameValue();
  return (
    poseKeyframesFor(frames).find((frame) => frame.id === fixedFrame) || frames[fixedFrame === 'end' ? 'end' : 'start']
  );
}

export function currentEffectTimelineFrame({
  tuning,
  effectKey,
  activeKeyframeId,
  fixedFrame,
  selectedSlot,
  activeT,
  ensureKeyframe,
  setFixedFrame,
}) {
  ensureEffectOffset(tuning, effectKey);
  const effect = tuning.effectOffsets[effectKey];

  if (activeKeyframeId) return ensureKeyframe(activeKeyframeId);

  if (!fixedFrame && selectedSlot !== null) {
    return interpolateEffectFrameValues(effectKeyframesFor(effect, effectKey), activeT, effectKey);
  }

  let frame = fixedFrame;
  if (!frame) {
    setFixedFrame('start');
    frame = 'start';
  }

  return effect[frame === 'end' ? 'end' : 'start'];
}
