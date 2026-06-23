export function rotatePointAround(point, origin, angle) {
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: origin.x + x * cos - y * sin,
    y: origin.y + x * sin + y * cos,
  };
}

export function scalePointAround(point, origin, scale) {
  return {
    x: origin.x + (point.x - origin.x) * scale,
    y: origin.y + (point.y - origin.y) * scale,
  };
}

export function screenDeltaToLocal(dx, dy, axis, unit) {
  return (dx * axis.x + dy * axis.y) / Math.max(0.01, unit || 1);
}

export function canvasPointFromEvent(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}
