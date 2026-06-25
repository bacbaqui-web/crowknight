import { drawSceneBackground } from './backgroundRenderer.js';
import { usesClipGround } from './sceneSession.js';

export function applyWorldView(ctx, world, view) {
  ctx.translate(world.viewW / 2, world.viewH / 2);
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-view.focusX, -view.focusY);
}

export function drawWorld(ctx, world, view, sceneSession) {
  drawSceneBackground(ctx, world, view, sceneSession?.background);
  if (usesClipGround(sceneSession?.background)) return;

  const bounds = visibleWorldBounds(world, view);
  const startX = Math.floor(bounds.x / 80) * 80 - 80;
  const endX = bounds.x + bounds.w + 160;

  ctx.save();
  applyWorldView(ctx, world, view);
  ctx.fillStyle = '#222230';
  ctx.fillRect(bounds.x - 8, world.floorY, bounds.w + 16, 110);
  ctx.strokeStyle = '#55556a';
  ctx.beginPath();
  ctx.moveTo(bounds.x - 8, world.floorY);
  ctx.lineTo(bounds.x + bounds.w + 8, world.floorY);
  ctx.stroke();

  ctx.fillStyle = '#1a1d26';
  for (let x = startX + 40; x < endX; x += 80) {
    ctx.fillRect(x, world.floorY + 36, 44, 4);
  }
  ctx.restore();
}

function visibleWorldBounds(world, view) {
  const w = world.viewW / view.zoom;
  const h = world.viewH / view.zoom;
  return {
    x: view.focusX - w / 2,
    y: view.focusY - h / 2,
    w,
    h,
  };
}
