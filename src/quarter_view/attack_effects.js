import { effectFrameGeometry, effectFrameReader } from './effect_geometry.js';
import { drawAttackTrail } from '../actor_canvas_renderer.js';
import { effectPoint, screenPoint } from './attack_geometry.js';

export function effectAnchor(actor, readEffectFrame) {
  const geometry = effectFrameGeometry(actor, readEffectFrame);
  if (geometry) return geometry.center;
  const regions =
    actor.quarterAttackSerial === actor.player.attackSerial
      ? actor.quarterAttackRawRegions || []
      : actor.player.attackInteractionRegions || [];
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
export function attackEffectMatrix(actor, world, view, readEffectFrame) {
  const geometry = effectFrameGeometry(actor, readEffectFrame);
  const anchor = geometry?.center || effectAnchor(actor, readEffectFrame);
  const project = (point) => screenPoint(effectPoint(actor, point, anchor, undefined, geometry?.radius), world, view);
  const center = project(anchor);
  const forward = project({ x: anchor.x + 1, y: anchor.y });
  const lateral = project({ x: anchor.x, y: anchor.y + 1 });
  const a = forward.x - center.x;
  const b = forward.y - center.y;
  const c = lateral.x - center.x,
    d = lateral.y - center.y;
  return { a, b, c, d, e: center.x - a * anchor.x - c * anchor.y, f: center.y - b * anchor.x - d * anchor.y };
}
export function drawQuarterAttackEffect(ctx, actor, effectAssets, world, view, readEffectFrame) {
  if (actor.respawning || actor.player.dead) return;
  const read = effectFrameReader(actor, readEffectFrame, effectAssets);
  const m = attackEffectMatrix(actor, world, view, read);
  ctx.save();
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
  drawAttackTrail(ctx, actor, effectAssets, read);
  ctx.restore();
}
