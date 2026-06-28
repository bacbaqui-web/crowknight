import {
  defaultEffectImageKey,
  effectFrameValue,
  frameValue,
  interpolateEffectFrameValues,
  poseAnchorValue,
  syncFrameAliases,
  validEffectImageKey,
} from './animationFrames.js';
import { EFFECT_KEYS, POSE_FRAME_KEYS, POSE_KEYS, POSE_PART_KEYS } from './gameConfig.js';
import { DEFAULT_PLAYER_TUNING } from './playerDefaultTuning.js';
import { normalizeCharacterHud } from './characterHudLayout.js';
import { SPEED_VALUE_MAX, SPEED_VALUE_MIN } from './tuningControlValueTransforms.js';
import { controlGroupPartKeys, imagePartKeys } from './tuningParts.js';
import {
  COLLISION_INTERACTION_BOX_KEY,
  HURT_INTERACTION_BOX_KEY,
  GUARD_INTERACTION_BOX_KEY,
  ATTACK_INTERACTION_BOX_KEY,
  INTERACTION_BOX_PART_TYPE,
  interactionBoxParentPartKey,
} from './tuningInteractionBoxes.js';
import { clamp, clone, lerp } from './utils.js';

export function mergeTuning(base, saved) {
  if (!saved) {
    const fresh = clone(base);
    fresh.poseOffsets = normalizePoseOffsets(fresh.poseOffsets);
    fresh.poseSettings = normalizePoseSettings(fresh.poseSettings, base.poseSettings);
    fresh.effectOffsets = normalizeEffectOffsets(fresh.effectOffsets);
    fresh.effectSettings = normalizeEffectSettings(fresh.effectSettings, base.effectSettings || base.poseSettings);
    normalizeControlGroups(fresh.rig);
    normalizeRigImageAnchors(fresh.rig);
    normalizeRigRotations(fresh.rig, base.rig);
    normalizeMovementScalars(fresh);
    normalizeRigInteractionBoxParts(fresh, base);
    normalizeSetupHudAnchors(fresh, base);
    return fresh;
  }
  const merged = clone(base);
  mergeInto(merged, saved);
  migrateSplitRigParts(merged.rig, saved.rig);
  merged.layerOrder = normalizeLayerOrder(merged.layerOrder, base.layerOrder);
  merged.poseOffsets = normalizePoseOffsets(saved.poseOffsets || merged.poseOffsets);
  merged.poseSettings = normalizePoseSettings(saved.poseSettings || merged.poseSettings, base.poseSettings);
  merged.effectOffsets = normalizeEffectOffsets(saved.effectOffsets || merged.effectOffsets);
  merged.effectSettings = normalizeEffectSettings(
    saved.effectSettings || merged.effectSettings,
    base.effectSettings || base.poseSettings
  );
  normalizeControlGroups(merged.rig);
  normalizeRigImageAnchors(merged.rig, saved.rig);
  normalizeRigRotations(merged.rig, base.rig);
  normalizeMotionSettings(merged.motion, base.motion);
  normalizeMovementScalars(merged);
  normalizeRigInteractionBoxParts(merged, base, saved);
  normalizeSetupHudAnchors(merged, base, saved.hudAnchors);
  return merged;
}

function normalizeRigInteractionBoxParts(tuning, base, saved = null) {
  const rig = tuning.rig;
  [
    COLLISION_INTERACTION_BOX_KEY,
    HURT_INTERACTION_BOX_KEY,
    ATTACK_INTERACTION_BOX_KEY,
    GUARD_INTERACTION_BOX_KEY,
  ].forEach((key) => {
    const savedRigPart = saved?.rig?.[key];
    const current = savedRigPart ? rig[key] : null;
    rig[key] = normalizeRigInteractionBoxPart({
      current,
      fallback: base.rig?.[key],
      parent: rig[interactionBoxParentPartKey(key)],
      legacyTopLeft: Boolean(
        savedRigPart &&
        savedRigPart.ax === undefined &&
        savedRigPart.ay === undefined &&
        (savedRigPart.x !== undefined || savedRigPart.y !== undefined)
      ),
    });
  });
}

function normalizeRigInteractionBoxPart({ current, fallback = {}, parent = {}, legacyTopLeft = false }) {
  const source = current || fallback;
  const width = Math.max(1, Number(source.w ?? fallback.w ?? parent.w ?? 1));
  const height = Math.max(1, Number(source.h ?? fallback.h ?? parent.h ?? 1));
  const baseW = Math.max(1, Number(source.baseW ?? fallback.baseW ?? parent.w ?? source.w ?? 1));
  const baseH = Math.max(1, Number(source.baseH ?? fallback.baseH ?? parent.h ?? source.h ?? 1));
  const hasAnchor = !legacyTopLeft && (source.ax !== undefined || source.ay !== undefined);
  const fallbackAx = Number(fallback.ax ?? width / 2);
  const fallbackAy = Number(fallback.ay ?? height / 2);
  const ax = Number(source.ax ?? fallbackAx);
  const ay = Number(source.ay ?? fallbackAy);
  return {
    type: INTERACTION_BOX_PART_TYPE,
    parent: source.parent || fallback.parent || null,
    x: Number(source.x ?? fallback.x ?? 0) + (hasAnchor ? 0 : ax),
    y: Number(source.y ?? fallback.y ?? 0) + (hasAnchor ? 0 : ay),
    ax,
    ay,
    w: width,
    h: height,
    baseW,
    baseH,
    rot: Number(source.rot ?? fallback.rot ?? 0),
    opacity: clamp(Number(source.opacity ?? fallback.opacity ?? 1), 0, 1),
  };
}

function normalizeSetupHudAnchors(tuning, base, legacyHudAnchors = tuning.hudAnchors) {
  tuning.hud = normalizeCharacterHud(tuning.hud, base.hud, legacyHudAnchors);
  delete tuning.hudAnchors;
}

function normalizeMovementScalars(tuning) {
  tuning.speed = clamp(Number(tuning.speed ?? DEFAULT_PLAYER_TUNING.speed), SPEED_VALUE_MIN, SPEED_VALUE_MAX);
  tuning.runAcceleration = clamp(Number(tuning.runAcceleration ?? DEFAULT_PLAYER_TUNING.runAcceleration), 0.02, 0.4);
  tuning.jumpPower = clamp(Number(tuning.jumpPower ?? DEFAULT_PLAYER_TUNING.jumpPower), 40, 720);
}

function normalizeMotionSettings(motion, fallback) {
  delete motion.animationIntensity;
  motion.rollIntensity = clamp(Number(motion.rollIntensity ?? fallback.rollIntensity ?? 1), 0, 4);
  motion.rollWeapon = Number(motion.rollWeapon ?? fallback.rollWeapon ?? 0) >= 0.5 ? 1 : 0;
  motion.rollGhostCount = Math.round(clamp(Number(motion.rollGhostCount ?? fallback.rollGhostCount ?? 5), 0, 8));
  motion.rollGhostInterval = clamp(Number(motion.rollGhostInterval ?? fallback.rollGhostInterval ?? 0.035), 0.01, 0.16);
  motion.rollGhostLife = clamp(Number(motion.rollGhostLife ?? fallback.rollGhostLife ?? 0.18), 0.04, 0.6);
  motion.rollGhostOpacity = clamp(Number(motion.rollGhostOpacity ?? fallback.rollGhostOpacity ?? 1), 0, 2);
}

function normalizePoseSettings(current = {}, fallback = {}) {
  const normalized = {};
  POSE_KEYS.forEach((key) => {
    const source = current?.[key] || {};
    const base = fallback?.[key] || {};
    normalized[key] = {
      duration: clamp(Number(source.duration ?? base.duration ?? 0.6), 0.05, 5),
      playback: source.playback === 'once' || base.playback === 'once' ? source.playback || base.playback : 'loop',
      playbackRate: clamp(Number(source.playbackRate ?? base.playbackRate ?? 1), 0.1, 4),
    };
    if (normalized[key].playback !== 'once') normalized[key].playback = 'loop';
  });
  return normalized;
}

function normalizeEffectSettings(current = {}, fallback = {}) {
  const normalized = {};
  EFFECT_KEYS.forEach((key) => {
    const source = current?.[key] || {};
    const base = fallback?.[key] || {};
    normalized[key] = {
      duration: clamp(Number(source.duration ?? base.duration ?? 0.4), 0.05, 5),
      playback: source.playback === 'loop' || base.playback === 'loop' ? source.playback || base.playback : 'once',
      playbackRate: clamp(Number(source.playbackRate ?? base.playbackRate ?? 1), 0.1, 4),
    };
    if (normalized[key].playback !== 'loop') normalized[key].playback = 'once';
  });
  return normalized;
}

export function normalizeEffectOffsets(current = {}) {
  const normalized = {};
  EFFECT_KEYS.forEach((key) => {
    const source = current?.[key] || {};
    const fallback = effectFrameValue({}, key);
    const image = validEffectImageKey(source.image) ? source.image : defaultEffectImageKey(key);
    normalized[key] = {
      image,
      start: effectFrameValue(source.start || fallback, key),
      end: effectFrameValue(source.end || fallback, key),
      keyframes: normalizeEffectKeyframes(source.keyframes, source.start || fallback, source.end || fallback, key),
    };
    syncFrameAliases(normalized[key]);
  });
  return normalized;
}

export function normalizeEffectKeyframes(keyframes, start, end, key) {
  const middle = Array.isArray(keyframes)
    ? keyframes
        .filter((frame) => frame && frame.id !== 'start' && frame.id !== 'end')
        .map((frame) => ({
          id: typeof frame.id === 'string' && frame.id ? frame.id : makePoseKeyframeId(),
          t: clamp(Number(frame.t ?? 0.5), 0.03, 0.97),
          ...effectFrameValue(frame, key),
        }))
    : [];

  const frames = [
    { id: 'start', t: 0, ...effectFrameValue(start, key) },
    ...middle,
    { id: 'end', t: 1, ...effectFrameValue(end, key) },
  ];
  sortPoseKeyframes(frames);
  return frames;
}

export function ensureEffectOffset(tuning, key) {
  tuning.effectOffsets ||= normalizeEffectOffsets();
  tuning.effectOffsets[key] = normalizeEffectOffsets({ [key]: tuning.effectOffsets[key] })[key];
}

export function ensureEffectSettings(tuning) {
  tuning.effectSettings = normalizeEffectSettings(
    tuning.effectSettings,
    DEFAULT_PLAYER_TUNING.effectSettings || DEFAULT_PLAYER_TUNING.poseSettings
  );
}

export function effectFrameAt(tuning, key, t = 0) {
  ensureEffectOffset(tuning, key);
  const effect = tuning.effectOffsets[key];
  const frame = interpolateEffectFrameValues(effectKeyframesFor(effect, key), clamp(Number(t), 0, 1), key);
  return {
    ...frame,
    image: defaultEffectImageKey(key),
  };
}

export function effectKeyframesFor(effect, key) {
  effect.keyframes = normalizeEffectKeyframes(effect.keyframes, effect.start, effect.end, key);
  syncFrameAliases(effect);
  return effect.keyframes;
}

function migrateSplitRigParts(rig, sourceRig = {}) {
  const pairs = [
    ['upperArm', 'upperArmL', 'upperArmR'],
    ['lowerArm', 'lowerArmL', 'lowerArmR'],
    ['upperLeg', 'upperLegL', 'upperLegR'],
    ['lowerLeg', 'lowerLegL', 'lowerLegR'],
  ];

  pairs.forEach(([legacy, left, right]) => {
    if (!sourceRig?.[legacy]) return;
    if (!sourceRig[left]) mergeInto(rig[left], sourceRig[legacy]);
    if (!sourceRig[right]) mergeInto(rig[right], sourceRig[legacy]);
  });
}

function normalizeControlGroups(rig) {
  controlGroupPartKeys().forEach((key) => {
    const part = rig[key];
    if (!part) return;
    part.w = Number(part.w ?? 1);
    part.h = Number(part.h ?? 1);
    part.ax = Number(part.ax || 0);
    part.ay = Number(part.ay || 0);
    part.anchorOffsetX = Number(part.anchorOffsetX || 0);
    part.anchorOffsetY = Number(part.anchorOffsetY || 0);
    part.opacity = Number(part.opacity ?? 1);
    part.rot = Number(part.rot || 0);
  });
}

function normalizeRigImageAnchors(rig, sourceRig = null) {
  imagePartKeys().forEach((key) => {
    const part = rig[key];
    if (!part) return;
    const sourcePart = sourceRig?.[key];
    part.baseW ||= Number(part.w || 1);
    part.baseH ||= Number(part.h || 1);
    part.opacity ??= 1;
    part.anchorOffsetX = Number(part.anchorOffsetX || 0);
    part.anchorOffsetY = Number(part.anchorOffsetY || 0);
    const needsMigration = part.anchorMode !== 'local' || (sourcePart && sourcePart.anchorMode !== 'local');
    if (needsMigration) {
      const oldAnchorX = Number(part.ax ?? part.x ?? 0);
      const oldAnchorY = Number(part.ay ?? part.y ?? 0);
      const oldImageX = Number(part.x || 0);
      const oldImageY = Number(part.y || 0);
      part.x = oldAnchorX + oldImageX - Number(part.ox || 0);
      part.y = oldAnchorY + oldImageY - Number(part.oy || 0);
      part.ax = Number(part.ox || 0);
      part.ay = Number(part.oy || 0);
      part.baseW ||= Number(part.w || 1);
      part.baseH ||= Number(part.h || 1);
      part.anchorMode = 'local';
    }
  });
}

function normalizeRigRotations(rig, baseRig) {
  Object.keys(baseRig).forEach((key) => {
    if (!rig[key]) return;
    if ('rot' in baseRig[key] && !('rot' in rig[key])) rig[key].rot = 0;
  });
}

function normalizePoseOffsets(current = {}) {
  const normalized = {};
  POSE_KEYS.forEach((pose) => {
    normalized[pose] = {};
    POSE_PART_KEYS.forEach((part) => {
      const value = current?.[pose]?.[part] ?? current?.[pose]?.[legacyPosePartKey(part)];
      normalized[pose][part] = normalizePoseFrameValue(poseFrameValueWithInteractionDefaults(pose, part, value));
    });
  });
  return normalized;
}

function poseFrameValueWithInteractionDefaults(pose, part, value) {
  const fallback = DEFAULT_PLAYER_TUNING.poseOffsets?.[pose]?.[part];
  if (part !== ATTACK_INTERACTION_BOX_KEY || !fallback) return value;
  if (!value) return fallback;
  return withInteractionFrameDefaults(value, fallback);
}

function withInteractionFrameDefaults(value = {}, fallback = {}) {
  return {
    ...value,
    active: value.active ?? fallback.active,
    start: withInteractionFrameDefault(value.start, fallback.start),
    end: withInteractionFrameDefault(value.end, fallback.end),
    keyframes: withInteractionKeyframeDefaults(value.keyframes, fallback.keyframes, value),
  };
}

function withInteractionFrameDefault(frame = {}, fallback = {}) {
  return {
    ...frame,
    active: frame.active ?? fallback.active ?? 0,
    attack: frame.attack ?? fallback.attack ?? 0,
    hurt: frame.hurt ?? fallback.hurt ?? 0,
    collision: frame.collision ?? fallback.collision ?? 0,
    guard: frame.guard ?? fallback.guard ?? 0,
    stun: frame.stun ?? fallback.stun ?? 0,
    knockbackX: frame.knockbackX ?? fallback.knockbackX ?? 0,
    knockbackY: frame.knockbackY ?? fallback.knockbackY ?? 0,
    deathBurst: frame.deathBurst ?? fallback.deathBurst ?? 1,
    pushPower: frame.pushPower ?? fallback.pushPower ?? 0,
  };
}

function withInteractionKeyframeDefaults(keyframes, fallbackKeyframes = [], value = {}) {
  if (!Array.isArray(keyframes) || !keyframes.length) {
    return fallbackKeyframes.map((frame) => ({
      ...interpolatePoseFrameDefaults(value, frame.t),
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

function interpolatePoseFrameDefaults(value = {}, t = 0) {
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

function legacyPosePartKey(part) {
  return {
    upperArmL: 'upperArm',
    upperArmR: 'upperArm',
    lowerArmL: 'lowerArm',
    lowerArmR: 'lowerArm',
    upperLegL: 'upperLeg',
    upperLegR: 'upperLeg',
    lowerLegL: 'lowerLeg',
    lowerLegR: 'lowerLeg',
  }[part];
}

export function ensurePoseOffset(tuning, pose, part) {
  tuning.poseOffsets ||= normalizePoseOffsets();
  tuning.poseOffsets[pose] ||= {};
  tuning.poseOffsets[pose][part] = normalizePoseFrameValue(tuning.poseOffsets[pose][part]);
}

export function ensurePoseSettings(tuning) {
  tuning.poseSettings = normalizePoseSettings(tuning.poseSettings, DEFAULT_PLAYER_TUNING.poseSettings);
}

export function normalizePoseFrameValue(value = {}) {
  const legacy = frameValue(value);
  const normalized = {};
  const anchor = poseAnchorValue(value, legacy);
  normalized.anchorX = anchor.anchorX;
  normalized.anchorY = anchor.anchorY;
  POSE_FRAME_KEYS.forEach((frame) => {
    normalized[frame] = frameValue(value?.[frame] || legacy);
  });
  normalized.keyframes = normalizePoseKeyframes(value?.keyframes, normalized.start, normalized.end);
  syncFrameAliases(normalized);
  return normalized;
}

function normalizePoseKeyframes(keyframes, start, end) {
  const middle = Array.isArray(keyframes)
    ? keyframes
        .filter((frame) => frame && frame.id !== 'start' && frame.id !== 'end')
        .map((frame) => ({
          id: typeof frame.id === 'string' && frame.id ? frame.id : makePoseKeyframeId(),
          t: clamp(Number(frame.t ?? 0.5), 0.03, 0.97),
          ...frameValue(frame),
        }))
    : [];

  const frames = [{ id: 'start', t: 0, ...frameValue(start) }, ...middle, { id: 'end', t: 1, ...frameValue(end) }];
  sortPoseKeyframes(frames);
  return frames;
}

export function poseKeyframesFor(frames) {
  frames.keyframes = normalizePoseKeyframes(frames.keyframes, frames.start, frames.end);
  syncFrameAliases(frames);
  return frames.keyframes;
}

export function sortPoseKeyframes(keyframes) {
  keyframes.sort((a, b) => {
    if (a.id === 'start') return -1;
    if (b.id === 'start') return 1;
    if (a.id === 'end') return 1;
    if (b.id === 'end') return -1;
    return Number(a.t) - Number(b.t);
  });
}

export function makePoseKeyframeId() {
  return `kf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeLayerOrder(current, fallback) {
  const valid = new Set(fallback);
  const kept = (current || []).filter((layer) => valid.has(layer));
  const missing = fallback.filter((layer) => !kept.includes(layer));
  return [...kept, ...missing];
}

function mergeInto(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && target[key]) {
      mergeInto(target[key], value);
    } else if (key in target) {
      target[key] = value;
    }
  });
}

export function replaceObject(target, source) {
  Object.keys(target).forEach((key) => {
    if (!(key in source)) delete target[key];
  });

  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && target[key]) {
      replaceObject(target[key], value);
    } else {
      target[key] = value;
    }
  });
}
