import {
  defaultEffectImageKey,
  effectFrameValue,
  frameValue,
  interpolateEffectFrameValues,
  interpolateFrameValues,
  syncFrameAliases,
} from './animation_frame_data.js';
import { ACTION_PART_KEYS } from './game_config_data.js';
import {
  effectKeyframesFor,
  ensureEffectOffset,
  ensureActionOffset,
  makeActionKeyframeId,
  normalizeEffectOffsetForKey,
  normalizeActionFrameValue,
  actionKeyframesFor,
  sortActionKeyframes,
} from './project_data_normalizer_helper.js';
import { actionKeyframeTargetId, hasActionKeyframeTarget } from './action_keyframe_target_helper.js';
import { hasTimelineKeyframeTarget, timelineKeyframeTargetId } from './timeline_keyframe_target_helper.js';

export function addActionTimelineKeyframe(tuning, actionKey, t) {
  const id = makeActionKeyframeId();
  ACTION_PART_KEYS.forEach((part) => {
    ensureActionOffset(tuning, actionKey, part);
    const frames = tuning.actionOffsets[actionKey][part];
    const next = {
      id,
      t,
      ...interpolateFrameValues(actionKeyframesFor(frames), t),
    };
    frames.keyframes.push(next);
    sortActionKeyframes(frames.keyframes);
    syncFrameAliases(frames);
  });
  return id;
}

export function ensureActionTimelineKeyframe(frames, id, timelineKeyframes) {
  const existing = Array.isArray(frames?.keyframes) ? frames.keyframes.find((frame) => frame.id === id) : null;
  if (existing) return existing;

  const keyframes = actionKeyframesFor(frames);
  const found = keyframes.find((frame) => frame.id === id);
  if (found) return found;

  const reference = timelineKeyframes.find((frame) => frame.id === id);
  const t = Number(reference?.t ?? 0.5);
  const created = { id, t, ...interpolateFrameValues(keyframes, t) };
  keyframes.push(created);
  sortActionKeyframes(keyframes);
  syncFrameAliases(frames);
  return created;
}

export function deleteActionTimelineKeyframe(tuning, actionKey, id) {
  ACTION_PART_KEYS.forEach((part) => {
    const frames = tuning.actionOffsets[actionKey]?.[part];
    if (!frames?.keyframes) return;
    frames.keyframes = frames.keyframes.filter((frame) => frame.id !== id);
    syncFrameAliases(frames);
  });
}

export function moveActionTimelineKeyframe(tuning, actionKey, id, t) {
  let moved = false;
  ACTION_PART_KEYS.forEach((part) => {
    const frames = tuning.actionOffsets[actionKey]?.[part];
    const keyframe = frames?.keyframes?.find((frame) => frame.id === id);
    if (!keyframe) return;
    keyframe.t = t;
    sortActionKeyframes(frames.keyframes);
    syncFrameAliases(frames);
    moved = true;
  });
  return moved;
}

export function applyActionTimelineFrameValueDelta(tuning, actionKey, part, prop, delta) {
  const frames = tuning.actionOffsets[actionKey]?.[part];
  if (!frames?.keyframes || !Number.isFinite(delta)) return false;

  actionKeyframesFor(frames).forEach((frame) => {
    frame[prop] = Number(frame[prop] ?? 0) + delta;
  });
  syncFrameAliases(frames);
  return true;
}

export function applyActionTimelineAllFrameValueDelta(tuning, actionKey, prop, delta, parts = ACTION_PART_KEYS) {
  if (!Number.isFinite(delta)) return false;
  let changed = false;
  parts.forEach((part) => {
    ensureActionOffset(tuning, actionKey, part);
    if (applyActionTimelineFrameValueDelta(tuning, actionKey, part, prop, delta)) changed = true;
  });
  return changed;
}

export function applyActionTimelineAllFrameValueTransform(
  tuning,
  actionKey,
  prop,
  transformValue,
  parts = ACTION_PART_KEYS
) {
  let changed = false;
  parts.forEach((part) => {
    ensureActionOffset(tuning, actionKey, part);
    const frames = tuning.actionOffsets[actionKey]?.[part];
    if (!frames?.keyframes) return;
    actionKeyframesFor(frames).forEach((frame) => {
      const nextValue = transformValue(Number(frame[prop] ?? 0), part, frame);
      if (!Number.isFinite(nextValue)) return;
      frame[prop] = nextValue;
      changed = true;
    });
    syncFrameAliases(frames);
  });
  return changed;
}

export function addEffectTimelineKeyframe(tuning, effectKey, t) {
  ensureEffectOffset(tuning, effectKey);
  const effect = tuning.effectOffsets[effectKey];
  const id = makeActionKeyframeId();
  const keyframes = effectKeyframesFor(effect, effectKey);
  keyframes.push({
    id,
    t,
    ...interpolateEffectFrameValues(keyframes, t, effectKey),
  });
  sortActionKeyframes(effect.keyframes);
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
  sortActionKeyframes(keyframes);
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
  sortActionKeyframes(effect.keyframes);
  syncFrameAliases(effect);
  return true;
}

export function resetActionTimelineAnimation(tuning, actionKey) {
  tuning.actionOffsets ||= {};
  tuning.actionOffsets[actionKey] = {};
  ACTION_PART_KEYS.forEach((part) => {
    tuning.actionOffsets[actionKey][part] = normalizeActionFrameValue();
  });
}

export function resetEffectTimelineAnimation(tuning, effectKey) {
  tuning.effectOffsets[effectKey] = normalizeEffectOffsetForKey(effectKey, { image: defaultEffectImageKey(effectKey) });
}

export function pasteActionTimelineFramePart({ frames, id, sourceFrame, ensureKeyframe }) {
  const target = ensureKeyframe(frames, id);
  const keep = { id: target.id, t: target.t };
  Object.assign(target, frameValue(sourceFrame), keep);
  if (id === 'start') frames.start = frameValue(target);
  if (id === 'end') frames.end = frameValue(target);
  syncFrameAliases(frames);
}

export function pasteEffectTimelineFrame({ effect, effectKey, id, sourceFrame, ensureKeyframe }) {
  const target = ensureKeyframe(effect, id);
  const keep = { id: target.id, t: target.t };
  Object.assign(target, effectFrameValue(sourceFrame, effectKey), keep);
  if (id === 'start') effect.start = effectFrameValue(target, effectKey);
  if (id === 'end') effect.end = effectFrameValue(target, effectKey);
  syncFrameAliases(effect);
}

export function writeActionTimelineFrameValue({
  frames,
  prop,
  value,
  actionKeyframeTarget,
  allowRootAnchorWrite,
  ensureKeyframe,
}) {
  const hasTarget = hasActionKeyframeTarget(actionKeyframeTarget);
  if (allowRootAnchorWrite && !hasTarget && (prop === 'anchorX' || prop === 'anchorY')) {
    frames[prop] = value;
    return true;
  }

  if (!hasTarget) return false;

  const keyframe = ensureKeyframe(frames, actionKeyframeTargetId(actionKeyframeTarget));
  keyframe[prop] = value;
  syncFrameAliases(frames);
  return true;
}

export function writeEffectTimelineFrameValue({
  effect,
  effectKey,
  prop,
  value,
  timelineKeyframeTarget,
  activeKeyframeId,
  fixedFrame,
  ensureKeyframe,
}) {
  if (timelineKeyframeTarget) {
    return writeEffectTimelineTargetFrameValue({
      effect,
      prop,
      value,
      timelineKeyframeTarget,
      ensureKeyframe,
    });
  }

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

function writeEffectTimelineTargetFrameValue({ effect, prop, value, timelineKeyframeTarget, ensureKeyframe }) {
  if (!hasTimelineKeyframeTarget(timelineKeyframeTarget)) return false;

  const keyframe = ensureKeyframe(effect, timelineKeyframeTargetId(timelineKeyframeTarget));
  keyframe[prop] = value;
  syncFrameAliases(effect);
  return true;
}
