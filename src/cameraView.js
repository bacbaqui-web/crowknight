import { clamp } from './utils.js';

export function getCameraX(playerActor, world) {
  const target = playerActor.player.x - world.viewW / 2;
  return Math.max(0, target);
}

export function getCameraY(playerActor, world) {
  return clamp(playerActor.player.y - 120, world.viewH * 0.35, world.floorY - 120);
}

export function getEditZoom(isEditPanelOpen, hasActiveEditPart) {
  return isEditPanelOpen && hasActiveEditPart ? 1.85 : 1;
}

export function getViewTransform({
  world,
  playerActor,
  selectedActor,
  particleEffects,
  playerDeathPending,
  resultOpen,
  isEditPanelOpen,
  hasActiveEditPart,
}) {
  if (playerDeathPending || resultOpen) {
    const shake = particleEffects.getScreenShakeOffset();
    return {
      zoom: 1.72,
      focusX: playerActor.player.x - shake.x,
      focusY: playerActor.player.y - 72 - shake.y,
    };
  }

  const zoom = getEditZoom(isEditPanelOpen, hasActiveEditPart);
  const shake = particleEffects.getScreenShakeOffset();
  if (zoom > 1) {
    return {
      zoom,
      focusX: selectedActor.player.x - shake.x,
      focusY: selectedActor.player.y - 88 - shake.y,
    };
  }

  return {
    zoom: 1,
    focusX: getCameraX(playerActor, world) + world.viewW / 2 - shake.x,
    focusY: getCameraY(playerActor, world) - shake.y,
  };
}
