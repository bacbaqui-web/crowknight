import { ensurePoseOffset } from './tuningNormalize.js';
import { groupPosePropertyGroups, partPropertyGroups, posePropertyGroups } from './tuningFieldGroups.js';
import { readPartFieldDisplayValue } from './tuningFieldValues.js';
import { emptyPartMessage, markPartPicker, renderPosePartHeader } from './tuningPanelDom.js';
import { isMasterPart } from './tuningLabels.js';
import { partPositionSources, poseMotionGroups } from './tuningParts.js';
import {
  clearPosePartSelectionState,
  posePartFocusAfterMultiSelect,
  selectOnlyPosePart,
  togglePosePartSelection,
} from './panelEditState.js';
import { updateRigPartValue } from './canvasVisualValues.js';
import { renderScrubGroups } from './tuningScrubControls.js';
import { applyGroupPoseEditValue } from './tuningGroupPoseEdit.js';
import { MASTER_PART_KEY } from './gameConfig.js';

export function createTuningPanelPartController({
  elements,
  selectedPosePartKeys,
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
      const activePosePartKey = getActivePosePartKey();
      setEditFocusPartKey(activePosePartKey);
      setEditFocusContext(activePosePartKey ? 'pose' : null);
    }

    clearInactiveEditHandleState();
    syncPartPickers();
    syncAnchorDebugPart();
  }

  function clearPosePartSelection() {
    const nextSelection = clearPosePartSelectionState(selectedPosePartKeys, MASTER_PART_KEY);
    setActivePosePartKey(nextSelection.activePosePartKey);
    resetGroupEditValues();
    setEditContext('pose');
    setEditFocusContext('pose');
    setEditFocusPartKey(nextSelection.editFocusPartKey);
    renderPosePartFields();
    poseTimeline.syncPreview();
  }

  function clearRigPartSelection() {
    setActivePartKey(null);
    setActivePartKeyGlobal(null);
    partFields.innerHTML = emptyPartMessage('위치를 조절할 부위를 선택하세요.');
  }

  function clearInactiveEditHandleState() {
    if (getEditFocusPartKey()) return;
    clearEditHandleState();
  }

  function togglePosePartMultiSelection(partKey) {
    setEditContext('pose');
    setEditFocusContext('pose');
    togglePosePartSelection(selectedPosePartKeys, partKey);
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
    setActivePosePartKey(selectOnlyPosePart(selectedPosePartKeys, partKey));
    resetGroupEditValues();
    posePartSelect.value = partKey;
  }

  function syncActivePosePartAfterMultiSelect(partKey) {
    const nextFocus = posePartFocusAfterMultiSelect(selectedPosePartKeys, partKey, MASTER_PART_KEY);
    setActivePosePartKey(nextFocus.activePosePartKey);
    setEditFocusPartKey(nextFocus.editFocusPartKey);
  }

  function syncPartPickers() {
    markPartPicker(partPicker, getActivePartKey());
    markPartPicker(posePartPicker, getActivePosePartKey(), selectedPosePartKeys);
  }

  function renderPartFields() {
    const activePartKey = getActivePartKey();
    if (!activePartKey) {
      partFields.innerHTML = emptyPartMessage('위치를 조절할 부위를 선택하세요.');
      return;
    }

    partSelect.value = activePartKey;
    const part = partPositionSources(getSelectedActor().tuning.rig)[activePartKey];
    partFields.innerHTML = '';
    renderScrubGroups(
      partFields,
      partPropertyGroups(activePartKey),
      (prop) => readPartFieldDisplayValue(activePartKey, part, prop),
      (prop, value) => updatePartValue(prop, value),
      scrubCallbacks
    );
  }

  function renderPosePartFields() {
    poseTimeline.renderTimeline();
    if (selectedPosePartKeys.size > 1) {
      posePartFields.innerHTML = '';
      renderPosePartHeader(posePartFields, 'group', selectedPosePartKeys.size);
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
    renderPosePartHeader(posePartFields, partKey, selectedPosePartKeys.size);

    renderScrubGroups(
      posePartFields,
      posePropertyGroups(partKey, poseTimeline.hasFrameSelection()),
      (prop) => poseTimeline.readDisplayValue(partKey, offset, prop),
      (prop, value) => poseTimeline.updateOffset(prop, value),
      scrubCallbacks
    );
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
    const activePartKey = getActivePartKey();
    const part = partPositionSources(getSelectedActor().tuning.rig)[activePartKey];
    updateRigPartValue(part, activePartKey, prop, value);
    applySelected();
    return readPartFieldDisplayValue(activePartKey, part, prop);
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
    const nextSelection = clearPosePartSelectionState(selectedPosePartKeys, MASTER_PART_KEY);
    resetGroupEditValues();
    setActivePosePartKey(nextSelection.activePosePartKey);
    setEditFocusPartKey(nextSelection.editFocusPartKey);
    renderPosePartFields();
    syncMotionRows();
    poseTimeline.syncPreview();
  }

  function handlePosePartChange() {
    setEditContext('pose');
    setEditFocusContext('pose');
    setActivePosePartKey(selectOnlyPosePart(selectedPosePartKeys, posePartSelect.value));
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
