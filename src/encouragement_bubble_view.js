import { normalizeRankingMessage, validRankingMessage } from './ranking_message_helper.js';

const DEFAULT_MAX_BUBBLES = 24;
const MESSAGE_POOL_LIMIT = 100;
const EDGE_ZONES = [
  { xMin: 0.04, xMax: 0.22, yMin: 0.12, yMax: 0.78 },
  { xMin: 0.76, xMax: 0.96, yMin: 0.12, yMax: 0.78 },
  { xMin: 0.18, xMax: 0.82, yMin: 0.05, yMax: 0.2 },
  { xMin: 0.18, xMax: 0.82, yMin: 0.76, yMax: 0.92 },
];

export function createEncouragementBubbleController({ root, maxBubbles = DEFAULT_MAX_BUBBLES } = {}) {
  const bubbles = [];
  let latestEntries = [];
  let frameId = 0;
  let lastTime = 0;
  let active = false;

  function refresh(entries = []) {
    latestEntries = Array.isArray(entries) ? entries : [];
    render();
  }

  function setActive(nextActive) {
    active = Boolean(nextActive);
    render();
  }

  function render() {
    if (!root) return;

    stop();
    root.innerHTML = '';
    bubbles.length = 0;

    const messages = active ? selectBubbleMessages(latestEntries, maxBubbles) : [];
    root.hidden = !active || messages.length === 0;
    if (root.hidden) return;

    messages.forEach((entry, index) => {
      const element = document.createElement('button');
      const message = document.createElement('span');
      const name = document.createElement('small');
      const bubble = createBubbleState(root, index);

      element.className = ['encouragement-bubble', bubbleLengthClass(entry.message)].filter(Boolean).join(' ');
      element.type = 'button';
      element.setAttribute('aria-label', `${entry.name}의 응원 메시지`);
      message.textContent = entry.message;
      name.textContent = `- ${entry.name}`;
      element.append(message, name);
      element.addEventListener('pointerdown', (event) => beginBubbleDrag(root, bubble, event));

      bubble.element = element;
      bubbles.push(bubble);
      root.append(element);
      applyBubblePosition(bubble);
    });

    start();
  }

  function start() {
    lastTime = performance.now();
    frameId = requestAnimationFrame(tick);
  }

  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    bubbles.forEach((bubble) => updateBubble(root, bubble, dt, now));
    frameId = requestAnimationFrame(tick);
  }

  render();

  return {
    refresh,
    setActive,
    stop,
  };
}

function selectBubbleMessages(entries, limit) {
  return shuffle(
    entries
      .map(normalizeBubbleEntry)
      .filter(Boolean)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
      .slice(0, MESSAGE_POOL_LIMIT)
  ).slice(0, limit);
}

function normalizeBubbleEntry(entry) {
  const message = normalizeRankingMessage(entry?.message);
  if (!message || !validRankingMessage(message)) return null;
  return {
    name: String(entry?.name || '이름 없음').slice(0, 12),
    message,
    createdAt: Number(entry?.createdAt || 0),
  };
}

function bubbleLengthClass(message) {
  const length = String(message || '').length;
  if (length >= 18) return 'is-message-very-long';
  if (length >= 14) return 'is-message-long';
  return '';
}

function createBubbleState(root, index) {
  const bounds = root.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const zone = EDGE_ZONES[index % EDGE_ZONES.length];
  const x = randomRange(zone.xMin * width, zone.xMax * width);
  const y = randomRange(zone.yMin * height, zone.yMax * height);

  return {
    element: null,
    baseX: x,
    baseY: y,
    x,
    y,
    driftX: randomRange(8, 18),
    driftY: randomRange(6, 14),
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    speedX: randomRange(0.22, 0.42),
    speedY: randomRange(0.18, 0.36),
    pausedUntil: 0,
    scale: 1,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    dragStartX: 0,
    dragStartY: 0,
    dragMoved: false,
  };
}

function updateBubble(root, bubble, dt, now) {
  if (bubble.dragging || now < bubble.pausedUntil) return;

  bubble.phaseX += bubble.speedX * dt;
  bubble.phaseY += bubble.speedY * dt;
  bubble.x = bubble.baseX + Math.sin(bubble.phaseX) * bubble.driftX;
  bubble.y = bubble.baseY + Math.cos(bubble.phaseY) * bubble.driftY;
  applyBubblePosition(bubble);
}

function beginBubbleDrag(root, bubble, event) {
  if (event.button !== undefined && event.button !== 0) return;

  event.preventDefault();
  const pointer = eventPointInRoot(root, event);
  bubble.dragging = true;
  bubble.dragOffsetX = pointer.x - bubble.x;
  bubble.dragOffsetY = pointer.y - bubble.y;
  bubble.dragStartX = pointer.x;
  bubble.dragStartY = pointer.y;
  bubble.dragMoved = false;
  bubble.pausedUntil = 0;
  bubble.scale = 1.08;
  bubble.element.classList.add('is-dragging');
  bubble.element.setPointerCapture?.(event.pointerId);
  applyBubblePosition(bubble);

  const move = (moveEvent) => moveBubbleDrag(root, bubble, moveEvent);
  const end = (endEvent) => {
    bubble.element.removeEventListener('pointermove', move);
    bubble.element.removeEventListener('pointerup', end);
    bubble.element.removeEventListener('pointercancel', end);
    finishBubbleDrag(root, bubble, endEvent);
  };

  bubble.element.addEventListener('pointermove', move);
  bubble.element.addEventListener('pointerup', end);
  bubble.element.addEventListener('pointercancel', end);
}

function moveBubbleDrag(root, bubble, event) {
  if (!bubble.dragging) return;

  event.preventDefault();
  const pointer = eventPointInRoot(root, event);
  const distance = Math.hypot(pointer.x - bubble.dragStartX, pointer.y - bubble.dragStartY);
  if (distance > 3) bubble.dragMoved = true;
  bubble.x = pointer.x - bubble.dragOffsetX;
  bubble.y = pointer.y - bubble.dragOffsetY;
  applyBubblePosition(bubble);
}

function finishBubbleDrag(root, bubble, event) {
  bubble.element.releasePointerCapture?.(event.pointerId);
  bubble.element.classList.remove('is-dragging');

  if (bubble.dragMoved) {
    const bounds = root.getBoundingClientRect();
    bubble.baseX = clamp(bubble.x, -20, Math.max(-20, bounds.width - 40));
    bubble.baseY = clamp(bubble.y, -20, Math.max(-20, bounds.height - 40));
    bubble.x = bubble.baseX;
    bubble.y = bubble.baseY;
    bubble.phaseX = Math.random() * Math.PI * 2;
    bubble.phaseY = Math.random() * Math.PI * 2;
    bubble.scale = 1;
    bubble.pausedUntil = performance.now() + 250;
    applyBubblePosition(bubble);
  } else {
    pauseBubble(bubble.element, bubble);
  }

  bubble.dragging = false;
}

function eventPointInRoot(root, event) {
  const bounds = root.getBoundingClientRect();
  return {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  };
}

function pauseBubble(element, bubble) {
  bubble.pausedUntil = performance.now() + 1800;
  bubble.scale = 1.08;
  applyBubblePosition(bubble);
  element.classList.add('is-paused');
  window.setTimeout(() => {
    bubble.scale = 1;
    applyBubblePosition(bubble);
    element.classList.remove('is-paused');
  }, 1800);
}

function applyBubblePosition(bubble) {
  bubble.element.style.transform = `translate3d(${bubble.x}px, ${bubble.y}px, 0) scale(${bubble.scale})`;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function shuffle(values) {
  const list = [...values];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}
