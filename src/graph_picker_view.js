const GRAPH_ORDER = ['easeIn', 'linear', 'easeOut'];

export function renderGraphPickerField(labelText, value, options, onChange) {
  const row = document.createElement('div');
  row.className = 'modifier-select-row';
  const label = document.createElement('span');
  label.textContent = labelText;
  const picker = document.createElement('div');
  picker.className = 'modifier-graph-picker';
  picker.setAttribute('role', 'radiogroup');
  picker.setAttribute('aria-label', labelText);
  graphOptionsForDisplay(options).forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'modifier-graph-button';
    button.dataset.value = option.value;
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    button.innerHTML = graphIconSvg(option.value);
    button.addEventListener('click', () => {
      const nextValue = onChange(option.value) ?? option.value;
      syncGraphPickerButtons(picker, nextValue);
    });
    picker.append(button);
  });
  syncGraphPickerButtons(picker, value);
  row.append(label, picker);
  return row;
}

function graphOptionsForDisplay(options = []) {
  return [...options].sort((a, b) => GRAPH_ORDER.indexOf(a.value) - GRAPH_ORDER.indexOf(b.value));
}

function syncGraphPickerButtons(picker, value) {
  picker.querySelectorAll('.modifier-graph-button').forEach((button) => {
    const active = button.dataset.value === value;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function graphIconSvg(value) {
  const paths = {
    easeIn: 'M16 50 C31 49 49 33 56 10',
    linear: 'M16 50 L56 10',
    easeOut: 'M16 50 C19 28 34 15 56 10',
  };
  const curvePath = paths[value] || paths.linear;
  return `
    <svg viewBox="0 0 68 58" aria-hidden="true" focusable="false">
      <path class="modifier-graph-axis" d="M14 8 V50 H60"></path>
      <path class="modifier-graph-curve" d="${curvePath}"></path>
    </svg>
  `;
}
