import { frameValue, interpolateEffectFrameValues, interpolateFrameValues } from './animation_frame_data.js';
import {
  effectKeyframesFor,
  ensureEffectOffset,
  ensureActionOffset,
  actionKeyframesFor,
} from './project_data_normalizer_helper.js';
import {
  actionKeyframeTargetId,
  actionKeyframeTargetT,
  hasActionKeyframeTarget,
} from './action_keyframe_target_helper.js';

export function currentActionTimelineFrame({
  tuning,
  actionKey,
  part,
  actionKeyframeTarget,
  isMasterPart,
  ensureKeyframe,
}) {
  ensureActionOffset(tuning, actionKey, part);
  const frames = tuning.actionOffsets[actionKey][part];
  const targetT = actionKeyframeTargetT(actionKeyframeTarget);

  if (hasActionKeyframeTarget(actionKeyframeTarget)) {
    return readActionKeyframeTarget(frames, actionKeyframeTargetId(actionKeyframeTarget), ensureKeyframe);
  }
  if (actionKeyframeTarget?.selectedSlot !== null && actionKeyframeTarget?.selectedSlot !== undefined) {
    return interpolateFrameValues(actionKeyframesFor(frames), targetT);
  }
  return isMasterPart ? frames : frames.start || frameValue();
}

function readActionKeyframeTarget(frames, id, ensureKeyframe) {
  const keyframe = actionKeyframesFor(frames).find((frame) => frame.id === id);
  if (keyframe) return keyframe;
  if (id === 'start' || id === 'end') return frames[id] || frameValue();
  return ensureKeyframe(frames, id);
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
