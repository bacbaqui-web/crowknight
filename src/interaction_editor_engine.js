import { isInteractionObjectPartKey, interactionObjectParentPartKey } from './interaction_object_editor.js';
import { partLabel } from './editor_label_helper.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { isInteractionPropOn } from './editable_property_helper.js';
import { interactionFieldLimits } from './part_source_registry.js';
import { clamp } from './utils.js';

const INTERACTION_DEFS = [
  { prop: 'collision', label: '충돌' },
  { prop: 'hurt', label: '피격' },
  { prop: 'attack', label: '공격' },
  { prop: 'guard', label: '방어' },
];

const ATTACK_GROUPS = [
  {
    label: '공격',
    props: [
      { prop: 'stun', label: '경직' },
      { prop: 'knockbackX', label: '넉백 X' },
      { prop: 'knockbackY', label: '넉백 Y' },
      { prop: 'deathBurst', label: '처치 연출' },
    ],
  },
];

const COLLISION_GROUPS = [{ label: '충돌', props: [{ prop: 'pushPower', label: '밀기' }] }];

export function renderInteractionEditor(container, options) {
  renderEditorDataCard(container, { title: '상호작용', className: 'interaction-editor-card' }, (body) => {
    renderInteractionToggleGrid(body, options);
    renderInteractionDetails(body, options);
  });
}

export function interactionFrameValueFromInput(prop, value) {
  if (prop === 'active' || INTERACTION_DEFS.some((item) => item.prop === prop)) return Number(value) >= 0.5 ? 1 : 0;
  const limits = interactionFieldLimits(prop);
  if (!limits) return Number(value);
  return clamp(Number(value), limits.min, limits.max);
}

export function readInteractionDisplayValue(frameValue, prop) {
  if (prop === 'active' || INTERACTION_DEFS.some((item) => item.prop === prop)) {
    return Number(frameValue?.[prop] || 0) >= 0.5 ? 1 : 0;
  }
  return frameValue?.[prop] ?? interactionDefaultValue(prop);
}

function renderInteractionToggleGrid(body, { frameValue, onWrite }) {
  const grid = document.createElement('div');
  grid.className = 'interaction-toggle-grid';
  INTERACTION_DEFS.forEach(({ prop, label }) => {
    const item = document.createElement('label');
    item.className = 'editor-check-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isInteractionPropOn(frameValue, prop);
    checkbox.addEventListener('change', () => {
      const nextValue = checkbox.checked ? 1 : 0;
      onWrite('active', hasAnyInteractionEnabled(frameValue, prop, nextValue) ? 1 : 0, { rerender: false });
      onWrite(prop, nextValue, { rerender: true });
    });
    item.append(checkbox, document.createTextNode(label));
    grid.append(item);
  });
  body.append(grid);
}

function renderInteractionDetails(body, options) {
  const { frameValue, targetKey = null } = options;
  const activeRoles = INTERACTION_DEFS.filter(({ prop }) => isInteractionPropOn(frameValue, prop));
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
    heading.textContent = interactionDetailTitle(label, targetKey);
    section.append(heading);

    const groups = interactionDetailGroups(prop);
    if (groups.length) {
      renderScrubGroups(
        section,
        groups,
        (field) => readInteractionDisplayValue(frameValue, field),
        (field, value) => options.onWrite(field, interactionFrameValueFromInput(field, value), { rerender: false }),
        options.scrubCallbacks
      );
    }
    body.append(section);
  });
}

function interactionDetailTitle(label, targetKey) {
  if (!isInteractionObjectPartKey(targetKey)) return label;
  const parentKey = interactionObjectParentPartKey(targetKey);
  return parentKey ? `${label} / 부모 ${partLabel(parentKey)}` : label;
}

function interactionDetailGroups(prop) {
  if (prop === 'attack') return ATTACK_GROUPS;
  if (prop === 'collision') return COLLISION_GROUPS;
  return [];
}

function hasAnyInteractionEnabled(frameValue, changedProp, changedValue) {
  return INTERACTION_DEFS.some(({ prop }) => {
    if (prop === changedProp) return Number(changedValue || 0) >= 0.5;
    return isInteractionPropOn(frameValue, prop);
  });
}

function interactionDefaultValue(prop) {
  if (prop === 'deathBurst') return 1;
  return 0;
}
