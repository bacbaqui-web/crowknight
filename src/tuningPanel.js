import { syncActorHealthCapacity } from './actorTuning.js';
import { bindNumberDragInput } from './tuningNumberInputs.js';
import { syncNumericFields } from './tuningPanelDom.js';
import {
  activeEditPartKeyForContext,
  activeEditPartKeysForContext,
  createDefaultGroupEditValues,
  resetGroupTransformValues as resetGroupTransformValueState,
} from './panelEditState.js';
import { syncActorAnchorDebugPart } from './previewState.js';
import { renderEditHandles as renderEditHandlesView } from './editHandleRenderer.js';
import {
  findTuningEditHandleAt,
  tuningEditHandleGeometry,
  tuningGroupEditHandleGeometry,
} from './tuningEditHandleGeometry.js';
import { initializeTuningPanelControls } from './tuningPanelControlSetup.js';
import { createTuningPanelUndoState } from './tuningPanelUndoState.js';
import { createTuningPanelCanvasController } from './tuningPanelCanvasController.js';
import { createTuningPanelPartController } from './tuningPanelPartController.js';
import { createTuningPanelLifecycleController } from './tuningPanelLifecycleController.js';
import { currentSettingsEditContext, isSettingsPanelOpen } from './settingsPanelState.js';
import { drawTuningPanelDebugBoxes } from './tuningPanelDebugView.js';
import { handlePanelKeyboardShortcut } from './tuningPanelShortcuts.js';
import { TUNING_FIELDS } from './gameConfig.js';
import { createBackgroundPanelController } from './backgroundPanelController.js';
import { bindTuningPanelAssetActions } from './tuningPanelAssetActions.js';
import { createTuningPanelTimelines } from './tuningPanelTimelines.js';
import { moveSelectedTuningLayer, renderTuningLayerOrder } from './tuningPanelLayerOrder.js';
import { createTuningPanelTimelineFrameActions } from './tuningPanelTimelineFrameActions.js';
import { createTuningPanelBootstrap } from './tuningPanelBootstrap.js';

export function createTuningPanel({
  canvas,
  ctx,
  actors,
  effectAssets,
  playerActor,
  getSelectedActor,
  setSelectedActor,
  getSceneSession,
  saveState,
  uploadSettings,
  downloadSettings,
  refreshClipSettings,
}) {
  let selectedActor = getSelectedActor();

  function setActiveActor(actor) {
    selectedActor = actor;
    setSelectedActor(actor);
  }

  let editFocusPartKey = null;
  let editFocusContext = null;
  let editHandleHover = null;
  let editHandleActiveMode = null;
  let activePartKeyGlobal = null;
  let selectedPosePartKeysGlobal = new Set();
  let groupEditValues = createDefaultGroupEditValues();
  let undoTuningChangeGlobal = null;
  let poseFrameCopyGlobal = null;
  let poseFramePasteGlobal = null;
  let poseFrameSelectionActive = false;
  let frameSelectionCheckGlobal = () => poseFrameSelectionActive;
  let effectEditHandle = null;

  function activeEditPartKey() {
    return activeEditPartKeyForContext(currentOpenEditContext(), editFocusPartKey);
  }

  function activeEditPartKeys() {
    return activeEditPartKeysForContext({
      context: currentOpenEditContext(),
      editFocusContext,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      editFocusPartKey,
    });
  }

  function resetGroupEditValues() {
    groupEditValues = createDefaultGroupEditValues();
  }

  function resetGroupTransformValues() {
    resetGroupTransformValueState(groupEditValues);
  }

  function currentOpenEditContext() {
    return currentSettingsEditContext({ editFocusContext, activePartKey: activePartKeyGlobal });
  }

  function drawSettingsDebugBoxes() {
    const nextDebugState = drawTuningPanelDebugBoxes(ctx, selectedActor, effectAssets);
    if (nextDebugState.hasEffectHandleUpdate) effectEditHandle = nextDebugState.effectHandle;
  }

  function getEditHandleGeometry() {
    return tuningEditHandleGeometry({
      isPanelOpen: isSettingsPanelOpen(),
      openEditContext: currentOpenEditContext(),
      effectEditHandle,
      editFocusPartKey,
      selectedActor,
      poseFrameSelectionActive,
      editFocusContext,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      groupEditValues,
    });
  }

  function getGroupEditHandleGeometry() {
    return tuningGroupEditHandleGeometry({
      editFocusContext,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      poseFrameSelectionActive,
      selectedActor,
      groupEditValues,
    });
  }

  function getEditHandleAt(point) {
    return findTuningEditHandleAt(point, getEditHandleGeometry());
  }

  function buildTuningPanel() {
    const bootstrap = createTuningPanelBootstrap();
    if (!bootstrap) return;

    const { panel, elements: panelElements, syncPanelToggle } = bootstrap;
    const { actorSelect, actorName, partSection, poseSection, effectSection, poseSelect, effectSelect, layerOrder } =
      panelElements;
    let editContext = 'part';
    let activePartKey = null;
    let activePosePartKey = null;
    let poseTimeline = null;
    let effectTimeline = null;
    let partController = null;
    let backgroundController = null;
    let canvasController = null;
    let lifecycleController = null;
    let timelineFrameActions;
    const undoState = createTuningPanelUndoState({
      actors,
      getSelectedActor: () => selectedActor,
      setSelectedActor: (actor) => {
        selectedActor = actor;
      },
      getGroupEditValues: () => groupEditValues,
      setGroupEditValues: (value) => {
        groupEditValues = value;
      },
      createDefaultGroupEditValues,
      applyActorTuning: (actor) => actor.player.applyTuning(actor.tuning),
      saveState,
      syncPanel,
      syncPoseToolbarButtons: () => poseTimeline?.syncToolbarButtons(),
    });
    const { beginUndoSnapshot, commitUndoSnapshot, pushUndoSnapshot, undoTuningChange } = undoState;
    undoTuningChangeGlobal = undoTuningChange;

    const fields = TUNING_FIELDS;
    const scrubCallbacks = {
      beginChange: beginUndoSnapshot,
      commitChange: commitUndoSnapshot,
    };
    const bindNumberDrag = (number, peer, updateValue) =>
      bindNumberDragInput(number, peer, updateValue, {
        beginChange: beginUndoSnapshot,
        commitChange: commitUndoSnapshot,
      });
    ({ poseTimeline, effectTimeline } = createTuningPanelTimelines({
      actors,
      effectAssets,
      elements: panelElements,
      undoState,
      scrubCallbacks,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      getSelectedActor: () => selectedActor,
      getActivePosePartKey: () => activePosePartKey,
      setFrameSelectionActive: (value) => {
        poseFrameSelectionActive = value;
      },
      setEditContext: (value) => {
        editContext = value;
      },
      resetGroupEditValues,
      renderPosePartFields: () => partController?.renderPosePartFields(),
      beginUndoSnapshot,
      commitUndoSnapshot,
      applySelected,
    }));
    timelineFrameActions = createTuningPanelTimelineFrameActions({
      getOpenEditContext: currentOpenEditContext,
      getPoseTimeline: () => poseTimeline,
      getEffectTimeline: () => effectTimeline,
    });
    poseFrameCopyGlobal = timelineFrameActions.copyCurrentFrame;
    poseFramePasteGlobal = timelineFrameActions.pasteCurrentFrame;
    frameSelectionCheckGlobal = timelineFrameActions.hasCurrentFrameSelection;
    bindTuningPanelAssetActions({
      elements: panelElements,
      effectAssets,
      getSelectedActor: () => selectedActor,
      getEffectTimeline: () => effectTimeline,
      pushUndoSnapshot,
      saveState,
      syncPanel,
      uploadSettings,
      downloadSettings,
    });
    backgroundController = createBackgroundPanelController({
      elements: panelElements,
      getSceneSession,
      saveState,
      refreshClipSettings,
    });
    partController = createTuningPanelPartController({
      elements: panelElements,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      scrubCallbacks,
      getSelectedActor: () => selectedActor,
      getActivePartKey: () => activePartKey,
      setActivePartKey: (value) => {
        activePartKey = value;
      },
      setActivePartKeyGlobal: (value) => {
        activePartKeyGlobal = value;
      },
      getActivePosePartKey: () => activePosePartKey,
      setActivePosePartKey: (value) => {
        activePosePartKey = value;
      },
      getEditFocusPartKey: () => editFocusPartKey,
      setEditContext: (value) => {
        editContext = value;
      },
      getEditFocusContext: () => editFocusContext,
      setEditFocusContext: (value) => {
        editFocusContext = value;
      },
      setEditFocusPartKey: (value) => {
        editFocusPartKey = value;
      },
      getGroupEditValues: () => groupEditValues,
      resetGroupEditValues,
      clearEditHandleState,
      syncAnchorDebugPart,
      poseTimeline,
      effectTimeline,
      getCanvasController: () => canvasController,
      beginUndoSnapshot,
      applySelected,
    });
    canvasController = createTuningPanelCanvasController({
      canvas,
      panel,
      sections: {
        part: partSection,
        pose: poseSection,
        effect: effectSection,
      },
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      getSelectedActor: () => selectedActor,
      getEditFocusPartKey: () => editFocusPartKey,
      setEditFocusPartKey: (value) => {
        editFocusPartKey = value;
      },
      getEditFocusContext: () => editFocusContext,
      getEditContext: () => editContext,
      setEditContext: (value) => {
        editContext = value;
      },
      getActivePartKey: () => activePartKeyGlobal,
      getGroupEditValues: () => groupEditValues,
      getEditHandleAt,
      getGroupEditHandleGeometry,
      setEditHandleHover: (value) => {
        editHandleHover = value;
      },
      setEditHandleActiveMode: (value) => {
        editHandleActiveMode = value;
      },
      resetGroupTransformValues,
      poseTimeline,
      effectTimeline,
      getPoseKey: () => poseSelect.value,
      getEffectKey: () => effectSelect.value,
      applySelected,
      saveState,
      renderPartFields: partController.renderPartFields,
      renderPosePartFields: partController.renderPosePartFields,
      pushUndoSnapshot,
      beginUndoSnapshot,
      commitUndoSnapshot,
    });
    lifecycleController = createTuningPanelLifecycleController({
      elements: panelElements,
      actors,
      playerActor,
      selectedPosePartKeys: selectedPosePartKeysGlobal,
      getSelectedActor: () => selectedActor,
      setActiveActor,
      setActivePartKey: (value) => {
        activePartKey = value;
      },
      setActivePartKeyGlobal: (value) => {
        activePartKeyGlobal = value;
      },
      setActivePosePartKey: (value) => {
        activePosePartKey = value;
      },
      setEditContext: (value) => {
        editContext = value;
      },
      setEditFocusPartKey: (value) => {
        editFocusPartKey = value;
      },
      setEditFocusContext: (value) => {
        editFocusContext = value;
      },
      resetGroupEditValues,
      clearEditHandleState,
      poseTimeline,
      effectTimeline,
      partController,
      syncPanel,
      syncPanelToggle,
      pushUndoSnapshot,
      saveState,
    });

    initializeTuningPanelControls({
      panel,
      canvas,
      actors,
      rig: selectedActor.tuning.rig,
      fields,
      elements: panelElements,
      bindNumberDrag,
      callbacks: {
        beginUndoSnapshot,
        getTuning: () => selectedActor.tuning,
        applySelected,
        handleActorChange: lifecycleController.handleActorChange,
        handleActorNameInput: lifecycleController.handleActorNameInput,
        handlePartChange: partController.handlePartChange,
        handlePoseChange: partController.handlePoseChange,
        handleEffectChange: lifecycleController.handleEffectChange,
        handlePosePartChange: partController.handlePosePartChange,
        selectPickerPart: partController.selectPickerPart,
        openPartSection: partController.openPartSection,
        closePartSection: () => partController.clearPartSelection('part'),
        openPoseSection: partController.openPoseSection,
        closePoseSection: () => partController.clearPartSelection('pose'),
        openEffectSection: () => {
          partController.closeEditSection('part');
          partController.closeEditSection('pose');
          editContext = 'effect';
          editFocusContext = null;
          editFocusPartKey = null;
          effectTimeline.ensureActiveFrame();
          effectTimeline.renderFields();
          effectTimeline.syncPreview();
        },
        clearEffectSelection: effectTimeline.clearSelection,
        updatePoseSetting: poseTimeline.updateSetting,
        commitUndoSnapshot,
        updatePosePlaybackRate: poseTimeline.updatePlaybackRate,
        stepPoseDuration: poseTimeline.stepDuration,
        togglePosePlayback: poseTimeline.togglePlayback,
        togglePosePlaybackMode: poseTimeline.togglePlaybackMode,
        copyActivePoseFrame: poseTimeline.copyFrame,
        pasteActivePoseFrame: poseTimeline.pasteFrame,
        undoTuningChange,
        addPoseKeyframe: poseTimeline.addKeyframe,
        deletePoseKeyframe: poseTimeline.deleteKeyframe,
        resetCurrentPoseAnimation: poseTimeline.resetAnimation,
        updateEffectSetting: effectTimeline.updateSetting,
        updateEffectPlaybackRate: effectTimeline.updatePlaybackRate,
        stepEffectDuration: effectTimeline.stepDuration,
        toggleEffectPlayback: effectTimeline.togglePlayback,
        toggleEffectPlaybackMode: effectTimeline.togglePlaybackMode,
        copyActiveEffectFrame: effectTimeline.copyFrame,
        pasteActiveEffectFrame: effectTimeline.pasteFrame,
        addEffectKeyframe: effectTimeline.addKeyframe,
        deleteEffectKeyframe: effectTimeline.deleteKeyframe,
        resetCurrentEffectAnimation: effectTimeline.resetAnimation,
        moveSelectedLayer,
        openPanel: lifecycleController.openPanel,
        closePanel: lifecycleController.closePanel,
        copyCurrentFrame: timelineFrameActions.copyCurrentFrame,
        pasteCurrentFrame: timelineFrameActions.pasteCurrentFrame,
        hasFrameSelection: timelineFrameActions.hasCurrentFrameSelection,
        resetSelectedActorTuning: lifecycleController.resetSelectedActorTuning,
        onCanvasPointerDown: canvasController.onPointerDown,
        onCanvasPointerMove: canvasController.onPointerMove,
        endCanvasDrag: canvasController.endDrag,
      },
    });

    function clearEditHandleState() {
      editHandleHover = null;
      editHandleActiveMode = null;
      canvas.style.cursor = '';
    }

    function syncAnchorDebugPart() {
      syncActorAnchorDebugPart(actors, selectedActor, selectedPosePartKeysGlobal.size > 1 ? null : editFocusPartKey);
    }

    function renderLayerOrder(selectedValue = layerOrder.value) {
      renderTuningLayerOrder(layerOrder, selectedActor, selectedValue);
    }

    function moveSelectedLayer(direction) {
      moveSelectedTuningLayer({
        layerOrder,
        actor: selectedActor,
        direction,
        pushUndoSnapshot,
        applyActorTuning: (actor) => actor.player.applyTuning(actor.tuning),
        saveState,
      });
    }

    function applySelected() {
      syncActorHealthCapacity(
        selectedActor,
        Number(selectedActor.maxHpPips) !== Number(selectedActor.tuning.maxHpPips)
      );
      selectedActor.player.applyTuning(selectedActor.tuning);
      saveState();
    }

    function syncPanel() {
      actorSelect.value = selectedActor.id;
      actorName.value = selectedActor.name;
      lifecycleController.syncActorOptions();

      syncNumericFields(fields, selectedActor.tuning);

      partController.renderPartFields();
      partController.renderPosePartFields();
      effectTimeline.renderFields();
      backgroundController.sync();
      partController.syncMotionRows();
      partController.syncPartPickers();
      syncAnchorDebugPart();
      poseTimeline.syncPreview();
      effectTimeline.syncPreview();
      renderLayerOrder();
    }

    syncPanel();
    syncPanelToggle();
  }

  function handleKeyboardShortcut(event) {
    return handlePanelKeyboardShortcut(event, {
      undo: undoTuningChangeGlobal,
      copyFrame: poseFrameCopyGlobal,
      pasteFrame: poseFramePasteGlobal,
      canUseFrameShortcut: () => frameSelectionCheckGlobal(),
    });
  }

  function renderPanelEditHandles() {
    renderEditHandlesView(ctx, getEditHandleGeometry(), editHandleActiveMode || editHandleHover);
  }

  buildTuningPanel();

  return {
    activeEditPartKey,
    activeEditPartKeys,
    drawSettingsDebugBoxes,
    handleKeyboardShortcut,
    renderEditHandles: renderPanelEditHandles,
  };
}
