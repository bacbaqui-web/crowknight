import { clamp } from './common_helper.js';
import { MAX_SCREEN_ZOOM, MIN_SCREEN_ZOOM } from './scene_session_data.js';

export function getViewTransform({ world, playerActor, particleEffects, screenZoom = 1, playerScreenY = null }) {
  const zoom = clamp(Number(screenZoom || 1), MIN_SCREEN_ZOOM, MAX_SCREEN_ZOOM);
  const shake = particleEffects.getScreenShakeOffset();
  const targetScreenY = resolvePlayerScreenY(world, playerScreenY);
  const focusX = playerActor.player.x - shake.x;
  const focusY = playerActor.player.y - (targetScreenY - world.viewH / 2) / zoom - shake.y;

  return {
    zoom,
    focusX,
    focusY,
  };
}

function resolvePlayerScreenY(world, playerScreenY) {
  const value = Number(playerScreenY);
  if (!Number.isFinite(value)) return Number(world?.viewH || 0) / 2;
  return clamp(value, 0, Number(world?.viewH || value));
}
