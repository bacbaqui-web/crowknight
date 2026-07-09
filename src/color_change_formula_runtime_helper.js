import { activeActionFormulaAtProgress } from './formula_runtime_engine.js';
import { timelineFrameCount } from './timeline_playback_helper.js';

export function updateFormulaColorChanges(actors = []) {
  actors.forEach(updateActorFormulaColorChange);
}

function updateActorFormulaColorChange(actor) {
  const player = actor?.player;
  if (!player) return;

  const actionKey = player.actionKey;
  const settings = player.actionSettings?.[actionKey] || {};
  const frameCount = timelineFrameCount(settings);
  const progress = player.getActionFrameProgress?.() || 0;
  const formula = activeActionFormulaAtProgress(settings, 'colorChange', progress, frameCount);
  if (!formula || Number(formula.opacity || 0) <= 0) {
    player.formulaTintColor = null;
    player.formulaTintOpacity = 0;
    return;
  }

  player.formulaTintColor = formula.color;
  player.formulaTintOpacity = Math.max(0, Math.min(1, Number(formula.opacity ?? 0.35)));
}
