import { normalizeActionTrigger } from './action_trigger_data.js';
import { timelineFrameCount, timelinePlaybackProgress } from './timeline_playback_helper.js';
import { actionMoveMirrorSign, isActionMirrorEnabled } from './action_mirror_helper.js';
import { normalizeActionCondition } from './action_condition_helper.js';
import { isRuntimeDebugEnabled, recordRuntimeDebugEvent } from './runtime_debug_state.js';
import {
  actionFormula,
  actionFormulaActiveAtProgress,
  actionFormulaFrameFromProgress,
  formulaFrameBoundary,
} from './formula_runtime_engine.js';

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
  if (!canInterruptCurrentAction(player, match.action, match.facing)) {
    recordActionStartFailure(player, match, '현재 Action을 취소할 수 없음');
    return new Set();
  }

  startCustomAction(player, match.action.key, match.facing, match.triggerMode, match.pressCodes);
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
  applyCustomActionVelocityModifier(player, dt);
  player.customActionElapsed = Math.max(0, Number(player.customActionElapsed || 0) + Math.max(0, Number(dt || 0)));
  applyCustomActionViewLock(player);

  if (isPressLoopAction(player)) {
    const duration = Math.max(0.01, Number(player.customActionDuration || 0.6));
    player.customActionTime = Math.max(ACTION_TIME_EPSILON, duration - Math.min(duration, player.customActionElapsed));
    return;
  }

  player.customActionTime = Math.max(0, player.customActionTime - dt);
  if (player.customActionTime <= ACTION_TIME_EPSILON) {
    stopCustomAction(player);
  }
}

function applyCustomActionViewLock(player) {
  const action = currentCustomAction(player);
  if (!action) return;
  const settings = actionRuntimeSettings(player, action.key);
  const frameCount = actionFrameCount(player, action);
  if (!actionFormulaActiveAtProgress(settings, 'lock', player.getActionFrameProgress?.() || 0, frameCount)) return;
  const lockedFacing = normalizedFacing(player.customActionViewFacing);
  if (lockedFacing) player.facing = lockedFacing;
}

export function requestRuntimeAction(player, key, facing = null, triggerMode = 'tap') {
  if (!runtimeActions(player).some((action) => action?.key === key)) return false;
  if (!canRunActionCondition(player, key)) return false;
  if (!actionLinkResult(player, key).allowed) return false;
  startCustomAction(player, key, facing, triggerMode, []);
  return true;
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
  const actions = customActionsByTriggerPriority(player, runtimeActions(player));
  return (
    findHoldComboMatch(player, actions, keys, pressed) ||
    findSequenceMatch(player, actions, runtime, pressed) ||
    findSingleMatch(player, actions, pressed)
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

function findHoldComboMatch(player, actions, keys, pressed) {
  for (const mirrored of [false, true]) {
    for (const action of actions) {
      const trigger = action.trigger;
      if (trigger.type !== 'holdCombo') continue;
      const variants = triggerInputVariants(player, action, [trigger.hold, trigger.press], { mirrored });
      for (const variant of variants) {
        const holdCode = inputCodeForTriggerKey(variant.keys[0]);
        const pressCode = inputCodeForTriggerKey(variant.keys[1]);
        if (!holdCode || !pressCode) continue;
        if (keys.has(holdCode) && pressed.has(pressCode)) {
          return triggerMatch(action, [pressCode], variant.facing, trigger, [holdCode, pressCode]);
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
          return triggerMatch(action, [finalCode], variant.facing, trigger, [finalCode]);
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

function findSingleMatch(player, actions, pressed) {
  for (const mirrored of [false, true]) {
    for (const action of actions) {
      const trigger = action.trigger;
      if (trigger.type !== 'single') continue;
      const variants = triggerInputVariants(player, action, [trigger.keys[0]], { mirrored });
      for (const variant of variants) {
        const code = inputCodeForTriggerKey(variant.keys[0]);
        if (code && pressed.has(code)) return triggerMatch(action, [code], variant.facing, trigger, [code]);
      }
    }
  }
  return null;
}

function canStartCustomAction(player) {
  return !player.dead && player.hurtTime <= 0 && player.guardBreakTime <= 0;
}

function startCustomAction(player, key, facing = null, triggerMode = 'tap', pressCodes = []) {
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
  player.customActionMoveProgress = 0;
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
  stopCustomAction(player);
}

function stopCustomAction(player) {
  const fallbackActionKey = player.resolveFallbackActionKey?.() || 'idle';
  player.fallbackActionKey = fallbackActionKey;
  player.beginCustomActionBlend?.(fallbackActionKey, player.customActionFacing || player.facing);
  player.customActionKey = null;
  player.customActionFacing = null;
  player.customActionViewFacing = null;
  player.customActionTriggerMode = 'tap';
  player.customActionPressCodes = null;
  player.customActionDuration = 0;
  player.customActionTime = 0;
  player.customActionElapsed = 0;
  player.customActionMoveProgress = 0;
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

function canInterruptCurrentAction(player, nextAction, requestedFacing = null) {
  if (!player.isCustomActionActive) return true;
  if (!nextAction?.key) return false;

  const currentSettings = actionRuntimeSettings(player, player.customActionKey);
  if (!canCancelCurrentActionAtFrame(player, currentSettings)) return false;
  if (nextAction.key === player.customActionKey) return isRequestedFacingChange(player, requestedFacing);

  return actionInterruptPriority(player, nextAction.key) >= actionInterruptPriority(player, player.customActionKey);
}

function canCancelCurrentActionAtFrame(player, settings) {
  const action = currentCustomAction(player);
  const frameCount = actionFrameCount(player, action);
  if (!actionFormulaActiveAtProgress(settings, 'cancel', player.getActionFrameProgress?.() || 0, frameCount))
    return false;
  return true;
}

function isRequestedFacingChange(player, requestedFacing) {
  const nextFacing = normalizedFacing(requestedFacing);
  if (!nextFacing) return false;
  const currentFacing = normalizedFacing(player.customActionFacing) || normalizedFacing(player.facing);
  return Boolean(currentFacing && currentFacing !== nextFacing);
}

function normalizedFacing(facing) {
  if (facing === -1 || facing === 1) return facing;
  return null;
}

function actionRuntimeSettings(player, key) {
  return player.actionSettings?.[key] || {};
}

function canRunActionCondition(player, key) {
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

function triggerMatch(action, consumedCodes, facing, trigger, pressCodes = []) {
  const triggerMode = trigger.triggerMode || 'tap';
  return {
    action,
    consumedCodes,
    facing,
    triggerMode,
    pressCodes: triggerMode === 'tap' ? [] : normalizePressCodes(pressCodes),
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

function actionInterruptPriority(player, key) {
  const settings = actionRuntimeSettings(player, key);
  const cancelRule = actionFormula(settings, 'cancel');
  const value = Number(cancelRule?.priority ?? settings.interruptPriority ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function applyCustomActionVelocityModifier(player, dt) {
  const action = currentCustomAction(player);
  const settings = actionRuntimeSettings(player, action?.key);
  const velocity = actionFormula(settings, 'velocity');
  if (!velocity) return;

  const duration = Math.max(0.01, Number(player.customActionDuration || player.getActionDuration(action.key, 0.6)));
  const previousRawProgress = Math.max(0, Number(player.customActionElapsed || 0)) / duration;
  const nextRawProgress = previousRawProgress + Math.max(0, Number(dt || 0)) / duration;
  const playback = effectiveCustomActionPlayback(player, action);
  const frameCount = actionFrameCount(player, action);
  const frameDelta = velocityFrameDelta(previousRawProgress, nextRawProgress, playback, velocity, frameCount);
  if (Math.abs(frameDelta) <= 0.000001) return;

  const mirrorSign = actionMoveMirrorSign(settings, player.facing);
  const x = Number(velocity.x || 0) * mirrorSign;
  const y = Number(velocity.y || 0);
  const mode = velocity.mode === 'add' ? 'add' : 'set';
  if (mode === 'add') {
    player.vx = Number(player.vx || 0) + x * frameDelta;
    player.vy = Number(player.vy || 0) + y * frameDelta;
  } else {
    player.vx = x;
    player.vy = y;
  }
  player.velocityControl = {
    x: Math.abs(x) > 0.0001,
    y: Math.abs(y) > 0.0001,
  };
  if (y < 0) player.onGround = false;
}

function effectiveCustomActionPlayback(player, action) {
  if (player.customActionTriggerMode !== 'pressLoop') return 'once';
  return actionRuntimeSettings(player, action.key).playback;
}

function velocityFrameDelta(previousRaw, nextRaw, playback, velocity, frameCount) {
  if (playback === 'loop') return loopVelocityFrameDelta(previousRaw, nextRaw, velocity, frameCount);
  const previous = velocityRangeProgress(timelinePlaybackProgress(previousRaw, playback), velocity, frameCount);
  const next = velocityRangeProgress(timelinePlaybackProgress(nextRaw, playback), velocity, frameCount);
  return next - previous;
}

function loopVelocityFrameDelta(previousRaw, nextRaw, velocity, frameCount) {
  if (nextRaw <= previousRaw) return 0;
  const previousLoop = Math.floor(previousRaw);
  const nextLoop = Math.floor(nextRaw);
  const previousProgress = previousRaw - previousLoop;
  const nextProgress = nextRaw - nextLoop;
  const rangeFrames = velocityRangeFrameCount(velocity, frameCount);

  if (previousLoop === nextLoop) {
    return (
      velocityRangeProgress(nextProgress, velocity, frameCount) -
      velocityRangeProgress(previousProgress, velocity, frameCount)
    );
  }

  const previousLoopEnd = rangeFrames - velocityRangeProgress(previousProgress, velocity, frameCount);
  const middleLoops = Math.max(0, nextLoop - previousLoop - 1) * rangeFrames;
  return previousLoopEnd + middleLoops + velocityRangeProgress(nextProgress, velocity, frameCount);
}

function velocityRangeProgress(progress, velocity, frameCount) {
  const start = formulaFrameBoundary(velocity.startFrame, frameCount, 1);
  const end = formulaFrameBoundary(velocity.endFrame, frameCount, frameCount);
  const minFrame = Math.min(start, end);
  const maxFrame = Math.max(start, end);
  const frameProgress = clamp01(progress) * frameCount;
  return Math.min(Math.max(0, frameProgress - (minFrame - 1)), maxFrame - minFrame + 1);
}

function velocityRangeFrameCount(velocity, frameCount) {
  const start = formulaFrameBoundary(velocity.startFrame, frameCount, 1);
  const end = formulaFrameBoundary(velocity.endFrame, frameCount, frameCount);
  return Math.abs(end - start) + 1;
}

function actionFrameCount(player, action) {
  return timelineFrameCount(player.actionSettings?.[action?.key] || action?.timeline?.settings || {});
}

function currentCustomAction(player) {
  return runtimeActions(player).find((action) => action?.key === player.customActionKey) || null;
}

function runtimeActions(player) {
  return (player.actions || player.customActions || []).map((action) => ({
    ...action,
    modifiers: liveActionModifiers(player, action),
  }));
}

function liveActionModifiers(player, action) {
  return player.modifiers?.action?.[action?.key] || action?.modifiers || [];
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function inputCodeForTriggerKey(key) {
  return TRIGGER_TO_INPUT_CODE[key] || '';
}
