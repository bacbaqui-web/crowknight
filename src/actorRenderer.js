import { drawHitFlash, drawSelectedPartGlow } from './actorEffectsRenderer.js';
import { drawActorShadow, drawHealthMeter } from './actorHudRenderer.js';

export function drawActor(ctx, world, actor, { selectedActor, activeEditPartKey, activeEditPartKeys }) {
  drawActorShadow(ctx, world, actor);
  const flicker = actor.invulnTime > 0 && Math.floor(actor.invulnTime * 24) % 2 === 0;
  if (flicker) {
    ctx.save();
    ctx.globalAlpha = 0.46;
  }
  if (actor.hurtCooldown > 0) {
    ctx.save();
    ctx.filter = 'brightness(1.18) saturate(0.55)';
  }

  const previousGlowPart = actor.player.glowPart;
  const previousGlowParts = actor.player.glowParts;
  const selectedGlowPart = actor === selectedActor ? activeEditPartKey() : null;
  const selectedGlowParts = actor === selectedActor ? activeEditPartKeys() : [];
  actor.player.glowPart = selectedGlowPart;
  actor.player.glowParts = selectedGlowParts;
  actor.player.draw(ctx);
  actor.player.glowPart = previousGlowPart;
  actor.player.glowParts = previousGlowParts;

  drawSelectedPartGlow(ctx, actor, selectedActor, selectedGlowParts);
  if (actor.hurtCooldown > 0) drawHitFlash(ctx, actor);
  if (actor.hurtCooldown > 0) ctx.restore();
  if (flicker) ctx.restore();

  const x = actor.player.x;
  const y = actor.player.hitbox.y - 24;
  const width = Math.max(72, actor.maxHpPips * 9);

  drawHealthMeter(ctx, actor, x, y - 16, width);
  ctx.fillStyle = actor.hurtCooldown > 0 ? '#fff' : actor.tint;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(actor.name, x, y - 22);
  ctx.textAlign = 'left';
}
