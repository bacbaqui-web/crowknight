export const ACTION_BLEND_MIN_FRAMES = 0;
export const ACTION_BLEND_MAX_FRAMES = 5;

export function normalizeActionBlendFrames(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return ACTION_BLEND_MIN_FRAMES;
  return Math.min(ACTION_BLEND_MAX_FRAMES, Math.max(ACTION_BLEND_MIN_FRAMES, Math.round(numeric)));
}

export function nextActionBlendFrames(value) {
  const current = normalizeActionBlendFrames(value);
  return current >= ACTION_BLEND_MAX_FRAMES ? ACTION_BLEND_MIN_FRAMES : current + 1;
}

export function actionBlendTitle(value) {
  const frames = normalizeActionBlendFrames(value);
  return frames === 0 ? '즉시 전환' : `${frames}프레임 연결`;
}
