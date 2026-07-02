import { renderEditorDataCard } from './editor_card_panel_view.js';
import { MODIFIER_DEFS } from './timeline_modifier_data.js';

export function renderModifierEditor(container, { modifiers, onToggle, onSettingChange }) {
  renderAppliedModifierEditor(container, { modifiers, onSettingChange });
  renderModifierLibraryEditor(container, { modifiers, onToggle });
}

export function renderAppliedModifierEditor(container, { modifiers, onSettingChange }) {
  renderEditorDataCard(container, { title: '적용된 수식', className: 'modifier-applied-card' }, (body) => {
    const enabledDefs = MODIFIER_DEFS.map((def) => [def, modifiers.find((item) => item.type === def.type)]).filter(
      ([, modifier]) => modifier?.enabled
    );
    if (!enabledDefs.length) {
      body.append(emptyAppliedModifierMessage());
      return;
    }

    enabledDefs.forEach(([def, modifier]) => renderAppliedModifier(body, def, modifier, onSettingChange));
  });
}

export function renderModifierLibraryEditor(container, { modifiers, onToggle }) {
  renderEditorDataCard(container, { title: '수식 라이브러리', className: 'modifier-library-card' }, (body) => {
    const grid = document.createElement('div');
    grid.className = 'modifier-toggle-grid';
    MODIFIER_DEFS.forEach((def) => renderModifierLibraryItem(grid, def, modifiers, onToggle));
    body.append(grid);
  });
}

function renderAppliedModifier(body, def, modifier, onSettingChange) {
  const section = document.createElement('section');
  section.className = 'modifier-applied-item';

  const title = document.createElement('div');
  title.className = 'modifier-applied-title';
  title.textContent = def.label;
  section.append(title);

  if (def.settings.length) {
    section.append(renderModifierSettings(def, modifier, onSettingChange));
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'modifier-setting-placeholder';
    placeholder.textContent = '설정 준비 중';
    section.append(placeholder);
  }

  body.append(section);
}

function renderModifierLibraryItem(body, def, modifiers, onToggle) {
  const modifier = modifiers.find((item) => item.type === def.type);
  const label = document.createElement('label');
  label.className = 'editor-check-row';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(modifier?.enabled);
  checkbox.addEventListener('change', () => onToggle(def.type, checkbox.checked));
  label.append(checkbox, document.createTextNode(def.label));
  body.append(label);
}

function emptyAppliedModifierMessage() {
  const message = document.createElement('div');
  message.className = 'editor-data-empty';
  message.textContent = '아래 수식 라이브러리에서 사용할 수식을 선택하세요.';
  return message;
}

function renderModifierSettings(def, modifier, onSettingChange) {
  const fields = document.createElement('div');
  fields.className = 'modifier-setting-grid';
  def.settings.forEach((setting) => {
    const label = document.createElement('label');
    label.className = 'modifier-setting-row';
    const text = document.createElement('span');
    text.textContent = setting.label;
    const input = document.createElement('input');
    input.type = setting.kind === 'color' ? 'color' : 'number';
    if (setting.kind !== 'color') {
      input.min = setting.min;
      input.max = setting.max;
      input.step = setting.step;
    }
    input.value = modifier?.settings?.[setting.prop] ?? defaultSettingValue(setting);
    input.addEventListener('input', () => onSettingChange(def.type, setting.prop, input.value));
    label.append(text, input);
    fields.append(label);
  });
  return fields;
}

function defaultSettingValue(setting) {
  if (setting.kind === 'color') return '#ffffff';
  if (setting.prop === 'strength') return 1;
  return 0;
}
