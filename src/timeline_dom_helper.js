import { clamp } from './utils.js';

export function renderTimelineSlots(track, frameCount, selectedSlot, onSelectSlot) {
  track.innerHTML = '';
  track.style.gridTemplateColumns = `repeat(${frameCount}, 1fr)`;

  for (let slot = 0; slot < frameCount; slot += 1) {
    const cell = document.createElement('span');
    cell.className = 'pose-slot';
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
  const { duration, playbackRateRange, playbackRate, playback, playbackMode } = elements;
  const { frameCount, settings, playing, isLoop } = state;

  duration.value = frameCount;
  playbackRateRange.value = settings.playbackRate;
  playbackRate.value = settings.playbackRate;
  playback.classList.toggle('is-active', playing);
  playback.setAttribute('aria-pressed', String(playing));
  playbackMode.classList.toggle('is-active', isLoop);
  playbackMode.setAttribute('aria-pressed', String(isLoop));
  playbackMode.title = isLoop ? '반복 재생' : '한 번 재생';
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
    button.className = 'pose-keyframe';
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
  const { onSelectFixed, onStartDrag, onMoveDrag, onFinishDrag } = handlers;

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
    onStartDrag(id);
    drag = { pointerId: event.pointerId };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    onMoveDrag(id, event);
  });
  const finish = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    onFinishDrag(id);
  };
  button.addEventListener('pointerup', finish);
  button.addEventListener('pointercancel', finish);
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
