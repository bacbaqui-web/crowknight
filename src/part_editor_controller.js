import { markPartPicker } from './editor_panel_dom_helper.js';
import { actionMotionGroups } from './part_source_data.js';
import { actionPartFocusAfterMultiSelect } from './panel_edit_state.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import { EDIT_CONTEXT_ACTION, resolveEditTarget } from './edit_target_helper.js';
import { createActionInteractionPanelController } from './action_interaction_panel_controller.js';
import { createActionModifierPanelController } from './action_modifier_panel_controller.js';
import { createPropertyPanelController } from './property_panel_controller.js';
import { primaryInteractionObjectPartKeyForEditFocus } from './interaction_object_editor_controller.js';

export function createTuningPanelPartController({
  elements,
  selectedActionParts,
  scrubCallbacks,
  getSelectedActor,
  getActivePartKey,
  setActivePartKey,
  setActivePartKeyGlobal,
  getActiveActionPartKey,
  setActiveActionPartKey,
  getEditTarget,
  getEditFocusPartKey,
  setEditContext,
  getEditFocusContext,
  setEditFocusContext,
  setEditFocusPartKey,
  setFrameSelectionActive,
  getGroupEditValues,
  resetGroupEditValues,
  clearEditHandleState,
  syncAnchorDebugPart,
  actionTimeline,
  effectTimeline,
  getCanvasController,
  beginUndoSnapshot,
  applySelected,
}) {
  const {
    partSection,
    actionSection,
    effectSection,
    partPicker,
    actionPartPicker,
    partSelect,
    partFields,
    actionSelect,
    actionPartSelect,
    actionPartFields,
    motionRows,
  } = elements;
  const actionInteractionPanel = createActionInteractionPanelController({
    applySelected,
    beginUndoSnapshot,
    getDefaultValue: (partKey) => getSelectedActor().tuning.rig?.[partKey],
    getActionKey: () => actionSelect.value,
    getTuning: () => getSelectedActor().tuning,
    getWriteTargetKey: () => primaryInteractionObjectPartKeyForEditFocus(actionTimelineEditTarget().writeTargetKey),
    rerender: () => renderActionPartFields(),
  });
  const actionModifierPanel = createActionModifierPanelController({
    applySelected,
    beginUndoSnapshot,
    getActionKey: () => actionSelect.value,
    getContainer: actionSupplementContainer,
    getTuning: () => getSelectedActor().tuning,
    getTotalFrames: () => actionTimeline.frameCount?.(),
    scrubCallbacks,
  });
  const propertyPanel = createPropertyPanelController({
    actionModifierPanel,
    actionPartFields,
    actionPartSelect,
    actionSelect,
    actionTimeline,
    applySelected,
    beginUndoSnapshot,
    getActiveActionPartKey,
    getActivePartKey,
    getCanvasController,
    getEditTarget,
    getGroupEditValues,
    getSelectedActor,
    getSetupSupplementContainer: setupSupplementContainer,
    partFields,
    partSelect,
    scrubCallbacks,
    selectedActionParts,
    setFrameSelectionActive,
  });

  function selectPickerPart(context, partKey, append = false) {
    if (context === 'action' && append) {
      toggleActionPartMultiSelection(partKey);
      return;
    }

    if ((context === 'action' ? getActiveActionPartKey() : getActivePartKey()) === partKey) {
      clearPartSelection(context);
      return;
    }

    setEditFocusPartKey(partKey);
    setEditFocusContext(context);
    if (context === 'action') {
      selectSingleActionPart(partKey);
      renderActionPartFields();
      actionTimeline.syncPreview();
    } else {
      setEditContext('part');
      setActivePartKey(partKey);
      setActivePartKeyGlobal(partKey);
      partSelect.value = partKey;
      renderPartFields();
    }

    syncPartPickers();
    syncAnchorDebugPart();
  }

  function selectCanvasPart(context, partKey) {
    if (context === 'action') {
      setEditFocusPartKey(partKey);
      setEditFocusContext('action');
      selectSingleActionPart(partKey);
      renderActionPartFields();
      actionTimeline.syncPreview();
    } else {
      setEditContext('part');
      setEditFocusContext('part');
      setActivePartKey(partKey);
      setActivePartKeyGlobal(partKey);
      setEditFocusPartKey(partKey);
      partSelect.value = partKey;
      renderPartFields();
    }

    syncPartPickers();
    syncAnchorDebugPart();
  }

  function openPartSection() {
    closeEditSection('action');
    closeEditSection('effect');
    if (!getActivePartKey()) selectRigBasis();
  }

  function openActionSection() {
    closeEditSection('part');
    closeEditSection('effect');
    setEditContext('action');
    setEditFocusContext('action');
    setEditFocusPartKey(getActiveActionPartKey() || MASTER_PART_KEY);
    renderActionPartFields();
    syncAnchorDebugPart();
  }

  function closeEditSection(context) {
    const section = context === 'action' ? actionSection : context === 'effect' ? effectSection : partSection;
    section.classList.remove('is-open');
    if (context === 'effect') effectTimeline.clearSelection();
    else clearPartSelection(context);
  }

  function clearPartSelection(context) {
    if (context === 'action') clearActionPartSelection();
    else clearRigPartSelection();

    if (context === getEditFocusContext() && context !== 'action') {
      setEditFocusPartKey(MASTER_PART_KEY);
      setEditFocusContext('part');
    }

    clearInactiveEditHandleState();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function clearActionPartSelection() {
    selectedActionParts.clear();
    setActiveActionPartKey(null);
    resetGroupEditValues();
    setEditContext('action');
    setEditFocusContext('action');
    setEditFocusPartKey(MASTER_PART_KEY);
    renderActionPartFields();
    actionTimeline.syncPreview();
  }

  function clearRigPartSelection() {
    selectRigBasis();
    renderPartFields();
  }

  function selectRigBasis() {
    setEditContext('part');
    setEditFocusContext('part');
    setActivePartKey(MASTER_PART_KEY);
    setActivePartKeyGlobal(MASTER_PART_KEY);
    setEditFocusPartKey(MASTER_PART_KEY);
    partSelect.value = MASTER_PART_KEY;
  }

  function clearInactiveEditHandleState() {
    if (getEditFocusPartKey()) return;
    clearEditHandleState();
  }

  function toggleActionPartMultiSelection(partKey) {
    setEditContext('action');
    setEditFocusContext('action');
    selectedActionParts.toggle(partKey);
    resetGroupEditValues();

    syncActiveActionPartAfterMultiSelect(partKey);
    if (getActiveActionPartKey()) actionPartSelect.value = getActiveActionPartKey();
    renderActionPartFields();
    actionTimeline.syncPreview();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function selectSingleActionPart(partKey) {
    setEditContext('action');
    setActiveActionPartKey(selectedActionParts.selectOnly(partKey));
    resetGroupEditValues();
    actionPartSelect.value = partKey;
  }

  function syncActiveActionPartAfterMultiSelect(partKey) {
    const nextFocus = actionPartFocusAfterMultiSelect(selectedActionParts, partKey, MASTER_PART_KEY);
    setActiveActionPartKey(nextFocus.activeActionPartKey);
    setEditFocusPartKey(nextFocus.editFocusPartKey);
  }

  function syncPartPickers() {
    markPartPicker(partPicker, getActivePartKey());
    markPartPicker(actionPartPicker, getActiveActionPartKey(), selectedActionParts);
  }

  function renderPartFields() {
    clearSetupSupplementCards();
    propertyPanel.renderSetupPartFields();
  }

  function setupSupplementContainer() {
    return partFields.parentElement || partFields;
  }

  function clearSetupSupplementCards() {
    const container = setupSupplementContainer();
    if (!container) return;
    Array.from(container.children).forEach((child) => {
      if (child.classList.contains('interaction-editor-card')) child.remove();
    });
  }

  function renderActionPartFields() {
    clearActionSupplementCards();
    propertyPanel.renderActionPartFields({
      renderInteraction: (options) => actionInteractionPanel.render(actionSupplementContainer(), options),
    });
  }

  function actionSupplementContainer() {
    return actionPartFields.parentElement || actionPartFields;
  }

  function clearActionSupplementCards() {
    const container = actionPartFields.parentElement;
    if (!container) return;
    Array.from(container.children).forEach((child) => {
      if (
        child.classList.contains('interaction-editor-card') ||
        child.classList.contains('modifier-applied-card') ||
        child.classList.contains('modifier-library-card')
      ) {
        child.remove();
      }
    });
  }

  function actionTimelineEditTarget() {
    const editTarget = getEditTarget?.(EDIT_CONTEXT_ACTION);
    if (editTarget) return editTarget;
    return resolveEditTarget({
      context: EDIT_CONTEXT_ACTION,
      hasFrameTarget: actionTimeline.hasFrameTarget(),
      selectedActionParts,
      activeActionPartKey: getActiveActionPartKey(),
    });
  }

  function syncMotionRows() {
    const groups = actionMotionGroups(actionSelect.value);
    motionRows.forEach((row) => {
      row.hidden = !groups.includes(row.dataset.motionGroup);
    });
    actionTimeline.renderSettings();
  }

  function handlePartChange() {
    setEditContext('part');
    setEditFocusContext('part');
    setActivePartKey(partSelect.value);
    setActivePartKeyGlobal(partSelect.value);
    setEditFocusPartKey(partSelect.value);
    renderPartFields();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function handleActionChange() {
    setEditContext('action');
    setEditFocusContext('action');
    actionTimeline.stopPreview();
    setEditFocusPartKey(getActiveActionPartKey() || MASTER_PART_KEY);
    renderActionPartFields();
    syncMotionRows();
    syncPartPickers();
    syncAnchorDebugPart();
    actionTimeline.syncPreview();
  }

  function handleActionPartChange() {
    setEditContext('action');
    setEditFocusContext('action');
    setActiveActionPartKey(selectedActionParts.selectOnly(actionPartSelect.value));
    resetGroupEditValues();
    setEditFocusPartKey(getActiveActionPartKey());
    renderActionPartFields();
    syncPartPickers();
    syncAnchorDebugPart();
    actionTimeline.syncPreview();
  }

  return {
    clearPartSelection,
    closeEditSection,
    handlePartChange,
    handleActionChange,
    handleActionPartChange,
    openPartSection,
    openActionSection,
    renderPartFields,
    renderActionPartFields,
    selectPickerPart,
    selectCanvasPart,
    syncMotionRows,
    syncPartPickers,
  };
}
