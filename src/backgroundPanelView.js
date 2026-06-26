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

export function captureBackgroundLayerRects() {
  return new Map(
    [...document.querySelectorAll('.background-layer-item')].map((item) => [
      item.dataset.layerId,
      item.getBoundingClientRect(),
    ])
  );
}

export function animateBackgroundLayersFromRects(before) {
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

export function createBackgroundLayerItem(layer, index) {
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

export function renderBackgroundLayerSignature(layers) {
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

export function isBackgroundControlTarget(target) {
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

export function clampBackgroundNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function formatBackgroundInputValue(value, step) {
  if (step >= 1) return String(Math.round(value));
  return String(Number(value.toFixed(2)));
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
  input.value = formatBackgroundInputValue(value, step);
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
