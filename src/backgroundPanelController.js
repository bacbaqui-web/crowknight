import { preloadSceneBackground } from './backgroundRenderer.js';
import { refreshClipBackground } from './clipBackgroundRuntime.js';
import { normalizeSceneBackground } from './sceneSession.js';

const ROLE_ORDER = ['back', 'ground', 'front'];
const ROLE_LABELS = {
  back: '뒤 배경',
  ground: '땅',
  front: '앞 배경',
};
const ROLE_TITLES = {
  back: '뒤 배경',
  ground: '땅',
  front: '앞 배경',
};
const NUMBER_DRAG_PIXELS_PER_STEP = 8;

export function createBackgroundPanelController({ elements, getSceneSession, saveState, refreshClipSettings }) {
  const { backgroundClipUpload, backgroundClipFile, backgroundRefresh, backgroundLayerList } = elements;
  if (!backgroundLayerList) return { sync: () => {} };

  let draggedLayerId = null;
  let lastRenderedSignature = '';
  let numberDrag = null;
  let refreshInFlight = false;

  backgroundClipUpload?.addEventListener('click', () => {
    if (refreshInFlight) return;
    backgroundClipFile.value = '';
    backgroundClipFile.click();
  });
  backgroundClipFile?.addEventListener('change', async () => {
    const clipFile = backgroundClipFile.files?.[0];
    if (!clipFile) return;
    await runClipRefresh({
      button: backgroundClipUpload,
      label: '로컬 PSD 파일 선택 및 업로드',
      clipFile,
    });
  });
  backgroundRefresh?.addEventListener('click', async () => {
    await runClipRefresh({
      button: backgroundRefresh,
      label: '기본 배경 파일 새로고침 및 업로드',
    });
  });
  backgroundLayerList.addEventListener('input', handleInput);
  backgroundLayerList.addEventListener('click', handleClick);
  backgroundLayerList.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
  backgroundLayerList.addEventListener('dragstart', handleDragStart);
  backgroundLayerList.addEventListener('dragover', handleDragOver);
  backgroundLayerList.addEventListener('drop', handleDrop);
  backgroundLayerList.addEventListener('dragend', handleDragEnd);

  async function runClipRefresh({ button, label, clipFile = null }) {
    if (refreshInFlight) return;
    refreshInFlight = true;
    button.disabled = true;
    button.classList.add('is-refreshing');
    button.setAttribute('aria-label', `${label} 처리중`);
    try {
      const refreshed = refreshClipSettings
        ? await refreshClipSettings({ clipFile })
        : await refreshClipBackground({
            getSceneSession,
            onUpdate: preloadSceneBackground,
            force: true,
            clipFile,
          });
      setRefreshResult(button, label, refreshed);
      if (refreshed) sync({ force: true });
    } finally {
      refreshInFlight = false;
      button.disabled = false;
      button.classList.remove('is-refreshing');
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (!target.matches('[data-background-field]')) return;

    const layerId = target.closest('[data-layer-id]')?.dataset.layerId;
    const field = target.dataset.backgroundField;
    updateLayer(layerId, { [field]: Number(target.value) });
    syncLayerFieldInputs(target);
  }

  function handleClick(event) {
    const stepButton = event.target.closest('[data-background-step]');
    if (stepButton) {
      stepBackgroundInput(stepButton);
      return;
    }

    const enabledButton = event.target.closest('[data-background-enabled]');
    if (enabledButton) {
      const layerId = enabledButton.closest('[data-layer-id]')?.dataset.layerId;
      const enabled = enabledButton.getAttribute('aria-pressed') !== 'true';
      updateLayer(layerId, { enabled });
      sync({ force: true });
      return;
    }

    const roleButton = event.target.closest('[data-background-role]');
    if (!roleButton) return;

    const layerId = roleButton.closest('[data-layer-id]')?.dataset.layerId;
    updateLayer(layerId, { role: roleButton.dataset.role, enabled: true });
    sync({ force: true });
  }

  function handleDragStart(event) {
    if (isBackgroundControlTarget(event.target)) {
      event.preventDefault();
      return;
    }

    const item = event.target.closest('[data-layer-id]');
    draggedLayerId = item?.dataset.layerId || null;
    if (!draggedLayerId) return;
    item.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedLayerId);
  }

  function handleDragOver(event) {
    if (!draggedLayerId || !event.target.closest('[data-layer-id]')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const targetId = event.target.closest('[data-layer-id]')?.dataset.layerId;
    if (targetId && targetId !== draggedLayerId) {
      animateLayerMove(() => moveLayer(draggedLayerId, targetId));
    }
  }

  function handleDrop(event) {
    const targetItem = event.target.closest('[data-layer-id]');
    if (!draggedLayerId || !targetItem) return;

    event.preventDefault();
    moveLayer(draggedLayerId, targetItem.dataset.layerId);
    sync({ force: true });
  }

  function handleDragEnd() {
    draggedLayerId = null;
    backgroundLayerList.querySelectorAll('.is-dragging').forEach((item) => item.classList.remove('is-dragging'));
  }

  function updateLayer(layerId, patch) {
    if (!layerId) return;
    const session = getSceneSession();
    const background = normalizeSceneBackground({ ...session.background, type: 'layers' });
    const layer = background.clipLayers.find((item) => item.id === layerId);
    if (!layer) return;

    Object.assign(layer, patch);
    session.background = background;
    preloadSceneBackground(session.background);
    saveState();
  }

  function moveLayer(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;

    const session = getSceneSession();
    const background = normalizeSceneBackground({ ...session.background, type: 'layers' });
    const layers = [...background.clipLayers];
    const fromIndex = layers.findIndex((layer) => layer.id === fromId);
    const toIndex = layers.findIndex((layer) => layer.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved);
    layers.forEach((layer, index) => {
      layer.order = index;
    });

    background.clipLayers = layers;
    session.background = background;
    saveState();
  }

  function syncLayerFieldInputs(target) {
    const item = target.closest('[data-layer-id]');
    if (!item) return;
    item.querySelectorAll(`[data-background-field="${target.dataset.backgroundField}"]`).forEach((input) => {
      if (input !== target) input.value = target.value;
    });
  }

  function stepBackgroundInput(button) {
    const input = button.closest('.background-compact-input')?.querySelector('[data-background-field]');
    if (!input) return;

    const step = Number(input.step) || 1;
    const direction = Number(button.dataset.backgroundStep) || 0;
    const min = Number(input.min);
    const max = Number(input.max);
    const nextValue = clampNumber(Number(input.value) + step * direction, min, max);
    input.value = formatInputValue(nextValue, step);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || event.target.closest('[data-background-step]')) return;

    const control = event.target.closest('.background-compact-input');
    if (!control) return;

    const input = control.querySelector('[data-background-field]');
    if (!input) return;

    numberDrag = {
      control,
      input,
      pointerId: event.pointerId,
      startY: event.clientY,
      startValue: Number(input.value) || 0,
      lastStepCount: 0,
      moved: false,
      min: Number(input.min),
      max: Number(input.max),
      step: Number(input.step) || 1,
    };
    control.classList.add('is-number-dragging');
    control.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!numberDrag || numberDrag.pointerId !== event.pointerId) return;

    const distance = numberDrag.startY - event.clientY;
    const stepCount = Math.trunc(distance / NUMBER_DRAG_PIXELS_PER_STEP);
    if (stepCount === numberDrag.lastStepCount) return;

    numberDrag.lastStepCount = stepCount;
    numberDrag.moved = true;
    const nextValue = clampNumber(numberDrag.startValue + stepCount * numberDrag.step, numberDrag.min, numberDrag.max);
    numberDrag.input.value = formatInputValue(nextValue, numberDrag.step);
    numberDrag.input.dispatchEvent(new Event('input', { bubbles: true }));
    event.preventDefault();
  }

  function handlePointerUp(event) {
    if (!numberDrag || numberDrag.pointerId !== event.pointerId) return;

    numberDrag.control.releasePointerCapture?.(event.pointerId);
    numberDrag.control.classList.remove('is-number-dragging');
    if (!numberDrag.moved) {
      numberDrag.input.focus();
      numberDrag.input.select();
    }
    numberDrag = null;
  }

  function sync({ force = false } = {}) {
    const session = getSceneSession();
    const background = normalizeSceneBackground({ ...session.background, type: 'layers' });
    session.background = background;
    const nextSignature = renderSignature(background.clipLayers);
    if (!force && nextSignature === lastRenderedSignature) return;
    lastRenderedSignature = nextSignature;
    render(background.clipLayers);
  }

  function setRefreshResult(button, label, ok) {
    button.classList.toggle('is-success', Boolean(ok));
    button.classList.toggle('is-error', !ok);
    button.setAttribute('aria-label', `${label} ${ok ? '완료' : '실패'}`);
    window.setTimeout(() => {
      button.classList.remove('is-success', 'is-error');
      button.setAttribute('aria-label', label);
    }, 1200);
  }

  function animateLayerMove(update) {
    const before = layerRects();
    update();
    sync({ force: true });
    animateFromRects(before);
  }

  function render(layers) {
    backgroundLayerList.innerHTML = '';

    if (!layers.length) {
      const empty = document.createElement('div');
      empty.className = 'part-empty';
      empty.textContent = 'clip 레이어를 기다리는 중';
      backgroundLayerList.append(empty);
      return;
    }

    layers.forEach((layer, index) => {
      backgroundLayerList.append(createLayerItem(layer, index));
    });
  }

  sync({ force: true });

  return { sync };
}

function layerRects() {
  return new Map(
    [...document.querySelectorAll('.background-layer-item')].map((item) => [
      item.dataset.layerId,
      item.getBoundingClientRect(),
    ])
  );
}

function animateFromRects(before) {
  document.querySelectorAll('.background-layer-item').forEach((item) => {
    const previous = before.get(item.dataset.layerId);
    if (!previous) return;

    const current = item.getBoundingClientRect();
    const deltaY = previous.top - current.top;
    if (!deltaY) return;

    item.animate([{ transform: `translateY(${deltaY}px)` }, { transform: 'translateY(0)' }], {
      duration: 150,
      easing: 'ease-out',
    });
  });
}

function createLayerItem(layer, index) {
  const item = document.createElement('article');
  item.className = `background-layer-item is-${layer.role}`;
  item.dataset.layerId = layer.id;
  item.draggable = true;

  const header = document.createElement('div');
  header.className = 'background-layer-header';

  const name = document.createElement('div');
  name.className = 'background-layer-name';
  name.textContent = `${index + 1}. ${layer.name}`;

  const roleGroup = document.createElement('div');
  roleGroup.className = 'background-role-group';
  ROLE_ORDER.forEach((role) => roleGroup.append(createRoleButton(layer, role)));

  const enabled = document.createElement('button');
  enabled.className = 'background-layer-enabled';
  enabled.type = 'button';
  enabled.dataset.backgroundEnabled = 'true';
  enabled.setAttribute('aria-label', `${layer.name} 사용`);
  enabled.setAttribute('aria-pressed', String(layer.enabled));
  enabled.innerHTML = enabledIcon(layer.enabled);

  header.append(name, roleGroup, enabled);

  const controls = document.createElement('div');
  controls.className = 'background-layer-controls';
  controls.append(
    createCompactInput('I', 'influence', layer.influence, 0, 2, 0.05),
    createCompactInput('X', 'offsetX', layer.offsetX, -600, 600, 1),
    createCompactInput('Y', 'offsetY', layer.offsetY, -600, 600, 1),
    createCompactInput('W', 'scale', layer.scale, 0.2, 3, 0.05),
    createCompactInput('V', 'verticalInfluence', layer.verticalInfluence, 0, 2, 0.05),
    createCompactInput('O', 'opacity', layer.opacity, 0, 1, 0.05)
  );

  item.append(header, controls);
  return item;
}

function createCompactInput(labelText, field, value, min, max, step) {
  const wrap = document.createElement('label');
  wrap.className = 'background-compact-input';

  const label = document.createElement('span');
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'number';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = formatInputValue(value, step);
  input.dataset.backgroundField = field;

  const steppers = document.createElement('span');
  steppers.className = 'background-stepper-buttons';
  steppers.innerHTML =
    '<button type="button" data-background-step="1" aria-label="값 증가">▲</button><button type="button" data-background-step="-1" aria-label="값 감소">▼</button>';

  wrap.append(label, input, steppers);
  return wrap;
}

function createRoleButton(layer, role) {
  const button = document.createElement('button');
  button.className = 'background-layer-role';
  button.type = 'button';
  button.dataset.backgroundRole = 'true';
  button.dataset.role = role;
  button.title = ROLE_TITLES[role];
  button.setAttribute('aria-label', `${layer.name} 속성 ${ROLE_LABELS[role]}`);
  button.setAttribute('aria-pressed', String(layer.role === role));
  button.innerHTML = roleIcon(role);
  return button;
}

function roleIcon(role) {
  const icons = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16"></path><path d="M7 13h10"></path><path d="M10 9h4"></path></svg>',
    ground:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15h18"></path><path d="M6 15l2 4"></path><path d="M18 15l-2 4"></path></svg>',
    front:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16"></path><path d="M6 10l6-6 6 6"></path><path d="M6 18h12"></path></svg>',
  };
  return icons[role] || icons.back;
}

function enabledIcon(enabled) {
  if (enabled) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>';
}

function renderSignature(layers) {
  return layers
    .map((layer) =>
      [
        layer.id,
        layer.name,
        layer.role,
        layer.enabled,
        layer.imageSrc,
        layer.influence,
        layer.verticalInfluence,
        layer.order,
      ].join(':')
    )
    .join('|');
}

function isBackgroundControlTarget(target) {
  return Boolean(
    target.closest(
      [
        'button',
        'input',
        '.background-layer-controls',
        '.background-compact-input',
        '.background-role-group',
        '.background-layer-enabled',
      ].join(',')
    )
  );
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function formatInputValue(value, step) {
  if (step >= 1) return String(Math.round(value));
  return String(Number(value.toFixed(2)));
}
