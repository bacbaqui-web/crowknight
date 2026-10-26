import { drawFlameSmoke } from './fire_burst_renderer.js';
// Render broad overlapping strips so each flame lobe bends instead of scaling as a rigid sticker.
// Time comes from the simulation clock, so pause freezes flames as well as combat.
export function drawFlameSprite(ctx, image, x, y, width, height, time, seed = 0) {
  if (!image) return;
  drawFlameSmoke(ctx,x,y,width,height,time,seed);
  const sourceW = image.naturalWidth || image.width;
  const sourceH = image.naturalHeight || image.height;
  const slices = 14;
  for (let i = 0; i < slices; i++) {
    const t = i / slices;
    const sway = (1 - t) * width * 0.065 * Math.sin(time * 8 - t * 5 + seed);
    const stretch = 1 + Math.sin(time * 11 + seed) * 0.035;
    const sh = Math.min(sourceH - (sourceH * i) / slices, sourceH / slices + 1);
    ctx.drawImage(
      image,
      0,
      (sourceH * i) / slices,
      sourceW,
      sh,
      x + sway,
      y + height - height * (1 - t) * stretch,
      width,
      (height / slices + 0.8) * stretch
    );
  }
  ctx.save();
  ctx.fillStyle = '#ffcc59';
  const opacity = ctx.globalAlpha;
  for (let i = 0; i < 7; i++) {
    const phase = (((time * 0.65 + i / 7 + seed * 0.13) % 1) + 1) % 1;
    ctx.globalAlpha = opacity * (1 - phase);
    ctx.beginPath();
    ctx.ellipse(
      x + width * (0.25 + i * 0.08) + Math.sin(time * 3 + i) * width * 0.08,
      y + height * (0.6 - phase * 0.85),
      1.5,
      2.5,
      0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}
