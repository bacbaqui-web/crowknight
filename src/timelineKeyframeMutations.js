import { defaultEffectImageKey, effectFrameValue, frameValue } from './animationFrames.js';
import { POSE_PART_KEYS } from './gameConfig.js';
import {
  effectKeyframesFor,
  ensureEffectOffset,
  ensurePoseOffset,
  interpolateEffectFrameValues,
  interpolateFrameValues,
  makePoseKeyframeId,
  normalizeEffectOffsets,
  normalizePoseFrameValue,
  poseKeyframesFor,
  sortPoseKeyframes,
  syncFrameAliases,
} from './tuningNormalize.js';

export function addPoseTimelineKeyframe(tuning, poseKey, t) {
  const id = makePoseKeyframeId();
  POSE_PART_KEYS.forEach((part) => {
    ensurePoseOffset(tuning, poseKey, part);
    const frames = tuning.poseOffsets[poseKey][part];
    const next = {
      id,
      t,
      ...interpolateFrameValues(poseKeyframesFor(frames), t),
    };
    frames.keyframes.push(next);
    sortPoseKeyframes(frames.keyframes);
    syncFrameAliases(frames);
  });
  return id;
}

export function deletePoseTimelineKeyframe(tuning, poseKey, id) {
  POSE_PART_KEYS.forEach((part) => {
    const frames = tuning.poseOffsets[poseKey]?.[part];
    if (!frames?.keyframes) return;
    frames.keyframes = frames.keyframes.filter((frame) => frame.id !== id);
    syncFrameAliases(frames);
  });
}

export function addEffectTimelineKeyframe(tuning, effectKey, t) {
  ensureEffectOffset(tuning, effectKey);
  const effect = tuning.effectOffsets[effectKey];
  const id = makePoseKeyframeId();
  effect.keyframes.push({
    id,
    t,
    ...interpolateEffectFrameValues(effectKeyframesFor(effect, effectKey), t, effectKey),
  });
  sortPoseKeyframes(effect.keyframes);
  syncFrameAliases(effect);
  return id;
}

export function deleteEffectTimelineKeyframe(tuning, effectKey, id) {
  const effect = tuning.effectOffsets[effectKey];
  effect.keyframes = effect.keyframes.filter((frame) => frame.id !== id);
  syncFrameAliases(effect);
}

export function resetPoseTimelineAnimation(tuning, poseKey) {
  tuning.poseOffsets ||= {};
  tuning.poseOffsets[poseKey] = {};
  POSE_PART_KEYS.forEach((part) => {
    tuning.poseOffsets[poseKey][part] = normalizePoseFrameValue();
  });
}

export function resetEffectTimelineAnimation(tuning, effectKey) {
  tuning.effectOffsets[effectKey] = normalizeEffectOffsets({
    [effectKey]: { image: defaultEffectImageKey(effectKey) },
  })[effectKey];
}

export function pastePoseTimelineFramePart({ frames, id, sourceFrame, ensureKeyframe }) {
  const target = ensureKeyframe(frames, id);
  const keep = { id: target.id, t: target.t };
  Object.assign(target, frameValue(sourceFrame), keep);
  if (id === 'start') frames.start = frameValue(target);
  if (id === 'end') frames.end = frameValue(target);
  syncFrameAliases(frames);
}

export function pasteEffectTimelineFrame({ effect, effectKey, id, sourceFrame, ensureKeyframe }) {
  const target = ensureKeyframe(id);
  const keep = { id: target.id, t: target.t };
  Object.assign(target, effectFrameValue(sourceFrame, effectKey), keep);
  if (id === 'start') effect.start = effectFrameValue(target, effectKey);
  if (id === 'end') effect.end = effectFrameValue(target, effectKey);
  syncFrameAliases(effect);
}
