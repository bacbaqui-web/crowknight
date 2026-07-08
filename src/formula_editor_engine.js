import { actionGroup, actionOptionsForGroup } from './action_authoring_data.js';
import { ACTION_FPS, ACTION_MAX_FRAMES } from './game_config_data.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import {
  FORMULA_DEFS,
  createDefaultFormula,
  normalizeActionFormulas,
  resetActionFormula,
  writeActionFormulaEnabled,
  writeActionFormulaSetting,
} from './formula_registry.js';
import { timelineFrameCount } from './timeline_playback_helper.js';
import { renderMiniTimelineRange } from './timeline_dom_helper.js';
import { renderFormulaNumberField } from './formulas/formula_editor_fields.js';

export function renderFormulaEditor(container, options) {
  renderAppliedFormulaEditor(container, options);
  renderFormulaLibraryEditor(container, options);
}

export function renderAppliedFormulaEditor(container, options) {
  container.append(createAppliedFormulaCards(options));
}

export function replaceAppliedFormulaEditor(container, options) {
  const existing = Array.from(container.children).filter((child) => child.classList.contains('modifier-applied-card'));
  const next = existing[existing.length - 1]?.nextSibling || container.querySelector('.modifier-library-card');
  existing.forEach((child) => child.remove());
  container.insertBefore(createAppliedFormulaCards(options), next || null);
}

export function renderFormulaLibraryEditor(container, { settings, onToggle, targetKey }) {
  const formulas = normalizeActionFormulas(settings.formulas, settings);
  const card = renderEditorDataCard(
    container,
    { title: '수식 라이브러리', className: 'modifier-library-card' },
    (body) => {
      const grid = document.createElement('div');
      grid.className = 'modifier-tag-list';
      FORMULA_DEFS.forEach((def) => renderFormulaLibraryItem(grid, def, formulas, onToggle, targetKey));
      body.append(grid);
    }
  );
  writeTargetKey(card, targetKey);
}

export function replaceFormulaLibraryEditor(container, options) {
  container.querySelector('.modifier-library-card')?.remove();
  renderFormulaLibraryEditor(container, options);
}

export function toggleActionFormula(settings, type, enabled) {
  return writeActionFormulaEnabled(settings, type, enabled);
}

export function updateActionFormulaSetting(settings, type, prop, value) {
  return writeActionFormulaSetting(settings, type, prop, value);
}

export function resetActionFormulaSetting(settings, type) {
  return resetActionFormula(settings, type);
}

function createAppliedFormulaCards({
  actionKey,
  settings,
  onResetFormula,
  onSettingChange,
  targetKey,
  totalFrames,
  tuning,
}) {
  const fragment = document.createDocumentFragment();
  normalizeActionFormulas(settings.formulas, settings)
    .filter((formula) => formula.enabled)
    .forEach((formula) =>
      renderAppliedFormula(fragment, formula, {
        actionKey,
        onResetFormula,
        onSettingChange,
        targetKey,
        totalFrames: formulaTimelineFrameCount(formula, tuning, totalFrames),
        tuning,
      })
    );
  return fragment;
}

function renderAppliedFormula(container, formula, context) {
  const def = FORMULA_DEFS.find((item) => item.type === formula.type);
  if (!def) return;
  const card = renderEditorDataCard(container, { title: def.label, className: 'modifier-applied-card' }, (body) => {
    const frameInputs = new Map();
    let timelineTrack = null;
    const syncFormulaTimeline = () => {
      if (!timelineTrack) return;
      const { startProp, endProp } = formulaTimelineRangeProps(def, formula);
      renderMiniTimelineRange(timelineTrack, {
        totalFrames: context.totalFrames || ACTION_MAX_FRAMES,
        startFrame: formula[startProp],
        endFrame: formula[endProp],
        onRangeChange: handleRangeChange,
      });
    };
    const handleFrameChange = (prop, value) => {
      formula[prop] = context.onSettingChange(def.type, prop, value, context.targetKey) ?? value;
      const input = frameInputs.get(prop);
      if (input) input.value = String(formula[prop]);
      const { startProp, endProp } = formulaTimelineRangeProps(def, formula);
      if (prop === startProp || prop === endProp) syncFormulaTimeline();
      return formula[prop];
    };
    const handleRangeChange = ({ startFrame, endFrame }) => {
      const { startProp, endProp } = formulaTimelineRangeProps(def, formula);
      formula[startProp] = context.onSettingChange(def.type, startProp, startFrame, context.targetKey) ?? startFrame;
      formula[endProp] = context.onSettingChange(def.type, endProp, endFrame, context.targetKey) ?? endFrame;
      if (frameInputs.has(startProp)) frameInputs.get(startProp).value = String(formula[startProp]);
      if (frameInputs.has(endProp)) frameInputs.get(endProp).value = String(formula[endProp]);
      return {
        startFrame: formula[startProp],
        endFrame: formula[endProp],
      };
    };
    const timelineProps = formulaTimelineRangeProps(def, formula);
    const timeline = renderFormulaMiniTimeline(def, formula, {
      ...context,
      frameInputs,
      onFrameChange: handleFrameChange,
      onRangeChange: handleRangeChange,
      ...timelineProps,
    });
    if (timeline) {
      timelineTrack = timeline.querySelector('.modifier-mini-timeline-track');
      body.append(timeline);
    }
    const fields = document.createElement('div');
    fields.className = 'modifier-setting-grid';
    formulaFrameFields(def, formula, timelineProps).forEach(({ prop, label }) => {
      const field = renderFormulaNumberField(label, formula[prop], (value) => handleFrameChange(prop, value));
      const input = field.querySelector('input');
      if (input) frameInputs.set(prop, input);
      fields.append(field);
    });
    def.renderOptions(fields, formula, formulaOptionContext(def, formula, context));
    body.append(fields);
  });
  decorateFormulaCardTitle(card, def);
  installFormulaResetButton(card, def, context);
  writeTargetKey(card, context.targetKey);
}

function renderFormulaMiniTimeline(def, formula, context) {
  if (def.showMiniTimeline?.(formula) === false) return null;
  const { startProp, endProp } = context;
  const row = document.createElement('div');
  row.className = 'modifier-mini-timeline-row';
  const startStepper = renderFormulaFrameStepper(formula[startProp], context.totalFrames, (value) =>
    context.onFrameChange(startProp, value)
  );
  context.frameInputs?.set(startProp, startStepper.input);
  const track = document.createElement('div');
  track.className = 'timeline-track modifier-mini-timeline-track';
  track.setAttribute('aria-label', `${def.label} 작동 구간`);
  renderMiniTimelineRange(track, {
    totalFrames: context.totalFrames || ACTION_MAX_FRAMES,
    startFrame: formula[startProp],
    endFrame: formula[endProp],
    onRangeChange: context.onRangeChange,
  });
  const endStepper = renderFormulaFrameStepper(formula[endProp], context.totalFrames, (value) =>
    context.onFrameChange(endProp, value)
  );
  context.frameInputs?.set(endProp, endStepper.input);
  row.append(startStepper.root, track, endStepper.root);
  return row;
}

function formulaFrameFields(def, formula, timelineProps) {
  const fields =
    typeof def.frameFields === 'function'
      ? def.frameFields(formula)
      : [
          { prop: 'startFrame', label: 'Start Frame' },
          { prop: 'endFrame', label: 'End Frame' },
        ];
  return fields.filter(({ prop }) => prop !== timelineProps.startProp && prop !== timelineProps.endProp);
}

function renderFormulaFrameStepper(value, maxFrame, onChange) {
  const root = document.createElement('span');
  root.className = 'number-stepper-control modifier-mini-timeline-frame-stepper';
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.min = '1';
  input.max = String(Math.max(1, Math.round(Number(maxFrame || ACTION_MAX_FRAMES))));
  input.className = 'modifier-mini-timeline-frame-input';
  input.value = String(value ?? 1);
  input.setAttribute('aria-label', '프레임');
  let lastValue = Number(input.value);
  const commit = () => {
    const nextValue = Number(input.value);
    if (Object.is(nextValue, lastValue)) return;
    lastValue = nextValue;
    const committedValue = onChange(nextValue);
    if (committedValue === undefined) return;
    input.value = String(committedValue);
    lastValue = Number(committedValue);
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
  up.addEventListener('click', (event) => stepFormulaFrameInput(event, input, 1));
  down.addEventListener('click', (event) => stepFormulaFrameInput(event, input, -1));
  buttons.append(up, down);
  root.append(input, buttons);
  return { root, input };
}

function stepFormulaFrameInput(event, input, direction) {
  event.preventDefault();
  event.stopPropagation();
  const step = event.shiftKey ? 10 : 1;
  const min = Number(input.min || 1);
  const max = Number(input.max || ACTION_MAX_FRAMES);
  const current = Math.round(Number(input.value || min));
  input.value = String(Math.min(max, Math.max(min, current + direction * step)));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function formulaTimelineRangeProps(def, formula) {
  if (typeof def.timelineRangeProps === 'function') return def.timelineRangeProps(formula);
  return {
    startProp: 'startFrame',
    endProp: 'endFrame',
    label: 'Mini Timeline',
  };
}

function renderFormulaLibraryItem(body, def, formulas, onToggle, targetKey) {
  const formula = formulas.find((item) => item.type === def.type) || createDefaultFormula(def.type, false);
  const button = document.createElement('button');
  const enabled = Boolean(formula?.enabled);
  button.type = 'button';
  button.className = 'modifier-tag-pill';
  button.classList.toggle('is-active', enabled);
  button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  button.textContent = def.label;
  button.addEventListener('click', () => {
    const nextEnabled = !button.classList.contains('is-active');
    button.classList.toggle('is-active', nextEnabled);
    button.setAttribute('aria-pressed', nextEnabled ? 'true' : 'false');
    onToggle(def.type, nextEnabled, targetKey);
  });
  body.append(button);
}

function formulaOptionContext(def, formula, context) {
  return {
    actionGroupForKey: (key) => actionGroup(context.tuning, key),
    actionKey: context.actionKey,
    actionOptionsForGroup: (group) => actionOptionsForGroup(context.tuning, group),
    onChange: (prop, value) => context.onSettingChange(def.type, prop, value, context.targetKey),
  };
}

function formulaTimelineFrameCount(formula, tuning, fallback) {
  if (formula.type === 'link') {
    const fromAction = formula.fromActions?.[0];
    if (fromAction) return timelineFrameCount(tuning?.actionSettings?.[fromAction] || {});
  }
  return fallback || ACTION_MAX_FRAMES;
}

function decorateFormulaCardTitle(card, def) {
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

function installFormulaResetButton(card, def, context) {
  const title = card.querySelector('.editor-data-card-title');
  if (!title || typeof context.onResetFormula !== 'function') return;
  const content = document.createElement('span');
  content.className = 'formula-card-title-content';
  while (title.firstChild) content.append(title.firstChild);
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'formula-reset-button';
  reset.textContent = 'x';
  reset.title = `${def.label} 수식 초기화`;
  reset.setAttribute('aria-label', `${def.label} 수식 초기화`);
  reset.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    context.onResetFormula(def.type, context.targetKey);
  });
  title.append(content, reset);
  title.addEventListener('click', (event) => {
    if (event.target.closest('.formula-reset-button')) return;
    event.preventDefault();
  });
  title.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
  });
}

function writeTargetKey(element, targetKey) {
  if (targetKey === undefined || targetKey === null) return;
  element.dataset.targetKey = String(targetKey);
}
