import { clamp } from './common_helper.js';
import { MAX_SCREEN_ZOOM, MIN_SCREEN_ZOOM } from './scene_session_data.js';

export function getViewTransform({ playerActor, particleEffects, screenZoom = 1 }) {
  const zoom = clamp(Number(screenZoom || 1), MIN_SCREEN_ZOOM, MAX_SCREEN_ZOOM);
  const shake = particleEffects.getScreenShakeOffset();
  return {
    zoom,
    focusX: playerActor.player.x - shake.x,
    focusY: playerActor.player.y - shake.y,
  };
}
