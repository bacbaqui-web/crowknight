import { upgradeVelocity } from './run_upgrade_effect_helper.js';
import { timelineFrameCount, timelineFrameDelta, timelinePlaybackProgress } from './timeline_playback_helper.js';
import { actionMoveMirrorSign } from './action_mirror_helper.js';
import { actionFormula, actionFormulaFrameFromProgress, formulaFrameBoundary } from './formula_runtime_engine.js';
import { actionRuntimeSettings, currentCustomAction } from './action_runtime_data_helper.js';
export function applyCustomActionVelocityModifier(player, dt) {
  const action = currentCustomAction(player);
  const settings = actionRuntimeSettings(player, action?.key);
  const velocity = actionFormula(settings, 'velocity');
  if (!velocity) return;

  const duration = Math.max(0.01, Number(player.customActionDuration || player.getActionDuration(action.key, 0.6)));
  const previousRawProgress = Math.max(0, Number(player.customActionElapsed || 0)) / duration;
  const nextRawProgress = previousRawProgress + Math.max(0, Number(dt || 0)) / duration;
  const playback = effectiveCustomActionPlayback(player, action);
  const frameCount = actionFrameCount(player, action);
  const rawFrameDelta = velocityFrameDelta(previousRawProgress, nextRawProgress, playback, velocity, frameCount, {
    curve: 'linear',
  });
  const frameDelta = velocityFrameDelta(previousRawProgress, nextRawProgress, playback, velocity, frameCount);
  if (Math.abs(frameDelta) <= 0.000001) return;

  const mirrorSign = actionMoveMirrorSign(settings, player.facing);
  const curveRate = Math.abs(rawFrameDelta) > 0.000001 ? frameDelta / rawFrameDelta : 0;
  const base = upgradeVelocity(player, settings, Number(velocity.x || 0), Number(velocity.y || 0));
  const x = base.x * mirrorSign * curveRate;
  const y = base.y * curveRate;
  const mode = velocity.mode === 'add' ? 'add' : 'set';
  if (mode === 'add') {
    player.vx = Number(player.vx || 0) + base.x * mirrorSign * frameDelta;
    player.vy = Number(player.vy || 0) + base.y * frameDelta;
  } else {
    const preserveVx = player.velocityControl?.x === true;
    const preserveVy = player.velocityControl?.y === true;
    if (!preserveVx) player.vx = x;
    if (!preserveVy) player.vy = y;
  }
  player.velocityControl = {
    x: player.velocityControl?.x === true || Math.abs(x) > 0.0001,
    y: player.velocityControl?.y === true || Math.abs(y) > 0.0001,
  };
  if (y < 0) player.onGround = false;
}

export function applyCustomActionTargetMove(player, dt) {
  const action = currentCustomAction(player);
  if (!action) return;
  const settings = actionRuntimeSettings(player, action.key);
  const targetMove = actionFormula(settings, 'targetMove');
  if (!targetMove?.enabled) {
    player.customActionTargetMove = null;
    return;
  }

  const frameCount = actionFrameCount(player, action);
  const state = ensureTargetMoveRuntimeState(player, action.key, targetMove, settings);
  if (!state.started && targetMoveTriggerReached(player, targetMove, frameCount, dt)) {
    startTargetMove(player, state, targetMove, settings);
  }
  if (!state.active) return;
  advanceTargetMove(player, state, dt);
}

function ensureTargetMoveRuntimeState(player, actionKey, targetMove, settings) {
  const signature = [
    actionKey,
    targetMove.triggerFrame,
    targetMove.x,
    targetMove.y,
    targetMove.moveFrames,
    actionMoveMirrorSign(settings, player.customActionFacing || player.facing),
  ].join(':');
  if (player.customActionTargetMove?.signature !== signature) {
    player.customActionTargetMove = {
      signature,
      actionKey,
      active: false,
      started: false,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0,
      elapsedFrames: 0,
      moveFrames: 1,
    };
  }
  return player.customActionTargetMove;
}

function targetMoveTriggerReached(player, targetMove, frameCount, dt) {
  const triggerFrame = formulaFrameBoundary(targetMove.triggerFrame, frameCount, 1);
  const duration = Math.max(0.01, Number(player.customActionDuration || 0.6));
  const previousProgress = Math.max(0, Number(player.customActionElapsed || 0)) / duration;
  const nextProgress = previousProgress + Math.max(0, Number(dt || 0)) / duration;
  const previousFrame = actionFormulaFrameFromProgress(previousProgress, frameCount);
  const nextFrame = actionFormulaFrameFromProgress(nextProgress, frameCount);
  return triggerFrame >= Math.min(previousFrame, nextFrame) && triggerFrame <= Math.max(previousFrame, nextFrame);
}

function startTargetMove(player, state, targetMove, settings) {
  const mirrorSign = actionMoveMirrorSign(settings, player.customActionFacing || player.facing);
  const shadowX = Number(player.x || 0);
  const shadowY = Number.isFinite(player.floorY) ? Number(player.floorY) : Number(player.y || 0);
  state.startX = Number(player.x || 0);
  state.startY = Number(player.y || 0);
  const move = { x: Number(targetMove.x || 0), y: Number(targetMove.y || 0) };
  if (settings.group === 'movement' && move.y < 0) move.y *= player.runUpgrades?.jump || 1;
  state.targetX = shadowX + move.x * mirrorSign;
  state.targetY = shadowY + move.y;
  state.elapsedFrames = 0;
  state.moveFrames =
    normalizeTargetMoveFrames(targetMove.moveFrames) /
    (settings.group === 'movement' ? player.runUpgrades?.speed || 1 : 1);
  state.active = true;
  state.started = true;
}

function advanceTargetMove(player, state, dt) {
  const startX = Number(state.startX || 0);
  const startY = Number(state.startY || 0);
  const targetX = Number(state.targetX || 0);
  const targetY = Number(state.targetY || 0);
  const dy = targetY - startY;
  player.vx = 0;
  player.vy = 0;
  player.velocityControl = { x: true, y: true };
  const moveFrames = Math.max(0, Number(state.moveFrames || 0));
  if (moveFrames <= 0) {
    player.x = targetX;
    player.y = targetY;
    state.active = false;
    if (dy < 0) player.onGround = false;
    return;
  }

  state.elapsedFrames = Math.max(0, Number(state.elapsedFrames || 0) + timelineFrameDelta(dt));
  const t = clamp01(state.elapsedFrames / moveFrames);
  player.x = startX + (targetX - startX) * t;
  player.y = startY + (targetY - startY) * t;
  if (t >= 1) state.active = false;
  if (dy < 0) player.onGround = false;
}

function normalizeTargetMoveFrames(value) {
  const number = Math.round(Number(value ?? 1));
  if (!Number.isFinite(number)) return 1;
  return Math.min(10, Math.max(0, number));
}

function effectiveCustomActionPlayback(player, action) {
  if (player.customActionTriggerMode !== 'pressLoop') return 'once';
  return actionRuntimeSettings(player, action.key).playback;
}

function velocityFrameDelta(previousRaw, nextRaw, playback, velocity, frameCount, options = {}) {
  const curve = options.curve || velocity.curve || 'linear';
  if (playback === 'loop') return loopVelocityFrameDelta(previousRaw, nextRaw, velocity, frameCount, curve);
  const previous = velocityRangeProgress(timelinePlaybackProgress(previousRaw, playback), velocity, frameCount, curve);
  const next = velocityRangeProgress(timelinePlaybackProgress(nextRaw, playback), velocity, frameCount, curve);
  return next - previous;
}

function loopVelocityFrameDelta(previousRaw, nextRaw, velocity, frameCount, curve) {
  if (nextRaw <= previousRaw) return 0;
  const previousLoop = Math.floor(previousRaw);
  const nextLoop = Math.floor(nextRaw);
  const previousProgress = previousRaw - previousLoop;
  const nextProgress = nextRaw - nextLoop;
  const rangeFrames = velocityRangeFrameCount(velocity, frameCount);

  if (previousLoop === nextLoop) {
    return (
      velocityRangeProgress(nextProgress, velocity, frameCount, curve) -
      velocityRangeProgress(previousProgress, velocity, frameCount, curve)
    );
  }

  const previousLoopEnd = rangeFrames - velocityRangeProgress(previousProgress, velocity, frameCount, curve);
  const middleLoops = Math.max(0, nextLoop - previousLoop - 1) * rangeFrames;
  return previousLoopEnd + middleLoops + velocityRangeProgress(nextProgress, velocity, frameCount, curve);
}

function velocityRangeProgress(progress, velocity, frameCount, curve = 'linear') {
  const start = formulaFrameBoundary(velocity.startFrame, frameCount, 1);
  const end = formulaFrameBoundary(velocity.endFrame, frameCount, frameCount);
  const minFrame = Math.min(start, end);
  const maxFrame = Math.max(start, end);
  const frameProgress = clamp01(progress) * frameCount;
  const rangeFrames = maxFrame - minFrame + 1;
  const rangeProgress = Math.min(Math.max(0, frameProgress - (minFrame - 1)), rangeFrames);
  return velocityCurveProgress(rangeProgress / rangeFrames, curve) * rangeFrames;
}

function velocityRangeFrameCount(velocity, frameCount) {
  const start = formulaFrameBoundary(velocity.startFrame, frameCount, 1);
  const end = formulaFrameBoundary(velocity.endFrame, frameCount, frameCount);
  return Math.abs(end - start) + 1;
}

export function actionFrameCount(player, action) {
  return timelineFrameCount(player.actionSettings?.[action?.key] || action?.timeline?.settings || {});
}

export function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function velocityCurveProgress(progress, curve) {
  const t = clamp01(progress);
  if (curve === 'easeIn') return t * t;
  if (curve === 'easeOut') return 1 - (1 - t) * (1 - t);
  return t;
}
