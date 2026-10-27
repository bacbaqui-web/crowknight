export { bombWarningAlpha } from './bomb_warning_timing.js';
const redSprites = new WeakMap();

// Tint each loaded sprite once, preserving transparency; reuse it for every bomb and frame.
export function drawBombFlash(ctx, asset, x, y, width, height, alpha) {
  if (!alpha) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (asset && (asset.naturalWidth || asset.width)) {
    let red = redSprites.get(asset);
    if (!red) {
      red = document.createElement('canvas');
      red.width = asset.naturalWidth || asset.width;
      red.height = asset.naturalHeight || asset.height;
      const paint = red.getContext('2d');
      paint.drawImage(asset, 0, 0);
      paint.globalCompositeOperation = 'source-in';
      paint.fillStyle = '#ff2525';
      paint.fillRect(0, 0, red.width, red.height);
      redSprites.set(asset, red);
    }
    ctx.drawImage(red, x, y, width, height);
  } else {
    ctx.fillStyle = '#ff2525';
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
