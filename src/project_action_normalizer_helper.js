import { frameValue, actionAnchorValue, syncFrameAliases } from './animation_frame_data.js';
import { ACTION_FRAME_KEYS, ACTION_PART_KEYS } from './game_config_data.js';
import { DEFAULT_PLAYER_TUNING } from './player_default_tuning_data.js';
import { defaultActionSettings, normalizeCustomActions, normalizeDeletedActionKeys } from './action_authoring_data.js';
import { normalizeActionBlendFrames } from './action_blend_helper.js';
import { normalizeActionRuntimeRules } from './action_runtime_rule_helper.js';
import { normalizeEnemyAiSettings } from './enemy_ai_settings_helper.js';
import { normalizeActionFormulas, migrateActionFormulasFromModifiers } from './formula_registry.js';
import { defaultActionCondition, normalizeActionCondition } from './action_condition_helper.js';
import { defaultActionGroup, normalizeActionGroup } from './action_group_helper.js';
import { normalizeActionEditPivot } from './action_timeline_edit_helper.js';
import { normalizeTimelinePlayback } from './timeline_playback_helper.js';
import {
  ATTACK_INTERACTION_OBJECT_KEY,
  INTERACTION_OBJECT_PART_KEYS,
  interactionObjectRole,
} from './interaction_object_model_data.js';
import { clamp } from './common_helper.js';
import { withInteractionFrameDefaults, normalizeInteractionFields } from './project_interaction_normalizer_helper.js';
import { actionKeysForNormalize } from './project_keys_normalizer_helper.js';

export function normalizeActionSettings(current = {}, fallback = {}, customActions = [], deletedActionKeys = []) {
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
    if (source.ai || base.ai) normalized[key].ai = normalizeEnemyAiSettings(source.ai ?? base.ai);
    normalized[key].runtimeRules = normalizeActionRuntimeRules(
      source.runtimeRules ?? base.runtimeRules ?? defaultSettings.runtimeRules,
      normalized[key]
    );
    normalized[key].mirror = normalized[key].mirror !== false;
    normalized[key].interruptible = normalized[key].interruptible !== false;
  });
  return normalized;
}

export function migrateNormalizedActionFormulas(tuning) {
  Object.keys(tuning.actionSettings || {}).forEach((key) => {
    tuning.actionSettings[key].formulas = normalizeActionFormulas(
      migrateActionFormulasFromModifiers(tuning.actionSettings[key], tuning.modifiers?.action?.[key] || []),
      tuning.actionSettings[key]
    );
  });
}

export function normalizeActionInteractions(current = {}) {
  const normalized = {};
  INTERACTION_OBJECT_PART_KEYS.forEach((partKey) => {
    const source = current?.[partKey];
    if (!source) return;
    const role = interactionObjectRole(partKey);
    const interactionFields = normalizeInteractionFields(source);
    if (partKey === ATTACK_INTERACTION_OBJECT_KEY && source.followWeapon === undefined) {
      delete interactionFields.followWeapon;
    }
    normalized[partKey] = {
      active: Number(source.active || 0) >= 0.5 ? 1 : 0,
      [role]: Number(source[role] || 0) >= 0.5 ? 1 : 0,
      ...interactionFields,
      ...normalizeActionInteractionWindow(source, role),
    };
  });
  return normalized;
}

export function normalizeActionInteractionWindow(source = {}, role = '') {
  if (role !== 'attack') return {};
  const window = {};
  if (source.startFrame !== undefined) window.startFrame = normalizeActionInteractionFrame(source.startFrame, 1);
  if (source.endFrame !== undefined) window.endFrame = normalizeActionInteractionFrame(source.endFrame, 1);
  return window;
}

export function normalizeActionInteractionFrame(value, fallback) {
  const frame = Math.round(Number(value ?? fallback));
  return Number.isFinite(frame) ? Math.max(1, frame) : fallback;
}

export function normalizeActionOffsets(current = {}, customActions = [], deletedActionKeys = []) {
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

export function actionFrameValueWithInteractionDefaults(action, part, value) {
  const fallback = DEFAULT_PLAYER_TUNING.actionOffsets?.[action]?.[part];
  if (part !== ATTACK_INTERACTION_OBJECT_KEY || !fallback) return value;
  if (!value) return fallback;
  return withInteractionFrameDefaults(value, fallback);
}

export function legacyActionPartKey(part) {
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

export function normalizeActionKeyframes(keyframes, start, end) {
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
