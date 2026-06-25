import { clamp, lerp } from './utils.js';

const GLOW_GROUP_PARTS = {
  shoulderL: ['upperArmL', 'lowerArmL'],
  shoulderR: ['upperArmR', 'lowerArmR'],
  hipL: ['upperLegL', 'lowerLegL'],
  hipR: ['upperLegR', 'lowerLegR'],
};
const glowImageCache = new WeakMap();

export function partWidth(image) {
  return image.naturalWidth || image.width;
}

export function partHeight(image) {
  return image.naturalHeight || image.height;
}

export function glowSilhouetteFor(image) {
  if (glowImageCache.has(image)) return glowImageCache.get(image);

  const width = partWidth(image);
  const height = partHeight(image);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const buffer = canvas.getContext('2d');
  buffer.drawImage(image, 0, 0, width, height);
  buffer.globalCompositeOperation = 'source-in';
  buffer.fillStyle = 'rgba(171, 255, 217, 0.98)';
  buffer.fillRect(0, 0, width, height);
  glowImageCache.set(image, canvas);
  return canvas;
}

export function shouldGlowPartKey(key, glowPart, glowParts) {
  if (!key) return false;
  const activeGlowParts = Array.isArray(glowParts) && glowParts.length ? glowParts : glowPart ? [glowPart] : [];
  return activeGlowParts.some((part) => part === key || GLOW_GROUP_PARTS[part]?.includes(key));
}

export function groupAnchor(x, y, group = {}) {
  return {
    x: x + Number(group.anchorOffsetX || 0) + Number(group.ax || 0),
    y: y + Number(group.anchorOffsetY || 0) + Number(group.ay || 0),
  };
}

export function transformPoint(matrix, x, y) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

export function identityMatrix() {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

export function translationMatrix(x, y) {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

export function rotationMatrix(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function scaleMatrix(x, y) {
  return { a: x, b: 0, c: 0, d: y, e: 0, f: 0 };
}

export function multiplyMatrix(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function transformMatrixPoint(matrix, x, y) {
  return transformPoint(matrix, x, y);
}

export function axisFromMatrix(matrix, anchor, x, y) {
  const point = transformPoint(matrix, x, y);
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const unit = Math.hypot(dx, dy) || 1;
  return {
    axis: { x: dx / unit, y: dy / unit },
    unit,
  };
}

export function applyPoseAnchor(frame, value = {}) {
  return {
    ...frame,
    anchorX: Number(value.anchorX || 0),
    anchorY: Number(value.anchorY || 0),
  };
}

export function pingPongProgress(raw) {
  const cycle = raw - Math.floor(raw / 2) * 2;
  return cycle <= 1 ? cycle : 2 - cycle;
}

export function interpolateFrameValues(keyframes = [], t = 0, fallback = {}) {
  const frames = keyframes
    .map((frame) => ({
      x: Number(frame.x || 0),
      y: Number(frame.y || 0),
      w: Number(frame.w || 0),
      h: Number(frame.h || 0),
      rot: Number(frame.rot || 0),
      opacity: Number(frame.opacity ?? 1),
      anchorX: Number(frame.anchorX || 0),
      anchorY: Number(frame.anchorY || 0),
      t: clamp(Number(frame.t), 0, 1),
    }))
    .sort((a, b) => a.t - b.t);

  if (!frames.length) return fallback;
  if (t <= frames[0].t) return { ...fallback, ...frames[0] };
  if (t >= frames.at(-1).t) return { ...fallback, ...frames.at(-1) };

  for (let index = 0; index < frames.length - 1; index += 1) {
    const a = frames[index];
    const b = frames[index + 1];
    if (t < a.t || t > b.t) continue;
    const localT = (t - a.t) / Math.max(0.0001, b.t - a.t);
    return {
      x: lerp(a.x, b.x, localT),
      y: lerp(a.y, b.y, localT),
      w: lerp(a.w, b.w, localT),
      h: lerp(a.h, b.h, localT),
      rot: lerp(a.rot, b.rot, localT),
      opacity: lerp(a.opacity, b.opacity, localT),
      anchorX: lerp(a.anchorX, b.anchorX, localT),
      anchorY: lerp(a.anchorY, b.anchorY, localT),
    };
  }

  return fallback;
}
