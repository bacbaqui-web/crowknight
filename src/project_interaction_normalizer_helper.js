import { frameValue } from './animation_frame_data.js';
import {
  INTERACTION_COLOR_PROPS,
  INTERACTION_NUMERIC_PROPS,
  INTERACTION_SELECT_PROPS,
  INTERACTION_TOGGLE_PROPS,
  interactionDefaultValue,
  normalizeInteractionColorValue,
  normalizeInteractionSelectValue,
} from './interaction_field_data.js';
import { clamp, lerp } from './common_helper.js';

export function withInteractionFrameDefaults(value = {}, fallback = {}) {
  return {
    ...value,
    active: value.active ?? fallback.active,
    start: withInteractionFrameDefault(value.start, fallback.start),
    end: withInteractionFrameDefault(value.end, fallback.end),
    keyframes: withInteractionKeyframeDefaults(value.keyframes, fallback.keyframes, value),
  };
}

export function withInteractionFrameDefault(frame = {}, fallback = {}) {
  return {
    ...frame,
    active: frame.active ?? fallback.active ?? 0,
    attack: frame.attack ?? fallback.attack ?? 0,
    hurt: frame.hurt ?? fallback.hurt ?? 0,
    collision: frame.collision ?? fallback.collision ?? 0,
    guard: frame.guard ?? fallback.guard ?? 0,
    ...normalizeInteractionFields(frame, fallback),
  };
}

export function withInteractionKeyframeDefaults(keyframes, fallbackKeyframes = [], value = {}) {
  if (!Array.isArray(keyframes) || !keyframes.length) {
    return fallbackKeyframes.map((frame) => ({
      ...interpolateActionFrameDefaults(value, frame.t),
      ...frame,
    }));
  }
  return keyframes.map((frame, index) => {
    const fallback =
      fallbackKeyframes.find((item) => item.id && item.id === frame.id) ||
      fallbackKeyframes.find((item) => Number(item.t) === Number(frame.t)) ||
      fallbackKeyframes[index] ||
      {};
    return withInteractionFrameDefault(frame, fallback);
  });
}

export function interpolateActionFrameDefaults(value = {}, t = 0) {
  const start = frameValue(value.start);
  const end = frameValue(value.end || value.start);
  const amount = clamp(Number(t), 0, 1);
  return {
    x: lerp(start.x, end.x, amount),
    y: lerp(start.y, end.y, amount),
    ax: lerp(start.ax, end.ax, amount),
    ay: lerp(start.ay, end.ay, amount),
    w: lerp(start.w, end.w, amount),
    h: lerp(start.h, end.h, amount),
    rot: lerp(start.rot, end.rot, amount),
    opacity: lerp(start.opacity, end.opacity, amount),
  };
}

export function normalizeInteractionFields(source = {}, fallback = {}) {
  const normalized = {};
  INTERACTION_TOGGLE_PROPS.forEach((prop) => {
    normalized[prop] = Number(source[prop] ?? fallback[prop] ?? interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  });
  INTERACTION_NUMERIC_PROPS.forEach((prop) => {
    normalized[prop] = Number(source[prop] ?? fallback[prop] ?? interactionDefaultValue(prop));
  });
  INTERACTION_SELECT_PROPS.forEach((prop) => {
    normalized[prop] = normalizeInteractionSelectValue(
      prop,
      source[prop] ?? fallback[prop] ?? interactionDefaultValue(prop)
    );
  });
  INTERACTION_COLOR_PROPS.forEach((prop) => {
    normalized[prop] = normalizeInteractionColorValue(
      prop,
      source[prop] ?? fallback[prop] ?? interactionDefaultValue(prop)
    );
  });
  return normalized;
}
