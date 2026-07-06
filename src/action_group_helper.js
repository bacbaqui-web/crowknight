export const ACTION_GROUPS = [
  { key: 'base', label: '기본' },
  { key: 'movement', label: '이동' },
  { key: 'attack', label: '공격' },
  { key: 'special', label: '특수' },
];

const ACTION_GROUP_KEYS = new Set(ACTION_GROUPS.map((group) => group.key));

const DEFAULT_ACTION_GROUPS = {
  idle: 'base',
  fall: 'base',
  death: 'base',
  run: 'movement',
  jump: 'movement',
  doubleJump: 'movement',
  sprint: 'movement',
  roll: 'movement',
  evade: 'movement',
  attack1: 'attack',
  attack2: 'attack',
  attack3: 'attack',
  jumpAttack: 'attack',
  guard: 'special',
  parry: 'special',
  guardBreak: 'special',
  glide: 'special',
  hurt: 'special',
};

export function normalizeActionGroup(value, fallback = 'movement') {
  const key = String(value || '').trim();
  if (ACTION_GROUP_KEYS.has(key)) return key;
  return ACTION_GROUP_KEYS.has(fallback) ? fallback : 'movement';
}

export function defaultActionGroup(key) {
  return DEFAULT_ACTION_GROUPS[key] || 'movement';
}

export function actionGroupLabel(value) {
  return ACTION_GROUPS.find((group) => group.key === value)?.label || '이동';
}

export function nextActionGroup(value) {
  const current = normalizeActionGroup(value);
  const index = ACTION_GROUPS.findIndex((group) => group.key === current);
  return ACTION_GROUPS[(index + 1) % ACTION_GROUPS.length].key;
}

export function normalizeActionGroupInput(value, fallback = 'movement') {
  const raw = String(value || '').trim();
  const match = ACTION_GROUPS.find((group) => group.key === raw || group.label === raw);
  return match ? match.key : normalizeActionGroup(raw, fallback);
}
