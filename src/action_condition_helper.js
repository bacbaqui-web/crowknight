export const ACTION_CONDITIONS = ['any', 'ground', 'air'];

const ACTION_CONDITION_TITLES = {
  any: '조건 없음',
  ground: '바닥에서만 실행',
  air: '공중에서만 실행',
};

const DEFAULT_ACTION_CONDITIONS = {
  idle: 'ground',
  fall: 'air',
};

export function defaultActionCondition(key) {
  return DEFAULT_ACTION_CONDITIONS[key] || 'any';
}

export function normalizeActionCondition(value, fallback = 'any') {
  const next = String(value || '');
  if (ACTION_CONDITIONS.includes(next)) return next;
  return ACTION_CONDITIONS.includes(fallback) ? fallback : 'any';
}

export function nextActionCondition(value) {
  const current = normalizeActionCondition(value);
  const index = ACTION_CONDITIONS.indexOf(current);
  return ACTION_CONDITIONS[(index + 1) % ACTION_CONDITIONS.length];
}

export function actionConditionTitle(value) {
  return ACTION_CONDITION_TITLES[normalizeActionCondition(value)] || ACTION_CONDITION_TITLES.any;
}
