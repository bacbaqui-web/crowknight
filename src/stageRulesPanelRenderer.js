import { STAGE_RULES_PANEL_DEFINITIONS } from './stageRulesPanelDefinitions.js';

export function renderStageRulesPanels(panel, { definitions = STAGE_RULES_PANEL_DEFINITIONS } = {}) {
  const mount = panel.querySelector('#stageRulesPanelMount');
  if (!mount) return;

  mount.replaceChildren(...definitions.map(createStageRulesPanel));
}

function createStageRulesPanel(definition) {
  const section = document.createElement('section');
  section.className = 'setting-section';
  section.dataset.collapsible = '';
  section.dataset.section = definition.key;

  const toggle = document.createElement('button');
  toggle.className = 'section-toggle';
  toggle.type = 'button';
  toggle.textContent = definition.title;

  const content = document.createElement('div');
  content.className = 'section-content';
  content.append(...definition.fields.map(createFieldElement));

  section.append(toggle, content);
  return section;
}

function createFieldElement(field) {
  if (field.type === 'select') return createSelectField(field);
  if (field.type === 'rangeNumber') return createRangeNumberField(field);
  if (field.type === 'summary') return createSummaryField(field);
  return document.createTextNode('');
}

function createSelectField(field) {
  const row = document.createElement('label');
  row.className = 'select-row';

  const label = document.createElement('span');
  label.textContent = field.label;

  const select = document.createElement('select');
  select.id = field.id;
  select.append(...field.options.map(createOption));

  row.append(label, select);
  return row;
}

function createRangeNumberField(field) {
  const row = document.createElement('label');
  row.className = 'setting-row';

  const label = document.createElement('span');
  label.textContent = field.label;

  const range = createNumberInput({
    id: field.rangeId,
    type: 'range',
    min: field.min,
    max: field.max,
    step: field.step,
  });
  const number = createNumberInput({
    id: field.numberId,
    type: 'number',
    min: field.min,
    max: field.max,
    step: field.step,
  });

  row.append(label, range, number);
  return row;
}

function createSummaryField(field) {
  const summary = document.createElement('div');
  summary.id = field.id;
  summary.className = 'part-fields';
  return summary;
}

function createOption(optionDefinition) {
  const option = document.createElement('option');
  option.value = optionDefinition.value;
  option.textContent = optionDefinition.label;
  return option;
}

function createNumberInput({ id, type, min, max, step }) {
  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  return input;
}
