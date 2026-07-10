import { clamp } from './common_helper.js';
import { actionFormula } from './formula_runtime_engine.js';

export const DEFAULT_ENEMY_AI_SETTINGS = Object.freeze({
  enabled: false,
  minRange: 0,
  maxRange: 120,
  cooldown: 0,
  chance: 100,
  priority: 0,
});

export function defaultEnemyAiSettings() {
  return { ...DEFAULT_ENEMY_AI_SETTINGS };
}

export function normalizeEnemyAiSettings(source = {}, fallback = DEFAULT_ENEMY_AI_SETTINGS) {
  const base = fallback || DEFAULT_ENEMY_AI_SETTINGS;
  const minRange = clamp(Number(source?.minRange ?? base.minRange), 0, 99999);
  const maxRange = clamp(Number(source?.maxRange ?? base.maxRange), 0, 99999);

  return {
    enabled: Boolean(source?.enabled ?? base.enabled),
    minRange: Math.min(minRange, maxRange),
    maxRange: Math.max(minRange, maxRange),
    cooldown: clamp(Number(source?.cooldown ?? base.cooldown), 0, 999),
    chance: clamp(Number(source?.chance ?? base.chance), 0, 100),
    priority: clamp(Number(source?.priority ?? base.priority), -9999, 9999),
  };
}

export function writeEnemyAiSettings(tuning, actionKey, patch = {}) {
  if (!tuning || !actionKey) return defaultEnemyAiSettings();
  tuning.actionSettings ||= {};
  tuning.actionSettings[actionKey] ||= {};
  tuning.actionSettings[actionKey].ai = normalizeEnemyAiSettings({
    ...tuning.actionSettings[actionKey].ai,
    ...patch,
  });
  return tuning.actionSettings[actionKey].ai;
}

export function resolveEnemyAiSettings(settings = {}) {
  if (settings?.ai && typeof settings.ai === 'object') {
    return normalizeEnemyAiSettings(settings.ai);
  }

  const rangeFormula = legacyRangeFormula(settings);
  if (rangeFormula?.enabled) {
    return normalizeEnemyAiSettings({
      enabled: true,
      minRange: rangeFormula.minRange,
      maxRange: rangeFormula.maxRange,
      cooldown: actionFormula(settings, 'cooldown')?.seconds || 0,
      chance: 100,
      priority: 0,
    });
  }

  return defaultEnemyAiSettings();
}

export function isEnemyAiActionRegistered(settings = {}) {
  if (actionFormula(settings, 'ai')?.enabled) return true;
  return Boolean(legacyRangeFormula(settings)?.enabled);
}

function legacyRangeFormula(settings = {}) {
  if (Array.isArray(settings.formulas) || settings?.ai) return null;
  return actionFormula(settings, 'range');
}
