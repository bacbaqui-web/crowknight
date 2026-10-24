import { lerp } from './common_helper.js';
import { emptyInteractionValues, interpolateInteractionValues } from './actor_runtime_pose_helper.js';
import { actionTimelineMirrorSign, mirrorActionFrameValue } from './action_mirror_helper.js';
import { applyActionAnchor, interpolateFrameValues } from './puppet_player_geometry_helper.js';
import { runtimeRead } from './runtime_read_cache.js';

const EMPTY_OFFSET = Object.freeze({
  x: 0,
  y: 0,
  ax: 0,
  ay: 0,
  w: 0,
  h: 0,
  rot: 0,
  opacity: 1,
  anchorX: 0,
  anchorY: 0,
  active: 0,
  attack: 0,
  hurt: 0,
  collision: 0,
  guard: 0,
  ...emptyInteractionValues(),
});

export function evaluateActionOffset(value, progress, settings = {}, facing = 1) {
  const mirrorSign = actionTimelineMirrorSign(settings, facing);
  return runtimeRead(value, `offset:${progress}:${mirrorSign}`, () => computeOffset(value, progress, mirrorSign), true);
}
function computeOffset(value, progress, mirrorSign) {
  const empty = EMPTY_OFFSET;
  if (!value) return { ...empty };
  const mirror = (frame) => mirrorActionFrameValue(frame, mirrorSign);
  if (Array.isArray(value.keyframes) && value.keyframes.length) {
    return mirror(applyActionAnchor(interpolateFrameValues(value.keyframes, progress, empty), value));
  }
  if (!value.start && !value.end) return mirror({ ...empty, ...value });

  const start = { ...empty, ...(value.start || {}) };
  const end = { ...empty, ...(value.end || start) };
  const t = progress;
  return mirror({
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    ax: lerp(start.ax, end.ax, t),
    ay: lerp(start.ay, end.ay, t),
    w: lerp(start.w, end.w, t),
    h: lerp(start.h, end.h, t),
    rot: lerp(start.rot, end.rot, t),
    opacity: lerp(start.opacity, end.opacity, t),
    anchorX: Number(value.anchorX || 0),
    anchorY: Number(value.anchorY || 0),
    active: Number(start.active || 0) >= 0.5 ? 1 : 0,
    attack: Number(start.attack || 0) >= 0.5 ? 1 : 0,
    hurt: Number(start.hurt || 0) >= 0.5 ? 1 : 0,
    collision: Number(start.collision || 0) >= 0.5 ? 1 : 0,
    guard: Number(start.guard || 0) >= 0.5 ? 1 : 0,
    ...interpolateInteractionValues(start, end, t),
  });
}
