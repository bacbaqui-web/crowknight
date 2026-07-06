import { ensureActionOffset } from './project_data_normalizer_helper.js';
import { groupActionPropertyGroups, partPropertyGroups, actionPropertyGroups } from './property_field_data.js';
import { readPartFieldDisplayValue } from './property_value_helper.js';
import { emptyPartMessage, markPartPicker, renderActionPartHeader } from './editor_panel_dom_helper.js';
import { isMasterPart } from './editor_label_helper.js';
import { partEditSources, actionMotionGroups } from './part_source_data.js';
import { actionPartFocusAfterMultiSelect } from './panel_edit_state.js';
import { updateRigPartValue } from './transform_value_helper.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { createGroupTransformTarget } from './group_transform_adapter.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import { clamp } from './common_helper.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import {
  interactionFrameValueFromInput,
  readInteractionDisplayValue,
  renderInteractionEditor,
} from './interaction_editor_engine.js';
import {
  renderAppliedModifierEditor,
  renderModifierLibraryEditor,
  replaceAppliedModifierEditor,
} from './modifier_editor_engine.js';
import {
  ensureTimelineModifierTarget,
  writeTimelineModifierEnabled,
  writeTimelineModifierSetting,
} from './timeline_modifier_data.js';
import { normalizeActionEditPivot, syncMasterFramePivot, writeActionEditPivot } from './action_timeline_edit_helper.js';
import { EDIT_CONTEXT_ACTION, EDIT_CONTEXT_SETUP, resolveEditTarget } from './edit_target_helper.js';

const ACTION_PIVOT_PROPERTY_GROUPS = [
  {
    label: '기준',
    props: [
      { prop: 'x', label: 'X' },
      { prop: 'y', label: 'Y' },
    ],
  },
];

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
    const activePartKey = getEditTarget?.(EDIT_CONTEXT_SETUP)?.targetKey || getActivePartKey() || MASTER_PART_KEY;

    partSelect.value = activePartKey;
    const part = partEditSources(getSelectedActor().tuning)[activePartKey];
    partFields.innerHTML = '';
    renderScrubGroups(
      partFields,
      partPropertyGroups(activePartKey),
      (prop) => readPartFieldDisplayValue(activePartKey, part, prop, getSelectedActor().tuning),
      (prop, value) => updatePartValue(prop, value),
      scrubCallbacks
    );
  }

  function renderActionPartFields() {
    actionTimeline.renderTimeline();
    setFrameSelectionActive?.(actionTimeline.hasFrameTarget());
    clearActionSupplementCards();
    const frameLabel = actionTimeline.frameLabel();
    const editTarget = actionTimelineEditTarget();
    if (editTarget.isGroup) {
      actionPartFields.innerHTML = '';
      renderActionPartHeader(actionPartFields, editTarget.targetType, editTarget.targetKeys.length, frameLabel);
      if (!actionTimeline.hasFrameSelection()) {
        actionPartFields.insertAdjacentHTML('beforeend', emptyPartMessage('그룹을 편집할 프레임을 선택하세요.'));
        renderActionModifierPanels();
        return;
      }
      renderScrubGroups(
        actionPartFields,
        groupActionPropertyGroups(),
        (prop) => getGroupEditValues()[prop],
        (prop, value) => updateGroupActionValue(prop, value),
        scrubCallbacks
      );
      renderActionModifierPanels();
      return;
    }

    const hasFrameSelection = actionTimeline.hasFrameSelection();
    const isWholeTimelineEdit = !actionTimeline.hasFrameTarget();
    if (editTarget.isActionPivot) {
      renderActionPivotFields(frameLabel);
      return;
    }
    if (editTarget.isFrameGroup) {
      renderFrameGroupFields(frameLabel);
      return;
    }

    const partKey = editTarget.targetKey || MASTER_PART_KEY;
    if (!hasFrameSelection && !isWholeTimelineEdit && !isMasterPart(partKey)) {
      actionPartFields.innerHTML = emptyPartMessage('편집할 프레임을 선택하세요.');
      renderActionModifierPanels();
      return;
    }

    actionPartSelect.value = partKey;
    ensureActionOffset(getSelectedActor().tuning, actionSelect.value, partKey);
    const offset = actionTimeline.currentFrameValue(partKey);
    actionPartFields.innerHTML = '';
    renderActionPartHeader(actionPartFields, partKey, selectedActionParts.size(), frameLabel);

    renderEditorDataCard(
      actionPartFields,
      { title: 'Property', className: 'property-editor-card', collapsible: false },
      (body) => {
        renderScrubGroups(
          body,
          actionPropertyGroups(partKey, hasFrameSelection),
          (prop) => actionTimeline.readDisplayValue(partKey, actionTimeline.currentFrameValue(partKey), prop),
          (prop, value) => updateActionPartValue(prop, value),
          scrubCallbacks
        );
      }
    );

    renderActionAppliedModifierPanel();

    if (hasFrameSelection) {
      renderInteractionEditor(actionSupplementContainer(), {
        frameValue: offset,
        targetKey: partKey,
        scrubCallbacks,
        onWrite: (prop, value, { rerender = true } = {}) => updateActionInteractionValue(prop, value, rerender),
      });
    }

    renderActionModifierLibraryPanel();
  }

  function renderActionPivotFields(frameLabel) {
    actionPartFields.innerHTML = '';
    renderActionPartHeader(actionPartFields, 'all', 0, frameLabel);

    renderEditorDataCard(
      actionPartFields,
      { title: 'Property', className: 'property-editor-card', collapsible: false },
      (body) => {
        renderScrubGroups(
          body,
          ACTION_PIVOT_PROPERTY_GROUPS,
          (prop) => readActionPivotValue(prop),
          (prop, value) => updateActionPivotValue(prop, value),
          scrubCallbacks
        );
      }
    );

    renderActionModifierPanels();
  }

  function renderFrameGroupFields(frameLabel) {
    actionPartFields.innerHTML = '';
    renderActionPartHeader(actionPartFields, 'all', 0, frameLabel);
    syncMasterPivotToFrames();

    renderEditorDataCard(
      actionPartFields,
      { title: 'Property', className: 'property-editor-card', collapsible: false },
      (body) => {
        renderScrubGroups(
          body,
          actionPropertyGroups(MASTER_PART_KEY, true),
          (prop) =>
            actionTimeline.readDisplayValue(MASTER_PART_KEY, actionTimeline.currentFrameValue(MASTER_PART_KEY), prop),
          (prop, value) => updateFrameGroupValue(prop, value),
          scrubCallbacks
        );
      }
    );

    renderActionModifierPanels();
  }

  function renderActionModifierPanels() {
    renderActionAppliedModifierPanel();
    renderActionModifierLibraryPanel();
  }

  function renderActionAppliedModifierPanel() {
    renderAppliedModifierEditor(actionSupplementContainer(), {
      modifiers: actionModifiers(),
      onSettingChange: updateActionModifierSetting,
      scrubCallbacks,
      targetKey: actionSelect.value,
      totalFrames: actionTimeline.frameCount?.(),
    });
  }

  function renderActionModifierLibraryPanel() {
    renderModifierLibraryEditor(actionSupplementContainer(), {
      modifiers: actionModifiers(),
      onToggle: updateActionModifierEnabled,
      onSettingChange: updateActionModifierSetting,
      scrubCallbacks,
      targetKey: actionSelect.value,
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

  function updateActionPartValue(prop, value) {
    const partKey = actionTimelineEditTarget().writeTargetKey || MASTER_PART_KEY;
    const nextValue = actionTimeline.updateOffsetForPart(partKey, prop, value, {
      applyWholeTimelineDelta: !actionTimeline.hasFrameTarget() && !isMasterPart(partKey),
    });
    return nextValue;
  }

  function updateFrameGroupValue(prop, value) {
    syncMasterPivotToFrames();
    const nextValue = actionTimeline.updateOffsetForPart(MASTER_PART_KEY, prop, value);
    return nextValue;
  }

  function readActionPivotValue(prop) {
    return actionSettings().editPivot?.[prop] ?? 0;
  }

  function updateActionPivotValue(prop, value) {
    beginUndoSnapshot();
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return readActionPivotValue(prop);
    const settings = actionSettings();
    writeActionEditPivot(settings, masterActionFrames(), { ...settings.editPivot, [prop]: nextValue });
    applySelected();
    return settings.editPivot[prop];
  }

  function actionSettings() {
    const actor = getSelectedActor();
    actor.tuning.actionSettings ||= {};
    actor.tuning.actionSettings[actionSelect.value] ||= {};
    actor.tuning.actionSettings[actionSelect.value].editPivot = normalizeActionEditPivot(
      actor.tuning.actionSettings[actionSelect.value].editPivot
    );
    return actor.tuning.actionSettings[actionSelect.value];
  }

  function syncMasterPivotToFrames() {
    syncMasterFramePivot(masterActionFrames(), actionSettings().editPivot);
  }

  function masterActionFrames() {
    const actor = getSelectedActor();
    ensureActionOffset(actor.tuning, actionSelect.value, MASTER_PART_KEY);
    return actor.tuning.actionOffsets?.[actionSelect.value]?.[MASTER_PART_KEY];
  }

  function updateActionInteractionValue(prop, value, rerender = true) {
    beginUndoSnapshot();
    actionTimeline.stopPreview();
    const partKey = actionTimelineEditTarget().writeTargetKey || MASTER_PART_KEY;
    const nextValue = interactionFrameValueFromInput(prop, value);
    actionTimeline.writeFrameValue(partKey, prop, nextValue);
    actionTimeline.syncPreview();
    applySelected();
    if (rerender) renderActionPartFields();
    return readInteractionDisplayValue(actionTimeline.currentFrameValue(partKey), prop);
  }

  function actionModifiers(key = actionSelect.value) {
    return ensureTimelineModifierTarget(getSelectedActor().tuning, 'action', key);
  }

  function updateActionModifierEnabled(type, enabled, targetKey = actionSelect.value) {
    beginUndoSnapshot();
    writeTimelineModifierEnabled(getSelectedActor().tuning, 'action', targetKey, type, enabled);
    applySelected();
    if (targetKey === actionSelect.value) {
      replaceAppliedModifierEditor(actionSupplementContainer(), {
        modifiers: actionModifiers(targetKey),
        onSettingChange: updateActionModifierSetting,
        scrubCallbacks,
        targetKey,
        totalFrames: actionTimeline.frameCount?.(),
      });
    }
  }

  function updateActionModifierSetting(type, prop, value, targetKey = actionSelect.value) {
    beginUndoSnapshot();
    const modifier = writeTimelineModifierSetting(getSelectedActor().tuning, 'action', targetKey, type, prop, value);
    applySelected();
    return modifier.settings?.[prop];
  }

  function updateGroupActionValue(prop, value) {
    actionTimeline.stopPreview();
    const canvasController = getCanvasController();
    const result = applyGroupEditPropertyValue({
      prop,
      value,
      groupEditValues: getGroupEditValues(),
      applyMove: canvasController.applyCurrentGroupMove,
      applyRotation: canvasController.applyCurrentGroupRotation,
      applyScale: canvasController.applyCurrentGroupScale,
      applyOpacity: canvasController.applyCurrentGroupOpacity,
    });
    if (!result.changed) return result.value;

    actionTimeline.syncPreview();
    applySelected();
    return result.value;
  }

  function applyGroupEditPropertyValue({
    prop,
    value,
    groupEditValues,
    applyMove,
    applyRotation,
    applyScale,
    applyOpacity,
  }) {
    const target = createGroupTransformTarget(groupEditValues);
    const nextValue = prop === 'scale' ? clamp(Number(value), 10, 400) : Number(value);
    if (!Number.isFinite(nextValue)) {
      return { changed: false, value: groupEditValues[prop] };
    }

    if (prop === 'x' || prop === 'y') {
      const dx = prop === 'x' ? nextValue - target.x : 0;
      const dy = prop === 'y' ? nextValue - target.y : 0;
      applyMove(dx, dy);
      groupEditValues[prop] = nextValue;
    } else if (prop === 'rot') {
      applyRotation(nextValue - target.rot);
      groupEditValues.rot = nextValue;
    } else if (prop === 'scale') {
      const previousScale = Math.max(0.1, target.scale / 100);
      const nextScale = Math.max(0.1, nextValue / 100);
      applyScale(nextScale / previousScale);
      groupEditValues.scale = nextValue;
    } else if (prop === 'opacity') {
      const nextOpacity = nextValue > 0 ? 1 : 0;
      applyOpacity(nextOpacity);
      groupEditValues.opacity = nextOpacity;
    }

    return { changed: true, value: groupEditValues[prop] };
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

  function updatePartValue(prop, value) {
    beginUndoSnapshot();
    const activePartKey = getEditTarget?.(EDIT_CONTEXT_SETUP)?.writeTargetKey || getActivePartKey() || MASTER_PART_KEY;
    const part = partEditSources(getSelectedActor().tuning)[activePartKey];
    updateRigPartValue(part, activePartKey, prop, value, getSelectedActor().tuning);
    applySelected();
    return readPartFieldDisplayValue(activePartKey, part, prop, getSelectedActor().tuning);
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
    syncMotionRows,
    syncPartPickers,
  };
}
