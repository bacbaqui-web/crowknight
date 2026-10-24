import { createPartEditHandleGeometry, findEditHandleAt } from '../edit_handle_geometry_helper.js';
import { renderEditHandles } from '../edit_handle_renderer.js';
import { handleCursor } from '../edit_handle_drawing_helper.js';
import { effectPoint, screenPoint } from './attack_geometry.js';
import { effectLayoutKey } from './effect_directions.js';
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
    direction = effectLayoutKey(actor.quarterAim.key);
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
  if (mode === 'rotation' || mode === 'rotate') {
    const a = inverseAxes(sub(start, frame.pivot), frame.rotateX, frame.rotateY);
    const b = inverseAxes(sub(point, frame.pivot), frame.rotateX, frame.rotateY);
    if (!a || !b || Math.hypot(b.x, b.y) < 1) return {};
    const angle = layout.rotation + ((Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * 180) / Math.PI;
    return { rotation: ((angle + 540) % 360) - 180 };
  }
  if (['width', 'height', 'size'].includes(mode)) {
    const a = inverseAxes(sub(start, frame.pivot), frame.sourceX, frame.sourceY);
    const b = inverseAxes(sub(point, frame.pivot), frame.sourceX, frame.sourceY);
    if (!a || !b) return {};
    const ratio = (value, base) => (Math.abs(base) < 1e-6 ? 1 : Math.max(0.01, value / base));
    if (mode === 'width') return { width: layout.width * ratio(b.x, a.x) };
    if (mode === 'height') return { height: layout.height * ratio(b.y, a.y) };
    const factor = Math.max(0.01, (a.x * b.x + a.y * b.y) / (a.x * a.x + a.y * a.y || 1));
    return { width: layout.width * factor, height: layout.height * factor };
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
// Reuse the setting editor's geometry, painting, hit priority and cursors in CSS pixels.
export function effectEditGeometry(frame, ratio = 1) {
  const unit = (vector) => {
    const length = Math.hypot(vector.x, vector.y) || 1;
    return { x: vector.x / length, y: vector.y / length };
  };
  const geometry = createPartEditHandleGeometry({
    editFocusPartKey: 'effect',
    editHandleInfo: {
      anchor: { x: frame.pivot.x / ratio, y: frame.pivot.y / ratio },
      xAxis: unit(frame.sourceX),
      yAxis: unit({ x: -frame.sourceY.x, y: -frame.sourceY.y }),
      target: { type: 'effect' },
    },
    actionFrameSelectionActive: false,
  });
  delete geometry.handles.opacity;
  return geometry;
}
export function drawEffectHandles(ctx, frame, ratio = 1, activeMode) {
  if (!frame) return;
  ctx.save();
  ctx.scale(ratio, ratio);
  renderEditHandles(ctx, effectEditGeometry(frame, ratio), activeMode);
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
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    return (
      findEditHandleAt({ x: p.x / ratio, y: p.y / ratio }, effectEditGeometry(frame, ratio))?.mode ||
      (contains(p, frame.polygon) ? 'move' : null)
    );
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (drag || ![0, 1, 2].includes(event.button)) return;
    const frame = preview.getFrame(),
      start = point(event);
    const mode = event.button !== 0 || event.altKey ? 'pan' : (frame && modeAt(start, frame)) || 'pan';
    if (!mode) return;
    event.preventDefault();
    drag = { frame, start, mode, id: event.pointerId, pan: preview.getPan() };
    preview.setDragging(true);
    preview.setActiveMode(mode);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = point(event);
    if (drag && event.pointerId === drag.id) {
      if (drag.mode === 'pan') {
        preview.setPan({ x: drag.pan.x + p.x - drag.start.x, y: drag.pan.y + p.y - drag.start.y });
        onChange(null);
        return;
      }
      pendingPatch = dragEffectPatch(drag.frame, drag.mode, drag.start, p);
      if (scheduled == null) scheduled = requestAnimationFrame(flush);
    } else {
      const frame = preview.getFrame();
      const mode = frame && modeAt(p, frame);
      canvas.style.cursor = handleCursor(mode) || 'default';
      preview.setActiveMode(mode);
      onChange(null);
    }
  });
  const end = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (scheduled != null) window.cancelAnimationFrame(scheduled);
    flush();
    drag = null;
    preview.setDragging(false);
    preview.setActiveMode(null);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    onChange(null);
  };
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, end);
}
