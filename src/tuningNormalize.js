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
  LEGACY_ATTACK_BOX_MIRROR_KEY,
  PRIMARY_ATTACK_INTERACTION_BOX_MIRROR_KEY,
  RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY,
  RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY,
  RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY,
  interactionBoxParentPartKey,
  syncRuntimeInteractionBoxesFromRig,
} from './tuningInteractionBoxes.js';
import { clamp, clone } from './utils.js';

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
    normalizeSetupInteractionBoxes(fresh, base);
    normalizeRigInteractionBoxParts(fresh, base);
    syncRuntimeInteractionBoxesFromRig(fresh);
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
  merged[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY] = normalizeAttackGeometryMirror(
    saved[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY] ||
      saved[LEGACY_ATTACK_BOX_MIRROR_KEY] ||
      merged[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY],
    base[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY],
    merged.rig
  );
  merged.attackEffects = normalizeAttackEffects(
    saved.attackEffects ||
      saved[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY] ||
      saved[LEGACY_ATTACK_BOX_MIRROR_KEY] ||
      merged.attackEffects,
    base.attackEffects,
    saved.hitReaction
  );
  merged.hitReaction = normalizeHitReaction(merged.hitReaction, base.hitReaction);
  normalizeControlGroups(merged.rig);
  normalizeRigImageAnchors(merged.rig, saved.rig);
  normalizeRigRotations(merged.rig, base.rig);
  normalizeMotionSettings(merged.motion, base.motion);
  normalizeMovementScalars(merged);
  normalizeSetupInteractionBoxes(merged, base);
  normalizeRigInteractionBoxParts(merged, base, saved);
  syncRuntimeInteractionBoxesFromRig(merged);
  normalizeSetupHudAnchors(merged, base, saved.hudAnchors);
  return merged;
}

function normalizeRigInteractionBoxParts(tuning, base, saved = null) {
  const rig = tuning.rig;
  const runtimeSources = {
    [COLLISION_INTERACTION_BOX_KEY]: saved?.collisionBox,
    [HURT_INTERACTION_BOX_KEY]: saved?.[RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY],
    [ATTACK_INTERACTION_BOX_KEY]:
      saved?.[RUNTIME_ATTACK_INTERACTION_BOX_MIRROR_KEY]?.[PRIMARY_ATTACK_INTERACTION_BOX_MIRROR_KEY] ||
      saved?.[LEGACY_ATTACK_BOX_MIRROR_KEY],
    [GUARD_INTERACTION_BOX_KEY]: saved?.[RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY],
  };

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
      runtimeSource: runtimeSources[key],
    });
  });
}

function normalizeRigInteractionBoxPart({ current, fallback = {}, parent = {}, runtimeSource = {} }) {
  const source = current || runtimeInteractionBoxToRigPart(runtimeSource, parent, fallback);
  return {
    type: INTERACTION_BOX_PART_TYPE,
    parent: source.parent || fallback.parent || null,
    x: Number(source.x ?? fallback.x ?? 0),
    y: Number(source.y ?? fallback.y ?? 0),
    w: Math.max(1, Number(source.w ?? fallback.w ?? parent.w ?? 1)),
    h: Math.max(1, Number(source.h ?? fallback.h ?? parent.h ?? 1)),
    baseW: Math.max(1, Number(source.baseW ?? fallback.baseW ?? parent.w ?? source.w ?? 1)),
    baseH: Math.max(1, Number(source.baseH ?? fallback.baseH ?? parent.h ?? source.h ?? 1)),
    rot: Number(source.rot ?? fallback.rot ?? 0),
  };
}

function runtimeInteractionBoxToRigPart(runtimeSource = {}, parent = {}, fallback = {}) {
  if (!runtimeSource || !Object.keys(runtimeSource).length) return fallback;
  const isWeaponLocal = fallback.parent === 'weapon';
  return {
    ...fallback,
    x: isWeaponLocal
      ? Number(runtimeSource.x ?? fallback.x ?? 0)
      : Number(runtimeSource.x ?? 0) - Number(parent.x || 0),
    y: isWeaponLocal
      ? Number(runtimeSource.y ?? fallback.y ?? 0)
      : Number(runtimeSource.y ?? 0) - Number(parent.y || 0),
    w: Math.max(1, Number(runtimeSource.w ?? fallback.w ?? parent.w ?? 1)),
    h: Math.max(1, Number(runtimeSource.h ?? fallback.h ?? parent.h ?? 1)),
    rot: Number(runtimeSource.rot ?? fallback.rot ?? 0),
  };
}

function normalizeSetupInteractionBoxes(tuning, base) {
  tuning.collisionBox = normalizeRectBox(
    tuning.collisionBox,
    setupInteractionBoxFallback(tuning, 'body', base.collisionBox)
  );
  tuning[RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY] = normalizeRectBox(
    tuning[RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY],
    setupInteractionBoxFallback(tuning, 'body', base[RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY])
  );
  tuning[RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY] = normalizeRectBox(
    tuning[RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY],
    setupInteractionBoxFallback(
      tuning,
      'shield',
      setupInteractionBoxFallback(
        tuning,
        'body',
        base[RUNTIME_GUARD_INTERACTION_BOX_MIRROR_KEY] || base[RUNTIME_HURT_INTERACTION_BOX_MIRROR_KEY]
      )
    )
  );
}

function setupInteractionBoxFallback(tuning, partKey, fallback = {}) {
  const part = tuning.rig?.[partKey];
  if (!part) return fallback || {};
  return {
    x: Number(fallback.x ?? 0),
    y: Number(fallback.y ?? 0),
    w: Math.max(1, Number(part.w ?? fallback.w ?? 1)),
    h: Math.max(1, Number(part.h ?? fallback.h ?? 1)),
    rot: Number(fallback.rot ?? 0),
  };
}

function normalizeSetupHudAnchors(tuning, base, legacyHudAnchors = tuning.hudAnchors) {
  tuning.hud = normalizeCharacterHud(tuning.hud, base.hud, legacyHudAnchors);
  delete tuning.hudAnchors;
}

function normalizeRectBox(current = {}, fallback = {}) {
  return {
    x: Number(current.x ?? fallback.x ?? 0),
    y: Number(current.y ?? fallback.y ?? 0),
    w: Math.max(1, Number(current.w ?? fallback.w ?? 1)),
    h: Math.max(1, Number(current.h ?? fallback.h ?? 1)),
    rot: Number(current.rot ?? fallback.rot ?? 0),
  };
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
  if (part !== ATTACK_INTERACTION_BOX_KEY || !fallback || poseFrameHasProp(value, 'active')) return value;
  return fallback;
}

function poseFrameHasProp(value, prop) {
  if (!value) return false;
  if (value[prop] !== undefined) return true;
  if (value.start?.[prop] !== undefined || value.end?.[prop] !== undefined) return true;
  return Array.isArray(value.keyframes) && value.keyframes.some((frame) => frame?.[prop] !== undefined);
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

function normalizeAttackGeometryMirror(current, fallback, rig = null) {
  const normalized = {};
  const common = current && ('frontX' in current || 'x' in current) ? current : null;
  ['attack1', 'attack2', 'attack3', 'jumpAttack', 'roll'].forEach((key) => {
    const base =
      key === 'attack1'
        ? { ...fallback[key], ...setupInteractionBoxFallback({ rig }, 'weapon', fallback[key]) }
        : fallback[key];
    normalized[key] = {
      ...base,
      ...interactionBoxGeometryFields(common || current?.[key] || {}),
    };
  });
  return normalized;
}

function interactionBoxGeometryFields(source = {}) {
  return {
    x: Number(source.x || 0),
    y: Number(source.y || 0),
    w: Math.max(1, Number(source.w || 1)),
    h: Math.max(1, Number(source.h || 1)),
    rot: Number(source.rot || 0),
  };
}

function normalizeAttackEffects(current, fallback, legacyReaction) {
  const normalized = {};
  const common = current && 'frontX' in current ? current : null;
  ['attack1', 'attack2', 'attack3', 'jumpAttack', 'roll'].forEach((key) => {
    const legacyHit = legacyReaction
      ? {
          stun: legacyReaction.stun,
          knockbackX:
            key === 'attack3' || key === 'jumpAttack' ? legacyReaction.heavyKnockbackX : legacyReaction.knockbackX,
          knockbackY:
            key === 'attack3' || key === 'jumpAttack' ? legacyReaction.heavyKnockbackY : legacyReaction.knockbackY,
        }
      : {};
    const source = common || current?.[key] || {};
    normalized[key] = {
      ...(fallback[key] || {}),
      ...legacyHit,
      stun: Number(source.stun ?? legacyHit.stun ?? fallback[key]?.stun ?? 0),
      knockbackX: Number(source.knockbackX ?? legacyHit.knockbackX ?? fallback[key]?.knockbackX ?? 0),
      knockbackY: Number(source.knockbackY ?? legacyHit.knockbackY ?? fallback[key]?.knockbackY ?? 0),
      deathBurst: Number(source.deathBurst ?? fallback[key]?.deathBurst ?? 1),
    };
  });
  return normalized;
}

function normalizeHitReaction(current, fallback) {
  return {
    ...fallback,
    ...(current || {}),
  };
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
