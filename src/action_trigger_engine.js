import { canUseRunSkill, startRunSkill } from './skill_runtime_helper.js';
import { upgradeActionDelta } from './run_upgrade_timing_helper.js';
import { normalizeActionTrigger } from './action_trigger_data.js';
import { isActionMirrorEnabled } from './action_mirror_helper.js';
import { normalizeActionCondition } from './action_condition_helper.js';
import { isRuntimeDebugEnabled, recordRuntimeDebugEvent } from './runtime_debug_state.js';
import {
  actionFormula,
  actionFormulaActiveAtProgress,
  activeActionFormulaAtProgress,
  actionFormulaFrameFromProgress,
  formulaFrameBoundary,
} from './formula_runtime_engine.js';
import { actionRuntimeSettings, currentCustomAction, runtimeActions } from './action_runtime_data_helper.js';
import {
  applyCustomActionVelocityModifier,
  applyCustomActionTargetMove,
  actionFrameCount,
  clamp01,
} from './action_movement_formula_helper.js';
const TRIGGER_TO_INPUT_CODE = {
  Shift: 'ShiftLeft',
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

const MIRRORED_TRIGGER_KEY = {
  ArrowLeft: 'ArrowRight',
  ArrowRight: 'ArrowLeft',
};

const MAX_HISTORY_AGE_MS = 2000;

const ACTION_TIME_EPSILON = 0.000001;

export function updateActionTriggerRuntime(player, dt, keys, pressed) {
  const runtime = ensureActionTriggerRuntime(player);
  runtime.nowMs += Math.max(0, Number(dt || 0)) * 1000;
  recordTriggerInputTrace(player, keys, pressed);
  recordPressedInputs(runtime, pressed);
  trimInputHistory(runtime);
  updateActivePressAction(player, keys);

  if (!canStartCustomAction(player)) {
    recordTriggerFailure(player, 'Action 시작 실패', '현재 상태에서 Action을 시작할 수 없음', pressed);
    return new Set();
  }

  const match = findMatchingCustomAction(player, runtime, keys, pressed);
  if (!match) {
    recordTriggerFailure(player, 'Trigger 실패', '입력과 일치하는 Action Trigger가 없음', pressed);
    return new Set();
  }
  recordTriggerMatchTrace(player, match);
  if (!canRunActionCondition(player, match.action.key)) {
    recordActionStartFailure(player, match, 'Action 조건이 맞지 않음');
    return new Set();
  }
  const linkResult = actionLinkResult(player, match.action.key);
  if (!linkResult.allowed) {
    recordActionStartFailure(player, match, linkResult.reason || '연계 조건이 맞지 않음');
    return new Set();
  }
  const cooldownResult = actionCooldownResult(player, match.action.key, runtimeNowMs(player));
  if (!cooldownResult.allowed) {
    recordActionStartFailure(player, match, cooldownResult.reason || '쿨타임 대기 중');
    return new Set();
  }
  if (!canInterruptCurrentAction(player, match.action, match.facing)) {
    recordActionStartFailure(player, match, '현재 Action을 취소할 수 없음');
    return new Set();
  }

  startCustomAction(player, match.action.key, match.facing, match.triggerMode, match.pressCodes);
  startActionCooldown(player, match.action.key, runtimeNowMs(player));
  return new Set(match.consumedCodes);
}

function recordTriggerInputTrace(player, keys, pressed) {
  if (!isRuntimeDebugEnabled()) return;
  if (!pressed?.size) return;
  recordRuntimeDebugEvent('trigger-input', {
    actionKey: player.actionKey,
    keys: [...keys].join(' + '),
    pressed: [...pressed].join(' + '),
  });
}

function recordTriggerMatchTrace(player, match) {
  if (!isRuntimeDebugEnabled()) return;
  recordRuntimeDebugEvent('trigger-match', {
    currentActionKey: player.actionKey,
    actionKey: match?.action?.key || '',
    triggerMode: match?.triggerMode || 'tap',
    facing: match?.facing || player.facing,
    consumed: [...(match?.consumedCodes || [])].join(' + '),
  });
}

export function advanceCustomActionRuntime(player, dt) {
  applyCustomActionViewLock(player);
  if (player.customActionBlend) {
    player.advanceCustomActionBlendFrame?.(dt);
    applyCustomActionViewLock(player);
    return;
  }
  if (!player.customActionKey || player.customActionTime <= 0) return;
  applyCustomActionViewLock(player);
  dt = upgradeActionDelta(player, dt);
  applyCustomActionVelocityModifier(player, dt);
  applyCustomActionTargetMove(player, dt);
  player.customActionElapsed = Math.max(0, Number(player.customActionElapsed || 0) + Math.max(0, Number(dt || 0)));
  applyCustomActionViewLock(player);

  if (player.customActionRepeatRelease) {
    player.customActionRepeatRelease.elapsed = Math.max(
      0,
      Number(player.customActionRepeatRelease.elapsed || 0) + Math.max(0, Number(dt || 0))
    );
    if (player.customActionRepeatRelease.elapsed >= Number(player.customActionRepeatRelease.duration || 0)) {
      stopCustomAction(player);
    }
    return;
  }

  if (isPressLoopAction(player)) {
    const duration = Math.max(0.01, Number(player.customActionDuration || 0.6));
    player.customActionTime = Math.max(ACTION_TIME_EPSILON, duration - Math.min(duration, player.customActionElapsed));
    return;
  }

  player.customActionTime = Math.max(0, player.customActionTime - dt);
  if (player.customActionTime <= ACTION_TIME_EPSILON) {
    stopCustomAction(player, {
      actionKey: player.customActionKey,
      progress: 1,
      facing: player.customActionFacing || player.facing,
    });
  }
}

function applyCustomActionViewLock(player) {
  const action = currentCustomAction(player);
  if (!action) return;
  const settings = actionRuntimeSettings(player, action.key);
  const frameCount = actionFrameCount(player, action);
  const lock = activeActionFormulaAtProgress(settings, 'lock', player.getActionFrameProgress?.() || 0, frameCount);
  if (!lock) return;
  const lockedFacing = lockFormulaFacing(lock, settings, player.customActionFacing || player.facing);
  if (lockedFacing) player.facing = lockedFacing;
}

function lockFormulaFacing(lock, settings, actionFacing) {
  if (lock.direction === 'away') return null;
  const originalFacing = lock.direction === 'left' ? -1 : 1;
  const mirrorSign = isActionMirrorEnabled(settings) && Number(actionFacing) < 0 ? -1 : 1;
  return originalFacing * mirrorSign;
}

export function requestRuntimeAction(player, key, facing = null, triggerMode = 'tap') {
  if (!runtimeActions(player).some((action) => action?.key === key)) return false;
  if (!canRunActionCondition(player, key)) return false;
  if (!actionLinkResult(player, key).allowed) return false;
  if (!actionCooldownResult(player, key, runtimeNowMs(player)).allowed) return false;
  startCustomAction(player, key, facing, triggerMode, []);
  startActionCooldown(player, key, runtimeNowMs(player));
  return true;
}

function ensureActionTriggerRuntime(player) {
  player.actionTriggerRuntime ||= {
    nowMs: 0,
    history: [],
    cooldowns: {},
  };
  player.actionTriggerRuntime.cooldowns ||= {};
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
  const actions = customActionsByTriggerPriority(
    player,
    runtimeActions(player).filter((action) => canUseRunSkill(player, action.key))
  );
  return (
    findEventCustomActionMatch(player, actions, runtime, keys, pressed) ||
    findStateReturnCustomActionMatch(player, actions, keys)
  );
}

function findEventCustomActionMatch(player, actions, runtime, keys, pressed) {
  return (
    findHoldComboMatch(player, actions, keys, pressed) ||
    findSequenceMatch(player, actions, runtime, pressed) ||
    findSingleMatch(player, actions, pressed)
  );
}

function findStateReturnCustomActionMatch(player, actions, keys) {
  if (player.isCustomActionActive) return null;
  return (
    findHoldComboMatch(player, actions, keys, keys, { state: true }) ||
    findSingleMatch(player, actions, keys, { state: true })
  );
}

function customActionsByTriggerPriority(player, actions = []) {
  return [...actions]
    .filter((action) => action?.key && action.runtimeMode !== 'legacy')
    .map((action) => ({
      ...action,
      trigger: normalizeActionTrigger(action.trigger),
      linkPriority: actionLinkPriority(player, action.key),
    }))
    .filter((action) => action.linkPriority >= 0)
    .sort((a, b) => b.linkPriority - a.linkPriority || triggerPriority(b.trigger) - triggerPriority(a.trigger));
}

function triggerPriority(trigger) {
  if (trigger.type === 'holdCombo') return 300;
  if (trigger.type === 'sequence') return 200 + trigger.keys.length;
  return 100;
}

function actionLinkPriority(player, actionKey) {
  const result = actionLinkResult(player, actionKey);
  if (!result.allowed) return -1;
  return result.linked ? 1000 : 0;
}

function findHoldComboMatch(player, actions, keys, pressed, { state = null } = {}) {
  for (const mirrored of [false, true]) {
    for (const action of actions) {
      const trigger = action.trigger;
      if (trigger.type !== 'holdCombo') continue;
      if (state !== null && isStateCastAction(player, action) !== state) continue;
      const variants = triggerInputVariants(player, action, [trigger.hold, trigger.press], { mirrored });
      for (const variant of variants) {
        const holdCode = inputCodeForTriggerKey(variant.keys[0]);
        const pressCode = inputCodeForTriggerKey(variant.keys[1]);
        if (!holdCode || !pressCode) continue;
        const matched = state
          ? keys.has(holdCode) && keys.has(pressCode)
          : keys.has(holdCode) && pressed.has(pressCode);
        if (matched) {
          return triggerMatch(player, action, state ? [] : [pressCode], variant.facing, trigger, [holdCode, pressCode]);
        }
      }
    }
  }
  return null;
}

function findSequenceMatch(player, actions, runtime, pressed) {
  const pressedKeys = new Set([...pressed].map((code) => INPUT_CODE_TO_TRIGGER[code]).filter(Boolean));
  if (!pressedKeys.size) return null;

  for (const mirrored of [false, true]) {
    for (const action of actions) {
      const trigger = action.trigger;
      if (trigger.type !== 'sequence') continue;
      const expected = trigger.keys;
      if (!expected.length) continue;
      const variants = triggerInputVariants(player, action, expected, { mirrored });
      for (const variant of variants) {
        const finalKey = variant.keys[variant.keys.length - 1];
        if (!pressedKeys.has(finalKey)) continue;
        if (historyEndsWithSequence(runtime.history, variant.keys, trigger.maxGapMs)) {
          const finalCode = inputCodeForTriggerKey(finalKey);
          return triggerMatch(player, action, [finalCode], variant.facing, trigger, [finalCode]);
        }
      }
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

function findSingleMatch(player, actions, pressed, { state = null } = {}) {
  for (const mirrored of [false, true]) {
    for (const action of actions) {
      const trigger = action.trigger;
      if (trigger.type !== 'single') continue;
      if (state !== null && isStateCastAction(player, action) !== state) continue;
      const variants = triggerInputVariants(player, action, [trigger.keys[0]], { mirrored });
      for (const variant of variants) {
        const code = inputCodeForTriggerKey(variant.keys[0]);
        if (code && pressed.has(code))
          return triggerMatch(player, action, state ? [] : [code], variant.facing, trigger, [code]);
      }
    }
  }
  return null;
}

function canStartCustomAction(player) {
  return !player.dead && player.hurtTime <= 0 && player.guardBreakTime <= 0;
}

function startCustomAction(player, key, facing = null, triggerMode = 'tap', pressCodes = []) {
  player.runChargedAttack = false;
  startRunSkill(player, key);
  const duration = player.getActionDuration(key, 0.6);
  const requestedFacing = normalizedFacing(facing);
  player.beginCustomActionBlend?.(key, requestedFacing || player.facing);
  if (requestedFacing) player.facing = requestedFacing;
  player.customActionKey = key;
  player.customActionFacing = requestedFacing;
  player.customActionViewFacing = player.facing;
  player.customActionTriggerMode = triggerMode;
  player.customActionPressCodes = normalizePressCodes(pressCodes);
  player.customActionDuration = duration;
  player.customActionTime = duration;
  player.customActionElapsed = 0;
  player.runUpgradeAttackWindow = null;
  player.customActionMoveProgress = 0;
  player.customActionRepeatRelease = null;
  player.customActionTargetMove = null;
  player.attackSerial += 1;
  if (isRuntimeDebugEnabled()) {
    recordRuntimeDebugEvent('action-start', {
      actionKey: key,
      triggerMode,
      facing: player.facing,
      started: player.customActionKey === key,
    });
  }
}

function updateActivePressAction(player, keys) {
  const pressCodes = normalizePressCodes(player.customActionPressCodes);
  if (!player.isCustomActionActive || !pressCodes.length) return;
  if (pressCodes.every((code) => keys.has(code))) return;
  const cast = currentCastFormula(player);
  if (cast?.releaseMode === 'finish') {
    if (cast.mode === 'repeat') {
      player.customActionRepeatRelease = createRepeatReleaseState(player, cast);
      player.customActionPressCodes = null;
      return;
    }
    player.customActionPressCodes = null;
    if (player.customActionTriggerMode === 'pressLoop') player.customActionTriggerMode = 'tap';
    return;
  }
  stopCustomAction(player);
}

function stopCustomAction(player, source = null) {
  const fallbackActionKey = player.resolveFallbackActionKey?.() || 'idle';
  player.fallbackActionKey = fallbackActionKey;
  player.beginCustomActionBlend?.(fallbackActionKey, player.customActionFacing || player.facing, source);
  player.customActionKey = null;
  player.customActionFacing = null;
  player.customActionViewFacing = null;
  player.customActionTriggerMode = 'tap';
  player.customActionPressCodes = null;
  player.customActionDuration = 0;
  player.customActionTime = 0;
  player.customActionElapsed = 0;
  player.customActionMoveProgress = 0;
  player.customActionRepeatRelease = null;
  player.customActionTargetMove = null;
  player.velocityControl = null;
  if (isRuntimeDebugEnabled()) {
    recordRuntimeDebugEvent('action-stop', {
      fallbackActionKey,
    });
  }
}

function recordTriggerFailure(player, label, reason, pressed) {
  if (!isRuntimeDebugEnabled()) return;
  if (!pressed?.size) return;
  recordRuntimeDebugEvent(label === 'Trigger 실패' ? 'trigger-failed' : 'action-start-failed', {
    actionKey: player.actionKey,
    reason,
    pressed: [...pressed].join(' + '),
  });
}

function recordActionStartFailure(player, match, reason) {
  if (!isRuntimeDebugEnabled()) return;
  recordRuntimeDebugEvent('action-start-failed', {
    actionKey: match?.action?.key || player.actionKey,
    currentActionKey: player.actionKey,
    triggerMode: match?.triggerMode || 'tap',
    reason,
  });
}

function canInterruptCurrentAction(player, nextAction) {
  if (!player.isCustomActionActive) return true;
  if (!nextAction?.key) return false;

  const currentSettings = actionRuntimeSettings(player, player.customActionKey);
  if (!canCancelCurrentActionAtFrame(player, currentSettings)) return false;
  if (nextAction.key === player.customActionKey) return true;

  return actionInterruptPriority(player, nextAction.key) >= actionInterruptPriority(player, player.customActionKey);
}

function canCancelCurrentActionAtFrame(player, settings) {
  const action = currentCustomAction(player);
  const frameCount = actionFrameCount(player, action);
  if (!actionFormulaActiveAtProgress(settings, 'cancel', player.getActionFrameProgress?.() || 0, frameCount))
    return false;
  return true;
}

function normalizedFacing(facing) {
  if (facing === -1 || facing === 1) return facing;
  return null;
}

function canRunActionCondition(player, key) {
  if (!canUseRunSkill(player, key)) return false;
  const condition = normalizeActionCondition(actionRuntimeSettings(player, key).condition);
  if (condition === 'ground') return player.onGround === true;
  if (condition === 'air') return player.onGround === false;
  return true;
}

function actionLinkResult(player, key) {
  const settings = actionRuntimeSettings(player, key);
  const linkRule = actionFormula(settings, 'link');
  if (!linkRule?.enabled) return { allowed: true, linked: false };
  const fromActions = Array.isArray(linkRule.fromActions) ? linkRule.fromActions.filter(Boolean) : [];
  if (!fromActions.length) return { allowed: false, linked: true, reason: '연계 대상 Action이 없음' };

  const sourceActionKey = currentRuntimeActionKey(player);
  if (!fromActions.includes(sourceActionKey)) {
    return { allowed: false, linked: true, reason: `현재 Action(${sourceActionKey})은 연계 대상이 아님` };
  }

  const sourceAction = runtimeActions(player).find((action) => action?.key === sourceActionKey);
  const frameCount = actionFrameCount(player, sourceAction);
  const frame = actionFormulaFrameFromProgress(player.getActionFrameProgress?.() || 0, frameCount);
  const start = formulaFrameBoundary(linkRule.startFrame, frameCount, 1);
  const end = formulaFrameBoundary(linkRule.endFrame, frameCount, frameCount);
  const minFrame = Math.min(start, end);
  const maxFrame = Math.max(start, end);
  if (frame < minFrame || frame > maxFrame) {
    return {
      allowed: false,
      linked: true,
      reason: `연계 입력 구간 아님(${frame}f, 허용 ${minFrame}~${maxFrame}f)`,
    };
  }
  return { allowed: true, linked: true };
}

function actionCooldownResult(player, key, nowMs) {
  const cooldown = actionFormula(actionRuntimeSettings(player, key), 'cooldown');
  const seconds = Number(cooldown?.seconds || 0);
  if (!cooldown?.enabled || seconds <= 0) return { allowed: true };
  const runtime = ensureActionTriggerRuntime(player);
  const untilMs = Number(runtime.cooldowns?.[key] || 0);
  if (nowMs >= untilMs) return { allowed: true };
  const remaining = Math.max(0, (untilMs - nowMs) / 1000);
  return { allowed: false, reason: `쿨타임 대기 중(${remaining.toFixed(1)}초)` };
}

function startActionCooldown(player, key, nowMs) {
  const cooldown = actionFormula(actionRuntimeSettings(player, key), 'cooldown');
  const seconds = Math.max(0, Number(cooldown?.seconds || 0));
  if (!cooldown?.enabled || seconds <= 0) return;
  const runtime = ensureActionTriggerRuntime(player);
  runtime.cooldowns[key] = nowMs + seconds * 1000;
}

function runtimeNowMs(player) {
  const runtime = ensureActionTriggerRuntime(player);
  return Math.max(Number(runtime.nowMs || 0), Number(player.animTime || 0) * 1000);
}

function currentRuntimeActionKey(player) {
  return player.customActionKey || player.actionKey || 'idle';
}

function triggerInputVariants(player, action, keys, { mirrored = false } = {}) {
  const sourceKeys = keys.filter(Boolean);
  if (!mirrored) return [{ keys: sourceKeys, facing: horizontalFacingForKeys(sourceKeys) }];

  if (!isActionMirrorEnabled(actionRuntimeSettings(player, action.key))) return [];
  const mirroredKeys = sourceKeys.map((key) => MIRRORED_TRIGGER_KEY[key] || key);
  if (mirroredKeys.every((key, index) => key === sourceKeys[index])) return [];
  return [{ keys: mirroredKeys, facing: horizontalFacingForKeys(mirroredKeys) }];
}

function horizontalFacingForKeys(keys) {
  const horizontalKey = [...keys].reverse().find((key) => key === 'ArrowLeft' || key === 'ArrowRight');
  if (horizontalKey === 'ArrowLeft') return -1;
  if (horizontalKey === 'ArrowRight') return 1;
  return null;
}

function triggerMatch(player, action, consumedCodes, facing, trigger, pressCodes = []) {
  const triggerMode = actionCastTriggerMode(player, action.key, trigger.triggerMode || 'tap');
  return {
    action,
    consumedCodes,
    facing,
    triggerMode,
    pressCodes: triggerMode === 'tap' ? [] : normalizePressCodes(pressCodes),
  };
}

function createRepeatReleaseState(player, cast) {
  const action = currentCustomAction(player);
  const frameCount = actionFrameCount(player, action);
  const progress = clamp01(Number(player.getActionFrameProgress?.() || 0));
  const frame = actionFormulaFrameFromProgress(progress, frameCount);
  const targetFrame = formulaFrameBoundary(cast.repeatEndFrame, frameCount, frameCount);
  const distance = Math.max(1, Math.abs(targetFrame - frame) + 1);
  const duration = Math.max(
    ACTION_TIME_EPSILON,
    (distance / Math.max(1, frameCount)) * Math.max(0.01, Number(player.customActionDuration || 0.6))
  );
  return {
    elapsed: 0,
    duration,
    startProgress: progress,
    endProgress: clamp01((targetFrame - 1) / Math.max(1, frameCount)),
  };
}

function normalizePressCodes(codes) {
  return Array.isArray(codes) ? [...new Set(codes.filter(Boolean))] : [];
}

function hasPressCondition(player) {
  return normalizePressCodes(player.customActionPressCodes).length > 0;
}

function isPressLoopAction(player) {
  return player.customActionTriggerMode === 'pressLoop' && hasPressCondition(player);
}

function currentCastFormula(player) {
  if (!player?.customActionKey) return null;
  return actionFormula(actionRuntimeSettings(player, player.customActionKey), 'cast');
}

function actionCastTriggerMode(player, actionKey, legacyMode = 'tap') {
  const mode = actionCastMode(player, actionKey, legacyMode);
  if (mode === 'press') return 'press';
  if (mode === 'repeat') return 'pressLoop';
  return 'tap';
}

function actionCastMode(player, actionKey, legacyMode = 'tap') {
  const settings = actionRuntimeSettings(player, actionKey);
  const cast = actionFormula(settings, 'cast');
  if (cast?.enabled) return cast.mode === 'press' || cast.mode === 'repeat' ? cast.mode : 'tap';
  if (Array.isArray(settings.formulas)) return 'tap';
  if (legacyMode === 'press') return 'press';
  if (legacyMode === 'pressLoop') return 'repeat';
  return 'tap';
}

function isStateCastAction(player, action) {
  const mode = actionCastMode(player, action.key, action.trigger?.triggerMode || 'tap');
  return mode === 'press' || mode === 'repeat';
}

function actionInterruptPriority(player, key) {
  const settings = actionRuntimeSettings(player, key);
  const cancelRule = actionFormula(settings, 'cancel');
  const value = Number(cancelRule?.priority ?? settings.interruptPriority ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function inputCodeForTriggerKey(key) {
  return TRIGGER_TO_INPUT_CODE[key] || '';
}
