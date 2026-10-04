import { clamp, lerp } from './common_helper.js';
import {
  INTERACTION_COLOR_PROPS,
  INTERACTION_NUMERIC_PROPS,
  INTERACTION_SELECT_PROPS,
  INTERACTION_TOGGLE_PROPS,
  interactionDefaultValue,
  normalizeInteractionColorValue,
  normalizeInteractionSelectValue,
} from './interaction_field_data.js';
import { timelineFrameCount } from './timeline_playback_helper.js';
import { formulaFrameBoundary } from './formula_runtime_engine.js';
import { normalizeActionCondition } from './action_condition_helper.js';

const ACTION_BLEND_VISUAL_KEYS = ['x', 'y', 'ax', 'ay', 'w', 'h', 'rot', 'opacity', 'anchorX', 'anchorY'];

const ROTATION_CYCLE_DEGREES = 360;

const INTERACTION_MERGE_PROPS = [
  ...INTERACTION_TOGGLE_PROPS,
  ...INTERACTION_NUMERIC_PROPS,
  ...INTERACTION_SELECT_PROPS,
  ...INTERACTION_COLOR_PROPS,
];

export function blendActionOffset(from = {}, to = {}, current = {}, t = 1) {
  const next = { ...current };
  ACTION_BLEND_VISUAL_KEYS.forEach((key) => {
    const start = Number(from?.[key] ?? next[key] ?? 0);
    const end = Number(to?.[key] ?? next[key] ?? 0);
    next[key] = key === 'rot' ? blendRotationShortest(start, end, t) : lerp(start, end, t);
  });
  return next;
}

export function blendRotationShortest(from, to, t) {
  return from + shortestRotationDelta(from, to) * t;
}

export function shortestRotationDelta(from, to) {
  return positiveModulo(to - from + ROTATION_CYCLE_DEGREES / 2, ROTATION_CYCLE_DEGREES) - ROTATION_CYCLE_DEGREES / 2;
}

export function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function canRunFallbackCondition(player, key) {
  const condition = normalizeActionCondition(player.actionSettings?.[key]?.condition);
  if (condition === 'ground') return player.onGround === true;
  if (condition === 'air') return player.onGround === false;
  return true;
}

export function interactionValueEnabled(value = {}, role) {
  return Number(value?.active || 0) >= 0.5 && Number(value?.[role] || 0) >= 0.5;
}

export function interactionFrameValueOverridesAction(prop, value) {
  if (value === undefined) return false;
  const fallback = interactionDefaultValue(prop);
  if (typeof fallback === 'string') return String(value || '') !== fallback;
  return Number(value ?? fallback) !== Number(fallback);
}

export function timelineSourceControlsInteractionRole(source, role) {
  if (!source) return false;
  const frames = [];
  if (source.start) frames.push(source.start);
  if (Array.isArray(source.keyframes)) frames.push(...source.keyframes);
  if (source.end) frames.push(source.end);
  if (!source.start && !source.end && !Array.isArray(source.keyframes)) frames.push(source);
  return frames.some((frame) => interactionValueEnabled(frame, role));
}

export function timelineSourceHasExplicitInteractionProp(source, prop) {
  if (!source) return false;
  const frames = [];
  if (source.start) frames.push(source.start);
  if (Array.isArray(source.keyframes)) frames.push(...source.keyframes);
  if (source.end) frames.push(source.end);
  if (!source.start && !source.end && !Array.isArray(source.keyframes)) frames.push(source);
  return frames.some((frame) => Object.prototype.hasOwnProperty.call(frame || {}, prop));
}

export function interactionHasFrameWindow(value = {}, role = '') {
  return role === 'attack' && (value.startFrame !== undefined || value.endFrame !== undefined);
}

export function interactionActionFrameWindowActive(player, value = {}, role = '') {
  if (!interactionHasFrameWindow(value, role)) return true;
  const frameCount = Math.max(1, timelineFrameCount(player.actionSettings?.[player.actionKey] || {}));
  const frame = interactionFrameFromProgress(player.getActionFrameProgress(), frameCount);
  const start = formulaFrameBoundary(value.startFrame, frameCount, 1);
  const end = formulaFrameBoundary(value.endFrame, frameCount, frameCount);
  return frame >= Math.min(start, end) && frame <= Math.max(start, end);
}

export function interactionFrameFromProgress(progress = 0, frameCount = 1) {
  const count = Math.max(1, Math.round(Number(frameCount || 1)));
  return clamp(Math.floor(clamp(Number(progress || 0), 0, 1) * count) + 1, 1, count);
}

export function repeatCastTimelineProgress(rawProgress, cast, frameCount) {
  const count = Math.max(1, Number(frameCount || 1));
  const start = formulaFrameBoundary(cast.repeatStartFrame, count, 1);
  const end = formulaFrameBoundary(cast.repeatEndFrame, count, count);
  const minFrame = Math.min(start, end);
  const maxFrame = Math.max(start, end);
  const rangeFrames = Math.max(1, maxFrame - minFrame + 1);
  const rangeProgress = ((Math.max(0, Number(rawProgress || 0)) * count) % rangeFrames) / count;
  return clamp((minFrame - 1) / count + rangeProgress, 0, 1);
}

export function repeatCastReleaseProgress(releaseState) {
  const duration = Math.max(0.000001, Number(releaseState?.duration || 0));
  const t = clamp(Number(releaseState?.elapsed || 0) / duration, 0, 1);
  return lerp(Number(releaseState?.startProgress || 0), Number(releaseState?.endProgress || 0), t);
}

export function emptyInteractionValues() {
  const values = {};
  INTERACTION_TOGGLE_PROPS.forEach((prop) => {
    values[prop] = Number(interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  });
  INTERACTION_NUMERIC_PROPS.forEach((prop) => {
    values[prop] = Number(interactionDefaultValue(prop));
  });
  INTERACTION_SELECT_PROPS.forEach((prop) => {
    values[prop] = normalizeInteractionSelectValue(prop, interactionDefaultValue(prop));
  });
  INTERACTION_COLOR_PROPS.forEach((prop) => {
    values[prop] = normalizeInteractionColorValue(prop, interactionDefaultValue(prop));
  });
  return values;
}

export function interpolateInteractionValues(start = {}, end = {}, t = 0) {
  const values = {};
  INTERACTION_TOGGLE_PROPS.forEach((prop) => {
    values[prop] = Number(start[prop] ?? interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  });
  INTERACTION_NUMERIC_PROPS.forEach((prop) => {
    values[prop] = lerp(
      Number(start[prop] ?? interactionDefaultValue(prop)),
      Number(end[prop] ?? interactionDefaultValue(prop)),
      t
    );
  });
  INTERACTION_SELECT_PROPS.forEach((prop) => {
    values[prop] = normalizeInteractionSelectValue(prop, start[prop] ?? interactionDefaultValue(prop));
  });
  INTERACTION_COLOR_PROPS.forEach((prop) => {
    values[prop] = normalizeInteractionColorValue(prop, start[prop] ?? interactionDefaultValue(prop));
  });
  return values;
}
export { INTERACTION_MERGE_PROPS };
