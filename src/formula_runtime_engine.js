import { ACTION_MAX_FRAMES } from './game_config_data.js';
import { clamp } from './common_helper.js';
import { normalizeActionFormulas } from './formula_registry.js';

export function actionFormula(settings = {}, type) {
  return normalizeActionFormulas(settings.formulas, settings).find((formula) => formula.type === type) || null;
}

export function actionFormulaActiveAtProgress(settings = {}, type, progress = 0, frameCount = ACTION_MAX_FRAMES) {
  const formula = actionFormula(settings, type);
  if (!formula?.enabled) return false;
  const frame = actionFormulaFrameFromProgress(progress, frameCount);
  const start = normalizeFormulaFrame(formula.startFrame, 1, frameCount);
  const end = normalizeFormulaFrame(formula.endFrame, frameCount, frameCount);
  return frame >= Math.min(start, end) && frame <= Math.max(start, end);
}

export function actionFormulaFrameFromProgress(progress = 0, frameCount = ACTION_MAX_FRAMES) {
  const count = Math.max(1, Math.round(Number(frameCount || ACTION_MAX_FRAMES)));
  const normalized = clamp(Number(progress || 0), 0, 1);
  return clamp(Math.floor(normalized * count) + 1, 1, count);
}

export function formulaFrameBoundary(value, frameCount, fallback) {
  return normalizeFormulaFrame(value, fallback, frameCount);
}

function normalizeFormulaFrame(value, fallback = 1, frameCount = ACTION_MAX_FRAMES) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(frameCount, Math.max(1, Math.round(number)));
}
