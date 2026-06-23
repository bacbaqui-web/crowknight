import { clamp } from './utils.js';

export function drawActorShadow(ctx, world, actor) {
  const scale = actor.player.transform?.scale || 1;
  const master = actor.player.getPartOffset?.('master') || {};
  const anchorLift = Math.max(0, Number(master.y || 0) - Number(master.anchorY || 0));
  const airHeight = Math.max(0, world.floorY - actor.player.y + anchorLift);
  const heightScale = clamp(1 - airHeight / 280, 0.22, 1);
  const width = 54 * scale * heightScale;
  const height = 11 * scale * (0.62 + heightScale * 0.38);
  const alpha = 0.16 + heightScale * 0.18;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(actor.player.x, world.floorY + 3, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHealthMeter(ctx, actor, x, y, width) {
  if (actor.maxHpPips > 0) {
    const gap = actor.maxHpPips > 10 ? 2 : 4;
    const pipWidth = (width - gap * (actor.maxHpPips - 1)) / actor.maxHpPips;
    for (let index = 0; index < actor.maxHpPips; index += 1) {
      const px = x - width / 2 + index * (pipWidth + gap);
      ctx.fillStyle = 'rgba(0,0,0,.44)';
      ctx.fillRect(px, y, pipWidth, 7);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.strokeRect(px, y, pipWidth, 7);
      if (index < actor.hpPips) {
        ctx.fillStyle = actor.tint;
        ctx.fillRect(px + 1, y + 1, pipWidth - 2, 5);
      }
    }
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,.44)';
  ctx.fillRect(x - width / 2, y, width, 6);
  ctx.fillStyle = actor.tint;
  ctx.fillRect(x - width / 2, y, width * (actor.hp / 100), 6);
}
