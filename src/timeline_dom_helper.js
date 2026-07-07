import { clamp } from './common_helper.js';
import { normalizeTimelinePlayback, timelinePlaybackTitle } from './timeline_playback_helper.js';
import { isActionMirrorEnabled } from './action_mirror_helper.js';
import { actionBlendTitle, normalizeActionBlendFrames } from './action_blend_helper.js';
import { actionConditionTitle, normalizeActionCondition } from './action_condition_helper.js';

export function renderTimelineSlots(track, frameCount, selectedSlot, onSelectSlot) {
  track.innerHTML = '';
  track.style.gridTemplateColumns = `repeat(${frameCount}, 1fr)`;

  for (let slot = 0; slot < frameCount; slot += 1) {
    const cell = document.createElement('span');
    cell.className = 'timeline-slot';
    cell.dataset.slot = String(slot);
    cell.classList.toggle('is-active', selectedSlot === slot);
    cell.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      onSelectSlot(slot);
    });
    track.append(cell);
  }
}

export function renderMiniTimelineRange(track, { totalFrames, startFrame, endFrame, onRangeChange = null }) {
  const frameCount = Math.max(1, Math.round(Number(totalFrames || 1)));
  const start = clampModifierFrame(startFrame, frameCount);
  const end = clampModifierFrame(endFrame, frameCount);
  const minFrame = Math.min(start, end);
  const maxFrame = Math.max(start, end);
  track.dataset.miniTimeline = 'true';
  track.dataset.startFrame = String(startFrame ?? start);
  track.dataset.endFrame = String(endFrame ?? end);
  track.classList.toggle('is-click-editable', Boolean(onRangeChange));
  renderTimelineSlots(track, frameCount, null, (slot) => {
    if (!onRangeChange) return;
    const nextRange = clickedMiniTimelineRange(slot + 1, minFrame, maxFrame);
    if (nextRange.startFrame === minFrame && nextRange.endFrame === maxFrame) return;
    const confirmedRange = onRangeChange(nextRange) || nextRange;
    renderMiniTimelineRange(track, {
      totalFrames: frameCount,
      startFrame: confirmedRange.startFrame,
      endFrame: confirmedRange.endFrame,
      onRangeChange,
    });
  });
  track.querySelectorAll('.timeline-slot').forEach((cell, index) => {
    const frame = index + 1;
    cell.classList.toggle('is-in-range', frame >= minFrame && frame <= maxFrame);
  });
}

export function syncMiniTimelineTracks(root, totalFrames) {
  root?.querySelectorAll('[data-mini-timeline="true"]').forEach((track) => {
    renderMiniTimelineRange(track, {
      totalFrames,
      startFrame: track.dataset.startFrame,
      endFrame: track.dataset.endFrame,
    });
  });
}

function clampModifierFrame(value, frameCount) {
  return clamp(Math.round(Number(value || 1)), 1, frameCount);
}

function clickedMiniTimelineRange(clickedFrame, startFrame, endFrame) {
  const startDistance = Math.abs(clickedFrame - startFrame);
  const endDistance = Math.abs(clickedFrame - endFrame);
  const useStart = startDistance < endDistance || (startDistance === endDistance && clickedFrame <= startFrame);
  if (useStart) {
    return {
      startFrame: Math.min(clickedFrame, endFrame),
      endFrame,
    };
  }
  return {
    startFrame,
    endFrame: Math.max(clickedFrame, startFrame),
  };
}

export function timelineTToSlot(t, lastSlot) {
  return clamp(Math.round(clamp(Number(t), 0, 1) * lastSlot), 0, lastSlot);
}

export function timelineSlotToT(slot, lastSlot) {
  return clamp(Number(slot), 0, lastSlot) / lastSlot;
}

export function timelineSlotToLeft(slot, frameCount, lastSlot) {
  return (clamp(Number(slot), 0, lastSlot) / frameCount) * 100;
}

export function timelinePointerT(event, track, frameCount, lastSlot) {
  const rect = track.getBoundingClientRect();
  const raw = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  return timelineSlotToT(clamp(Math.round(raw * frameCount - 0.5), 1, lastSlot - 1), lastSlot);
}

export function isEmptyEditableSlot(slot, keyframes, lastSlot, toSlot) {
  return slot !== null && slot > 0 && slot < lastSlot && !keyframes.some((frame) => toSlot(frame.t) === slot);
}

export function findTimelineKeyframeInsertSlot(keyframes, lastSlot, toSlot) {
  const used = new Set(keyframes.map((frame) => toSlot(frame.t)));
  for (let slot = 1; slot < lastSlot; slot += 1) {
    if (!used.has(slot)) return slot;
  }
  return null;
}

export function selectedOrFirstEmptySlot(selectedSlot, keyframes, lastSlot, toSlot) {
  return isEmptyEditableSlot(selectedSlot, keyframes, lastSlot, toSlot)
    ? selectedSlot
    : findTimelineKeyframeInsertSlot(keyframes, lastSlot, toSlot);
}

export function syncTimelinePlaybackControls(elements, state) {
  const {
    duration,
    playbackRateRange,
    playbackRate,
    playback,
    playbackMode: playbackModeButton,
    mirror,
    cancel,
    blend,
    condition,
  } = elements;
  const { frameCount, settings, playing } = state;
  const playbackMode = normalizeTimelinePlayback(state.playbackMode || settings.playback, 'once');
  const isRepeatingMode = playbackMode !== 'once';
  const modeTitle = timelinePlaybackTitle(playbackMode);

  duration.value = frameCount;
  syncMiniTimelineTracks(duration.closest('.setting-section') || duration.ownerDocument, frameCount);
  if (playbackRateRange) playbackRateRange.value = settings.playbackRate;
  playbackRate.value = settings.playbackRate;
  playback.classList.toggle('is-active', playing);
  playback.setAttribute('aria-pressed', String(playing));
  playbackModeButton.classList.toggle('is-active', isRepeatingMode);
  playbackModeButton.setAttribute('aria-pressed', String(isRepeatingMode));
  playbackModeButton.setAttribute('aria-label', `재생 방식: ${modeTitle}`);
  playbackModeButton.title = modeTitle;
  syncTimelinePlaybackModeIcon(playbackModeButton, playbackMode);
  syncActionMirrorButton(mirror, settings);
  syncActionCancelButton(cancel, settings);
  syncActionBlendButton(blend, settings);
  syncActionConditionButton(condition, settings);
}

export function syncTimelineToolbar({
  addButton,
  deleteButton,
  keyframes,
  selectedSlot,
  activeKeyframeId,
  frameCount,
  lastSlot,
  toSlot,
}) {
  const occupiedSlots = new Set(keyframes.map((frame) => toSlot(frame.t)));
  const hasSelectedEmptySlot =
    selectedSlot !== null && selectedSlot > 0 && selectedSlot < lastSlot && !occupiedSlots.has(selectedSlot);
  const middleKeyframeCount = keyframes.filter((frame) => frame.id !== 'start' && frame.id !== 'end').length;

  addButton.disabled = !hasSelectedEmptySlot && middleKeyframeCount >= frameCount - 2;
  deleteButton.disabled = !activeKeyframeId;
}

export function appendTimelineKeyframes(track, keyframes, options) {
  const { frameCount, toSlot, slotToLeft, isActive, bindDrag } = options;

  keyframes.forEach((frame) => {
    const button = document.createElement('button');
    button.className = 'timeline-keyframe';
    button.type = 'button';
    button.dataset.keyframeId = frame.id;
    button.dataset.fixed = String(frame.id === 'start' || frame.id === 'end');
    const slot = toSlot(frame.t);
    button.style.left = `${slotToLeft(slot)}%`;
    button.style.width = `${100 / frameCount}%`;
    if (frame.id === 'start' || frame.id === 'end') {
      button.append(createSkipIcon(frame.id));
    } else {
      button.textContent = '+';
    }
    button.title = `${slot + 1}칸`;
    button.classList.toggle('is-active', isActive(frame, slot));
    bindDrag(button, frame.id);
    track.append(button);
  });
}

export function bindTimelineKeyframeDrag(button, id, handlers) {
  const { onSelectFixed, onSelectKeyframe, onStartDrag, onMoveDrag, onFinishDrag } = handlers;

  if (id === 'start' || id === 'end') {
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      onSelectFixed(id);
    });
    return;
  }

  let drag = null;
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (!drag.started) {
      const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (moved < 2) return;
      drag.started = true;
      onStartDrag(id);
    }
    onMoveDrag(id, event);
  });
  const finish = (event, { cancelled = false } = {}) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragging = drag.started;
    drag = null;
    if (wasDragging) {
      onFinishDrag(id);
      return;
    }
    if (cancelled) return;
    onSelectKeyframe(id);
  };
  button.addEventListener('pointerup', finish);
  button.addEventListener('pointercancel', (event) => finish(event, { cancelled: true }));
}

function createSkipIcon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (id === 'start') {
    bar.setAttribute('d', 'M6 5v14');
    arrow.setAttribute('d', 'M18 6l-9 6 9 6V6z');
  } else {
    bar.setAttribute('d', 'M18 5v14');
    arrow.setAttribute('d', 'M6 6l9 6-9 6V6z');
  }
  svg.append(bar, arrow);
  return svg;
}

function syncTimelinePlaybackModeIcon(button, playbackMode) {
  button.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  getPlaybackIconPaths(playbackMode).forEach((pathData) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  });
  button.append(svg);
}

function getPlaybackIconPaths(playbackMode) {
  if (playbackMode === 'loop') {
    return ['M17 1l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 23l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3'];
  }
  if (playbackMode === 'pingpong') {
    return ['M7 7h10', 'M13 3l4 4-4 4', 'M17 17H7', 'M11 13l-4 4 4 4'];
  }
  return ['M8 5l10 7-10 7V5z', 'M5 5v14'];
}

function syncActionMirrorButton(button, settings) {
  if (!button) return;
  const enabled = isActionMirrorEnabled(settings);
  const label = enabled ? '좌우 자동 거울상' : '거울상 사용 안 함';
  button.classList.toggle('is-active', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', label);
  button.title = label;
}

function syncActionCancelButton(button, settings) {
  if (!button) return;
  const enabled = settings.interruptible !== false;
  const label = enabled ? '다른 액션으로 즉시 전환' : '현재 액션이 끝날 때까지 유지';
  button.classList.toggle('is-active', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', label);
  button.title = label;
}

function syncActionBlendButton(button, settings) {
  if (!button) return;
  const frames = normalizeActionBlendFrames(settings.blendFrames);
  const label = actionBlendTitle(frames);
  const badge = button.querySelector('.action-blend-badge');
  button.classList.toggle('is-active', frames > 0);
  button.setAttribute('aria-pressed', String(frames > 0));
  button.setAttribute('aria-label', label);
  button.title = label;
  if (badge) badge.textContent = String(frames);
}

function syncActionConditionButton(button, settings) {
  if (!button) return;
  const condition = normalizeActionCondition(settings.condition);
  const label = actionConditionTitle(condition);
  button.classList.toggle('is-active', condition !== 'any');
  button.dataset.condition = condition;
  button.setAttribute('aria-pressed', String(condition !== 'any'));
  button.setAttribute('aria-label', label);
  button.title = label;
  syncActionConditionIcon(button, condition);
}

function syncActionConditionIcon(button, condition) {
  button.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  getConditionIconPaths(condition).forEach((pathData) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.append(path);
  });
  button.append(svg);
}

function getConditionIconPaths(condition) {
  if (condition === 'ground') return ['M4 17h16', 'M8 13h8'];
  if (condition === 'air')
    return ['M12 19V7', 'M8 11l4-4 4 4', 'M5 17c1.5-2 4-2 5.5-.7 1.2-2.4 4.8-2.4 6 0 1-.6 2-.4 2.8.7'];
  return ['M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4'];
}
