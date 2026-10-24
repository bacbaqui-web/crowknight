import { EFFECT_DIRECTIONS, effectDirection } from './effect_directions.js';
import { effectPoint, screenPoint } from './attack_geometry.js';
import { depthOf } from './camera.js';

export function drawEffectGuides(ctx, actor, geometry, world, view, selected = effectDirection(actor).key) {
  const center = geometry?.center || { x: actor.player.x, y: actor.player.y - 70 };
  const radius = geometry?.radius || 100;
  const start = screenPoint({ x: actor.player.x, depth: depthOf(actor), y: actor.player.y }, world, view);
  ctx.save();
  ctx.lineWidth = 1.5;
  for (const direction of EFFECT_DIRECTIONS) {
    const point = effectPoint({ ...actor, quarterAim: direction }, center, center, undefined, radius);
    const end = screenPoint(point, world, view),
      angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.globalAlpha = direction.key === selected ? 0.9 : 0.25;
    ctx.strokeStyle = direction.key === selected ? '#ffd17e' : '#93d4bf';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.moveTo(end.x - 7 * Math.cos(angle - 0.45), end.y - 7 * Math.sin(angle - 0.45));
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(end.x - 7 * Math.cos(angle + 0.45), end.y - 7 * Math.sin(angle + 0.45));
    ctx.stroke();
  }
  ctx.restore();
}
