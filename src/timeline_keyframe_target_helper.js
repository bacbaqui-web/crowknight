const START_KEYFRAME_ID = 'start';
const END_KEYFRAME_ID = 'end';
const TIMELINE_KEYFRAME_ROLES = new Set(['start', 'end', 'normal']);

export function resolveTimelineKeyframeTarget({ selection = {}, keyframes = [], frameCount = 1 } = {}) {
  const count = normalizedFrameCount(frameCount);
  const frames = normalizedKeyframes(keyframes);
  const selectedSlot = normalizedSelectedSlot(selection.selectedSlot, count);
  const activeId = stringId(selection.activeKeyframeId);
  const fixedId = stringId(selection.fixedFrame);

  if (activeId) {
    const keyframe = frameById(frames, activeId);
    const t = normalizedT(keyframe?.t, selectedSlotToT(selectedSlot, count));
    return createTimelineKeyframeTarget({
      id: activeId,
      t,
      selectedSlot: selectedSlot ?? tToSelectedSlot(t, count),
      frameCount: count,
    });
  }

  if (fixedId === START_KEYFRAME_ID || fixedId === END_KEYFRAME_ID) {
    const t = fixedId === END_KEYFRAME_ID ? 1 : 0;
    return createTimelineKeyframeTarget({
      id: fixedId,
      t,
      selectedSlot: fixedId === END_KEYFRAME_ID ? count - 1 : 0,
      frameCount: count,
    });
  }

  if (selectedSlot !== null) {
    const keyframe = frameAtSlot(frames, selectedSlot, count);
    if (keyframe?.id) {
      return createTimelineKeyframeTarget({
        id: keyframe.id,
        t: normalizedT(keyframe.t, selectedSlotToT(selectedSlot, count)),
        selectedSlot,
        frameCount: count,
      });
    }
  }

  return createEmptyTimelineKeyframeTarget({ selectedSlot, frameCount: count });
}

export function timelineKeyframeRole(id) {
  if (id === START_KEYFRAME_ID) return 'start';
  if (id === END_KEYFRAME_ID) return 'end';
  return id ? 'normal' : null;
}

export function timelineKeyframeTargetId(target) {
  return hasTimelineKeyframeTarget(target) ? target.id : null;
}

export function timelineKeyframeTargetT(target) {
  return Number.isFinite(target?.t) ? target.t : null;
}

export function legacySelectionFromTimelineKeyframeTarget(target) {
  if (!hasTimelineKeyframeTarget(target)) {
    return {
      activeKeyframeId: null,
      fixedFrame: null,
      selectedSlot: target?.selectedSlot ?? null,
    };
  }

  if (target.role === 'start' || target.role === 'end') {
    return {
      activeKeyframeId: null,
      fixedFrame: target.id,
      selectedSlot: target.selectedSlot,
    };
  }

  return {
    activeKeyframeId: target.id,
    fixedFrame: null,
    selectedSlot: target.selectedSlot,
  };
}

export function legacySelectionFromTimelineKeyframeId({
  id,
  selectedSlot = null,
  keyframes = [],
  frameCount = 1,
} = {}) {
  return legacySelectionFromTimelineKeyframeTarget(
    resolveTimelineKeyframeTarget({
      selection: { activeKeyframeId: id, selectedSlot },
      keyframes,
      frameCount,
    })
  );
}

export function hasTimelineKeyframeTarget(target) {
  return Boolean(target?.isTimelineKeyframeTarget && target.id && TIMELINE_KEYFRAME_ROLES.has(target.role));
}

export function isTimelineKeyframeDeletable(target) {
  return hasTimelineKeyframeTarget(target) && target.deletable === true;
}

function createTimelineKeyframeTarget({ id, t, selectedSlot, frameCount }) {
  const count = normalizedFrameCount(frameCount);
  const nextT = normalizedT(t, 0);
  const slot = normalizedSelectedSlot(selectedSlot, count) ?? tToSelectedSlot(nextT, count);
  const role = timelineKeyframeRole(id);
  return {
    id,
    role,
    t: nextT,
    frame: slot + 1,
    selectedSlot: slot,
    deletable: role === 'normal',
    movable: role === 'normal',
    isTimelineKeyframeTarget: true,
  };
}

function createEmptyTimelineKeyframeTarget({ selectedSlot, frameCount }) {
  const slot = normalizedSelectedSlot(selectedSlot, frameCount);
  return {
    id: null,
    role: null,
    t: selectedSlotToT(slot, frameCount),
    frame: slot === null ? null : slot + 1,
    selectedSlot: slot,
    deletable: false,
    movable: false,
    isTimelineKeyframeTarget: false,
  };
}

function normalizedKeyframes(keyframes) {
  return Array.isArray(keyframes) ? keyframes : [];
}

function frameById(keyframes, id) {
  return keyframes.find((frame) => frame?.id === id) || null;
}

function frameAtSlot(keyframes, slot, frameCount) {
  if (slot === null) return null;
  return keyframes.find((frame) => tToSelectedSlot(frame?.t, frameCount) === slot) || null;
}

function stringId(value) {
  if (typeof value !== 'string') return null;
  return value || null;
}

function normalizedFrameCount(value) {
  const count = Math.round(Number(value));
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function normalizedSelectedSlot(value, frameCount) {
  if (value === null || value === undefined) return null;
  const slot = Math.round(Number(value));
  if (!Number.isFinite(slot)) return null;
  return Math.min(Math.max(slot, 0), Math.max(0, normalizedFrameCount(frameCount) - 1));
}

function normalizedT(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return clamp01(fallback);
  return clamp01(number);
}

function selectedSlotToT(slot, frameCount) {
  if (slot === null) return null;
  const lastSlot = Math.max(0, normalizedFrameCount(frameCount) - 1);
  if (lastSlot <= 0) return 0;
  return clamp01(slot / lastSlot);
}

function tToSelectedSlot(t, frameCount) {
  const lastSlot = Math.max(0, normalizedFrameCount(frameCount) - 1);
  return Math.round(clamp01(t) * lastSlot);
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}
