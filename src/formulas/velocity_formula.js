import { ACTION_MAX_FRAMES } from '../game_config_data.js';
import { renderGraphPickerField } from '../graph_picker_view.js';

export const VELOCITY_CURVES = ['easeIn', 'linear', 'easeOut'];

export const velocityFormula = {
  type: 'velocity',
  label: '속도',
  defaultValue: () => ({
    type: 'velocity',
    enabled: false,
    startFrame: 1,
    endFrame: ACTION_MAX_FRAMES,
    x: 0,
    y: 0,
    mode: 'set',
    curve: 'linear',
  }),
  normalize(source = {}) {
    return {
      ...this.defaultValue(),
      enabled: Boolean(source.enabled),
      startFrame: source.startFrame,
      endFrame: source.endFrame,
      x: Number(source.x ?? source.settings?.x ?? 0),
      y: Number(source.y ?? source.settings?.y ?? 0),
      mode: source.mode === 'add' || source.settings?.mode === 'add' ? 'add' : 'set',
      curve: normalizeVelocityCurve(source.curve ?? source.settings?.curve),
    };
  },
  renderOptions(container, formula, context) {
    container.append(
      renderVelocityInlineControls(formula, context),
      renderGraphPickerField(
        '그래프',
        formula.curve,
        [
          { value: 'easeIn', label: '이지인' },
          { value: 'linear', label: '리니어' },
          { value: 'easeOut', label: '이지아웃' },
        ],
        (value) => context.onChange('curve', value)
      )
    );
  },
  runtime: {
    appliesTo: 'velocity',
  },
};

function renderVelocityInlineControls(formula, context) {
  const row = document.createElement('div');
  row.className = 'velocity-formula-inline-row';
  row.append(
    renderVelocityStepperInput('X Velocity', formula.x, (value) => context.onChange('x', value)),
    renderVelocityStepperInput('Y Velocity', formula.y, (value) => context.onChange('y', value)),
    renderVelocityModeToggle(formula.mode, (value) => context.onChange('mode', value))
  );
  return row;
}

function renderVelocityStepperInput(label, value, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'velocity-formula-input';
  wrap.title = `${label} (px/f)`;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.1';
  input.value = String(value ?? 0);
  input.setAttribute('aria-label', `${label} px/f`);
  const unit = document.createElement('span');
  unit.className = 'velocity-formula-unit';
  unit.textContent = 'px/f';
  unit.setAttribute('aria-hidden', 'true');
  bindVelocityInput(input, onChange);
  wrap.append(input, unit, renderVelocitySteppers(input));
  return wrap;
}

function bindVelocityInput(input, onChange) {
  let lastValue = Number(input.value || 0);
  const commit = (value = Number(input.value)) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || Object.is(nextValue, lastValue)) return;
    lastValue = nextValue;
    const committedValue = onChange(nextValue);
    if (committedValue === undefined) return;
    input.value = String(committedValue);
    lastValue = Number(committedValue);
  };

  input.addEventListener('input', () => commit());
  input.addEventListener('change', () => commit());
  input.commitVelocityValue = commit;
}

function renderVelocitySteppers(input) {
  const steppers = document.createElement('span');
  steppers.className = 'velocity-formula-stepper-buttons';
  const up = document.createElement('button');
  const down = document.createElement('button');
  up.type = 'button';
  down.type = 'button';
  up.setAttribute('aria-label', '값 올리기');
  down.setAttribute('aria-label', '값 내리기');
  up.textContent = '▲';
  down.textContent = '▼';
  up.addEventListener('click', (event) => stepVelocityInput(event, input, 1));
  down.addEventListener('click', (event) => stepVelocityInput(event, input, -1));
  steppers.append(up, down);
  return steppers;
}

function stepVelocityInput(event, input, direction) {
  event.preventDefault();
  event.stopPropagation();
  const step = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
  const nextValue = roundVelocityValue(Number(input.value || 0) + direction * step);
  input.value = String(nextValue);
  input.commitVelocityValue?.(nextValue);
}

function renderVelocityModeToggle(mode, onChange) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'velocity-formula-mode-toggle';
  const sync = (value) => {
    const normalized = value === 'add' ? 'add' : 'set';
    button.dataset.mode = normalized;
    button.title = normalized === 'add' ? 'Add' : 'Set';
    button.setAttribute('aria-label', normalized === 'add' ? '속도 더하기' : '속도 설정');
    button.innerHTML = normalized === 'add' ? modeAddIcon() : modeSetIcon();
  };
  sync(mode);
  button.addEventListener('click', () => {
    const nextMode = button.dataset.mode === 'add' ? 'set' : 'add';
    const committedMode = onChange(nextMode) || nextMode;
    sync(committedMode);
  });
  return button;
}

function roundVelocityValue(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function modeSetIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8h14"></path>
      <path d="M5 16h14"></path>
    </svg>
  `;
}

function modeAddIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14"></path>
      <path d="M5 12h14"></path>
    </svg>
  `;
}

export function normalizeVelocityCurve(value) {
  const curve = String(value || '');
  return VELOCITY_CURVES.includes(curve) ? curve : 'linear';
}
