import { renderEditorDataCard } from './editor_card_panel_view.js';
import { MODIFIER_DEFS } from './timeline_modifier_data.js';

export function renderModifierEditor(container, { modifiers, onToggle, onSettingChange }) {
  renderEditorDataCard(container, { title: 'Modifiers', className: 'modifier-editor-card' }, (body) => {
    MODIFIER_DEFS.forEach((def) => renderModifierRow(body, def, modifiers, onToggle, onSettingChange));
  });
}

function renderModifierRow(body, def, modifiers, onToggle, onSettingChange) {
  const modifier = modifiers.find((item) => item.type === def.type);
  const section = document.createElement('div');
  section.className = 'modifier-row';

  const label = document.createElement('label');
  label.className = 'editor-check-row';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(modifier?.enabled);
  checkbox.addEventListener('change', () => onToggle(def.type, checkbox.checked));
  label.append(checkbox, document.createTextNode(def.label));
  section.append(label);

  if (checkbox.checked) section.append(renderModifierSettings(def, modifier, onSettingChange));
  body.append(section);
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
  if (setting.prop === 'endFrame') return 1;
  if (setting.prop === 'intensity' || setting.prop === 'amount' || setting.prop === 'scale') return 1;
  return 0;
}
