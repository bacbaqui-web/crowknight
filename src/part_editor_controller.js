import { ensurePoseOffset } from './project_data_normalizer.js';
import { groupPosePropertyGroups, partPropertyGroups, posePropertyGroups } from './property_field_groups.js';
import { readPartFieldDisplayValue } from './property_value_helper.js';
import { emptyPartMessage, markPartPicker, renderPosePartHeader } from './editor_panel_dom.js';
import { isMasterPart } from './editor_label_helper.js';
import { isPartWithSize, partEditSources, partPositionSources, poseMotionGroups } from './part_source_registry.js';
import { posePartFocusAfterMultiSelect } from './panel_edit_state.js';
import { updateRigPartValue } from './transform_value_helper.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { applyGroupTransformPropertyValue } from './group_transform_adapter.js';
import { MASTER_PART_KEY } from './game_config.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import {
  interactionFrameValueFromInput,
  readInteractionDisplayValue,
  renderInteractionEditor,
} from './interaction_editor_engine.js';
import { renderAppliedModifierEditor, renderModifierLibraryEditor } from './modifier_editor_engine.js';
import {
  ensureTimelineModifierTarget,
  writeTimelineModifierEnabled,
  writeTimelineModifierSetting,
} from './timeline_modifier_data.js';

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
    clearPoseSupplementCards();
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
    const hasFrameSelection = poseTimeline.hasFrameSelection();
    const isWholeTimelineEdit = !poseTimeline.hasFrameTarget();
    const isAllPartsEdit = isAllPosePartsEdit();
    if (isAllPartsEdit) {
      renderAllPosePartsFields(frameLabel);
      return;
    }
    if (!hasFrameSelection && !isWholeTimelineEdit && !isMasterPart(partKey)) {
      posePartFields.innerHTML = emptyPartMessage('편집할 프레임을 선택하세요.');
      return;
    }

    posePartSelect.value = partKey;
    ensurePoseOffset(getSelectedActor().tuning, poseSelect.value, partKey);
    const offset = poseTimeline.currentFrameValue(partKey);
    posePartFields.innerHTML = '';
    renderPosePartHeader(posePartFields, partKey, selectedPoseParts.size(), frameLabel);

    renderEditorDataCard(
      posePartFields,
      { title: 'Property', className: 'property-editor-card', collapsible: false },
      (body) => {
        renderScrubGroups(
          body,
          posePropertyGroups(partKey, hasFrameSelection),
          (prop) => poseTimeline.readDisplayValue(partKey, poseTimeline.currentFrameValue(partKey), prop),
          (prop, value) => updatePosePartValue(prop, value),
          scrubCallbacks
        );
      }
    );

    const supplementContainer = posePartFields.parentElement || posePartFields;

    renderAppliedModifierEditor(supplementContainer, {
      modifiers: poseModifiers(),
      onSettingChange: updatePoseModifierSetting,
    });

    if (hasFrameSelection) {
      renderInteractionEditor(supplementContainer, {
        frameValue: offset,
        targetKey: partKey,
        scrubCallbacks,
        onWrite: (prop, value, { rerender = true } = {}) => updatePoseInteractionValue(prop, value, rerender),
      });
    }

    renderModifierLibraryEditor(supplementContainer, {
      modifiers: poseModifiers(),
      onToggle: updatePoseModifierEnabled,
    });
  }

  function renderAllPosePartsFields(frameLabel) {
    posePartFields.innerHTML = '';
    renderPosePartHeader(posePartFields, 'all', 0, frameLabel);

    renderEditorDataCard(
      posePartFields,
      { title: 'Property', className: 'property-editor-card', collapsible: false },
      (body) => {
        renderScrubGroups(
          body,
          groupPosePropertyGroups(),
          (prop) => getGroupEditValues()[prop],
          (prop, value) => updateAllPosePartsValue(prop, value),
          scrubCallbacks
        );
      }
    );

    const supplementContainer = posePartFields.parentElement || posePartFields;

    renderAppliedModifierEditor(supplementContainer, {
      modifiers: poseModifiers(),
      onSettingChange: updatePoseModifierSetting,
    });

    renderModifierLibraryEditor(supplementContainer, {
      modifiers: poseModifiers(),
      onToggle: updatePoseModifierEnabled,
    });
  }

  function clearPoseSupplementCards() {
    const container = posePartFields.parentElement;
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

  function updatePosePartValue(prop, value) {
    const nextValue = poseTimeline.updateOffset(prop, value);
    return nextValue;
  }

  function updateAllPosePartsValue(prop, value) {
    beginUndoSnapshot();
    poseTimeline.stopPreview();
    const groupValues = getGroupEditValues();
    const nextValue = prop === 'opacity' ? (Number(value) > 0 ? 1 : 0) : Number(value);
    if (!Number.isFinite(nextValue)) return groupValues[prop];

    const parts = allPoseTimelineEditParts();
    if (prop === 'x' || prop === 'y' || prop === 'rot') {
      const delta = nextValue - Number(groupValues[prop] || 0);
      applyAllPosePartsDelta(prop, delta, parts);
      groupValues[prop] = nextValue;
    } else if (prop === 'scale') {
      applyAllPosePartsScale(nextValue, parts);
      groupValues.scale = nextValue;
    } else if (prop === 'opacity') {
      applyAllPosePartsTransform('opacity', () => nextValue, parts);
      groupValues.opacity = nextValue;
    }

    poseTimeline.syncPreview();
    applySelected();
    return groupValues[prop];
  }

  function updatePoseInteractionValue(prop, value, rerender = true) {
    beginUndoSnapshot();
    poseTimeline.stopPreview();
    const partKey = getActivePosePartKey() || MASTER_PART_KEY;
    const nextValue = interactionFrameValueFromInput(prop, value);
    poseTimeline.writeFrameValue(partKey, prop, nextValue);
    poseTimeline.syncPreview();
    applySelected();
    if (rerender) renderPosePartFields();
    return readInteractionDisplayValue(poseTimeline.currentFrameValue(partKey), prop);
  }

  function poseModifiers() {
    return ensureTimelineModifierTarget(getSelectedActor().tuning, 'pose', poseSelect.value);
  }

  function updatePoseModifierEnabled(type, enabled) {
    beginUndoSnapshot();
    writeTimelineModifierEnabled(getSelectedActor().tuning, 'pose', poseSelect.value, type, enabled);
    applySelected();
    renderPosePartFields();
  }

  function updatePoseModifierSetting(type, prop, value) {
    beginUndoSnapshot();
    writeTimelineModifierSetting(getSelectedActor().tuning, 'pose', poseSelect.value, type, prop, value);
    applySelected();
  }

  function updateGroupPoseValue(prop, value) {
    poseTimeline.stopPreview();
    const canvasController = getCanvasController();
    const result = applyGroupTransformPropertyValue({
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

  function applyAllPosePartsDelta(prop, delta, parts) {
    if (poseTimeline.hasFrameTarget()) {
      parts.forEach((part) => {
        const currentValue = Number(poseTimeline.currentFrameValue(part)?.[prop] ?? 0);
        poseTimeline.writeFrameValue(part, prop, currentValue + delta);
      });
      return;
    }
    poseTimeline.updateAllOffsets(prop, delta, parts);
  }

  function applyAllPosePartsTransform(prop, transformValue, parts) {
    if (poseTimeline.hasFrameTarget()) {
      parts.forEach((part) => {
        const currentValue = Number(poseTimeline.currentFrameValue(part)?.[prop] ?? 0);
        const nextValue = transformValue(currentValue, part);
        if (Number.isFinite(nextValue)) poseTimeline.writeFrameValue(part, prop, nextValue);
      });
      return;
    }
    poseTimeline.transformAllOffsets(prop, transformValue, parts);
  }

  function applyAllPosePartsScale(nextValue, parts) {
    const groupValues = getGroupEditValues();
    const previousScale = Math.max(0.1, Number(groupValues.scale || 100) / 100);
    const nextScale = Math.max(0.1, Number(nextValue) / 100);
    const ratio = nextScale / previousScale;
    if (!Number.isFinite(ratio) || ratio === 1) return;
    ['w', 'h'].forEach((prop) => {
      applyAllPosePartsTransform(
        prop,
        (currentOffset, part) => {
          if (!isPartWithSize(part)) return currentOffset;
          const base = Math.max(0.001, Number(poseTimeline.source(part)?.[prop] || 1));
          return (base + currentOffset) * ratio - base;
        },
        parts
      );
    });
  }

  function isAllPosePartsEdit() {
    const activePosePartKey = getActivePosePartKey();
    return selectedPoseParts.size() === 0 && (!activePosePartKey || isMasterPart(activePosePartKey));
  }

  function allPoseTimelineEditParts() {
    return Object.keys(partPositionSources(getSelectedActor().tuning.rig));
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
