import { activeActionFormulaAtProgress } from './formula_runtime_engine.js';
import { MAX_SCREEN_ZOOM, MIN_SCREEN_ZOOM } from './scene_session_data.js';
import { timelineFrameCount } from './timeline_playback_helper.js';

export function formulaScreenZoom(actors = [], baseZoom = 1) {
  const base = clampZoom(baseZoom);
  const activeZoom = actors.reduce((maxZoom, actor) => Math.max(maxZoom, actorFormulaZoom(actor)), base);
  return clampZoom(activeZoom);
}

function actorFormulaZoom(actor) {
  const player = actor?.player;
  if (!player || player.dead || actor.respawning) return 0;

  const actionKey = player.actionKey;
  const settings = player.actionSettings?.[actionKey] || {};
  const frameCount = timelineFrameCount(settings);
  const progress = player.getActionFrameProgress?.() || 0;
  const formula = activeActionFormulaAtProgress(settings, 'zoom', progress, frameCount);
  if (!formula) return 0;
  return clampZoom(formula.scale);
}

function clampZoom(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(MAX_SCREEN_ZOOM, Math.max(MIN_SCREEN_ZOOM, number));
}
