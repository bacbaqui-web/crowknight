import { ensurePoseOffset } from './project_data_normalizer.js';
import { groupPosePropertyGroups, partPropertyGroups, posePropertyGroups } from './property_field_groups.js';
import { isInteractionToggleProp, readPartFieldDisplayValue } from './property_value_helper.js';
import { emptyPartMessage, markPartPicker, renderPosePartHeader } from './editor_panel_dom.js';
import { isMasterPart } from './editor_label_helper.js';
import { partEditSources, poseMotionGroups } from './part_source_registry.js';
import { posePartFocusAfterMultiSelect } from './panel_edit_state.js';
import { updateRigPartValue } from './transform_value_helper.js';
import { renderScrubGroups } from './property_scrub_helper.js';
import { applyGroupPoseEditValue } from './group_pose_editor.js';
import { MASTER_PART_KEY } from './game_config.js';

export function createTuningPanelPartController({
  elements,
  selectedPoseParts,
  scrubCallbacks,
  getSelectedActor,
  getActivePartKey,
  setActivePartKey,
  setActivePartKeyGlobal,
  getActivePosePartKey,
  setActivePosePartKey,
  getEditFocusPartKey,
  setEditContext,
  getEditFocusContext,
  setEditFocusContext,
  setEditFocusPartKey,
  getGroupEditValues,
  resetGroupEditValues,
  clearEditHandleState,
  syncAnchorDebugPart,
  poseTimeline,
  effectTimeline,
  getCanvasController,
  beginUndoSnapshot,
  applySelected,
}) {
  const {
    partSection,
    poseSection,
    effectSection,
    partPicker,
    posePartPicker,
    partSelect,
    partFields,
    poseSelect,
    posePartSelect,
    posePartFields,
    motionRows,
  } = elements;

  function selectPickerPart(context, partKey, append = false) {
    if (context === 'pose' && append) {
      togglePosePartMultiSelection(partKey);
      return;
    }

    if ((context === 'pose' ? getActivePosePartKey() : getActivePartKey()) === partKey) {
      clearPartSelection(context);
      return;
    }

    setEditFocusPartKey(partKey);
    setEditFocusContext(context);
    if (context === 'pose') {
      selectSinglePosePart(partKey);
      renderPosePartFields();
      poseTimeline.syncPreview();
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
    closeEditSection('pose');
    closeEditSection('effect');
    if (!getActivePartKey()) selectRigBasis();
  }

  function openPoseSection() {
    closeEditSection('part');
    closeEditSection('effect');
    setEditContext('pose');
    setEditFocusContext('pose');
    setEditFocusPartKey(getActivePosePartKey() || MASTER_PART_KEY);
    renderPosePartFields();
    syncAnchorDebugPart();
  }

  function closeEditSection(context) {
    const section = context === 'pose' ? poseSection : context === 'effect' ? effectSection : partSection;
    section.classList.remove('is-open');
    if (context === 'effect') effectTimeline.clearSelection();
    else clearPartSelection(context);
  }

  function clearPartSelection(context) {
    if (context === 'pose') clearPosePartSelection();
    else clearRigPartSelection();

    if (context === getEditFocusContext() && context !== 'pose') {
      setEditFocusPartKey(MASTER_PART_KEY);
      setEditFocusContext('part');
    }

    clearInactiveEditHandleState();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function clearPosePartSelection() {
    selectedPoseParts.clear();
    setActivePosePartKey(null);
    resetGroupEditValues();
    setEditContext('pose');
    setEditFocusContext('pose');
    setEditFocusPartKey(MASTER_PART_KEY);
    renderPosePartFields();
    poseTimeline.syncPreview();
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

  function togglePosePartMultiSelection(partKey) {
    setEditContext('pose');
    setEditFocusContext('pose');
    selectedPoseParts.toggle(partKey);
    resetGroupEditValues();

    syncActivePosePartAfterMultiSelect(partKey);
    if (getActivePosePartKey()) posePartSelect.value = getActivePosePartKey();
    renderPosePartFields();
    poseTimeline.syncPreview();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function selectSinglePosePart(partKey) {
    setEditContext('pose');
    setActivePosePartKey(selectedPoseParts.selectOnly(partKey));
    resetGroupEditValues();
    posePartSelect.value = partKey;
  }

  function syncActivePosePartAfterMultiSelect(partKey) {
    const nextFocus = posePartFocusAfterMultiSelect(selectedPoseParts, partKey, MASTER_PART_KEY);
    setActivePosePartKey(nextFocus.activePosePartKey);
    setEditFocusPartKey(nextFocus.editFocusPartKey);
  }

  function syncPartPickers() {
    markPartPicker(partPicker, getActivePartKey());
    markPartPicker(posePartPicker, getActivePosePartKey(), selectedPoseParts);
  }

  function renderPartFields() {
    const activePartKey = getActivePartKey() || MASTER_PART_KEY;

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

  function renderPosePartFields() {
    poseTimeline.renderTimeline();
    const frameLabel = poseTimeline.frameLabel();
    if (selectedPoseParts.size() > 1) {
      posePartFields.innerHTML = '';
      renderPosePartHeader(posePartFields, 'group', selectedPoseParts.size(), frameLabel);
      if (!poseTimeline.hasFrameSelection()) {
        posePartFields.insertAdjacentHTML('beforeend', emptyPartMessage('그룹을 편집할 프레임을 선택하세요.'));
        return;
      }
      renderScrubGroups(
        posePartFields,
        groupPosePropertyGroups(),
        (prop) => getGroupEditValues()[prop],
        (prop, value) => updateGroupPoseValue(prop, value),
        scrubCallbacks
      );
      return;
    }

    const partKey = getActivePosePartKey() || MASTER_PART_KEY;
    if (!poseTimeline.hasFrameSelection() && !isMasterPart(partKey)) {
      posePartFields.innerHTML = emptyPartMessage('편집할 프레임을 선택하세요.');
      return;
    }

    posePartSelect.value = partKey;
    ensurePoseOffset(getSelectedActor().tuning, poseSelect.value, partKey);
    const offset = poseTimeline.currentFrameValue(partKey);
    posePartFields.innerHTML = '';
    renderPosePartHeader(posePartFields, partKey, selectedPoseParts.size(), frameLabel);

    renderScrubGroups(
      posePartFields,
      posePropertyGroups(partKey, poseTimeline.hasFrameSelection(), offset),
      (prop) => poseTimeline.readDisplayValue(partKey, offset, prop),
      (prop, value) => updatePosePartValue(prop, value),
      scrubCallbacks
    );
  }

  function updatePosePartValue(prop, value) {
    const nextValue = poseTimeline.updateOffset(prop, value);
    if (isInteractionToggleProp(prop)) renderPosePartFields();
    return nextValue;
  }

  function updateGroupPoseValue(prop, value) {
    poseTimeline.stopPreview();
    const canvasController = getCanvasController();
    const result = applyGroupPoseEditValue({
      prop,
      value,
      groupEditValues: getGroupEditValues(),
      applyMove: canvasController.applyCurrentGroupMove,
      applyRotation: canvasController.applyCurrentGroupRotation,
      applyScale: canvasController.applyCurrentGroupScale,
      applyOpacity: canvasController.applyCurrentGroupOpacity,
    });
    if (!result.changed) return result.value;

    poseTimeline.syncPreview();
    applySelected();
    return result.value;
  }

  function updatePartValue(prop, value) {
    beginUndoSnapshot();
    const activePartKey = getActivePartKey() || MASTER_PART_KEY;
    const part = partEditSources(getSelectedActor().tuning)[activePartKey];
    updateRigPartValue(part, activePartKey, prop, value, getSelectedActor().tuning);
    applySelected();
    return readPartFieldDisplayValue(activePartKey, part, prop, getSelectedActor().tuning);
  }

  function syncMotionRows() {
    const groups = poseMotionGroups(poseSelect.value);
    motionRows.forEach((row) => {
      row.hidden = !groups.includes(row.dataset.motionGroup);
    });
    poseTimeline.renderSettings();
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

  function handlePoseChange() {
    setEditContext('pose');
    poseTimeline.stopPreview();
    poseTimeline.resetSelectionState();
    selectedPoseParts.clear();
    resetGroupEditValues();
    setActivePosePartKey(null);
    setEditFocusPartKey(MASTER_PART_KEY);
    renderPosePartFields();
    syncMotionRows();
    poseTimeline.syncPreview();
  }

  function handlePosePartChange() {
    setEditContext('pose');
    setEditFocusContext('pose');
    setActivePosePartKey(selectedPoseParts.selectOnly(posePartSelect.value));
    resetGroupEditValues();
    setEditFocusPartKey(getActivePosePartKey());
    renderPosePartFields();
    syncPartPickers();
    syncAnchorDebugPart();
    poseTimeline.syncPreview();
  }

  return {
    clearPartSelection,
    closeEditSection,
    handlePartChange,
    handlePoseChange,
    handlePosePartChange,
    openPartSection,
    openPoseSection,
    renderPartFields,
    renderPosePartFields,
    selectPickerPart,
    syncMotionRows,
    syncPartPickers,
  };
}
