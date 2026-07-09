import { isInteractionObjectPartKey, interactionObjectParentPartKey } from './interaction_object_editor_controller.js';
import { partLabel } from './editor_label_helper.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { renderMiniTimelineRange } from './timeline_dom_helper.js';
import { renderVelocityModeToggle } from './formulas/velocity_formula.js';
import { interactionFieldLimits } from './part_source_data.js';
import { clamp } from './common_helper.js';
import {
  INTERACTION_COLOR_PROPS,
  INTERACTION_ROLE_DEFS,
  INTERACTION_SELECT_OPTIONS,
  INTERACTION_SELECT_PROPS,
  INTERACTION_TOGGLE_PROPS,
  interactionDefaultValue,
  interactionDetailFieldProps,
  interactionDetailGroups,
  interactionRoleLabel,
  normalizeInteractionColorValue,
  normalizeInteractionSelectValue,
} from './interaction_field_data.js';

const ATTACK_KNOCKBACK_INLINE_PROPS = ['knockback', 'knockbackExtraVx', 'knockbackExtraVy'];

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
  if (INTERACTION_SELECT_PROPS.has(prop)) return normalizeInteractionSelectValue(prop, value);
  if (INTERACTION_COLOR_PROPS.has(prop)) return normalizeInteractionColorValue(prop, value);
  const limits = interactionFieldLimits(prop);
  if (!limits) return Number(value);
  return clamp(Number(value), limits.min, limits.max);
}

export function readInteractionDisplayValue(frameValue, prop) {
  if (INTERACTION_TOGGLE_PROPS.has(prop)) {
    return Number(frameValue?.[prop] ?? interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  }
  if (INTERACTION_SELECT_PROPS.has(prop)) {
    return normalizeInteractionSelectValue(prop, frameValue?.[prop] ?? interactionDefaultValue(prop));
  }
  if (INTERACTION_COLOR_PROPS.has(prop)) {
    return normalizeInteractionColorValue(prop, frameValue?.[prop] ?? interactionDefaultValue(prop));
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
  const baseRoles = fixedRole
    ? [{ prop: fixedRole, label: interactionRoleLabel(fixedRole) }]
    : INTERACTION_ROLE_DEFS.filter(({ prop }) => isInteractionValueOn(options, prop, prop));
  const activeRoles = mergeInteractionDetailRoles(baseRoles, readAdditionalDetailRoles(options, baseRoles));
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
    if (prop === 'attack') renderAttackFrameWindow(section, options, prop);
    renderInteractionDetailControls(section, groups, options, prop);
    body.append(section);
  });
}

function readAdditionalDetailRoles(options, activeRoles) {
  if (typeof options?.additionalDetailRoles !== 'function') return [];
  return options.additionalDetailRoles(activeRoles) || [];
}

function mergeInteractionDetailRoles(baseRoles, additionalRoles) {
  const roles = [...baseRoles];
  additionalRoles.forEach((role) => {
    if (!role?.prop) return;
    if (roles.some((item) => item.prop === role.prop)) return;
    roles.push({
      prop: role.prop,
      label: role.label || interactionRoleLabel(role.prop),
    });
  });
  return roles;
}

function renderAttackFrameWindow(section, options, role) {
  const rawTotalFrames = Number(options.totalFrames);
  if (!Number.isFinite(rawTotalFrames) || rawTotalFrames <= 0) return;
  const totalFrames = Math.max(1, Math.round(rawTotalFrames));

  const row = document.createElement('div');
  row.className = 'modifier-mini-timeline-row interaction-mini-timeline-row';

  const startInput = renderInteractionFrameStepper(
    readInteractionFrameWindowValue(options, 'startFrame', role, 1, totalFrames),
    totalFrames,
    (value) => commitInteractionFrameWindowValue(options, role, 'startFrame', value, totalFrames)
  );
  const track = document.createElement('div');
  track.className = 'timeline-track modifier-mini-timeline-track interaction-mini-timeline-track';
  track.setAttribute('aria-label', '공격 작동 구간');
  const endInput = renderInteractionFrameStepper(
    readInteractionFrameWindowValue(options, 'endFrame', role, totalFrames, totalFrames),
    totalFrames,
    (value) => commitInteractionFrameWindowValue(options, role, 'endFrame', value, totalFrames)
  );

  const renderRange = (startFrame, endFrame) => {
    renderMiniTimelineRange(track, {
      totalFrames,
      startFrame,
      endFrame,
      onRangeChange: ({ startFrame: nextStart, endFrame: nextEnd }) => {
        const start = commitInteractionFrameWindowValue(options, role, 'startFrame', nextStart, totalFrames);
        const end = commitInteractionFrameWindowValue(options, role, 'endFrame', nextEnd, totalFrames);
        startInput.input.value = String(start);
        endInput.input.value = String(end);
        return { startFrame: start, endFrame: end };
      },
    });
  };

  const syncRange = () => {
    renderRange(Number(startInput.input.value), Number(endInput.input.value));
  };
  startInput.onAfterCommit = syncRange;
  endInput.onAfterCommit = syncRange;
  renderRange(Number(startInput.input.value), Number(endInput.input.value));

  row.append(startInput.root, track, endInput.root);
  section.append(row);
}

function renderInteractionFrameStepper(value, maxFrame, onChange) {
  const root = document.createElement('span');
  root.className = 'number-stepper-control modifier-mini-timeline-frame-stepper';
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.min = '1';
  input.max = String(maxFrame);
  input.className = 'modifier-mini-timeline-frame-input';
  input.value = String(value);
  input.setAttribute('aria-label', '프레임');
  let lastValue = Number(input.value);
  const result = { root, input, onAfterCommit: null };
  const commit = () => {
    const nextValue = Number(input.value);
    if (Object.is(nextValue, lastValue)) return;
    lastValue = nextValue;
    const committedValue = onChange(nextValue);
    if (committedValue !== undefined) {
      input.value = String(committedValue);
      lastValue = Number(committedValue);
    }
    result.onAfterCommit?.();
  };
  input.addEventListener('input', commit);
  input.addEventListener('change', commit);

  const buttons = document.createElement('span');
  buttons.className = 'number-stepper-buttons';
  const up = document.createElement('button');
  const down = document.createElement('button');
  up.type = 'button';
  down.type = 'button';
  up.setAttribute('aria-label', '프레임 올리기');
  down.setAttribute('aria-label', '프레임 내리기');
  up.textContent = '▲';
  down.textContent = '▼';
  up.addEventListener('click', (event) => stepInteractionFrameInput(event, input, 1));
  down.addEventListener('click', (event) => stepInteractionFrameInput(event, input, -1));
  buttons.append(up, down);
  root.append(input, buttons);
  return result;
}

function stepInteractionFrameInput(event, input, direction) {
  event.preventDefault();
  const min = Number(input.min || 1);
  const max = Number(input.max || 1);
  const next = clamp(Math.round(Number(input.value || min)) + direction, min, max);
  input.value = String(next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function readInteractionFrameWindowValue(options, prop, role, fallback, totalFrames) {
  return clampInteractionFrame(readInteractionOptionValue(options, prop, role) ?? fallback, totalFrames, fallback);
}

function commitInteractionFrameWindowValue(options, role, prop, value, totalFrames) {
  const nextValue = clampInteractionFrame(value, totalFrames, prop === 'startFrame' ? 1 : totalFrames);
  return options.onWrite(prop, nextValue, { role, rerender: false }) ?? nextValue;
}

function clampInteractionFrame(value, totalFrames, fallback) {
  const number = Math.round(Number(value ?? fallback));
  if (!Number.isFinite(number)) return fallback;
  return clamp(number, 1, totalFrames);
}

function renderInteractionDetailControls(section, groups, options, role) {
  groups.forEach((group) => {
    renderInteractionCheckRows(section, group.toggles || [], options, role);
    renderInteractionSelectRows(section, group.selects || [], options, role);
    renderInteractionColorRows(section, group.colors || [], options, role);
    if (!group.props?.length) return;
    if (role === 'attack' && isAttackKnockbackInlineGroup(group.props)) {
      renderAttackKnockbackInlineControls(section, group.props, options, role);
      return;
    }
    renderScrubGroups(
      section,
      [group],
      (field) => readInteractionOptionValue(options, field, role),
      (field, value) => options.onWrite(field, interactionFrameValueFromInput(field, value), { role, rerender: false }),
      options.scrubCallbacks
    );
  });
}

function isAttackKnockbackInlineGroup(props = []) {
  return ATTACK_KNOCKBACK_INLINE_PROPS.every((prop) => props.some((field) => field.prop === prop));
}

function renderAttackKnockbackInlineControls(section, props, options, role) {
  const row = document.createElement('div');
  row.className = 'interaction-knockback-inline-row';
  row.append(
    renderVelocityModeToggle(readInteractionOptionValue(options, 'knockbackMode', role), (value) =>
      options.onWrite('knockbackMode', interactionFrameValueFromInput('knockbackMode', value), {
        role,
        rerender: false,
      })
    )
  );
  ATTACK_KNOCKBACK_INLINE_PROPS.forEach((prop) => {
    const field = props.find((item) => item.prop === prop) || { prop };
    row.append(renderInteractionNumberStepper(field, options, role));
  });
  section.append(row);
}

function renderInteractionNumberStepper(field, options, role) {
  const prop = field.prop;
  const limits = interactionFieldLimits(prop) || {};
  const root = document.createElement('span');
  root.className = 'number-stepper-control interaction-number-stepper';
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(limits.step ?? 1);
  if (limits.min !== undefined) input.min = String(limits.min);
  if (limits.max !== undefined) input.max = String(limits.max);
  input.value = String(readInteractionOptionValue(options, prop, role));
  input.setAttribute('aria-label', field.label || prop);

  let lastValue = Number(input.value || 0);
  const commit = (rawValue = input.value) => {
    const nextValue = clampInteractionNumber(prop, rawValue);
    if (Object.is(nextValue, lastValue)) return;
    lastValue = nextValue;
    const committedValue = options.onWrite(prop, nextValue, { role, rerender: false });
    const displayValue = committedValue ?? readInteractionOptionValue(options, prop, role);
    input.value = String(displayValue);
    lastValue = Number(displayValue);
  };
  input.addEventListener('input', () => commit());
  input.addEventListener('change', () => commit());

  const buttons = document.createElement('span');
  buttons.className = 'number-stepper-buttons';
  const up = document.createElement('button');
  const down = document.createElement('button');
  up.type = 'button';
  down.type = 'button';
  up.setAttribute('aria-label', `${field.label || prop} 올리기`);
  down.setAttribute('aria-label', `${field.label || prop} 내리기`);
  up.textContent = '▲';
  down.textContent = '▼';
  up.addEventListener('click', (event) => stepInteractionNumber(event, input, prop, 1, commit));
  down.addEventListener('click', (event) => stepInteractionNumber(event, input, prop, -1, commit));
  buttons.append(up, down);
  root.append(input, buttons);
  return root;
}

function stepInteractionNumber(event, input, prop, direction, commit) {
  event.preventDefault();
  const limits = interactionFieldLimits(prop) || {};
  const step = Number(limits.step ?? 1);
  const current = Number(input.value || 0);
  const next = clampInteractionNumber(prop, current + direction * step);
  input.value = String(next);
  commit(next);
}

function clampInteractionNumber(prop, value) {
  const limits = interactionFieldLimits(prop);
  const number = Number(value);
  if (!Number.isFinite(number)) return Number(interactionDefaultValue(prop) || 0);
  if (!limits) return number;
  return clamp(number, limits.min ?? number, limits.max ?? number);
}

function renderInteractionColorRows(section, colors, options, role) {
  const { onWrite } = options;
  colors.forEach(({ prop, label }) => {
    const item = document.createElement('label');
    item.className = 'modifier-setting-row interaction-color-row';
    const text = document.createElement('span');
    text.textContent = label;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = normalizeInteractionColorValue(prop, readInteractionOptionValue(options, prop, role));
    input.addEventListener('input', () => {
      onWrite(prop, interactionFrameValueFromInput(prop, input.value), { role, rerender: false });
    });
    input.addEventListener('change', () => {
      onWrite(prop, interactionFrameValueFromInput(prop, input.value), { role, rerender: false });
    });
    item.append(text, input);
    section.append(item);
  });
}

function renderInteractionSelectRows(section, selects, options, role) {
  const { onWrite } = options;
  selects.forEach(({ prop, label }) => {
    const item = document.createElement('label');
    item.className = 'modifier-select-row interaction-select-row';
    const text = document.createElement('span');
    text.textContent = label;
    const select = document.createElement('select');
    select.className = 'modifier-select-field';
    (INTERACTION_SELECT_OPTIONS[prop] || []).forEach((option) => {
      const optionNode = document.createElement('option');
      optionNode.value = option.value;
      optionNode.textContent = option.label;
      select.append(optionNode);
    });
    select.value = normalizeInteractionSelectValue(prop, readInteractionOptionValue(options, prop, role));
    select.addEventListener('change', () => {
      onWrite(prop, interactionFrameValueFromInput(prop, select.value), { role, rerender: false });
    });
    item.append(text, select);
    section.append(item);
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
      onWrite(prop, interactionFrameValueFromInput(prop, checkbox.checked ? 1 : 0), {
        role,
        rerender: prop === 'followWeapon' || options.shouldRerenderOnWrite?.(prop, role) === true,
      });
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
