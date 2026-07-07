import {
  defaultEffectImageKey,
  effectFrameValue,
  frameValue,
  interpolateEffectFrameValues,
  actionAnchorValue,
  syncFrameAliases,
  validEffectImageKey,
} from './animation_frame_data.js';
import { EFFECT_KEYS, ACTION_FRAME_KEYS, ACTION_KEYS, ACTION_PART_KEYS } from './game_config_data.js';
import { DEFAULT_PLAYER_TUNING } from './player_default_tuning_data.js';
import { normalizeCharacterHud } from './character_hud_layout_helper.js';
import { controlGroupPartKeys, imagePartKeys } from './part_source_data.js';
import { normalizeTimelineModifiers } from './timeline_modifier_data.js';
import {
  defaultActionSettings,
  normalizeActionNames,
  normalizeActionTriggers,
  normalizeCustomActions,
  normalizeDeletedActionKeys,
} from './action_authoring_data.js';
import { normalizeActionBlendFrames } from './action_blend_helper.js';
import { normalizeActionRuntimeRules } from './action_runtime_rule_helper.js';
import { normalizeActionFormulas, migrateActionFormulasFromModifiers } from './formula_registry.js';
import { defaultActionCondition, normalizeActionCondition } from './action_condition_helper.js';
import { defaultActionGroup, normalizeActionGroup } from './action_group_helper.js';
import { normalizeActionEditPivot } from './action_timeline_edit_helper.js';
import { normalizeTimelinePlayback } from './timeline_playback_helper.js';
import {
  COLLISION_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  ATTACK_INTERACTION_OBJECT_KEY,
  INTERACTION_OBJECT_PART_TYPE,
  INTERACTION_OBJECT_PART_KEYS,
  interactionObjectRole,
  interactionObjectParentPartKey,
} from './interaction_object_editor_controller.js';
import {
  INTERACTION_NUMERIC_PROPS,
  INTERACTION_TOGGLE_PROPS,
  interactionDefaultValue,
} from './interaction_field_data.js';
import { clamp, clone, lerp } from './common_helper.js';

export function mergeTuning(base, saved) {
  if (!saved) {
    const fresh = clone(base);
    fresh.actionNames = normalizeActionNames(fresh.actionNames);
    fresh.customActions = normalizeCustomActions(fresh.customActions);
    fresh.deletedActionKeys = normalizeDeletedActionKeys(fresh.deletedActionKeys);
    fresh.actionTriggers = normalizeActionTriggers(fresh.actionTriggers, fresh.customActions);
    fresh.actionOffsets = normalizeActionOffsets(fresh.actionOffsets, fresh.customActions, fresh.deletedActionKeys);
    fresh.actionSettings = normalizeActionSettings(
      fresh.actionSettings,
      base.actionSettings,
      fresh.customActions,
      fresh.deletedActionKeys
    );
    fresh.effectOffsets = normalizeEffectOffsets(fresh.effectOffsets);
    fresh.effectSettings = normalizeEffectSettings(fresh.effectSettings, base.effectSettings || base.actionSettings);
    fresh.modifiers = normalizeTimelineModifiers(fresh.modifiers);
    migrateNormalizedActionFormulas(fresh);
    normalizeControlGroups(fresh.rig);
    normalizeRigImageAnchors(fresh.rig);
    normalizeRigRotations(fresh.rig, base.rig);
    normalizeMovementScalars(fresh);
    normalizeRigInteractionObjectParts(fresh, base);
    normalizeSetupHudAnchors(fresh, base);
    return fresh;
  }
  const merged = clone(base);
  mergeInto(merged, saved);
  migrateSplitRigParts(merged.rig, saved.rig);
  merged.layerOrder = normalizeLayerOrder(merged.layerOrder, base.layerOrder);
  merged.actionNames = normalizeActionNames(saved.actionNames || merged.actionNames);
  merged.customActions = normalizeCustomActions(saved.customActions || merged.customActions);
  merged.deletedActionKeys = normalizeDeletedActionKeys(saved.deletedActionKeys || merged.deletedActionKeys);
  merged.actionTriggers = normalizeActionTriggers(saved.actionTriggers || merged.actionTriggers, merged.customActions);
  merged.actionOffsets = normalizeActionOffsets(
    saved.actionOffsets || merged.actionOffsets,
    merged.customActions,
    merged.deletedActionKeys
  );
  merged.actionSettings = normalizeActionSettings(
    saved.actionSettings || merged.actionSettings,
    base.actionSettings,
    merged.customActions,
    merged.deletedActionKeys
  );
  merged.effectOffsets = normalizeEffectOffsets(saved.effectOffsets || merged.effectOffsets);
  merged.effectSettings = normalizeEffectSettings(
    saved.effectSettings || merged.effectSettings,
    base.effectSettings || base.actionSettings
  );
  merged.modifiers = normalizeTimelineModifiers(saved.modifiers || merged.modifiers);
  migrateNormalizedActionFormulas(merged);
  normalizeControlGroups(merged.rig);
  normalizeRigImageAnchors(merged.rig, saved.rig);
  normalizeRigRotations(merged.rig, base.rig);
  normalizeMotionSettings(merged.motion, base.motion);
  normalizeMovementScalars(merged);
  normalizeRigInteractionObjectParts(merged, base, saved);
  normalizeSetupHudAnchors(merged, base, saved.hudAnchors);
  return merged;
}

function normalizeRigInteractionObjectParts(tuning, base, saved = null) {
  const rig = tuning.rig;
  [
    COLLISION_INTERACTION_OBJECT_KEY,
    HURT_INTERACTION_OBJECT_KEY,
    ATTACK_INTERACTION_OBJECT_KEY,
    GUARD_INTERACTION_OBJECT_KEY,
  ].forEach((key) => {
    const savedRigPart = saved?.rig?.[key];
    const current = savedRigPart ? rig[key] : null;
    rig[key] = normalizeRigInteractionObjectPart({
      current,
      fallback: base.rig?.[key],
      parent: rig[interactionObjectParentPartKey(key)],
    });
  });
}

function normalizeRigInteractionObjectPart({ current, fallback = {}, parent = {} }) {
  const source = current || fallback;
  const width = Math.max(1, Number(source.w ?? fallback.w ?? parent.w ?? 1));
  const height = Math.max(1, Number(source.h ?? fallback.h ?? parent.h ?? 1));
  const baseW = Math.max(1, Number(source.baseW ?? fallback.baseW ?? parent.w ?? source.w ?? 1));
  const baseH = Math.max(1, Number(source.baseH ?? fallback.baseH ?? parent.h ?? source.h ?? 1));
  const fallbackAx = Number(fallback.ax ?? width / 2);
  const fallbackAy = Number(fallback.ay ?? height / 2);
  const ax = Number(source.ax ?? fallbackAx);
  const ay = Number(source.ay ?? fallbackAy);
  return {
    type: INTERACTION_OBJECT_PART_TYPE,
    parent: source.parent || fallback.parent || null,
    x: Number(source.x ?? fallback.x ?? 0),
    y: Number(source.y ?? fallback.y ?? 0),
    ax,
    ay,
    w: width,
    h: height,
    baseW,
    baseH,
    rot: Number(source.rot ?? fallback.rot ?? 0),
    opacity: clamp(Number(source.opacity ?? fallback.opacity ?? 1), 0, 1),
    ...normalizeInteractionFields(source, fallback),
  };
}

function normalizeSetupHudAnchors(tuning, base, legacyHudAnchors = tuning.hudAnchors) {
  tuning.hud = normalizeCharacterHud(tuning.hud, base.hud, legacyHudAnchors);
  delete tuning.hudAnchors;
}

function normalizeMovementScalars(tuning) {
  tuning.speed = 0;
  tuning.runAcceleration = 0;
  tuning.jumpPower = 0;
  tuning.airFlapPower = 0;
  tuning.airFlapCooldown = 0;
  tuning.glideTimeMax = 0;
  tuning.glideFallSpeed = 0;
  tuning.dashCooldownMax = 0;
  tuning.attackCooldownMax = 0;
  tuning.comboResetTime = 0;
  tuning.invulnerability = { hurt: 0, rollEnd: 0 };
}

function normalizeMotionSettings(motion, fallback) {
  void fallback;
  delete motion.animationIntensity;
  delete motion.walkBob;
  delete motion.rollIntensity;
  delete motion.rollWeapon;
  delete motion.rollGhostCount;
  delete motion.rollGhostInterval;
  delete motion.rollGhostLife;
  delete motion.rollGhostOpacity;
}

function normalizeActionSettings(current = {}, fallback = {}, customActions = [], deletedActionKeys = []) {
  const normalized = {};
  actionKeysForNormalize(customActions, deletedActionKeys).forEach((key) => {
    const source = current?.[key] || {};
    const base = fallback?.[key] || {};
    const defaultSettings = defaultActionSettings(defaultActionGroup(key), defaultActionCondition(key));
    normalized[key] = {
      duration: clamp(Number(source.duration ?? base.duration ?? defaultSettings.duration), 0.05, 5),
      playback: normalizeTimelinePlayback(source.playback ?? base.playback, defaultSettings.playback),
      playbackRate: clamp(Number(source.playbackRate ?? base.playbackRate ?? defaultSettings.playbackRate), 0.1, 4),
      mirror: source.mirror ?? base.mirror ?? defaultSettings.mirror,
      interruptible: source.interruptible ?? base.interruptible ?? defaultSettings.interruptible,
      interruptPriority: clamp(
        Number(source.interruptPriority ?? base.interruptPriority ?? defaultSettings.interruptPriority),
        -100,
        100
      ),
      blendFrames: normalizeActionBlendFrames(source.blendFrames ?? base.blendFrames ?? defaultSettings.blendFrames),
      condition: normalizeActionCondition(source.condition ?? base.condition ?? defaultSettings.condition),
      group: normalizeActionGroup(source.group ?? base.group ?? defaultSettings.group, defaultActionGroup(key)),
      editPivot: normalizeActionEditPivot(source.editPivot, base.editPivot ?? defaultSettings.editPivot),
      interactions: normalizeActionInteractions(
        source.interactions ?? base.interactions ?? defaultSettings.interactions
      ),
      formulas: normalizeActionFormulas(source.formulas ?? base.formulas, {
        ...source,
        runtimeRules: source.runtimeRules ?? base.runtimeRules ?? defaultSettings.runtimeRules,
      }),
    };
    normalized[key].runtimeRules = normalizeActionRuntimeRules(
      source.runtimeRules ?? base.runtimeRules ?? defaultSettings.runtimeRules,
      normalized[key]
    );
    normalized[key].mirror = normalized[key].mirror !== false;
    normalized[key].interruptible = normalized[key].interruptible !== false;
  });
  return normalized;
}

function migrateNormalizedActionFormulas(tuning) {
  Object.keys(tuning.actionSettings || {}).forEach((key) => {
    tuning.actionSettings[key].formulas = normalizeActionFormulas(
      migrateActionFormulasFromModifiers(tuning.actionSettings[key], tuning.modifiers?.action?.[key] || []),
      tuning.actionSettings[key]
    );
  });
}

function normalizeActionInteractions(current = {}) {
  const normalized = {};
  INTERACTION_OBJECT_PART_KEYS.forEach((partKey) => {
    const source = current?.[partKey];
    if (!source) return;
    const role = interactionObjectRole(partKey);
    normalized[partKey] = {
      active: Number(source.active || 0) >= 0.5 ? 1 : 0,
      [role]: Number(source[role] || 0) >= 0.5 ? 1 : 0,
      ...normalizeInteractionFields(source),
    };
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
      playback: normalizeTimelinePlayback(source.playback ?? base.playback, 'once'),
      playbackRate: clamp(Number(source.playbackRate ?? base.playbackRate ?? 1), 0.1, 4),
    };
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
          id: typeof frame.id === 'string' && frame.id ? frame.id : makeActionKeyframeId(),
          t: clamp(Number(frame.t ?? 0.5), 0.03, 0.97),
          ...effectFrameValue(frame, key),
        }))
    : [];

  const frames = [
    { id: 'start', t: 0, ...effectFrameValue(start, key) },
    ...middle,
    { id: 'end', t: 1, ...effectFrameValue(end, key) },
  ];
  sortActionKeyframes(frames);
  return frames;
}

export function ensureEffectOffset(tuning, key) {
  tuning.effectOffsets ||= normalizeEffectOffsets();
  tuning.effectOffsets[key] = normalizeEffectOffsets({ [key]: tuning.effectOffsets[key] })[key];
}

export function ensureEffectSettings(tuning) {
  tuning.effectSettings = normalizeEffectSettings(
    tuning.effectSettings,
    DEFAULT_PLAYER_TUNING.effectSettings || DEFAULT_PLAYER_TUNING.actionSettings
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

function normalizeActionOffsets(current = {}, customActions = [], deletedActionKeys = []) {
  const normalized = {};
  actionKeysForNormalize(customActions, deletedActionKeys).forEach((action) => {
    normalized[action] = {};
    ACTION_PART_KEYS.forEach((part) => {
      const value = current?.[action]?.[part] ?? current?.[action]?.[legacyActionPartKey(part)];
      normalized[action][part] = normalizeActionFrameValue(
        actionFrameValueWithInteractionDefaults(action, part, value)
      );
    });
  });
  return normalized;
}

function actionKeysForNormalize(customActions = [], deletedActionKeys = []) {
  const deleted = new Set(normalizeDeletedActionKeys(deletedActionKeys));
  return [
    ...ACTION_KEYS.filter((key) => !deleted.has(key)),
    ...normalizeCustomActions(customActions).map((action) => action.key),
  ];
}

function actionFrameValueWithInteractionDefaults(action, part, value) {
  const fallback = DEFAULT_PLAYER_TUNING.actionOffsets?.[action]?.[part];
  if (part !== ATTACK_INTERACTION_OBJECT_KEY || !fallback) return value;
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
    ...normalizeInteractionFields(frame, fallback),
  };
}

function withInteractionKeyframeDefaults(keyframes, fallbackKeyframes = [], value = {}) {
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

function interpolateActionFrameDefaults(value = {}, t = 0) {
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

function normalizeInteractionFields(source = {}, fallback = {}) {
  const normalized = {};
  INTERACTION_TOGGLE_PROPS.forEach((prop) => {
    normalized[prop] = Number(source[prop] ?? fallback[prop] ?? interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  });
  INTERACTION_NUMERIC_PROPS.forEach((prop) => {
    normalized[prop] = Number(source[prop] ?? fallback[prop] ?? interactionDefaultValue(prop));
  });
  return normalized;
}

function legacyActionPartKey(part) {
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

export function ensureActionOffset(tuning, action, part) {
  tuning.actionOffsets ||= normalizeActionOffsets();
  tuning.actionOffsets[action] ||= {};
  tuning.actionOffsets[action][part] = normalizeActionFrameValue(tuning.actionOffsets[action][part]);
}

export function ensureActionSettings(tuning) {
  tuning.customActions = normalizeCustomActions(tuning.customActions);
  tuning.deletedActionKeys = normalizeDeletedActionKeys(tuning.deletedActionKeys);
  tuning.actionSettings = normalizeActionSettings(
    tuning.actionSettings,
    DEFAULT_PLAYER_TUNING.actionSettings,
    tuning.customActions,
    tuning.deletedActionKeys
  );
}

export function normalizeActionFrameValue(value = {}) {
  const legacy = frameValue(value);
  const normalized = {};
  const anchor = actionAnchorValue(value, legacy);
  normalized.anchorX = anchor.anchorX;
  normalized.anchorY = anchor.anchorY;
  ACTION_FRAME_KEYS.forEach((frame) => {
    normalized[frame] = frameValue(value?.[frame] || legacy);
  });
  normalized.keyframes = normalizeActionKeyframes(value?.keyframes, normalized.start, normalized.end);
  syncFrameAliases(normalized);
  return normalized;
}

function normalizeActionKeyframes(keyframes, start, end) {
  const middle = Array.isArray(keyframes)
    ? keyframes
        .filter((frame) => frame && frame.id !== 'start' && frame.id !== 'end')
        .map((frame) => ({
          id: typeof frame.id === 'string' && frame.id ? frame.id : makeActionKeyframeId(),
          t: clamp(Number(frame.t ?? 0.5), 0.03, 0.97),
          ...frameValue(frame),
        }))
    : [];

  const frames = [{ id: 'start', t: 0, ...frameValue(start) }, ...middle, { id: 'end', t: 1, ...frameValue(end) }];
  sortActionKeyframes(frames);
  return frames;
}

export function actionKeyframesFor(frames) {
  frames.keyframes = normalizeActionKeyframes(frames.keyframes, frames.start, frames.end);
  syncFrameAliases(frames);
  return frames.keyframes;
}

export function sortActionKeyframes(keyframes) {
  keyframes.sort((a, b) => {
    if (a.id === 'start') return -1;
    if (b.id === 'start') return 1;
    if (a.id === 'end') return 1;
    if (b.id === 'end') return -1;
    return Number(a.t) - Number(b.t);
  });
}

export function makeActionKeyframeId() {
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
