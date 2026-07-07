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
  input.addEventListener('change', () => onChange(Number(input.value)));
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
  groupSelect.addEventListener('change', () => {
    const nextAction = firstActionOption(context, groupSelect.value)?.value || '';
    context.onChange('fromActions', nextAction ? [nextAction] : []);
  });

  const actionSelect = document.createElement('select');
  actionSelect.className = 'modifier-select-field';
  actionSelect.title = '연계 대상 Action';
  const options = actionOptions(context, group);
  options.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    actionSelect.append(option);
  });
  actionSelect.value = fromAction || options[0]?.value || '';
  actionSelect.disabled = options.length <= 0;
  actionSelect.addEventListener('change', () =>
    context.onChange('fromActions', actionSelect.value ? [actionSelect.value] : [])
  );

  row.append(groupSelect, actionSelect);
  return row;
}

function actionOptions(context, group) {
  return (context.actionOptionsForGroup?.(group) || []).filter((action) => action.value !== context.actionKey);
}

function firstActionOption(context, group) {
  return actionOptions(context, group)[0] || null;
}
