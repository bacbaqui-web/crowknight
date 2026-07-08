import { ACTION_GROUPS, normalizeActionGroup } from '../action_group_helper.js';

export function renderFormulaNumberField(labelText, value, onChange, unitText = '') {
  const label = document.createElement('label');
  label.className = 'modifier-setting-row';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.value = String(value ?? 0);
  let lastValue = Number(input.value);
  const commit = () => {
    const nextValue = Number(input.value);
    if (Object.is(nextValue, lastValue)) return;
    lastValue = nextValue;
    const committedValue = onChange(nextValue);
    if (committedValue === undefined) return;
    input.value = String(committedValue);
    lastValue = Number(committedValue);
  };
  input.addEventListener('input', commit);
  input.addEventListener('change', commit);
  label.append(text, input);
  if (unitText) {
    const unit = document.createElement('span');
    unit.className = 'modifier-unit-label';
    unit.textContent = unitText;
    label.append(unit);
  }
  return label;
}

export function renderFormulaSelectField(labelText, value, options, onChange) {
  const label = document.createElement('label');
  label.className = 'modifier-select-row';
  const text = document.createElement('span');
  text.textContent = labelText;
  const select = document.createElement('select');
  select.className = 'modifier-select-field';
  options.forEach((option) => {
    const item = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    select.append(item);
  });
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  label.append(text, select);
  return label;
}

export function renderFormulaButtonGroup(labelText, value, options, onChange) {
  const row = document.createElement('div');
  row.className = 'modifier-select-row';
  const text = document.createElement('span');
  text.textContent = labelText;
  const group = document.createElement('div');
  group.className = 'modifier-tag-list';
  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'modifier-tag-pill';
    button.classList.toggle('is-active', option.value === value);
    button.setAttribute('aria-pressed', option.value === value ? 'true' : 'false');
    button.textContent = option.label;
    button.addEventListener('click', () => {
      Array.from(group.children).forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      onChange(option.value);
    });
    group.append(button);
  });
  row.append(text, group);
  return row;
}

export function renderFormulaInlineStepperFields(fields = []) {
  const row = document.createElement('div');
  row.className = 'formula-inline-stepper-row';
  fields.forEach((field) => row.append(renderFormulaInlineStepperField(field)));
  return row;
}

export function renderFormulaRangeField({ label, value, min = 0, max = 10, step = 1, onChange, formatValue = null }) {
  const row = document.createElement('label');
  row.className = 'formula-range-row';
  const text = document.createElement('span');
  text.className = 'formula-range-label';
  text.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value ?? min);
  const output = document.createElement('span');
  output.className = 'formula-range-value';
  const syncOutput = (nextValue) => {
    output.textContent = typeof formatValue === 'function' ? formatValue(nextValue) : String(nextValue);
  };
  const commit = () => {
    const nextValue = clampInlineStepperValue(Number(input.value), input);
    input.value = String(nextValue);
    syncOutput(nextValue);
    const committedValue = onChange(nextValue);
    if (committedValue === undefined) return;
    input.value = String(committedValue);
    syncOutput(committedValue);
  };
  syncOutput(Number(input.value));
  input.addEventListener('input', commit);
  input.addEventListener('change', commit);
  row.append(text, input, output);
  return row;
}

function renderFormulaInlineStepperField({ label, value, onChange, step = 1, min = null, max = null }) {
  const wrap = document.createElement('label');
  wrap.className = 'formula-inline-stepper-field';
  wrap.title = label;
  const text = document.createElement('span');
  text.className = 'formula-inline-stepper-label';
  text.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(step);
  if (min !== null) input.min = String(min);
  if (max !== null) input.max = String(max);
  input.value = String(value ?? 0);
  input.setAttribute('aria-label', label);
  let lastValue = Number(input.value);
  const commit = (nextValue = Number(input.value)) => {
    const clamped = clampInlineStepperValue(nextValue, input);
    if (Object.is(clamped, lastValue)) return;
    lastValue = clamped;
    const committedValue = onChange(clamped);
    const displayValue = committedValue === undefined ? clamped : committedValue;
    input.value = String(displayValue);
    lastValue = Number(displayValue);
  };
  input.addEventListener('input', () => commit());
  input.addEventListener('change', () => commit());
  wrap.append(text, input, renderInlineStepperButtons(input, commit, Number(step || 1)));
  return wrap;
}

function renderInlineStepperButtons(input, commit, step) {
  const buttons = document.createElement('span');
  buttons.className = 'formula-inline-stepper-buttons';
  const up = document.createElement('button');
  const down = document.createElement('button');
  up.type = 'button';
  down.type = 'button';
  up.setAttribute('aria-label', '값 올리기');
  down.setAttribute('aria-label', '값 내리기');
  up.textContent = '▲';
  down.textContent = '▼';
  up.addEventListener('click', (event) => stepInlineStepper(event, input, commit, step));
  down.addEventListener('click', (event) => stepInlineStepper(event, input, commit, -step));
  buttons.append(up, down);
  return buttons;
}

function stepInlineStepper(event, input, commit, step) {
  event.preventDefault();
  event.stopPropagation();
  const multiplier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
  const nextValue = Number(input.value || 0) + step * multiplier;
  input.value = String(clampInlineStepperValue(nextValue, input));
  commit(Number(input.value));
}

function clampInlineStepperValue(value, input) {
  const min = input.min === '' ? -Infinity : Number(input.min);
  const max = input.max === '' ? Infinity : Number(input.max);
  const number = Number(value);
  if (!Number.isFinite(number)) return Number(input.value || 0);
  return Math.min(max, Math.max(min, Math.round(number * 10) / 10));
}

export function renderFormulaActionTargetFields(formula, context) {
  const row = document.createElement('div');
  row.className = 'action-runtime-rule-link-targets';
  const fromAction = formula.fromActions?.[0] || '';
  const group = normalizeActionGroup(
    fromAction ? context.actionGroupForKey?.(fromAction) : context.actionGroupForKey?.(context.actionKey)
  );

  const groupSelect = document.createElement('select');
  groupSelect.className = 'modifier-select-field';
  groupSelect.title = '연계 대상 폴더';
  ACTION_GROUPS.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.key;
    option.textContent = item.label;
    groupSelect.append(option);
  });
  groupSelect.value = group;

  const actionSelect = document.createElement('select');
  actionSelect.className = 'modifier-select-field';
  actionSelect.title = '연계 대상 Action';
  syncActionSelect(actionSelect, actionOptions(context, group), fromAction);
  groupSelect.addEventListener('change', () => {
    const options = actionOptions(context, groupSelect.value);
    const nextAction = options[0]?.value || '';
    syncActionSelect(actionSelect, options, nextAction);
    context.onChange('fromActions', nextAction ? [nextAction] : []);
  });
  actionSelect.addEventListener('change', () =>
    context.onChange('fromActions', actionSelect.value ? [actionSelect.value] : [])
  );

  row.append(groupSelect, actionSelect);
  return row;
}

function actionOptions(context, group) {
  return (context.actionOptionsForGroup?.(group) || []).filter((action) => action.value !== context.actionKey);
}

function syncActionSelect(select, options, value) {
  select.innerHTML = '';
  options.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.append(option);
  });
  select.value = value || options[0]?.value || '';
  select.disabled = options.length <= 0;
}
