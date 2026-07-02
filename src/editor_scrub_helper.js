import { stepNumberByOne, stepNumberByTen } from './number_input_helper.js';
import {
  formatNumericInputValue,
  formatRotationInputValue,
  parseNumericTextValue,
  parseRotationInputValue,
} from './property_numeric_input_helper.js';
import {
  isPercentDisplayProp,
  isInteractionDecimalProp,
  isOpacityProp,
  isRotationProp,
  isSizeProp,
  isToggleProp,
  isTogglePropOff,
  togglePropFallback,
} from './editable_property_helper.js';

let sizeFieldsLinked = true;

export function renderScrubGroups(container, groups, readValue, writeValue, callbacks) {
  groups.forEach((group) => {
    const sizeLinkGroup = isSizeLinkGroup(group);
    const row = document.createElement('div');
    row.className = 'ae-prop-row';
    row.classList.toggle('has-link-toggle', sizeLinkGroup);
    row.classList.toggle('is-size-linked', sizeLinkGroup && sizeFieldsLinked);
    row.classList.toggle(
      'has-rotation-field',
      group.props.some((item) => item.prop === 'rot')
    );
    const label = document.createElement('span');
    label.className = 'ae-prop-label';
    const labelText = document.createElement('span');
    labelText.className = 'ae-prop-label-text';
    labelText.textContent = group.label;
    label.append(labelText);
    if (sizeLinkGroup) label.append(renderSizeLinkToggle(row));
    const values = document.createElement('div');
    values.className = 'ae-prop-values';
    values.classList.toggle('is-two-up', group.props.length === 2);

    group.props.forEach(({ prop, label: propLabel }) => {
      values.append(
        renderScrubValue(propLabel, prop, readValue(prop), writeValue, container, readValue, callbacks, {
          linkedPropForWrite: sizeLinkGroup ? linkedSizePropForWrite : null,
        })
      );
    });

    row.append(label, values);
    container.append(row);
  });
}

function renderSizeLinkToggle(row) {
  const button = document.createElement('button');
  button.className = 'scrub-link-toggle';
  button.type = 'button';
  button.title = '크기 연결';
  button.setAttribute('aria-label', '크기 연결');
  syncSizeLinkToggle(button);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    sizeFieldsLinked = !sizeFieldsLinked;
    syncAllSizeLinkToggles(row.ownerDocument);
  });
  return button;
}

function syncSizeLinkToggle(button) {
  button.classList.toggle('is-active', sizeFieldsLinked);
  button.setAttribute('aria-pressed', sizeFieldsLinked ? 'true' : 'false');
  button.textContent = sizeFieldsLinked ? '∞' : '×';
}

function syncAllSizeLinkToggles(root) {
  root?.querySelectorAll('.scrub-link-toggle').forEach(syncSizeLinkToggle);
  root?.querySelectorAll('.ae-prop-row.has-link-toggle').forEach((row) => {
    row.classList.toggle('is-size-linked', sizeFieldsLinked);
  });
}

function renderScrubValue(label, prop, value, writeValue, container, readValue, callbacks, options = {}) {
  const control = document.createElement('span');
  control.className = 'scrub-control';
  control.classList.toggle('is-rotation', isRotationProp(prop));
  control.classList.toggle('is-toggle', isToggleProp(prop));
  const button = document.createElement('button');
  button.className = 'scrub-value';
  button.type = 'button';
  button.dataset.scrubProp = prop;
  button.dataset.scrubLabel = label;
  button.setAttribute('aria-label', label || propLabelForScrub(prop));
  button.classList.toggle('has-no-label', shouldHideScrubLabel(prop));
  button.classList.toggle('is-off', isTogglePropOff(prop, value));
  button.innerHTML = scrubButtonMarkup(label, value, prop);
  bindScrubValue(button, prop, writeValue, container, readValue, callbacks, options);
  if (isToggleProp(prop)) control.append(button);
  else control.append(button, renderScrubSteppers(button, prop, writeValue, container, readValue, callbacks, options));
  return control;
}

function renderScrubSteppers(button, prop, writeValue, container, readValue, callbacks, options = {}) {
  const steppers = document.createElement('span');
  steppers.className = 'scrub-stepper-buttons';
  const up = document.createElement('button');
  const down = document.createElement('button');
  up.type = 'button';
  down.type = 'button';
  up.setAttribute('aria-label', '값 올리기');
  down.setAttribute('aria-label', '값 내리기');
  up.textContent = '▲';
  down.textContent = '▼';
  up.addEventListener('click', (event) =>
    stepScrubValue(event, button, prop, 1, writeValue, container, readValue, callbacks, options)
  );
  down.addEventListener('click', (event) =>
    stepScrubValue(event, button, prop, -1, writeValue, container, readValue, callbacks, options)
  );
  steppers.append(up, down);
  return steppers;
}

function stepScrubValue(event, button, prop, direction, writeValue, container, readValue, callbacks, options = {}) {
  event.preventDefault();
  event.stopPropagation();
  callbacks.beginChange();
  const current = Number(readValue(prop) ?? togglePropFallback(prop));
  const next = isToggleProp(prop)
    ? direction > 0
      ? 1
      : 0
    : event.shiftKey
      ? stepNumberByTen(current, direction)
      : stepNumberByOne(current, direction);
  const nextValue = writeScrubValue(prop, next, writeValue, options);
  callbacks.commitChange();
  syncScrubValue(button, prop, nextValue ?? readValue(prop));
  syncScrubValues(container, readValue);
}

function bindScrubValue(button, prop, writeValue, container, readValue, callbacks, options = {}) {
  let scrub = null;

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (button.classList.contains('is-editing')) return;
    event.preventDefault();
    scrub = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startValue: Number(readValue(prop) ?? togglePropFallback(prop)),
      moved: false,
      hasSnapshot: false,
    };
    button.classList.add('is-scrubbing');
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener('pointermove', (event) => {
    if (!scrub || scrub.pointerId !== event.pointerId) return;
    if (isToggleProp(prop)) return;
    event.preventDefault();
    const dragDistance = scrub.startY - event.clientY;
    if (!scrub.moved && Math.abs(dragDistance) < 2) return;
    if (!scrub.hasSnapshot) {
      callbacks.beginChange();
      scrub.hasSnapshot = true;
      setPropertyScrubCursorHidden(button, prop, true);
    }
    scrub.moved = true;
    const delta = dragDistance * scrubStep(prop);
    const nextValue = writeScrubValue(prop, scrub.startValue + delta, writeValue, options);
    syncScrubValue(button, prop, nextValue ?? readValue(prop));
    syncScrubValues(container, readValue);
  });

  const finish = (event, editOnClick = false) => {
    if (!scrub || scrub.pointerId !== event.pointerId) return;
    const shouldEdit = editOnClick && !scrub.moved;
    const shouldCommit = scrub.hasSnapshot;
    scrub = null;
    button.classList.remove('is-scrubbing');
    setPropertyScrubCursorHidden(button, prop, false);
    if (shouldCommit) callbacks.commitChange();
    if (!shouldEdit) return;

    if (isToggleProp(prop)) {
      callbacks.beginChange();
      const current = Number(readValue(prop) ?? togglePropFallback(prop));
      const nextValue = writeValue(prop, current > 0 ? 0 : 1);
      syncScrubValue(button, prop, nextValue ?? readValue(prop));
      syncScrubValues(container, readValue);
      callbacks.commitChange();
      return;
    }

    startInlineScrubEdit(button, prop, writeValue, container, readValue, callbacks, options);
  };

  button.addEventListener('pointerup', (event) => finish(event, true));
  button.addEventListener('pointercancel', (event) => finish(event, false));
  button.addEventListener('lostpointercapture', (event) => finish(event, false));
}

function setPropertyScrubCursorHidden(button, prop, hidden) {
  if (isToggleProp(prop)) return;
  button.ownerDocument?.body?.classList.toggle('is-property-scrubbing', hidden);
}

function startInlineScrubEdit(button, prop, writeValue, container, readValue, callbacks, options = {}) {
  const currentValue = readValue(prop);
  const input = document.createElement('input');
  input.className = 'scrub-input';
  input.type = isRotationProp(prop) ? 'text' : 'number';
  input.step = isPercentDisplayProp(prop) ? '1' : '0.1';
  input.value = scrubInputValue(currentValue, prop);
  button.classList.add('is-editing');
  button.innerHTML = '';
  button.append(input);
  input.focus();
  input.select();

  const finish = (apply) => {
    if (!button.classList.contains('is-editing')) return;
    if (apply) {
      const next = parseScrubInput(input.value, prop);
      if (Number.isFinite(next)) {
        callbacks.beginChange();
        const nextValue = writeScrubValue(prop, next, writeValue, options);
        callbacks.commitChange();
        button.classList.remove('is-editing');
        syncScrubValue(button, prop, nextValue ?? readValue(prop));
        syncScrubValues(container, readValue);
        return;
      }
    }
    button.classList.remove('is-editing');
    syncScrubValues(container, readValue);
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
    event.stopPropagation();
  });
  input.addEventListener('blur', () => finish(true));
}

function syncScrubValues(container, readValue) {
  container.querySelectorAll('[data-scrub-prop]').forEach((button) => {
    const prop = button.dataset.scrubProp;
    const value = readValue(prop);
    if (button.classList.contains('is-editing')) return;
    syncScrubValue(button, prop, value);
  });
}

function syncScrubValue(button, prop, value) {
  const label = button.dataset.scrubLabel || propLabelForScrub(prop);
  button.classList.toggle('is-off', isTogglePropOff(prop, value));
  button.innerHTML = scrubButtonMarkup(label, value, prop);
}

function propLabelForScrub(prop) {
  return (
    {
      x: 'X',
      y: 'Y',
      w: 'W',
      h: 'H',
      scale: 'S',
      rot: 'R',
      opacity: 'O',
      ax: 'X',
      ay: 'Y',
    }[prop] || prop.toUpperCase()
  );
}

function scrubInputValue(value, prop) {
  if (isRotationProp(prop)) return formatRotationInputValue(value);
  if (isPercentDisplayProp(prop)) return formatNumericInputValue(Number(value ?? togglePropFallback(prop)), 0.1);
  if (isInteractionDecimalProp(prop)) return formatNumericInputValue(value, 0.01);
  const number = Number(value ?? 0);
  return formatNumericInputValue(number, 0.1);
}

function scrubStep(prop) {
  if (isToggleProp(prop)) return 0.01;
  if (isInteractionDecimalProp(prop)) return 0.01;
  if (isPercentDisplayProp(prop)) return 1;
  return 1;
}

function parseScrubInput(value, prop) {
  if (isRotationProp(prop)) return parseRotationInputValue(value);
  return parseNumericTextValue(value);
}

function formatPartValue(value, prop) {
  const fallback = togglePropFallback(prop);
  const number = Number(value ?? fallback);
  if (isRotationProp(prop)) return formatRotationInputValue(number);
  if (isPercentDisplayProp(prop)) {
    return formatNumericInputValue(number, 0.1);
  }
  if (isOpacityProp(prop)) {
    return number > 0 ? '보임' : '숨김';
  }
  if (isToggleProp(prop)) {
    return number > 0 ? '켜짐' : '꺼짐';
  }
  if (isInteractionDecimalProp(prop)) return formatNumericInputValue(number, 0.01);
  return formatNumericInputValue(number, 0.1);
}

function scrubButtonMarkup(label, value, prop) {
  if (isOpacityProp(prop)) return opacityIconMarkup(isTogglePropOff(prop, value));
  if (isToggleProp(prop)) return `<span>${label}</span>`;
  const labelMarkup = label && !shouldHideScrubLabel(prop) ? `<span>${label}</span>` : '';
  return `${labelMarkup}<strong>${formatPartValue(value, prop)}</strong>`;
}

function opacityIconMarkup(hidden) {
  const slash = hidden ? '<path d="M4 4l16 16"></path>' : '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"></path><circle cx="12" cy="12" r="3"></circle>${slash}</svg>`;
}

function shouldHideScrubLabel(prop) {
  return ['x', 'y', 'w', 'h', 'rot', 'scale', 'ax', 'ay', 'anchorX', 'anchorY'].includes(prop);
}

function writeScrubValue(prop, value, writeValue, { linkedPropForWrite = null } = {}) {
  const nextValue = writeValue(prop, value);
  const linkedProp = linkedPropForWrite?.(prop);
  if (linkedProp) writeValue(linkedProp, value);
  return nextValue;
}

function isSizeLinkGroup(group) {
  if (group.props?.length !== 2) return false;
  const props = group.props.map((item) => item.prop);
  return props.includes('w') && props.includes('h') && props.every(isSizeProp);
}

function linkedSizePropForWrite(prop) {
  if (!sizeFieldsLinked) return null;
  if (prop === 'w') return 'h';
  if (prop === 'h') return 'w';
  return null;
}
