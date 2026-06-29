export function createEditableTransform({ x = 0, y = 0, w = 1, h = 1, ax = 0, ay = 0, rot = 0 } = {}) {
  return {
    x: finiteNumber(x, 0),
    y: finiteNumber(y, 0),
    w: Math.max(0, finiteNumber(w, 1)),
    h: Math.max(0, finiteNumber(h, 1)),
    ax: finiteNumber(ax, 0),
    ay: finiteNumber(ay, 0),
    rot: finiteNumber(rot, 0),
  };
}

export function createEditableAppearance({ opacity = 1 } = {}) {
  return {
    opacity: clampUnit(opacity),
  };
}

export function editableTransformDrawRect(transform) {
  const rect = createEditableTransform(transform);
  return {
    x: -rect.ax,
    y: -rect.ay,
    w: rect.w,
    h: rect.h,
  };
}

export function scaledEditableAnchor({ ax = 0, ay = 0, w = 1, h = 1, baseW = w, baseH = h } = {}) {
  const width = Math.max(0, finiteNumber(w, 1));
  const height = Math.max(0, finiteNumber(h, 1));
  return {
    ax: finiteNumber(ax, 0) * (width / Math.max(1, finiteNumber(baseW, width || 1))),
    ay: finiteNumber(ay, 0) * (height / Math.max(1, finiteNumber(baseH, height || 1))),
  };
}

export function resizeEditableTransform(transform, { w, h } = {}) {
  const rect = createEditableTransform(transform);
  return {
    ...rect,
    w: Math.max(0, finiteNumber(w, rect.w)),
    h: Math.max(0, finiteNumber(h, rect.h)),
  };
}

export function resizeEditableTransformFromHandle({
  transform,
  mode,
  widthDelta = 0,
  heightDelta = 0,
  baseW = transform?.w,
  baseH = transform?.h,
} = {}) {
  const rect = createEditableTransform(transform);

  if (mode === 'width') {
    return resizeEditableTransform(rect, { w: rect.w + finiteNumber(widthDelta, 0) });
  }

  if (mode === 'height') {
    return resizeEditableTransform(rect, { h: rect.h + finiteNumber(heightDelta, 0) });
  }

  if (mode === 'size') {
    const widthBase = Math.max(0.001, finiteNumber(baseW, rect.w || 1));
    const heightBase = Math.max(0.001, finiteNumber(baseH, rect.h || 1));
    const sharedDelta = (finiteNumber(widthDelta, 0) / widthBase + finiteNumber(heightDelta, 0) / heightBase) / 2;
    return resizeEditableTransform(rect, {
      w: rect.w + widthBase * sharedDelta,
      h: rect.h + heightBase * sharedDelta,
    });
  }

  return rect;
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, finiteNumber(value, 1)));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
