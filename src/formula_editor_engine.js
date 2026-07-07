import { actionGroup, actionOptionsForGroup } from './action_authoring_data.js';
import { ACTION_FPS, ACTION_MAX_FRAMES } from './game_config_data.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import {
  FORMULA_DEFS,
  createDefaultFormula,
  normalizeActionFormulas,
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

function createAppliedFormulaCards({ actionKey, settings, onSettingChange, targetKey, totalFrames, tuning }) {
  const fragment = document.createDocumentFragment();
  normalizeActionFormulas(settings.formulas, settings)
    .filter((formula) => formula.enabled)
    .forEach((formula) =>
      renderAppliedFormula(fragment, formula, {
        actionKey,
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
    let startInput = null;
    let endInput = null;
    body.append(
      renderFormulaMiniTimeline(def, formula, {
        ...context,
        onRangeChange: ({ startFrame, endFrame }) => {
          formula.startFrame =
            context.onSettingChange(def.type, 'startFrame', startFrame, context.targetKey) ?? startFrame;
          formula.endFrame = context.onSettingChange(def.type, 'endFrame', endFrame, context.targetKey) ?? endFrame;
          if (startInput) startInput.value = String(formula.startFrame);
          if (endInput) endInput.value = String(formula.endFrame);
          return {
            startFrame: formula.startFrame,
            endFrame: formula.endFrame,
          };
        },
      })
    );
    const fields = document.createElement('div');
    fields.className = 'modifier-setting-grid';
    const startField = renderFormulaNumberField('Start Frame', formula.startFrame, (value) =>
      context.onSettingChange(def.type, 'startFrame', value, context.targetKey)
    );
    const endField = renderFormulaNumberField('End Frame', formula.endFrame, (value) =>
      context.onSettingChange(def.type, 'endFrame', value, context.targetKey)
    );
    startInput = startField.querySelector('input');
    endInput = endField.querySelector('input');
    fields.append(startField, endField);
    def.renderOptions(fields, formula, formulaOptionContext(def, formula, context));
    body.append(fields);
  });
  decorateFormulaCardTitle(card, def);
  writeTargetKey(card, context.targetKey);
}

function renderFormulaMiniTimeline(def, formula, context) {
  const row = document.createElement('div');
  row.className = 'modifier-mini-timeline-row';
  const label = document.createElement('span');
  label.textContent = 'Mini Timeline';
  const track = document.createElement('div');
  track.className = 'timeline-track modifier-mini-timeline-track';
  track.setAttribute('aria-label', `${def.label} 작동 구간`);
  renderMiniTimelineRange(track, {
    totalFrames: context.totalFrames || ACTION_MAX_FRAMES,
    startFrame: formula.startFrame,
    endFrame: formula.endFrame,
    onRangeChange: context.onRangeChange,
  });
  row.append(label, track);
  return row;
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

function writeTargetKey(element, targetKey) {
  if (targetKey === undefined || targetKey === null) return;
  element.dataset.targetKey = String(targetKey);
}
