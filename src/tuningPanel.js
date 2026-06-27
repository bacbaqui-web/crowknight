import { syncActorHealthCapacity } from './actorTuning.js';
import { activeEditPartKeyForContext, activeEditPartKeysForContext } from './panelEditState.js';
import { syncActorAnchorDebugPart } from './previewState.js';
import { renderEditHandles as renderEditHandlesView } from './editHandleRenderer.js';
import {
  findTuningEditHandleAt,
  tuningEditHandleGeometry,
  tuningGroupEditHandleGeometry,
} from './tuningEditHandleGeometry.js';
import { createTuningPanelUndoState } from './tuningPanelUndoState.js';
import { currentSettingsEditContext, isSettingsPanelOpen } from './settingsPanelState.js';
import { drawTuningPanelDebugBoxes } from './tuningPanelDebugView.js';
import { handlePanelKeyboardShortcut } from './tuningPanelShortcuts.js';
import { bindTuningPanelAssetActions } from './tuningPanelAssetActions.js';
import { moveSelectedTuningLayer } from './tuningPanelLayerOrder.js';
import { createTuningPanelBootstrap } from './tuningPanelBootstrap.js';
import { createTuningPanelComposition } from './tuningPanelComposition.js';
import { bindTuningPanelControls, openTuningPanelEffectSection } from './tuningPanelControlBindings.js';
import { createTuningPanelEditingState } from './tuningPanelEditingState.js';
import { createTuningPanelGroupEditState } from './tuningPanelGroupEditState.js';
import { createTuningPanelSelectionState } from './tuningPanelSelectionState.js';
import { createTuningPanelSync } from './tuningPanelSync.js';
import { createTuningPanelWorkflowController } from './tuningPanelWorkflowController.js';
import { createTuningPanelWorkflowSessionState } from './tuningPanelWorkflowSessionState.js';

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
  refreshPsdSettings,
}) {
  let selectedActor = getSelectedActor();

  function setActiveActor(actor) {
    selectedActor = actor;
    setSelectedActor(actor);
  }

  const selectionState = createTuningPanelSelectionState();
  const editingState = createTuningPanelEditingState();
  const groupEditState = createTuningPanelGroupEditState();
  const workflowSessionState = createTuningPanelWorkflowSessionState();
  let editHandleHover = null;
  let editHandleActiveMode = null;
  let undoTuningChangeGlobal = null;
  let poseFrameCopyGlobal = null;
  let poseFramePasteGlobal = null;
  let poseFrameSelectionActive = false;
  let frameSelectionCheckGlobal = () => poseFrameSelectionActive;
  let effectEditHandle = null;

  function activeEditPartKey() {
    return activeEditPartKeyForContext(currentOpenEditContext(), editingState.getEditFocusPartKey());
  }

  function activeEditPartKeys() {
    return activeEditPartKeysForContext({
      context: currentOpenEditContext(),
      editFocusContext: editingState.getEditFocusContext(),
      selectedPoseParts: selectionState.poseParts,
      editFocusPartKey: editingState.getEditFocusPartKey(),
    });
  }

  function currentOpenEditContext() {
    return currentSettingsEditContext({
      editFocusContext: editingState.getEditFocusContext(),
      activePartKey: selectionState.getActivePartKeyGlobal(),
    });
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
      editFocusPartKey: editingState.getEditFocusPartKey(),
      selectedActor,
      poseFrameSelectionActive,
      editFocusContext: editingState.getEditFocusContext(),
      selectedPoseParts: selectionState.poseParts,
      groupEditValues: groupEditState.getValues(),
    });
  }

  function getGroupEditHandleGeometry() {
    return tuningGroupEditHandleGeometry({
      editFocusContext: editingState.getEditFocusContext(),
      selectedPoseParts: selectionState.poseParts,
      poseFrameSelectionActive,
      selectedActor,
      groupEditValues: groupEditState.getValues(),
    });
  }

  function getEditHandleAt(point) {
    return findTuningEditHandleAt(point, getEditHandleGeometry());
  }

  function buildTuningPanel() {
    const bootstrap = createTuningPanelBootstrap();
    if (!bootstrap) return;

    const { panel, elements: panelElements, syncPanelToggle } = bootstrap;
    const { layerOrder } = panelElements;
    let poseTimeline;
    let effectTimeline;
    let partController;
    let backgroundController;
    let canvasController;
    let lifecycleController;
    let stageRulesController;
    let stageRulesPanelController;
    let timelineFrameActions;
    let panelSync = null;
    let workflowController = null;
    const undoState = createTuningPanelUndoState({
      actors,
      getSelectedActor: () => selectedActor,
      setSelectedActor: (actor) => {
        selectedActor = actor;
      },
      getGroupEditValues: groupEditState.getValues,
      setGroupEditValues: groupEditState.setValues,
      createDefaultGroupEditValues: groupEditState.createDefaultValues,
      applyActorTuning: (actor) => actor.player.applyTuning(actor.tuning),
      saveState,
      syncPanel,
      syncPoseToolbarButtons: () => poseTimeline?.syncToolbarButtons(),
    });
    const { beginUndoSnapshot, commitUndoSnapshot, pushUndoSnapshot, undoTuningChange } = undoState;
    undoTuningChangeGlobal = undoTuningChange;

    const scrubCallbacks = {
      beginChange: beginUndoSnapshot,
      commitChange: commitUndoSnapshot,
    };
    ({
      poseTimeline,
      effectTimeline,
      timelineFrameActions,
      backgroundController,
      partController,
      stageRulesController,
      stageRulesPanelController,
      canvasController,
      lifecycleController,
    } = createTuningPanelComposition({
      actors,
      applySelected,
      beginUndoSnapshot,
      canvas,
      clearEditHandleState,
      commitUndoSnapshot,
      effectAssets,
      elements: panelElements,
      undoState,
      scrubCallbacks,
      getActivePartKey: selectionState.getActivePartKey,
      getActivePartKeyGlobal: selectionState.getActivePartKeyGlobal,
      getActivePosePartKey: selectionState.getActivePosePartKey,
      getEditFocusContext: editingState.getEditFocusContext,
      getEditFocusPartKey: editingState.getEditFocusPartKey,
      getEditContext: selectionState.getEditContext,
      getEditHandleAt,
      getGroupEditHandleGeometry,
      getGroupEditValues: groupEditState.getValues,
      getOpenEditContext: currentOpenEditContext,
      getSceneSession,
      getSelectedActor: () => selectedActor,
      panel,
      playerActor,
      pushUndoSnapshot,
      refreshPsdSettings,
      resetGroupEditValues: groupEditState.resetValues,
      resetGroupTransformValues: groupEditState.resetTransformValues,
      saveState,
      selectedPoseParts: selectionState.poseParts,
      setActiveActor,
      setActivePartKey: selectionState.setActivePartKey,
      setActivePartKeyGlobal: selectionState.setActivePartKeyGlobal,
      setActivePosePartKey: selectionState.setActivePosePartKey,
      setFrameSelectionActive: (value) => {
        poseFrameSelectionActive = value;
      },
      setEditContext: selectionState.setEditContext,
      setEditFocusContext: editingState.setEditFocusContext,
      setEditFocusPartKey: editingState.setEditFocusPartKey,
      setEditHandleActiveMode: (value) => {
        editHandleActiveMode = value;
      },
      setEditHandleHover: (value) => {
        editHandleHover = value;
      },
      syncAnchorDebugPart,
      syncPanel,
      syncPanelToggle,
    }));
    undoState.setStageRulesAccessors({
      getStageRules: stageRulesController.getStageRules,
      setStageRules: (stageRules) => {
        const restoredStageRules = stageRulesController.setStageRules(stageRules, { notify: false });
        const session = getSceneSession();
        if (session) session.stageRules = restoredStageRules;
      },
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
    panelSync = createTuningPanelSync({
      elements: panelElements,
      getSelectedActor: () => selectedActor,
      lifecycleController,
      partController,
      effectTimeline,
      backgroundController,
      stageRulesPanelController,
      poseTimeline,
      syncAnchorDebugPart,
    });
    bindTuningPanelControls({
      actors,
      panel,
      canvas,
      elements: panelElements,
      applySelected,
      beginUndoSnapshot,
      commitUndoSnapshot,
      getSelectedActor: () => selectedActor,
      partController,
      lifecycleController,
      poseTimeline,
      effectTimeline,
      timelineFrameActions,
      canvasController,
      moveSelectedLayer,
      undoTuningChange,
      setEditContext: selectionState.setEditContext,
      setEditFocusContext: editingState.setEditFocusContext,
      setEditFocusPartKey: editingState.setEditFocusPartKey,
    });
    workflowController = createTuningPanelWorkflowController({
      panel,
      getActiveSession: workflowSessionState.getActiveSession,
      setActiveSession: workflowSessionState.setActiveSession,
      enterSession: enterWorkflowSession,
      exitSession: exitWorkflowSession,
      syncAllPanels: () => panelSync?.sync(),
      syncSessionPanels: (session) => panelSync?.syncSession(session),
    });

    function clearEditHandleState() {
      editHandleHover = null;
      editHandleActiveMode = null;
      canvas.style.cursor = '';
    }

    function syncAnchorDebugPart() {
      syncActorAnchorDebugPart(
        actors,
        selectedActor,
        selectionState.poseParts.size() > 1 ? null : editingState.getEditFocusPartKey()
      );
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
      workflowController?.syncAll();
    }

    function enterWorkflowSession(session) {
      if (session === 'setup') enterSetupWorkflowSession();
      else if (session === 'animation') enterAnimationWorkflowSession();
      else if (session === 'effect') enterEffectWorkflowSession();
      else if (session === 'stage') enterStageWorkflowSession();
    }

    function exitWorkflowSession(session, nextSession) {
      if (session === 'animation' && nextSession !== 'animation') poseTimeline?.stopPreview();
      if (session === 'effect' && nextSession !== 'effect') effectTimeline?.stopPreview();
      clearEditHandleState();
    }

    function enterSetupWorkflowSession() {
      openWorkflowSection(panelElements.collisionSection);
      openWorkflowSection(panelElements.layerSection);
    }

    function enterAnimationWorkflowSession() {
      openWorkflowSection(panelElements.poseSection, partController.openPoseSection);
    }

    function enterEffectWorkflowSession() {
      openWorkflowSection(panelElements.effectSection, () =>
        openTuningPanelEffectSection({
          partController,
          effectTimeline,
          setEditContext: selectionState.setEditContext,
          setEditFocusContext: editingState.setEditFocusContext,
          setEditFocusPartKey: editingState.setEditFocusPartKey,
        })
      );
    }

    function enterStageWorkflowSession() {
      openWorkflowSection(panelElements.sceneSection);
      openWorkflowSection(panelElements.progressionSection);
    }

    function openWorkflowSection(section, onOpen) {
      if (!section) return;
      section.classList.add('is-open');
      onOpen?.();
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
