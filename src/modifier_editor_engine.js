import { renderEditorDataCard } from './editor_card_panel_view.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { ACTION_FPS, ACTION_MAX_FRAMES } from './game_config_data.js';
import { MODIFIER_DEFS } from './timeline_modifier_data.js';
import { renderMiniTimelineRange } from './timeline_dom_helper.js';

export function renderModifierEditor(container, options) {
  renderAppliedModifierEditor(container, options);
  renderModifierLibraryEditor(container, options);
}

export function renderAppliedModifierEditor(
  container,
  { modifiers, onSettingChange, scrubCallbacks, targetKey, totalFrames }
) {
  container.append(createAppliedModifierCards({ modifiers, onSettingChange, scrubCallbacks, targetKey, totalFrames }));
}

export function replaceAppliedModifierEditor(
  container,
  { modifiers, onSettingChange, scrubCallbacks, targetKey, totalFrames }
) {
  const existing = Array.from(container.children).filter((child) => child.classList.contains('modifier-applied-card'));
  const next = existing[existing.length - 1]?.nextSibling || container.querySelector('.modifier-library-card');
  existing.forEach((child) => child.remove());
  container.insertBefore(
    createAppliedModifierCards({ modifiers, onSettingChange, scrubCallbacks, targetKey, totalFrames }),
    next || null
  );
}

function createAppliedModifierCards({ modifiers, onSettingChange, scrubCallbacks, targetKey, totalFrames }) {
  const fragment = document.createDocumentFragment();
  enabledModifierEntries(modifiers).forEach(([def, modifier]) =>
    renderAppliedModifier(fragment, def, modifier, onSettingChange, scrubCallbacks, targetKey, totalFrames)
  );
  return fragment;
}

export function renderModifierLibraryEditor(container, { modifiers, onToggle, targetKey }) {
  const card = renderEditorDataCard(
    container,
    { title: '수식 라이브러리', className: 'modifier-library-card' },
    (body) => {
      const grid = document.createElement('div');
      grid.className = 'modifier-tag-list';
      MODIFIER_DEFS.forEach((def) =>
        renderModifierLibraryItem(grid, def, modifiers, {
          onToggle,
          targetKey,
        })
      );
      body.append(grid);
    }
  );
  writeTargetKey(card, targetKey);
}

function enabledModifierEntries(modifiers) {
  return MODIFIER_DEFS.map((def) => [def, modifiers.find((item) => item.type === def.type)]).filter(
    ([, modifier]) => modifier?.enabled
  );
}

function renderAppliedModifier(container, def, modifier, onSettingChange, scrubCallbacks, targetKey, totalFrames) {
  const card = renderEditorDataCard(container, { title: def.label, className: 'modifier-applied-card' }, (body) => {
    if (def.settings.length) {
      body.append(renderModifierSettings(def, modifier, onSettingChange, scrubCallbacks, targetKey, totalFrames));
      return;
    }
    const placeholder = document.createElement('div');
    placeholder.className = 'modifier-setting-placeholder';
    placeholder.textContent = '설정 준비 중';
    body.append(placeholder);
  });
  decorateModifierCardTitle(card, def);
  writeTargetKey(card, targetKey);
}

function decorateModifierCardTitle(card, def) {
  if (def.type !== 'velocity') return;
  const title = card.querySelector('.editor-data-card-title');
  if (!title) return;
  title.textContent = '';
  const label = document.createElement('span');
  label.textContent = def.label;
  const meta = document.createElement('span');
  meta.className = 'modifier-title-meta';
  meta.textContent = `1s = ${ACTION_FPS}f`;
  title.append(label, meta);
}

function renderModifierLibraryItem(body, def, modifiers, { onToggle, targetKey }) {
  const modifier = modifiers.find((item) => item.type === def.type);
  const button = document.createElement('button');
  const enabled = Boolean(modifier?.enabled);
  button.type = 'button';
  button.className = 'modifier-tag-pill';
  button.classList.toggle('is-active', enabled);
  button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  button.textContent = def.label;
  button.addEventListener('click', () => {
    const nextEnabled = !button.classList.contains('is-active');
    button.classList.toggle('is-active', nextEnabled);
    button.setAttribute('aria-pressed', nextEnabled ? 'true' : 'false');
    ensureLocalModifier(modifiers, def).enabled = nextEnabled;
    onToggle(def.type, nextEnabled, targetKey);
  });
  body.append(button);
}

function ensureLocalModifier(modifiers, def) {
  let modifier = modifiers.find((item) => item.type === def.type);
  if (modifier) return modifier;
  modifier = {
    type: def.type,
    enabled: false,
    settings: Object.fromEntries(def.settings.map((setting) => [setting.prop, defaultSettingValue(def, setting)])),
  };
  modifiers.push(modifier);
  return modifier;
}

function renderModifierSettings(def, modifier, onSettingChange, scrubCallbacks, targetKey, totalFrames) {
  const fields = document.createElement('div');
  fields.className = 'modifier-setting-grid';
  const numericSettings = def.settings.filter((setting) => setting.kind !== 'select');
  const selectSettings = def.settings.filter((setting) => setting.kind === 'select');
  let miniTimelineTrack = null;
  const syncMiniTimeline = () => {
    if (!miniTimelineTrack) return;
    renderMiniTimelineRange(miniTimelineTrack, {
      totalFrames: totalFrames || ACTION_MAX_FRAMES,
      startFrame: modifier?.settings?.startFrame ?? defaultSettingValue(def, { prop: 'startFrame' }),
      endFrame: modifier?.settings?.endFrame ?? defaultSettingValue(def, { prop: 'endFrame' }),
    });
  };
  if (numericSettings.length) {
    renderScrubGroups(
      fields,
      numericSettings.map((setting) => ({
        label: setting.label,
        props: [{ prop: setting.prop, label: '' }],
      })),
      (prop) =>
        modifier?.settings?.[prop] ??
        defaultSettingValue(
          def,
          numericSettings.find((setting) => setting.prop === prop)
        ),
      (prop, value) => {
        const nextValue = onSettingChange(def.type, prop, value, targetKey) ?? value;
        modifier.settings ||= {};
        modifier.settings[prop] = nextValue;
        if (prop === 'startFrame' || prop === 'endFrame') syncMiniTimeline();
        return nextValue;
      },
      scrubCallbacks || noopScrubCallbacks()
    );
    if (def.type === 'velocity') appendVelocityUnits(fields);
  }
  selectSettings.forEach((setting) => {
    fields.append(renderModifierSelectSetting(def, modifier, setting, onSettingChange, targetKey));
  });
  if (def.timeline) {
    const miniTimeline = renderModifierMiniTimeline(def, modifier, totalFrames);
    miniTimelineTrack = miniTimeline.querySelector('.modifier-mini-timeline-track');
    fields.append(miniTimeline);
    syncMiniTimeline();
  }
  return fields;
}

function appendVelocityUnits(fields) {
  ['x', 'y'].forEach((prop) => {
    const button = fields.querySelector(`[data-scrub-prop="${prop}"]`);
    const control = button?.closest('.scrub-control');
    if (!button || !control || control.querySelector('.modifier-unit-label')) return;
    const unit = document.createElement('span');
    unit.className = 'modifier-unit-label';
    unit.textContent = 'px/f';
    unit.title = 'Action Timeline 1프레임당 이동 픽셀. f는 현재 Action Timeline Frame입니다.';
    unit.setAttribute('aria-label', unit.title);
    control.append(unit);
  });
}

function renderModifierMiniTimeline(def, modifier, totalFrames) {
  const row = document.createElement('div');
  row.className = 'modifier-mini-timeline-row';
  const label = document.createElement('span');
  label.textContent = 'Mini Timeline';
  const track = document.createElement('div');
  track.className = 'timeline-track modifier-mini-timeline-track';
  track.setAttribute('aria-label', `${def.label} 작동 구간`);
  renderMiniTimelineRange(track, {
    totalFrames: totalFrames || ACTION_MAX_FRAMES,
    startFrame: modifier?.settings?.startFrame ?? defaultSettingValue(def, { prop: 'startFrame' }),
    endFrame: modifier?.settings?.endFrame ?? defaultSettingValue(def, { prop: 'endFrame' }),
  });
  row.append(label, track);
  return row;
}

function renderModifierSelectSetting(def, modifier, setting, onSettingChange, targetKey) {
  if (setting.prop === 'graph') {
    return renderModifierGraphSetting(def, modifier, setting, onSettingChange, targetKey);
  }

  const row = document.createElement('label');
  row.className = 'modifier-select-row';
  const label = document.createElement('span');
  label.textContent = setting.label;
  const select = document.createElement('select');
  select.className = 'modifier-select-field';
  (setting.options || []).forEach((option) => {
    const item = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    select.append(item);
  });
  select.value = modifier?.settings?.[setting.prop] ?? defaultSettingValue(def, setting);
  select.addEventListener('change', () => {
    const nextValue = onSettingChange(def.type, setting.prop, select.value, targetKey) ?? select.value;
    modifier.settings ||= {};
    modifier.settings[setting.prop] = nextValue;
    select.value = nextValue;
  });
  row.append(label, select);
  return row;
}

function renderModifierGraphSetting(def, modifier, setting, onSettingChange, targetKey) {
  const row = document.createElement('div');
  row.className = 'modifier-select-row';
  const label = document.createElement('span');
  label.textContent = setting.label;
  const picker = document.createElement('div');
  picker.className = 'modifier-graph-picker';
  picker.setAttribute('role', 'radiogroup');
  picker.setAttribute('aria-label', setting.label);
  const currentValue = modifier?.settings?.[setting.prop] ?? defaultSettingValue(def, setting);
  graphOptionsForDisplay(setting.options).forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'modifier-graph-button';
    button.dataset.value = option.value;
    button.title = option.label;
    button.setAttribute('aria-label', option.label);
    button.innerHTML = graphIconSvg(option.value);
    button.addEventListener('click', () => {
      const nextValue = onSettingChange(def.type, setting.prop, option.value, targetKey) ?? option.value;
      modifier.settings ||= {};
      modifier.settings[setting.prop] = nextValue;
      syncGraphPickerButtons(picker, nextValue);
    });
    picker.append(button);
  });
  syncGraphPickerButtons(picker, currentValue);
  row.append(label, picker);
  return row;
}

function graphOptionsForDisplay(options = []) {
  const order = ['easeOut', 'linear', 'easeIn'];
  return [...options].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
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
    easeOut: 'M16 50 C19 28 34 15 56 10',
    easeIn: 'M16 50 C31 49 49 33 56 10',
    linear: 'M16 50 L56 10',
  };
  const curvePath = paths[value] || paths.linear;
  return `
    <svg viewBox="0 0 68 58" aria-hidden="true" focusable="false">
      <path class="modifier-graph-axis" d="M14 8 V50 H60"></path>
      <path class="modifier-graph-curve" d="${curvePath || curvePath.linear}"></path>
    </svg>
  `;
}

function defaultSettingValue(def, setting) {
  if (setting.kind === 'color') return '#ffffff';
  if (setting.kind === 'select') return setting.options?.[0]?.value || '';
  if (setting.prop === 'frames' && def.type === 'move') return ACTION_MAX_FRAMES;
  if (setting.prop === 'frames') return 4;
  if (setting.prop === 'startFrame') return 1;
  if (setting.prop === 'endFrame') return def.type === 'velocity' ? ACTION_MAX_FRAMES : 4;
  if (setting.prop === 'mode') return 'set';
  return 0;
}

function noopScrubCallbacks() {
  return {
    beginChange() {},
    commitChange() {},
  };
}

function writeTargetKey(element, targetKey) {
  if (targetKey === undefined || targetKey === null) return;
  element.dataset.targetKey = String(targetKey);
}
