import { drawAttackTrail } from '../actor_canvas_renderer.js';
import { attackPoint, screenPoint } from './attack_geometry.js';

export function effectAnchor(actor) {
  const regions = actor.player.attackInteractionRegions || [];
  if (regions.length) {
    const left = Math.min(...regions.map((r) => r.x)),
      right = Math.max(...regions.map((r) => r.x + r.w));
    const top = Math.min(...regions.map((r) => r.y)),
      bottom = Math.max(...regions.map((r) => r.y + r.h));
    return { x: (left + right) / 2, y: (top + bottom) / 2 };
  }
  const scale = actor.player.transform?.scale || 1;
  return { x: actor.player.x + (actor.player.facing || 1) * 65 * scale, y: actor.player.y - 70 };
}
export function attackEffectMatrix(actor, world, view) {
  const anchor = effectAnchor(actor),
    facing = actor.player.facing || 1;
  const center = screenPoint(attackPoint(actor, anchor), world, view);
  const forward = screenPoint(attackPoint(actor, { x: anchor.x + facing, y: anchor.y }), world, view);
  const lateral = screenPoint(attackPoint(actor, anchor, facing), world, view);
  const a = (forward.x - center.x) * facing,
    b = (forward.y - center.y) * facing;
  const c = lateral.x - center.x,
    d = lateral.y - center.y;
  return { a, b, c, d, e: center.x - a * anchor.x - c * anchor.y, f: center.y - b * anchor.x - d * anchor.y };
}
export function drawQuarterAttackEffect(ctx, actor, effectAssets, world, view) {
  if (actor.respawning || actor.player.dead) return;
  const m = attackEffectMatrix(actor, world, view);
  ctx.save();
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  drawAttackTrail(ctx, actor, effectAssets);
  ctx.restore();
}
