import { ACTION_FPS, ACTION_MAX_FRAMES } from './game_config_data.js';
import { actionFormula, actionFormulaFrameFromProgress, formulaFrameBoundary } from './formula_runtime_engine.js';
import { timelineFrameCount } from './timeline_playback_helper.js';

export function updateFormulaShakes(actors = [], particleEffects) {
  if (!particleEffects?.shakeScreen) return;
  actors.forEach((actor) => updateActorFormulaShake(actor, particleEffects));
}

function updateActorFormulaShake(actor, particleEffects) {
  const player = actor?.player;
  if (!player) return;

  const actionKey = player.actionKey;
  const settings = player.actionSettings?.[actionKey] || {};
  const formula = actionFormula(settings, 'shake');
  if (!formula?.enabled) {
    actor.formulaShakeState = null;
    return;
  }

  const frameCount = timelineFrameCount(settings) || ACTION_MAX_FRAMES;
  const progress = player.getActionFrameProgress?.() || 0;
  const frame = actionFormulaFrameFromProgress(progress, frameCount);
  const triggerFrame = formulaFrameBoundary(formula.triggerFrame, frameCount, 1);
  const state = nextFormulaShakeState(actor.formulaShakeState, actionKey, progress);
  actor.formulaShakeState = state;

  const fireKey = `${triggerFrame}:${formula.power}:${formula.frames}`;
  if (frame < triggerFrame || state.firedFrames.has(fireKey)) return;
  state.firedFrames.add(fireKey);

  const magnitude = Math.max(0, Number(formula.power || 0));
  const frames = Math.max(0, Number(formula.frames || 0));
  if (magnitude <= 0 || frames <= 0) return;

  particleEffects.shakeScreen({
    magnitude,
    duration: frames / ACTION_FPS,
    direction: 'random',
    decay: true,
  });
}

function nextFormulaShakeState(previous, actionKey, progress) {
  const normalizedProgress = Math.max(0, Math.min(1, Number(progress || 0)));
  const restarted =
    !previous || previous.actionKey !== actionKey || normalizedProgress + 0.0001 < Number(previous.progress || 0);
  if (restarted) {
    return {
      actionKey,
      progress: normalizedProgress,
      firedFrames: new Set(),
    };
  }
  previous.progress = normalizedProgress;
  return previous;
}
