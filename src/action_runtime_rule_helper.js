import { clamp } from './common_helper.js';
import { ACTION_MAX_FRAMES } from './game_config_data.js';
import { normalizeActionBlendFrames } from './action_blend_helper.js';

export const ACTION_RUNTIME_RULE_KEYS = ['viewLock', 'cancel', 'blend', 'link'];

export function defaultActionRuntimeRules(legacy = {}) {
  const blendFrames = normalizeActionBlendFrames(legacy.blendFrames);
  return {
    viewLock: {
      enabled: false,
      startFrame: 1,
      endFrame: 1,
    },
    cancel: {
      enabled: legacy.interruptible !== false,
      startFrame: 1,
      endFrame: ACTION_MAX_FRAMES,
      priority: normalizeRuleNumber(legacy.interruptPriority, 0, -100, 100),
    },
    blend: {
      enabled: blendFrames > 0,
      startFrame: 1,
      endFrame: Math.max(1, blendFrames || 1),
      frames: blendFrames,
    },
    link: {
      enabled: false,
      fromActions: [],
      startFrame: 1,
      endFrame: ACTION_MAX_FRAMES,
      consumeTrigger: true,
    },
  };
}

export function normalizeActionRuntimeRules(source = {}, legacy = {}) {
  source ||= {};
  const defaults = defaultActionRuntimeRules(legacy);
  return {
    viewLock: normalizeBaseRule(source.viewLock, defaults.viewLock),
    cancel: {
      ...normalizeBaseRule(source.cancel, defaults.cancel),
      priority: normalizeRuleNumber(source.cancel?.priority, defaults.cancel.priority, -100, 100),
    },
    blend: {
      ...normalizeBaseRule(source.blend, defaults.blend),
      frames: normalizeActionBlendFrames(source.blend?.frames ?? defaults.blend.frames),
    },
    link: {
      ...normalizeBaseRule(source.link, defaults.link),
      fromActions: normalizeRuleActionKeys(source.link?.fromActions ?? defaults.link.fromActions),
      consumeTrigger: source.link?.consumeTrigger ?? defaults.link.consumeTrigger ?? true,
    },
  };
}

export function writeActionRuntimeRuleSetting(settings, ruleKey, prop, value) {
  settings.runtimeRules = normalizeActionRuntimeRules(settings.runtimeRules, settings);
  const rule = settings.runtimeRules[ruleKey];
  if (!rule) return null;

  if (prop === 'enabled') rule.enabled = Boolean(value);
  if (prop === 'startFrame') rule.startFrame = normalizeRuleFrame(value, rule.startFrame);
  if (prop === 'endFrame') rule.endFrame = normalizeRuleFrame(value, rule.endFrame);
  if (ruleKey === 'cancel' && prop === 'enabled') settings.interruptible = rule.enabled;
  if (ruleKey === 'cancel' && prop === 'priority') {
    rule.priority = normalizeRuleNumber(value, rule.priority, -100, 100);
    settings.interruptPriority = rule.priority;
  }
  if (ruleKey === 'blend' && prop === 'enabled') {
    if (rule.enabled && normalizeActionBlendFrames(rule.frames) <= 0) rule.frames = 1;
    if (!rule.enabled) rule.frames = 0;
    settings.blendFrames = normalizeActionBlendFrames(rule.frames);
  }
  if (ruleKey === 'blend' && prop === 'frames') {
    rule.frames = normalizeActionBlendFrames(value);
    rule.enabled = rule.frames > 0;
    rule.endFrame = Math.max(rule.startFrame, rule.startFrame + Math.max(0, rule.frames - 1));
    settings.blendFrames = rule.frames;
  }
  if (ruleKey === 'link' && prop === 'fromAction') {
    const actionKey = normalizeRuleActionKey(value);
    rule.fromActions = actionKey ? [actionKey] : [];
  }
  if (ruleKey === 'link' && prop === 'consumeTrigger') rule.consumeTrigger = Boolean(value);
  return rule;
}

export function runtimeRuleForAction(settings = {}, ruleKey) {
  return normalizeActionRuntimeRules(settings.runtimeRules, settings)[ruleKey] || null;
}

export function runtimeRuleActiveAtProgress(settings = {}, ruleKey, progress = 0, frameCount = ACTION_MAX_FRAMES) {
  const rule = runtimeRuleForAction(settings, ruleKey);
  if (!rule?.enabled) return false;
  const frame = actionRuntimeFrameFromProgress(progress, frameCount);
  const start = normalizeRuleFrame(rule.startFrame, 1);
  const end = normalizeRuleFrame(rule.endFrame, frameCount);
  return frame >= Math.min(start, end) && frame <= Math.max(start, end);
}

export function actionRuntimeFrameFromProgress(progress = 0, frameCount = ACTION_MAX_FRAMES) {
  const count = Math.max(1, Math.round(Number(frameCount || ACTION_MAX_FRAMES)));
  const normalized = clamp(Number(progress || 0), 0, 1);
  return clamp(Math.floor(normalized * count) + 1, 1, count);
}

function normalizeBaseRule(source = {}, defaults = {}) {
  return {
    enabled: source.enabled ?? defaults.enabled ?? false,
    startFrame: normalizeRuleFrame(source.startFrame, defaults.startFrame ?? 1),
    endFrame: normalizeRuleFrame(source.endFrame, defaults.endFrame ?? 1),
  };
}

function normalizeRuleFrame(value, fallback = 1) {
  return clamp(Math.round(Number(value ?? fallback)), 1, ACTION_MAX_FRAMES);
}

function normalizeRuleNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return clamp(number, min, max);
}

function normalizeRuleActionKeys(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeRuleActionKey).filter(Boolean))];
}

function normalizeRuleActionKey(value) {
  return String(value || '').trim();
}
