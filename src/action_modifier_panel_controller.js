import {
  renderAppliedFormulaEditor,
  renderFormulaLibraryEditor,
  replaceFormulaLibraryEditor,
  replaceAppliedFormulaEditor,
  resetActionFormulaSetting,
  toggleActionFormula,
  updateActionFormulaSetting,
} from './formula_editor_engine.js';
import { normalizeActionFormulas, migrateActionFormulasFromModifiers } from './formula_registry.js';
import { actionGroup, actionOptionsForGroup } from './action_authoring_data.js';
import { timelineFrameCount } from './timeline_playback_helper.js';

export function createActionModifierPanelController({
  applySelected,
  beginUndoSnapshot,
  getActionKey,
  getContainer,
  getTuning,
  getTotalFrames,
}) {
  function settings(key = getActionKey()) {
    const tuning = getTuning();
    tuning.actionSettings ||= {};
    tuning.actionSettings[key] ||= {};
    tuning.actionSettings[key].formulas = normalizeActionFormulas(
      migrateActionFormulasFromModifiers(tuning.actionSettings[key], tuning.modifiers?.action?.[key] || []),
      tuning.actionSettings[key]
    );
    clampFormulaEndFramesToTimeline(tuning.actionSettings[key], key);
    return tuning.actionSettings[key];
  }

  function renderPanels() {
    renderAppliedPanel();
    renderLibraryPanel();
  }

  function renderAppliedPanel() {
    renderAppliedFormulaEditor(getContainer(), {
      actionKey: getActionKey(),
      settings: settings(),
      onResetFormula: resetFormula,
      onSettingChange: updateSetting,
      targetKey: getActionKey(),
      totalFrames: getTotalFrames?.(),
      tuning: getTuning(),
    });
  }

  function renderLibraryPanel() {
    renderFormulaLibraryEditor(getContainer(), {
      settings: settings(),
      onToggle: updateEnabled,
      targetKey: getActionKey(),
    });
  }

  function updateEnabled(type, enabled, targetKey = getActionKey()) {
    beginUndoSnapshot();
    const formula = toggleActionFormula(settings(targetKey), type, enabled);
    syncLegacyModifierEnabled(targetKey, type, enabled);
    if (type === 'link' && formula?.enabled && !formula.fromActions?.length) {
      const fallback = fallbackLinkActionKey(targetKey);
      if (fallback) updateActionFormulaSetting(settings(targetKey), 'link', 'fromActions', [fallback]);
    }
    if (enabled) syncFormulaEndFrame(type, targetKey);
    applySelected();
    if (targetKey === getActionKey()) {
      replaceAppliedFormulaEditor(getContainer(), {
        actionKey: targetKey,
        settings: settings(targetKey),
        onResetFormula: resetFormula,
        onSettingChange: updateSetting,
        targetKey,
        totalFrames: getTotalFrames?.(),
        tuning: getTuning(),
      });
      replaceFormulaLibraryEditor(getContainer(), {
        settings: settings(targetKey),
        onToggle: updateEnabled,
        targetKey,
      });
    }
    return formula;
  }

  function syncLegacyModifierEnabled(targetKey, type, enabled) {
    if (type !== 'velocity' || enabled) return;
    const modifiers = getTuning().modifiers?.action?.[targetKey];
    modifiers?.forEach((modifier) => {
      if (modifier?.type === 'velocity') modifier.enabled = false;
    });
  }

  function updateSetting(type, prop, value, targetKey = getActionKey()) {
    beginUndoSnapshot();
    const formula = updateActionFormulaSetting(settings(targetKey), type, prop, value);
    if (type === 'link' && prop === 'fromActions') {
      const fromAction = formula?.fromActions?.[0];
      if (fromAction) {
        updateActionFormulaSetting(
          settings(targetKey),
          type,
          'endFrame',
          timelineFrameCount(getTuning().actionSettings?.[fromAction] || {})
        );
      }
    }
    if (type === 'cast' && prop === 'mode' && value === 'repeat') {
      updateActionFormulaSetting(settings(targetKey), type, 'repeatEndFrame', actionTimelineFrameCount(targetKey));
    }
    applySelected();
    if (
      ((type === 'cast' && prop === 'mode') || (type === 'link' && prop === 'fromActions')) &&
      targetKey === getActionKey()
    ) {
      replaceAppliedFormulaEditor(getContainer(), {
        actionKey: targetKey,
        settings: settings(targetKey),
        onResetFormula: resetFormula,
        onSettingChange: updateSetting,
        targetKey,
        totalFrames: getTotalFrames?.(),
        tuning: getTuning(),
      });
    }
    return formula?.[prop];
  }

  function resetFormula(type, targetKey = getActionKey()) {
    beginUndoSnapshot();
    const formula = resetActionFormulaSetting(settings(targetKey), type);
    if (type === 'link' && formula?.enabled && !formula.fromActions?.length) {
      const fallback = fallbackLinkActionKey(targetKey);
      if (fallback) updateActionFormulaSetting(settings(targetKey), 'link', 'fromActions', [fallback]);
    }
    syncFormulaEndFrame(type, targetKey);
    applySelected();
    if (targetKey === getActionKey()) {
      replaceAppliedFormulaEditor(getContainer(), {
        actionKey: targetKey,
        settings: settings(targetKey),
        onResetFormula: resetFormula,
        onSettingChange: updateSetting,
        targetKey,
        totalFrames: getTotalFrames?.(),
        tuning: getTuning(),
      });
      replaceFormulaLibraryEditor(getContainer(), {
        settings: settings(targetKey),
        onToggle: updateEnabled,
        targetKey,
      });
    }
    return formula;
  }

  function fallbackLinkActionKey(actionKey) {
    const tuning = getTuning();
    const group = actionGroup(tuning, actionKey);
    return actionOptionsForGroup(tuning, group).find((action) => action.value !== actionKey)?.value || '';
  }

  function syncFormulaEndFrame(type, targetKey) {
    const formula = settings(targetKey).formulas.find((item) => item.type === type);
    const endFrame = formulaEndFrame(type, formula, targetKey);
    updateActionFormulaSetting(settings(targetKey), type, 'endFrame', endFrame);
    if (type === 'cast') updateActionFormulaSetting(settings(targetKey), type, 'repeatEndFrame', endFrame);
  }

  function formulaEndFrame(type, formula, targetKey) {
    if (type === 'link') {
      const fromAction = formula?.fromActions?.[0];
      if (fromAction) return actionTimelineFrameCount(fromAction);
    }
    return actionTimelineFrameCount(targetKey);
  }

  function actionTimelineFrameCount(actionKey) {
    return timelineFrameCount(getTuning().actionSettings?.[actionKey] || settings(actionKey));
  }

  function clampFormulaEndFramesToTimeline(actionSettings, actionKey) {
    actionSettings.formulas?.forEach((formula) => {
      const endFrame = formulaEndFrame(formula.type, formula, actionKey);
      if (Number(formula.endFrame || 0) > endFrame) formula.endFrame = endFrame;
      if (formula.type === 'cast' && Number(formula.repeatEndFrame || 0) > endFrame) {
        formula.repeatEndFrame = endFrame;
      }
    });
  }

  return {
    renderAppliedPanel,
    renderLibraryPanel,
    renderPanels,
    updateEnabled,
    updateSetting,
  };
}
