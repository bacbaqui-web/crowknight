import {
  defaultEffectImageKey,
  effectFrameValue,
  frameValue,
  interpolateEffectFrameValues,
  interpolateFrameValues,
  syncFrameAliases,
} from './animationFrames.js';
import { POSE_PART_KEYS } from './gameConfig.js';
import {
  effectKeyframesFor,
  ensureEffectOffset,
  ensurePoseOffset,
  makePoseKeyframeId,
  normalizeEffectOffsets,
  normalizePoseFrameValue,
  poseKeyframesFor,
  sortPoseKeyframes,
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

export function ensurePoseTimelineKeyframe(frames, id, timelineKeyframes) {
  const keyframes = poseKeyframesFor(frames);
  const found = keyframes.find((frame) => frame.id === id);
  if (found) return found;

  const reference = timelineKeyframes.find((frame) => frame.id === id);
  const t = Number(reference?.t ?? 0.5);
  const created = { id, t, ...interpolateFrameValues(keyframes, t) };
  keyframes.push(created);
  sortPoseKeyframes(keyframes);
  syncFrameAliases(frames);
  return created;
}

export function deletePoseTimelineKeyframe(tuning, poseKey, id) {
  POSE_PART_KEYS.forEach((part) => {
    const frames = tuning.poseOffsets[poseKey]?.[part];
    if (!frames?.keyframes) return;
    frames.keyframes = frames.keyframes.filter((frame) => frame.id !== id);
    syncFrameAliases(frames);
  });
}

export function movePoseTimelineKeyframe(tuning, poseKey, id, t) {
  let moved = false;
  POSE_PART_KEYS.forEach((part) => {
    const frames = tuning.poseOffsets[poseKey]?.[part];
    const keyframe = frames?.keyframes?.find((frame) => frame.id === id);
    if (!keyframe) return;
    keyframe.t = t;
    sortPoseKeyframes(frames.keyframes);
    syncFrameAliases(frames);
    moved = true;
  });
  return moved;
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

export function ensureEffectTimelineKeyframe(effect, effectKey, id, timelineKeyframes) {
  const keyframes = effectKeyframesFor(effect, effectKey);
  const found = keyframes.find((frame) => frame.id === id);
  if (found) return found;

  const reference = timelineKeyframes.find((frame) => frame.id === id);
  const t = Number(reference?.t ?? 0.5);
  const created = { id, t, ...interpolateEffectFrameValues(keyframes, t, effectKey) };
  keyframes.push(created);
  sortPoseKeyframes(keyframes);
  syncFrameAliases(effect);
  return created;
}

export function deleteEffectTimelineKeyframe(tuning, effectKey, id) {
  const effect = tuning.effectOffsets[effectKey];
  effect.keyframes = effect.keyframes.filter((frame) => frame.id !== id);
  syncFrameAliases(effect);
}

export function moveEffectTimelineKeyframe(tuning, effectKey, id, t) {
  const effect = tuning.effectOffsets[effectKey];
  const keyframe = effect.keyframes?.find((frame) => frame.id === id);
  if (!keyframe) return false;
  keyframe.t = t;
  sortPoseKeyframes(effect.keyframes);
  syncFrameAliases(effect);
  return true;
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

export function writePoseTimelineFrameValue({
  frames,
  prop,
  value,
  activeKeyframeId,
  fixedFrame,
  allowRootAnchorWrite,
  ensureKeyframe,
}) {
  if (allowRootAnchorWrite && !activeKeyframeId && !fixedFrame && (prop === 'anchorX' || prop === 'anchorY')) {
    frames[prop] = value;
    return true;
  }

  if (!activeKeyframeId && !fixedFrame) return false;

  if (activeKeyframeId) {
    const keyframe = ensureKeyframe(frames, activeKeyframeId);
    keyframe[prop] = value;
    syncFrameAliases(frames);
    return true;
  }

  frames[fixedFrame][prop] = value;
  poseKeyframesFor(frames).find((keyframe) => keyframe.id === fixedFrame)[prop] = value;
  syncFrameAliases(frames);
  return true;
}

export function writeEffectTimelineFrameValue({
  effect,
  effectKey,
  prop,
  value,
  activeKeyframeId,
  fixedFrame,
  ensureKeyframe,
}) {
  if (!activeKeyframeId && !fixedFrame) return false;

  if (activeKeyframeId) {
    const keyframe = ensureKeyframe(activeKeyframeId);
    keyframe[prop] = value;
    syncFrameAliases(effect);
    return true;
  }

  effect[fixedFrame][prop] = value;
  effectKeyframesFor(effect, effectKey).find((keyframe) => keyframe.id === fixedFrame)[prop] = value;
  syncFrameAliases(effect);
  return true;
}
