export const MOVE_HANDLE_RADIUS = 28;
export const ANCHOR_HANDLE_RADIUS = 8;
export const HANDLE_LINE_GAP = 6;

export function drawPolygon(ctx, points, fill = false) {
  if (!points?.length) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

export function handleLineStart(anchor, target) {
  const dx = target.x - anchor.x;
  const dy = target.y - anchor.y;
  const length = Math.hypot(dx, dy) || 1;
  const distance = MOVE_HANDLE_RADIUS + HANDLE_LINE_GAP;
  return {
    x: anchor.x + (dx / length) * distance,
    y: anchor.y + (dy / length) * distance,
  };
}

export function handleColor(mode, activeMode) {
  const active = mode === activeMode;
  const colors = {
    move: active ? '#80e8ff' : '#31b7da',
    anchor: active ? '#d7fbff' : '#259fca',
    width: active ? '#ffe58c' : '#f2bc4d',
    height: active ? '#9cffc8' : '#55d88e',
    size: active ? '#ffb0e8' : '#df72c5',
    rotate: active ? '#bca6ff' : '#8f7bff',
    opacity: active ? '#ffb28a' : '#f47c58',
  };
  return {
    stroke: colors[mode] || '#f8fbff',
    shadow: active,
    width: active ? 3 : 2,
  };
}

export function handleCursor(mode) {
  return (
    {
      anchor: 'crosshair',
      move: 'grab',
      width: 'ew-resize',
      height: 'ns-resize',
      size: 'nwse-resize',
      rotate: 'grab',
      opacity: 'pointer',
    }[mode] || ''
  );
}

export function drawAnchorHandleDot(ctx, point, style) {
  ctx.save();
  ctx.fillStyle = style.stroke;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHandleLine(ctx, from, to, style) {
  ctx.save();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

export function drawHandleArrow(ctx, from, to, style) {
  drawHandleLine(ctx, from, to, style);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 10;
  ctx.save();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle - 0.62) * size, to.y - Math.sin(angle - 0.62) * size);
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle + 0.62) * size, to.y - Math.sin(angle + 0.62) * size);
  ctx.stroke();
  ctx.restore();
}

export function drawHandleCircle(ctx, point, radius, style, fill) {
  ctx.save();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  if (style.shadow) {
    ctx.shadowColor = style.stroke;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = 'rgba(12, 14, 20, 0.68)';
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}
