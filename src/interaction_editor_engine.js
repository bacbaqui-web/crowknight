import { isInteractionObjectPartKey, interactionObjectParentPartKey } from './interaction_object_editor_controller.js';
import { partLabel } from './editor_label_helper.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { interactionFieldLimits } from './part_source_data.js';
import { clamp } from './common_helper.js';
import {
  INTERACTION_ROLE_DEFS,
  INTERACTION_TOGGLE_PROPS,
  interactionDefaultValue,
  interactionDetailFieldProps,
  interactionDetailGroups,
  interactionRoleLabel,
} from './interaction_field_data.js';

export function renderInteractionEditor(container, options) {
  renderEditorDataCard(
    container,
    { title: options.title || '상호작용', className: 'interaction-editor-card' },
    (body) => {
      if (options.fixedRole) renderFixedRoleToggle(body, options, options.fixedRole);
      else if (options.showRoleToggles !== false) renderInteractionToggleGrid(body, options);
      renderInteractionDetails(body, options);
    }
  );
}

export function interactionFrameValueFromInput(prop, value) {
  if (INTERACTION_TOGGLE_PROPS.has(prop)) return Number(value) >= 0.5 ? 1 : 0;
  const limits = interactionFieldLimits(prop);
  if (!limits) return Number(value);
  return clamp(Number(value), limits.min, limits.max);
}

export function readInteractionDisplayValue(frameValue, prop) {
  if (INTERACTION_TOGGLE_PROPS.has(prop)) {
    return Number(frameValue?.[prop] ?? interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  }
  return frameValue?.[prop] ?? interactionDefaultValue(prop);
}

function renderInteractionToggleGrid(body, options) {
  const { onWrite, defaultValue = null } = options;
  const grid = document.createElement('div');
  grid.className = 'interaction-toggle-grid';
  INTERACTION_ROLE_DEFS.forEach(({ prop, label }) => {
    const item = document.createElement('label');
    item.className = 'editor-check-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isInteractionValueOn(options, prop, prop);
    checkbox.addEventListener('change', () => {
      const nextValue = checkbox.checked ? 1 : 0;
      onWrite('active', nextValue, { role: prop, rerender: false });
      if (nextValue)
        writeDefaultInteractionDetails(prop, interactionDefaultForRole(options, prop, defaultValue), onWrite);
      onWrite(prop, nextValue, { role: prop, rerender: true });
    });
    item.append(checkbox, document.createTextNode(label));
    grid.append(item);
  });
  body.append(grid);
}

function renderFixedRoleToggle(body, options, role) {
  if (options.showRoleToggles === false) return;

  const { onWrite, defaultValue = null } = options;
  const item = document.createElement('label');
  item.className = 'editor-check-row interaction-fixed-role-toggle';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isInteractionValueOn(options, 'active', role) && isInteractionValueOn(options, role, role);
  checkbox.addEventListener('change', () => {
    const nextValue = checkbox.checked ? 1 : 0;
    onWrite('active', nextValue, { role, rerender: false });
    if (nextValue)
      writeDefaultInteractionDetails(role, interactionDefaultForRole(options, role, defaultValue), onWrite);
    onWrite(role, nextValue, { role, rerender: true });
  });
  item.append(checkbox, document.createTextNode('사용'));
  body.append(item);
}

function renderInteractionDetails(body, options) {
  const { targetKey = null, fixedRole = null } = options;
  const activeRoles = fixedRole
    ? [{ prop: fixedRole, label: interactionRoleLabel(fixedRole) }]
    : INTERACTION_ROLE_DEFS.filter(({ prop }) => isInteractionValueOn(options, prop, prop));
  if (!activeRoles.length) {
    const empty = document.createElement('div');
    empty.className = 'editor-data-empty';
    empty.textContent = '활성화된 상호작용이 없습니다.';
    body.append(empty);
    return;
  }

  activeRoles.forEach(({ prop, label }) => {
    const section = document.createElement('div');
    section.className = 'interaction-detail-section';
    const heading = document.createElement('div');
    heading.className = 'interaction-detail-title';
    heading.textContent = interactionDetailTitle(label, options.targetKeyForRole?.(prop) || targetKey);
    section.append(heading);

    const groups = interactionDetailGroups(prop);
    renderInteractionDetailControls(section, groups, options, prop);
    body.append(section);
  });
}

function renderInteractionDetailControls(section, groups, options, role) {
  groups.forEach((group) => {
    renderInteractionCheckRows(section, group.toggles || [], options, role);
    if (!group.props?.length) return;
    renderScrubGroups(
      section,
      [group],
      (field) => readInteractionOptionValue(options, field, role),
      (field, value) => options.onWrite(field, interactionFrameValueFromInput(field, value), { role, rerender: false }),
      options.scrubCallbacks
    );
  });
}

function renderInteractionCheckRows(section, toggles, options, role) {
  const { onWrite } = options;
  toggles.forEach(({ prop, label }) => {
    const item = document.createElement('label');
    item.className = 'editor-check-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = readInteractionOptionValue(options, prop, role) >= 0.5;
    checkbox.addEventListener('change', () => {
      onWrite(prop, interactionFrameValueFromInput(prop, checkbox.checked ? 1 : 0), { role, rerender: false });
    });
    item.append(checkbox, document.createTextNode(label));
    section.append(item);
  });
}

function interactionDetailTitle(label, targetKey) {
  if (!isInteractionObjectPartKey(targetKey)) return label;
  const parentKey = interactionObjectParentPartKey(targetKey);
  return parentKey ? `${label} / 부모 ${partLabel(parentKey)}` : label;
}

function writeDefaultInteractionDetails(role, defaultValue, onWrite) {
  if (!defaultValue) return;
  interactionDetailFieldProps(role).forEach((field) => {
    const value = defaultValue[field] ?? interactionDefaultValue(field);
    onWrite(field, interactionFrameValueFromInput(field, value), { role, rerender: false });
  });
}

function readInteractionOptionValue(options, prop, role = null) {
  if (typeof options?.readValue === 'function') return options.readValue(prop, role);
  return readInteractionDisplayValue(options?.frameValue, prop);
}

function isInteractionValueOn(options, prop, role = null) {
  return Number(readInteractionOptionValue(options, prop, role)) >= 0.5;
}

function interactionDefaultForRole(options, role, fallback) {
  return typeof options?.defaultValueForRole === 'function' ? options.defaultValueForRole(role) : fallback;
}
