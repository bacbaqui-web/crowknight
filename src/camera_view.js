import { clamp } from './common_helper.js';
import { MAX_SCREEN_ZOOM, MIN_SCREEN_ZOOM } from './scene_session_data.js';

export function getCameraX(playerActor, world) {
  const target = playerActor.player.x - world.viewW / 2;
  return Math.max(0, target);
}

export function getCameraY(playerActor, world) {
  return clamp(playerActor.player.y - 120, world.viewH * 0.35, world.floorY - 120);
}

export function getViewTransform({
  world,
  playerActor,
  selectedActor,
  particleEffects,
  playerDeathPending,
  resultOpen,
  isEditPanelOpen,
  screenZoom = 1,
}) {
  const editFocusActor = selectedActor || playerActor;
  const zoom = clamp(Number(screenZoom || 1), MIN_SCREEN_ZOOM, MAX_SCREEN_ZOOM);
  if (playerDeathPending || resultOpen) {
    const shake = particleEffects.getScreenShakeOffset();
    return {
      zoom,
      focusX: playerActor.player.x - shake.x,
      focusY: playerActor.player.y - 72 - shake.y,
    };
  }

  const shake = particleEffects.getScreenShakeOffset();
  if (zoom > 1) {
    return {
      zoom,
      focusX: editFocusActor.player.x - shake.x,
      focusY: editFocusActor.player.y - 88 - shake.y,
    };
  }

  const cameraActor = isEditPanelOpen ? editFocusActor : playerActor;
  return {
    zoom,
    focusX: getCameraX(cameraActor, world) + world.viewW / 2 - shake.x,
    focusY: getCameraY(cameraActor, world) - shake.y,
  };
}
