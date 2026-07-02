import { normalizeActionTrigger } from './action_trigger_data.js';

const TRIGGER_TO_INPUT_CODE = {
  Q: 'KeyQ',
  W: 'KeyW',
  E: 'KeyE',
  Space: 'Space',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
};

const INPUT_CODE_TO_TRIGGER = Object.fromEntries(
  Object.entries(TRIGGER_TO_INPUT_CODE).map(([triggerKey, code]) => [code, triggerKey])
);
const MAX_HISTORY_AGE_MS = 2000;

export function updateActionTriggerRuntime(player, dt, keys, pressed) {
  const runtime = ensureActionTriggerRuntime(player);
  runtime.nowMs += Math.max(0, Number(dt || 0)) * 1000;
  recordPressedInputs(runtime, pressed);
  trimInputHistory(runtime);

  if (player.isCustomActionActive || !canStartCustomAction(player)) return new Set();

  const match = findMatchingCustomAction(player, runtime, keys, pressed);
  if (!match) return new Set();

  startCustomAction(player, match.action.key);
  return new Set(match.consumedCodes);
}

export function advanceCustomActionRuntime(player, dt) {
  if (!player.customActionKey || player.customActionTime <= 0) return;
  applyCustomActionMoveModifier(player, dt);
  player.customActionTime = Math.max(0, player.customActionTime - dt);
  if (player.customActionTime <= 0) {
    player.customActionKey = null;
    player.customActionDuration = 0;
    player.customActionMoveProgress = 0;
  }
}

function ensureActionTriggerRuntime(player) {
  player.actionTriggerRuntime ||= {
    nowMs: 0,
    history: [],
  };
  return player.actionTriggerRuntime;
}

function recordPressedInputs(runtime, pressed) {
  pressed.forEach((code) => {
    const key = INPUT_CODE_TO_TRIGGER[code];
    if (!key) return;
    runtime.history.push({ key, code, atMs: runtime.nowMs });
  });
}

function trimInputHistory(runtime) {
  const oldest = runtime.nowMs - MAX_HISTORY_AGE_MS;
  runtime.history = runtime.history.filter((entry) => entry.atMs >= oldest);
}

function findMatchingCustomAction(player, runtime, keys, pressed) {
  const actions = customActionsByTriggerPriority(player.actions || player.customActions);
  return (
    findHoldComboMatch(actions, keys, pressed) ||
    findSequenceMatch(actions, runtime, pressed) ||
    findSingleMatch(actions, pressed) ||
    findHeldRepeatMatch(actions, runtime, keys)
  );
}

function customActionsByTriggerPriority(actions = []) {
  return [...actions]
    .filter((action) => action?.key && action.runtimeMode !== 'legacy')
    .map((action) => ({
      ...action,
      trigger: normalizeActionTrigger(action.trigger),
    }))
    .sort((a, b) => triggerPriority(b.trigger) - triggerPriority(a.trigger));
}

function triggerPriority(trigger) {
  if (trigger.type === 'holdCombo') return 300;
  if (trigger.type === 'sequence') return 200 + trigger.keys.length;
  return 100;
}

function findHoldComboMatch(actions, keys, pressed) {
  for (const action of actions) {
    const trigger = action.trigger;
    if (trigger.type !== 'holdCombo') continue;
    const holdCode = inputCodeForTriggerKey(trigger.hold);
    const pressCode = inputCodeForTriggerKey(trigger.press);
    if (!holdCode || !pressCode) continue;
    if (keys.has(holdCode) && pressed.has(pressCode)) {
      return { action, consumedCodes: [pressCode] };
    }
  }
  return null;
}

function findSequenceMatch(actions, runtime, pressed) {
  const pressedKeys = new Set([...pressed].map((code) => INPUT_CODE_TO_TRIGGER[code]).filter(Boolean));
  if (!pressedKeys.size) return null;

  for (const action of actions) {
    const trigger = action.trigger;
    if (trigger.type !== 'sequence') continue;
    const expected = trigger.keys;
    const finalKey = expected[expected.length - 1];
    if (!expected.length || !pressedKeys.has(finalKey)) continue;
    if (historyEndsWithSequence(runtime.history, expected, trigger.maxGapMs)) {
      return { action, consumedCodes: [inputCodeForTriggerKey(finalKey)] };
    }
  }
  return null;
}

function historyEndsWithSequence(history, expected, maxGapMs) {
  if (history.length < expected.length) return false;
  const slice = history.slice(history.length - expected.length);
  if (slice.some((entry, index) => entry.key !== expected[index])) return false;
  for (let index = 1; index < slice.length; index += 1) {
    if (slice[index].atMs - slice[index - 1].atMs > maxGapMs) return false;
  }
  return true;
}

function findSingleMatch(actions, pressed) {
  for (const action of actions) {
    const trigger = action.trigger;
    if (trigger.type !== 'single') continue;
    const code = inputCodeForTriggerKey(trigger.keys[0]);
    if (code && pressed.has(code)) return { action, consumedCodes: [code] };
  }
  return null;
}

function findHeldRepeatMatch(actions, runtime, keys) {
  for (const action of actions) {
    const trigger = action.trigger;
    if (!trigger.repeatWhileHeld) continue;
    const consumedCodes = heldCodesForTrigger(trigger, runtime, keys);
    if (consumedCodes.length) return { action, consumedCodes };
  }
  return null;
}

function heldCodesForTrigger(trigger, runtime, keys) {
  if (trigger.type === 'single') {
    const code = inputCodeForTriggerKey(trigger.keys[0]);
    return code && keys.has(code) ? [code] : [];
  }
  if (trigger.type === 'holdCombo') {
    const holdCode = inputCodeForTriggerKey(trigger.hold);
    const pressCode = inputCodeForTriggerKey(trigger.press);
    return holdCode && pressCode && keys.has(holdCode) && keys.has(pressCode) ? [holdCode, pressCode] : [];
  }
  if (trigger.type === 'sequence') {
    const finalCode = inputCodeForTriggerKey(trigger.keys[trigger.keys.length - 1]);
    if (!finalCode || !keys.has(finalCode)) return [];
    return historyEndsWithSequence(runtime.history, trigger.keys, trigger.maxGapMs) ? [finalCode] : [];
  }
  return [];
}

function canStartCustomAction(player) {
  return !player.dead && player.hurtTime <= 0 && player.guardBreakTime <= 0;
}

function startCustomAction(player, key) {
  const duration = player.getPoseActionDuration(key, 0.6);
  player.customActionKey = key;
  player.customActionDuration = duration;
  player.customActionTime = duration;
  player.customActionMoveProgress = 0;
  player.attackSerial += 1;
}

function applyCustomActionMoveModifier(player, dt) {
  const action = currentCustomAction(player);
  const move = enabledModifier(action, 'move');
  if (!move) return;

  const duration = Math.max(0.01, Number(player.customActionDuration || player.getPoseActionDuration(action.key, 0.6)));
  const previousProgress = clamp01(Number(player.customActionMoveProgress || 0));
  const nextProgress = clamp01(1 - Math.max(0, player.customActionTime - dt) / duration);
  const easedPrevious = easedMoveProgress(previousProgress, action);
  const easedNext = easedMoveProgress(nextProgress, action);
  const deltaProgress = easedNext - easedPrevious;
  const deltaX = Number(move.settings?.x || 0) * deltaProgress;
  const deltaY = Number(move.settings?.y || 0) * deltaProgress;

  player.x += deltaX;
  player.y += deltaY;
  if (deltaY < 0) player.onGround = false;
  player.customActionMoveProgress = nextProgress;
}

function easedMoveProgress(progress, action) {
  const accelerate = enabledModifier(action, 'accelerate');
  const decelerate = enabledModifier(action, 'decelerate');
  if (!accelerate && !decelerate) return progress;

  const strength = modifierStrength(accelerate, decelerate);
  const exponent = 1 + strength;
  if (accelerate && decelerate) return easeInOut(progress, exponent);
  if (accelerate) return progress ** exponent;
  return 1 - (1 - progress) ** exponent;
}

function easeInOut(progress, exponent) {
  if (progress < 0.5) return 0.5 * (progress * 2) ** exponent;
  return 1 - 0.5 * ((1 - progress) * 2) ** exponent;
}

function modifierStrength(...modifiers) {
  const active = modifiers.filter(Boolean);
  if (!active.length) return 1;
  const total = active.reduce((sum, modifier) => sum + Math.max(0, Number(modifier.settings?.strength ?? 1)), 0);
  return total / active.length;
}

function currentCustomAction(player) {
  return (
    (player.actions || player.customActions || []).find((action) => action?.key === player.customActionKey) || null
  );
}

function enabledModifier(action, type) {
  return action?.modifiers?.find((modifier) => modifier?.type === type && modifier.enabled) || null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function inputCodeForTriggerKey(key) {
  return TRIGGER_TO_INPUT_CODE[key] || '';
}
