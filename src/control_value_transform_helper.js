export const SPEED_LEVEL_MIN = 1;
export const SPEED_LEVEL_MAX = 10;
export const SPEED_VALUE_MIN = 400;
export const SPEED_VALUE_MAX = 1200;
export const SPEED_VALUE_PER_LEVEL = (SPEED_VALUE_MAX - SPEED_VALUE_MIN) / (SPEED_LEVEL_MAX - SPEED_LEVEL_MIN);

export function displayTuningControlValue(id, value) {
  if (id === 'speed') return formatDisplayNumber(speedValueToLevel(value), 1);
  return value;
}

export function storedTuningControlValue(id, value) {
  if (id === 'speed') return speedLevelToValue(value);
  if (id === 'rollWeapon') return Number(value) >= 0.5 ? 1 : 0;
  return Number(value);
}

export function speedLevelToValue(level) {
  const nextLevel = clampNumber(Number(level), SPEED_LEVEL_MIN, SPEED_LEVEL_MAX);
  return SPEED_VALUE_MIN + (nextLevel - SPEED_LEVEL_MIN) * SPEED_VALUE_PER_LEVEL;
}

export function speedValueToLevel(value) {
  const nextValue = clampNumber(Number(value), SPEED_VALUE_MIN, SPEED_VALUE_MAX);
  return SPEED_LEVEL_MIN + (nextValue - SPEED_VALUE_MIN) / SPEED_VALUE_PER_LEVEL;
}

function formatDisplayNumber(value, decimals) {
  return Number(value.toFixed(decimals));
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
