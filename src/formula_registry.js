import { ACTION_MAX_FRAMES } from './game_config_data.js';
import { clamp } from './common_helper.js';
import { velocityFormula } from './formulas/velocity_formula.js';
import { lockFormula } from './formulas/lock_formula.js';
import { blendFormula } from './formulas/blend_formula.js';
import { cancelFormula } from './formulas/cancel_formula.js';
import { castFormula } from './formulas/cast_formula.js';
import { inertiaFormula } from './formulas/inertia_formula.js';
import { linkFormula } from './formulas/link_formula.js';
import { cooldownFormula } from './formulas/cooldown_formula.js';
import { targetMoveFormula } from './formulas/target_move_formula.js';
import { afterimageFormula } from './formulas/afterimage_formula.js';
import { shakeFormula } from './formulas/shake_formula.js';
import { colorChangeFormula } from './formulas/color_change_formula.js';
import { rangeFormula } from './formulas/range_formula.js';
import { projectileFormula } from './formulas/projectile_formula.js';
import { zoomFormula } from './formulas/zoom_formula.js';
import { aiFormula } from './formulas/ai_formula.js';

export const FORMULA_DEFS = Object.freeze([
  velocityFormula,
  inertiaFormula,
  lockFormula,
  blendFormula,
  cancelFormula,
  linkFormula,
  castFormula,
  cooldownFormula,
  targetMoveFormula,
  afterimageFormula,
  shakeFormula,
  colorChangeFormula,
  zoomFormula,
  projectileFormula,
  aiFormula,
  rangeFormula,
]);

export function formulaDef(type) {
  return FORMULA_DEFS.find((formula) => formula.type === type) || null;
}

export function createDefaultFormula(type, enabled = false) {
  const def = formulaDef(type);
  if (!def) return null;
  return normalizeFormula({ ...def.defaultValue(), enabled });
}

export function normalizeActionFormulas(formulas, legacy = {}) {
  const normalized = new Map();
  const hasFormulaSource = Array.isArray(formulas);
  if (!hasFormulaSource) legacyFormulas(legacy).forEach((formula) => setFormula(normalized, formula));
  const source = hasFormulaSource ? formulas : [];
  source.forEach((formula) => setFormula(normalized, formula));
  return FORMULA_DEFS.map((def) => normalized.get(def.type)).filter((formula) => formula?.enabled);
}

export function ensureActionFormula(settings, type) {
  settings.formulas = normalizeActionFormulas(settings.formulas, settings);
  let formula = settings.formulas.find((item) => item.type === type);
  if (!formula) {
    formula = createDefaultFormula(type, false);
    if (formula) settings.formulas.push(formula);
  }
  return formula || null;
}

export function writeActionFormulaEnabled(settings, type, enabled) {
  const formula = ensureActionFormula(settings, type);
  if (!formula) return null;
  formula.enabled = Boolean(enabled);
  if (type === 'blend' && formula.enabled && Number(formula.frames || 0) <= 0) {
    formula.frames = 1;
    formula.endFrame = Math.max(Number(formula.startFrame || 1), Number(formula.startFrame || 1));
  }
  settings.formulas = normalizeActionFormulas(settings.formulas, settings);
  return settings.formulas.find((item) => item.type === type) || formula;
}

export function writeActionFormulaSetting(settings, type, prop, value) {
  const formula = ensureActionFormula(settings, type);
  if (!formula) return null;
  formula[prop] = value;
  settings.formulas = normalizeActionFormulas(settings.formulas, settings);
  return settings.formulas.find((item) => item.type === type) || formula;
}

export function resetActionFormula(settings, type) {
  const def = formulaDef(type);
  if (!def) return null;
  const formula = normalizeFormula(normalizeResetSource(type, def.defaultValue()));
  if (!formula) return null;
  const formulas = normalizeActionFormulas(settings.formulas, settings).filter((item) => item.type !== type);
  settings.formulas = normalizeActionFormulas([...formulas, formula], settings);
  return settings.formulas.find((item) => item.type === type) || formula;
}

export function migrateActionFormulasFromModifiers(settings, modifiers = []) {
  const velocity = modifiers.find((modifier) => modifier?.type === 'velocity' && modifier.enabled);
  if (!velocity) return normalizeActionFormulas(settings.formulas, settings);
  return normalizeActionFormulas(
    [
      ...(settings.formulas || []),
      {
        type: 'velocity',
        enabled: true,
        ...(velocity.settings || {}),
      },
    ],
    settings
  );
}

function setFormula(target, source) {
  const formula = normalizeFormula(source);
  if (!formula) return;
  target.set(formula.type, formula);
}

function normalizeFormula(source = {}) {
  const def = formulaDef(source.type);
  if (!def) return null;
  const normalized = def.normalize(source);
  return {
    ...normalized,
    enabled: Boolean(normalized.enabled),
    startFrame: normalizeFormulaFrame(normalized.startFrame, def.defaultValue().startFrame || 1),
    endFrame: normalizeFormulaFrame(normalized.endFrame, def.defaultValue().endFrame || ACTION_MAX_FRAMES),
  };
}

function legacyFormulas(legacy = {}) {
  const formulas = [];
  const rules = legacy.runtimeRules || {};
  if (rules.viewLock) formulas.push({ type: 'lock', ...rules.viewLock });
  if (rules.cancel) formulas.push({ type: 'cancel', ...rules.cancel });
  if (rules.blend) formulas.push({ type: 'blend', ...rules.blend });
  if (rules.link) formulas.push({ type: 'link', ...rules.link });
  if (legacy.blendFrames > 0) {
    formulas.push({
      type: 'blend',
      enabled: true,
      startFrame: 1,
      endFrame: Math.max(1, Number(legacy.blendFrames || 1)),
      frames: legacy.blendFrames,
    });
  }
  if (legacy.interruptible !== undefined || legacy.interruptPriority !== undefined) {
    formulas.push({
      type: 'cancel',
      enabled: legacy.interruptible !== false,
      startFrame: 1,
      endFrame: ACTION_MAX_FRAMES,
      priority: legacy.interruptPriority || 0,
    });
  }
  return formulas;
}

function normalizeFormulaFrame(value, fallback = 1) {
  return clamp(Math.round(Number(value ?? fallback)), 1, ACTION_MAX_FRAMES);
}

function normalizeResetSource(type, source) {
  const next = { ...source, enabled: true };
  if (type === 'blend' && Number(next.frames || 0) <= 0) {
    next.frames = 1;
    next.endFrame = Math.max(Number(next.startFrame || 1), Number(next.startFrame || 1));
  }
  return next;
}
