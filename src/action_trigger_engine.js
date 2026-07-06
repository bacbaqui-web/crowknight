import { normalizeActionTrigger } from './action_trigger_data.js';
import { timelineFrameCount, timelinePlaybackProgress } from './timeline_playback_helper.js';
import { actionMoveMirrorSign, isActionMirrorEnabled } from './action_mirror_helper.js';
import { normalizeActionCondition } from './action_condition_helper.js';

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
  recordPressedInputs(runtime, pressed);
  trimInputHistory(runtime);
  updateActivePressAction(player, keys);

  if (!canStartCustomAction(player)) return new Set();

  const match = findMatchingCustomAction(player, runtime, keys, pressed);
  if (!match) return new Set();
  if (!canRunActionCondition(player, match.action.key)) return new Set();
  if (!canInterruptCurrentAction(player, match.action, match.facing)) return new Set();

  startCustomAction(player, match.action.key, match.facing, match.triggerMode, match.pressCodes);
  return new Set(match.consumedCodes);
}

export function advanceCustomActionRuntime(player, dt) {
  if (player.customActionBlend) {
    player.advanceCustomActionBlendFrame?.(dt);
    return;
  }
  if (!player.customActionKey || player.customActionTime <= 0) return;
  applyCustomActionMoveModifier(player, dt);
  applyCustomActionVelocityModifier(player, dt);
  player.customActionElapsed = Math.max(0, Number(player.customActionElapsed || 0) + Math.max(0, Number(dt || 0)));

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
  const actions = customActionsByTriggerPriority(runtimeActions(player));
  return (
    findHoldComboMatch(player, actions, keys, pressed) ||
    findSequenceMatch(player, actions, runtime, pressed) ||
    findSingleMatch(player, actions, pressed)
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
  player.customActionTriggerMode = triggerMode;
  player.customActionPressCodes = normalizePressCodes(pressCodes);
  player.customActionDuration = duration;
  player.customActionTime = duration;
  player.customActionElapsed = 0;
  player.customActionMoveProgress = 0;
  player.attackSerial += 1;
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
  player.customActionTriggerMode = 'tap';
  player.customActionPressCodes = null;
  player.customActionDuration = 0;
  player.customActionTime = 0;
  player.customActionElapsed = 0;
  player.customActionMoveProgress = 0;
  player.velocityControl = null;
}

function canInterruptCurrentAction(player, nextAction, requestedFacing = null) {
  if (!player.isCustomActionActive) return true;
  if (!nextAction?.key) return false;

  const currentSettings = actionRuntimeSettings(player, player.customActionKey);
  if (currentSettings.interruptible === false) return false;
  if (nextAction.key === player.customActionKey) return isRequestedFacingChange(player, requestedFacing);

  return actionInterruptPriority(player, nextAction.key) >= actionInterruptPriority(player, player.customActionKey);
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
  const value = Number(actionRuntimeSettings(player, key).interruptPriority || 0);
  return Number.isFinite(value) ? value : 0;
}

function applyCustomActionMoveModifier(player, dt) {
  const action = currentCustomAction(player);
  const move = enabledModifier(action, 'move');
  if (!move) return;

  const duration = Math.max(0.01, Number(player.customActionDuration || player.getActionDuration(action.key, 0.6)));
  const previousRawProgress = Math.max(0, Number(player.customActionElapsed || 0)) / duration;
  const nextRawProgress = previousRawProgress + Math.max(0, Number(dt || 0)) / duration;
  const playback = effectiveCustomActionPlayback(player, action);
  const nextProgress = timelinePlaybackProgress(nextRawProgress, playback);
  const frameCount = actionFrameCount(player, action);
  const deltaRatio = framedMoveDeltaRatio(previousRawProgress, nextRawProgress, playback, action, move, frameCount);
  const settings = actionRuntimeSettings(player, action.key);
  const sourceMoveX = Number(move.settings?.x || 0);
  const deltaX = sourceMoveX * actionMoveMirrorSign(settings, player.facing) * deltaRatio;
  const deltaY = Number(move.settings?.y || 0) * deltaRatio;

  if (!isActionMirrorEnabled(settings) && Math.abs(sourceMoveX) > 0.001) player.facing = Math.sign(sourceMoveX);
  player.x += deltaX;
  player.y += deltaY;
  if (deltaY < 0) player.onGround = false;
  player.customActionMoveProgress = nextProgress;
}

function applyCustomActionVelocityModifier(player, dt) {
  const action = currentCustomAction(player);
  const velocity = enabledModifier(action, 'velocity');
  if (!velocity) return;

  const duration = Math.max(0.01, Number(player.customActionDuration || player.getActionDuration(action.key, 0.6)));
  const previousRawProgress = Math.max(0, Number(player.customActionElapsed || 0)) / duration;
  const nextRawProgress = previousRawProgress + Math.max(0, Number(dt || 0)) / duration;
  const playback = effectiveCustomActionPlayback(player, action);
  const frameCount = actionFrameCount(player, action);
  const frameDelta = velocityFrameDelta(previousRawProgress, nextRawProgress, playback, velocity, frameCount);
  if (Math.abs(frameDelta) <= 0.000001) return;

  const settings = actionRuntimeSettings(player, action.key);
  const mirrorSign = actionMoveMirrorSign(settings, player.facing);
  const x = Number(velocity.settings?.x || 0) * mirrorSign;
  const y = Number(velocity.settings?.y || 0);
  const mode = velocity.settings?.mode === 'add' ? 'add' : 'set';
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

function modifierFrameBoundary(value, frameCount, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(frameCount, Math.max(1, Math.round(number)));
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
  const start = modifierFrameBoundary(velocity.settings?.startFrame, frameCount, 1);
  const end = modifierFrameBoundary(velocity.settings?.endFrame, frameCount, frameCount);
  const minFrame = Math.min(start, end);
  const maxFrame = Math.max(start, end);
  const frameProgress = clamp01(progress) * frameCount;
  return Math.min(Math.max(0, frameProgress - (minFrame - 1)), maxFrame - minFrame + 1);
}

function velocityRangeFrameCount(velocity, frameCount) {
  const start = modifierFrameBoundary(velocity.settings?.startFrame, frameCount, 1);
  const end = modifierFrameBoundary(velocity.settings?.endFrame, frameCount, frameCount);
  return Math.abs(end - start) + 1;
}

function framedMoveDeltaRatio(previousRaw, nextRaw, playback, action, move, frameCount) {
  if (playback === 'loop') return framedLoopMoveDeltaRatio(previousRaw, nextRaw, action, move, frameCount);
  const previousMove = framedMoveRatio(timelinePlaybackProgress(previousRaw, playback), action, move, frameCount);
  const nextMove = framedMoveRatio(timelinePlaybackProgress(nextRaw, playback), action, move, frameCount);
  return nextMove - previousMove;
}

function framedLoopMoveDeltaRatio(previousRaw, nextRaw, action, move, frameCount) {
  if (nextRaw <= previousRaw) return 0;
  const ratioAt = (progress, loopIndex) =>
    framedMoveRatio(progress, action, move, frameCount, { useRamps: loopIndex === 0 });
  const previousLoop = Math.floor(previousRaw);
  const nextLoop = Math.floor(nextRaw);
  const previousProgress = previousRaw - previousLoop;
  const nextProgress = nextRaw - nextLoop;

  if (previousLoop === nextLoop) return ratioAt(nextProgress, previousLoop) - ratioAt(previousProgress, previousLoop);

  const middleLoops = Math.max(0, nextLoop - previousLoop - 1);
  const previousLoopEnd = ratioAt(1, previousLoop) - ratioAt(previousProgress, previousLoop);
  const fullMiddleMove = middleLoops * ratioAt(1, 1);
  return previousLoopEnd + fullMiddleMove + ratioAt(nextProgress, nextLoop);
}

function framedMoveRatio(progress, action, move, frameCount, { useRamps = true } = {}) {
  const moveFrames = moveFrameCount(move, frameCount);
  const moveWeights = moveFrameWeights(moveFrames, action, { useRamps });
  const moveTotal = moveWeights.reduce((sum, weight) => sum + weight, 0);
  if (moveTotal <= 0) return 0;

  const frameProgress = clamp01(progress) * frameCount;
  const moveCompletedWeight = completedFrameWeight(moveWeights, Math.min(frameProgress, moveFrames));
  return clamp01(moveCompletedWeight / moveTotal);
}

function completedFrameWeight(weights, frameProgress) {
  const clampedProgress = Math.min(weights.length, Math.max(0, Number(frameProgress || 0)));
  const fullFrameCount = Math.floor(clampedProgress);
  const partialFrame = clampedProgress - fullFrameCount;
  return weights
    .slice(0, fullFrameCount)
    .reduce((sum, weight) => sum + weight, partialFrame * (weights[fullFrameCount] || 0));
}

function moveFrameCount(move, actionFrameCountValue) {
  return modifierFrameCount(move, actionFrameCountValue, actionFrameCountValue, 1);
}

function moveFrameWeights(moveFrames, action, { useRamps = true } = {}) {
  const accelerate = enabledModifier(action, 'accelerate');
  const decelerate = enabledModifier(action, 'decelerate');
  const count = Math.max(1, Math.round(Number(moveFrames || 1)));
  return Array.from({ length: count }, (_, index) => {
    const frame = index + 1;
    const accelerationWeight = useRamps ? rangedModifierRampWeight(accelerate, frame, count, 'forward') : 1;
    const decelerationWeight = useRamps ? rangedModifierRampWeight(decelerate, frame, count, 'backward') : 1;
    return accelerationWeight * decelerationWeight;
  });
}

function rangedModifierRampWeight(modifier, frame, frameCount, direction) {
  if (!modifier) return 1;
  const start = modifierFrameBoundary(modifier.settings?.startFrame, frameCount, 1);
  const end = modifierFrameBoundary(
    modifier.settings?.endFrame ?? modifier.settings?.frames ?? modifier.settings?.strength,
    frameCount,
    0
  );
  const minFrame = Math.min(start, end);
  const maxFrame = Math.max(start, end);
  if (frame < minFrame || frame > maxFrame) return 1;
  const rangeFrames = Math.max(1, maxFrame - minFrame + 1);
  const localFrame = direction === 'backward' ? maxFrame - frame + 1 : frame - minFrame + 1;
  return modifierRampWeight(localFrame, rangeFrames, modifier.settings?.graph);
}

function modifierRampWeight(frame, frames, graph) {
  if (!frames || frames <= 0) return 1;
  const t = clamp01(frame / frames);
  if (graph === 'easeIn') return t * t;
  if (graph === 'easeOut') return 1 - (1 - t) * (1 - t);
  return t;
}

function modifierFrameCount(modifier, frameCount, fallback = 0, minimum = 0) {
  if (!modifier) return 0;
  const value = Number(modifier.settings?.frames ?? modifier.settings?.strength ?? fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(frameCount, Math.max(minimum, Math.round(value)));
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
