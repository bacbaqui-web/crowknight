export const ACTION_TRIGGER_KEY_OPTIONS = [
  { value: 'Q', label: 'Q' },
  { value: 'W', label: 'W' },
  { value: 'E', label: 'E' },
  { value: 'Space', label: 'Space' },
  { value: 'ArrowUp', label: '↑' },
  { value: 'ArrowDown', label: '↓' },
  { value: 'ArrowLeft', label: '←' },
  { value: 'ArrowRight', label: '→' },
];

export const ACTION_TRIGGER_TYPE_OPTIONS = [
  { value: 'single', label: '단일' },
  { value: 'sequence', label: '연속' },
  { value: 'holdCombo', label: '홀드 조합' },
];

const INPUT_CODE_TO_TRIGGER_KEY = {
  KeyQ: 'Q',
  KeyW: 'W',
  KeyE: 'E',
  Space: 'Space',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
};
const ACTION_TRIGGER_KEYS = ACTION_TRIGGER_KEY_OPTIONS.map((option) => option.value);
const DEFAULT_MAX_GAP_MS = 350;

export function defaultActionTrigger() {
  return { type: 'single', keys: ['Q'] };
}

export function defaultActionTriggerForKey(key) {
  return (
    {
      idle: null,
      run: null,
      jump: { type: 'single', keys: ['Space'] },
      fall: null,
      glide: null,
      roll: { type: 'single', keys: ['W'] },
      guard: { type: 'single', keys: ['E'] },
      guardBreak: null,
      hurt: null,
      death: null,
      jumpAttack: { type: 'holdCombo', hold: 'Space', press: 'Q' },
      attack1: { type: 'single', keys: ['Q'] },
      attack2: { type: 'sequence', keys: ['Q', 'Q'], maxGapMs: DEFAULT_MAX_GAP_MS },
      attack3: { type: 'sequence', keys: ['Q', 'Q', 'Q'], maxGapMs: DEFAULT_MAX_GAP_MS },
    }[key] || null
  );
}

export function normalizeActionTrigger(trigger) {
  const type = trigger?.type;
  if (type === 'sequence') {
    const keys = normalizeTriggerKeyList(trigger.keys);
    return withTriggerRepeat(trigger, {
      type: 'sequence',
      keys: keys.length >= 2 ? keys : ['Q', 'Q'],
      maxGapMs: clampMaxGapMs(trigger.maxGapMs),
    });
  }
  if (type === 'holdCombo') {
    return withTriggerRepeat(trigger, {
      type: 'holdCombo',
      hold: normalizeTriggerKey(trigger.hold) || 'Q',
      press: normalizeTriggerKey(trigger.press) || 'E',
    });
  }
  return withTriggerRepeat(trigger, {
    type: 'single',
    keys: [normalizeTriggerKey(trigger?.keys?.[0]) || normalizeTriggerKey(trigger?.key) || 'Q'],
  });
}

export function normalizeOptionalActionTrigger(trigger) {
  if (!trigger) return null;
  return normalizeActionTrigger(trigger);
}

export function parseActionTriggerSequence(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  if (/^[qweQWE]+$/.test(text)) return text.toUpperCase().split('');
  return text
    .split(/[\s,>+]+/g)
    .map(normalizeTriggerKey)
    .filter(Boolean);
}

export function formatActionTriggerSequence(trigger) {
  const keys = normalizeActionTrigger(trigger).keys || [];
  return keys.every((key) => key.length === 1) ? keys.join('') : keys.join(' ');
}

export function triggerKeyFromInputCode(code) {
  return INPUT_CODE_TO_TRIGGER_KEY[code] || '';
}

export function actionTriggerKeyLabel(key) {
  return ACTION_TRIGGER_KEY_OPTIONS.find((option) => option.value === key)?.label || key;
}

function normalizeTriggerKeyList(keys) {
  return Array.isArray(keys) ? keys.map(normalizeTriggerKey).filter(Boolean) : [];
}

function normalizeTriggerKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === 'q') return 'Q';
  if (lower === 'w') return 'W';
  if (lower === 'e') return 'E';
  if (lower === 'space' || lower === 'spacebar') return 'Space';
  if (lower === 'arrowup' || lower === 'up' || raw === '↑') return 'ArrowUp';
  if (lower === 'arrowdown' || lower === 'down' || raw === '↓') return 'ArrowDown';
  if (lower === 'arrowleft' || lower === 'left' || raw === '←') return 'ArrowLeft';
  if (lower === 'arrowright' || lower === 'right' || raw === '→') return 'ArrowRight';
  return ACTION_TRIGGER_KEYS.includes(raw) ? raw : '';
}

function clampMaxGapMs(value) {
  const next = Math.round(Number(value ?? DEFAULT_MAX_GAP_MS));
  if (!Number.isFinite(next)) return DEFAULT_MAX_GAP_MS;
  return Math.min(2000, Math.max(50, next));
}

function withTriggerRepeat(source, trigger) {
  return source?.repeatWhileHeld ? { ...trigger, repeatWhileHeld: true } : trigger;
}
