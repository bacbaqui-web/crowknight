import { ensureActionOffset } from './project_data_normalizer_helper.js';
import { groupActionPropertyGroups, partPropertyGroups, actionPropertyGroups } from './property_field_data.js';
import { readPartFieldDisplayValue } from './property_value_helper.js';
import { emptyPartMessage, renderActionPartHeader } from './editor_panel_dom_helper.js';
import { isMasterPart } from './editor_label_helper.js';
import { partEditSources } from './part_source_data.js';
import { updateRigPartValue } from './transform_value_helper.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import { normalizeActionEditPivot, syncMasterFramePivot, writeActionEditPivot } from './action_timeline_edit_helper.js';
import { EDIT_CONTEXT_ACTION, EDIT_CONTEXT_SETUP, resolveEditTarget } from './edit_target_helper.js';
import { applyGroupEditPropertyValue } from './property_group_edit_helper.js';
import {
  interactionFrameValueFromInput,
  readInteractionDisplayValue,
  renderInteractionEditor,
} from './interaction_editor_engine.js';
import {
  interactionObjectRole,
  isInteractionObjectPartKey,
  primaryInteractionObjectPartKeyForEditFocus,
} from './interaction_object_editor_controller.js';

const ACTION_PIVOT_PROPERTY_GROUPS = [
  {
    label: '기준',
    props: [
      { prop: 'x', label: 'X' },
      { prop: 'y', label: 'Y' },
    ],
  },
];

export function createPropertyPanelController({
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
  getSetupSupplementContainer,
  partFields,
  partSelect,
  scrubCallbacks,
  selectedActionParts,
  setFrameSelectionActive,
}) {
  function renderSetupPartFields() {
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
    if (isInteractionObjectPartKey(activePartKey)) renderSetupInteractionFields(activePartKey, part);
  }

  function renderActionPartFields({ renderInteraction }) {
    actionTimeline.renderTimeline();
    setFrameSelectionActive?.(actionTimeline.hasFrameTarget());
    const frameLabel = actionTimeline.frameLabel();
    const editTarget = actionTimelineEditTarget();

    if (editTarget.isGroup) {
      renderActionGroupFields(frameLabel);
      return;
    }

    const hasFrameSelection = actionTimeline.hasFrameSelection();
    if (editTarget.isActionPivot) {
      renderActionPivotFields(frameLabel);
      return;
    }
    if (editTarget.isFrameGroup) {
      renderFrameGroupFields(frameLabel);
      return;
    }

    const partKey = editTarget.targetKey || MASTER_PART_KEY;
    actionPartSelect.value = partKey;
    ensureActionOffset(getSelectedActor().tuning, actionSelect.value, partKey);
    const interactionTargetKey = primaryInteractionObjectPartKeyForEditFocus(partKey);
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

    actionModifierPanel.renderAppliedPanel();

    if (isInteractionObjectPartKey(interactionTargetKey)) {
      renderInteraction?.({
        targetKey: interactionTargetKey,
        scrubCallbacks,
      });
    }

    actionModifierPanel.renderLibraryPanel();
  }

  function renderActionGroupFields(frameLabel) {
    const editTarget = actionTimelineEditTarget();
    actionPartFields.innerHTML = '';
    renderActionPartHeader(actionPartFields, editTarget.targetType, editTarget.targetKeys.length, frameLabel);
    if (!actionTimeline.hasFrameSelection()) {
      actionPartFields.insertAdjacentHTML('beforeend', emptyPartMessage('그룹을 편집할 프레임을 선택하세요.'));
      actionModifierPanel.renderPanels();
      return;
    }
    renderScrubGroups(
      actionPartFields,
      groupActionPropertyGroups(),
      (prop) => getGroupEditValues()[prop],
      (prop, value) => updateGroupActionValue(prop, value),
      scrubCallbacks
    );
    actionModifierPanel.renderPanels();
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

    actionModifierPanel.renderPanels();
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

    actionModifierPanel.renderPanels();
  }

  function updateActionPartValue(prop, value) {
    const partKey = actionTimelineEditTarget().writeTargetKey || MASTER_PART_KEY;
    return actionTimeline.updateOffsetForPart(partKey, prop, value, {
      applyWholeTimelineDelta: !actionTimeline.hasFrameTarget() && !isMasterPart(partKey),
    });
  }

  function updateFrameGroupValue(prop, value) {
    syncMasterPivotToFrames();
    return actionTimeline.updateOffsetForPart(MASTER_PART_KEY, prop, value);
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

  function renderSetupInteractionFields(partKey, part) {
    renderInteractionEditor(getSetupSupplementContainer?.() || partFields, {
      title: '상호작용 기본값',
      frameValue: part,
      targetKey: partKey,
      fixedRole: interactionObjectRole(partKey),
      showRoleToggles: false,
      scrubCallbacks,
      onWrite: (prop, value) => updateSetupInteractionValue(partKey, part, prop, value),
    });
  }

  function updateSetupInteractionValue(partKey, part, prop, value) {
    beginUndoSnapshot();
    updateRigPartValue(part, partKey, prop, interactionFrameValueFromInput(prop, value), getSelectedActor().tuning);
    applySelected();
    return readInteractionDisplayValue(part, prop);
  }

  return {
    renderActionPartFields,
    renderSetupPartFields,
  };
}
