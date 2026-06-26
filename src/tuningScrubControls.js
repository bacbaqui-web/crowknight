import { stepNumberByOne, stepNumberByTen } from './tuningNumberInputs.js';

export function renderScrubGroups(container, groups, readValue, writeValue, callbacks) {
  groups.forEach((group) => {
    const row = document.createElement('div');
    row.className = 'ae-prop-row';
    const label = document.createElement('span');
    label.className = 'ae-prop-label';
    label.textContent = group.label;
    const values = document.createElement('div');
    values.className = 'ae-prop-values';

    group.props.forEach(({ prop, label: propLabel }) => {
      values.append(renderScrubValue(propLabel, prop, readValue(prop), writeValue, container, readValue, callbacks));
    });

    row.append(label, values);
    container.append(row);
  });
}

function renderScrubValue(label, prop, value, writeValue, container, readValue, callbacks) {
  const control = document.createElement('span');
  control.className = 'scrub-control';
  control.classList.toggle('is-rotation', prop === 'rot');
  const button = document.createElement('button');
  button.className = 'scrub-value';
  button.type = 'button';
  button.dataset.scrubProp = prop;
  button.dataset.scrubLabel = label;
  button.classList.toggle('is-off', prop === 'opacity' && Number(value ?? 1) <= 0);
  button.innerHTML = `<span>${label}</span><strong>${formatPartValue(value, prop)}</strong>`;
  bindScrubValue(button, prop, writeValue, container, readValue, callbacks);
  control.append(button, renderScrubSteppers(button, prop, writeValue, container, readValue, callbacks));
  return control;
}

function renderScrubSteppers(button, prop, writeValue, container, readValue, callbacks) {
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
    stepScrubValue(event, button, prop, 1, writeValue, container, readValue, callbacks)
  );
  down.addEventListener('click', (event) =>
    stepScrubValue(event, button, prop, -1, writeValue, container, readValue, callbacks)
  );
  steppers.append(up, down);
  return steppers;
}

function stepScrubValue(event, button, prop, direction, writeValue, container, readValue, callbacks) {
  event.preventDefault();
  event.stopPropagation();
  callbacks.beginChange();
  const current = Number(readValue(prop) ?? (prop === 'opacity' ? 1 : 0));
  const next =
    prop === 'opacity'
      ? direction > 0
        ? 1
        : 0
      : event.shiftKey
        ? stepNumberByTen(current, direction)
        : stepNumberByOne(current, direction);
  const nextValue = writeValue(prop, next);
  callbacks.commitChange();
  syncScrubValue(button, prop, nextValue ?? readValue(prop));
  syncScrubValues(container, readValue);
}

function bindScrubValue(button, prop, writeValue, container, readValue, callbacks) {
  let scrub = null;

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (button.classList.contains('is-editing')) return;
    event.preventDefault();
    scrub = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startValue: Number(readValue(prop) ?? (prop === 'opacity' ? 1 : 0)),
      moved: false,
      hasSnapshot: false,
    };
    button.classList.add('is-scrubbing');
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener('pointermove', (event) => {
    if (!scrub || scrub.pointerId !== event.pointerId) return;
    if (prop === 'opacity') return;
    event.preventDefault();
    const dragDistance = scrub.startY - event.clientY;
    if (!scrub.moved && Math.abs(dragDistance) < 2) return;
    if (!scrub.hasSnapshot) {
      callbacks.beginChange();
      scrub.hasSnapshot = true;
    }
    scrub.moved = true;
    const delta = dragDistance * scrubStep(prop);
    const nextValue = writeValue(prop, scrub.startValue + delta);
    syncScrubValue(button, prop, nextValue ?? readValue(prop));
  });

  const finish = (event, editOnClick = false) => {
    if (!scrub || scrub.pointerId !== event.pointerId) return;
    const shouldEdit = editOnClick && !scrub.moved;
    const shouldCommit = scrub.hasSnapshot;
    scrub = null;
    button.classList.remove('is-scrubbing');
    if (shouldCommit) callbacks.commitChange();
    if (!shouldEdit) return;

    if (prop === 'opacity') {
      callbacks.beginChange();
      const current = Number(readValue(prop) ?? 1);
      const nextValue = writeValue(prop, current > 0 ? 0 : 1);
      syncScrubValue(button, prop, nextValue ?? readValue(prop));
      callbacks.commitChange();
      return;
    }

    startInlineScrubEdit(button, prop, writeValue, container, readValue, callbacks);
  };

  button.addEventListener('pointerup', (event) => finish(event, true));
  button.addEventListener('pointercancel', (event) => finish(event, false));
}

function startInlineScrubEdit(button, prop, writeValue, container, readValue, callbacks) {
  const currentValue = readValue(prop);
  const input = document.createElement('input');
  input.className = 'scrub-input';
  input.type = prop === 'rot' ? 'text' : 'number';
  input.step = prop === 'w' || prop === 'h' ? '1' : '0.1';
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
        const nextValue = writeValue(prop, next);
        callbacks.commitChange();
        button.classList.remove('is-editing');
        syncScrubValue(button, prop, nextValue ?? readValue(prop));
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
  button.classList.toggle('is-off', prop === 'opacity' && Number(value ?? 1) <= 0);
  button.innerHTML = `<span>${label}</span><strong>${formatPartValue(value, prop)}</strong>`;
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
  if (prop === 'rot') return formatRotationValue(value);
  if (prop === 'w' || prop === 'h' || prop === 'scale') return parseScrubNumber(formatPartValue(value, prop));
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function scrubStep(prop) {
  if (prop === 'opacity') return 0.01;
  if (prop === 'w' || prop === 'h' || prop === 'scale') return 1;
  return 1;
}

function parseScrubNumber(value) {
  return Number(String(value).replace('%', '').trim());
}

function parseScrubInput(value, prop) {
  if (prop === 'rot') return parseRotationValue(value);
  return parseScrubNumber(value);
}

function formatPartValue(value, prop) {
  const fallback = prop === 'opacity' ? 1 : 0;
  const number = Number(value ?? fallback);
  if (prop === 'rot') return formatRotationValue(number);
  if (prop === 'w' || prop === 'h' || prop === 'scale') {
    const text = Number.isInteger(number) ? String(number) : number.toFixed(1);
    return `${text}%`;
  }
  if (prop === 'opacity') {
    return number > 0 ? '보임' : '숨김';
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatRotationValue(value) {
  const total = Number(value || 0);
  if (!Number.isFinite(total)) return '0x +0°';
  const turns = total < 0 ? Math.ceil(total / 360) : Math.floor(total / 360);
  const degrees = total - turns * 360;
  const degreeText = formatDegreeRemainder(degrees);
  return `${turns}x ${degrees >= 0 ? '+' : ''}${degreeText}°`;
}

function formatDegreeRemainder(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function parseRotationValue(value) {
  const text = String(value ?? '')
    .trim()
    .replace(/°/g, '');
  if (!text) return NaN;

  const aeMatch = text.match(/^([+-]?\d+)\s*x\s*([+-]?\d+(?:\.\d+)?)?$/i);
  if (aeMatch) {
    const turns = Number(aeMatch[1]);
    const degrees = Number(aeMatch[2] ?? 0);
    return turns * 360 + degrees;
  }

  return parseScrubNumber(text);
}
