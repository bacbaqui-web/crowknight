import { clamp } from './utils.js';

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
  const x = a.x + dx * t;
  const y = a.y + dy * t;
  return Math.hypot(point.x - x, point.y - y);
}

export function addScreenVector(point, vector, distance) {
  return {
    x: point.x + vector.x * distance,
    y: point.y + vector.y * distance,
  };
}

export function normalizeScreenVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

export function transformCanvasPoint(matrix, x, y) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

export function axisFromCanvasMatrix(matrix, anchor, x, y) {
  const point = transformCanvasPoint(matrix, x, y);
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const unit = Math.hypot(dx, dy) || 1;
  return {
    axis: { x: dx / unit, y: dy / unit },
    unit,
  };
}
