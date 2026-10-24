import { effectPoint, screenPoint } from './attack_geometry.js';
import { effectLayoutFor } from './effect_layout.js';
import { attackPlane } from '../attack_plane_helper.js';

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export function inverseAxes(point, a, b) {
  const det = a.x * b.y - a.y * b.x;
  return Math.abs(det) < 1e-8
    ? null
    : { x: (point.x * b.y - point.y * b.x) / det, y: (a.x * point.y - a.y * point.x) / det };
}
export function effectHandleFrame(actor, geometry, world, view) {
  if (!geometry) return null;
  const layout = { ...effectLayoutFor(actor) },
    facing = actor.player.facing || 1;
  const key = actor.player.actionKey,
    direction = actor.quarterAim.key;
  const project = (u, v, patch = {}) => {
    const copy = {
      ...actor,
      quarterEffectLayouts: { [key]: { directions: { [direction]: { ...layout, ...patch } } } },
    };
    return screenPoint(
      effectPoint(
        copy,
        { x: geometry.center.x + u * facing, y: geometry.center.y - v },
        geometry.center,
        undefined,
        geometry.radius
      ),
      world,
      view
    );
  };
  const pivot = project(layout.anchorX, layout.anchorY);
  const sourceX = sub(project(layout.anchorX + 1, layout.anchorY), pivot);
  const sourceY = sub(project(layout.anchorX, layout.anchorY + 1), pivot);
  const aerial = attackPlane(actor) === 'height';
  const first = aerial && Math.abs(actor.quarterAim.x) < 0.1 ? 'side' : 'distance';
  const second = aerial ? 'elevation' : 'side';
  const moveX = sub(project(layout.anchorX, layout.anchorY, { [first]: layout[first] + 1 }), pivot);
  const moveY = sub(project(layout.anchorX, layout.anchorY, { [second]: layout[second] + 1 }), pivot);
  const zero = project(layout.anchorX, layout.anchorY, { rotation: 0 });
  const rotateX = sub(project(layout.anchorX + 1 / layout.width, layout.anchorY, { rotation: 0 }), zero);
  const rotateY = sub(project(layout.anchorX, layout.anchorY + 1 / layout.height, { rotation: 0 }), zero);
  const length = Math.hypot(sourceX.x, sourceX.y) || 1;
  const handle = { x: pivot.x + (sourceX.x * 66) / length, y: pivot.y + (sourceX.y * 66) / length };
  const polygon = geometry.points.map((p) =>
    screenPoint(effectPoint(actor, p, geometry.center, undefined, geometry.radius), world, view)
  );
  return { layout, pivot, handle, sourceX, sourceY, moveX, moveY, rotateX, rotateY, first, second, polygon };
}
export function dragEffectPatch(frame, mode, start, point) {
  const delta = sub(point, start),
    layout = frame.layout;
  if (mode === 'rotation') {
    const a = inverseAxes(sub(start, frame.pivot), frame.rotateX, frame.rotateY);
    const b = inverseAxes(sub(point, frame.pivot), frame.rotateX, frame.rotateY);
    if (!a || !b || Math.hypot(b.x, b.y) < 1) return {};
    const angle = layout.rotation + ((Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * 180) / Math.PI;
    return { rotation: ((angle + 540) % 360) - 180 };
  }
  const move = inverseAxes(delta, frame.moveX, frame.moveY);
  if (!move) return {};
  const patch = { [frame.first]: layout[frame.first] + move.x, [frame.second]: layout[frame.second] + move.y };
  if (mode === 'anchor') {
    const source = inverseAxes(delta, frame.sourceX, frame.sourceY);
    if (!source) return {};
    patch.anchorX = layout.anchorX + source.x;
    patch.anchorY = layout.anchorY + source.y;
  }
  return patch;
}
function contains(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
export function drawEffectHandles(ctx, frame) {
  if (!frame) return;
  const { pivot, handle } = frame;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#63e5ff';
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(handle.x, handle.y);
  ctx.stroke();
  for (const [p, color, label] of [
    [pivot, '#ff6fcf', '앵커'],
    [handle, '#63e5ff', '회전'],
  ]) {
    ctx.fillStyle = '#10231f';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(label, p.x + 13, p.y - 10);
  }
  ctx.restore();
}
export function bindEffectHandles(canvas, preview, onChange) {
  let drag, pendingPatch, scheduled;
  const flush = () => {
    scheduled = null;
    if (!pendingPatch) return;
    const patch = pendingPatch;
    pendingPatch = null;
    onChange(patch);
  };
  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };
  const modeAt = (p, frame) => {
    const radius = (15 * canvas.width) / canvas.getBoundingClientRect().width;
    if (Math.hypot(p.x - frame.pivot.x, p.y - frame.pivot.y) < radius) return 'anchor';
    if (Math.hypot(p.x - frame.handle.x, p.y - frame.handle.y) < radius) return 'rotation';
    return contains(p, frame.polygon) ? 'position' : null;
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const frame = preview.getFrame(),
      start = point(event);
    const mode = frame && modeAt(start, frame);
    if (!mode) return;
    event.preventDefault();
    drag = { frame, start, mode, id: event.pointerId };
    preview.setDragging(true);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = point(event);
    if (drag && event.pointerId === drag.id) {
      pendingPatch = dragEffectPatch(drag.frame, drag.mode, drag.start, p);
      if (scheduled == null) scheduled = requestAnimationFrame(flush);
    } else {
      const frame = preview.getFrame();
      canvas.style.cursor = frame && modeAt(p, frame) ? 'grab' : 'default';
    }
  });
  const end = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (scheduled != null) window.cancelAnimationFrame(scheduled);
    flush();
    drag = null;
    preview.setDragging(false);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    onChange({});
  };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, end);
}
