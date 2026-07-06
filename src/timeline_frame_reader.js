import { frameValue, interpolateEffectFrameValues, interpolateFrameValues } from './animation_frame_data.js';
import {
  effectKeyframesFor,
  ensureEffectOffset,
  ensureActionOffset,
  actionKeyframesFor,
} from './project_data_normalizer_helper.js';

export function currentActionTimelineFrame({
  tuning,
  actionKey,
  part,
  activeKeyframeId,
  fixedFrame,
  selectedSlot,
  activeT,
  isMasterPart,
  ensureKeyframe,
}) {
  ensureActionOffset(tuning, actionKey, part);
  const frames = tuning.actionOffsets[actionKey][part];

  if (activeKeyframeId) return ensureKeyframe(frames, activeKeyframeId);
  if (!fixedFrame && selectedSlot !== null) return interpolateFrameValues(actionKeyframesFor(frames), activeT);
  if (!fixedFrame) return isMasterPart ? frames : frames.start || frameValue();
  return (
    actionKeyframesFor(frames).find((frame) => frame.id === fixedFrame) ||
    frames[fixedFrame === 'end' ? 'end' : 'start']
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
