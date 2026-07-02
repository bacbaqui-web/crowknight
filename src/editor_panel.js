import { syncActorHealthCapacity } from './actorTuning.js';
import { activeEditPartKeyForContext, activeEditPartKeysForContext } from './panel_edit_state.js';
import { syncActorAnchorDebugPart } from './preview_state.js';
import { renderEditHandles as renderEditHandlesView } from './edit_handle_renderer.js';
import {
  findTuningEditHandleAt,
  tuningEditHandleGeometry,
  tuningGroupEditHandleGeometry,
} from './transform_handle_geometry.js';
import { createTuningPanelUndoState } from './editor_undo_data.js';
import { currentSettingsEditContext, isSettingsPanelOpen } from './settings_panel_state.js';
import { drawTuningPanelDebugBoxes } from './editor_debug_view.js';
import { handlePanelKeyboardShortcut } from './editor_shortcut_helper.js';
import { bindTuningPanelAssetActions } from './editor_asset_actions.js';
import { reorderTuningLayer } from './editor_layer_order.js';
import { createTuningPanelBootstrap } from './editor_panel_bootstrap.js';
import { createTuningPanelComposition } from './editor_panel_composition.js';
import { bindTuningPanelControls, openTuningPanelEffectSection } from './editor_control_bindings.js';
import { createTuningPanelGroupEditState } from './group_edit_state.js';
import { createTuningPanelSelectionState } from './selection_state.js';
import { createTuningPanelSync } from './editor_panel_sync.js';
import { DEFAULT_TUNING_PANEL_WORKFLOW_SESSION, normalizeTuningPanelWorkflowSession } from './editor_workflow_data.js';
import { createTuningPanelWorkflowController } from './editor_workflow_controller.js';

export function createTuningPanel({
  canvas,
  ctx,
  actors,
  characterDefs,
  world,
  effectAssets,
  effectAssetSources,
  playerActor,
  getSelectedActor,
  setSelectedActor,
  getSceneSession,
  saveState,
  uploadSettings,
  downloadSettings,
  refreshStagePsdAsset,
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
    drawTuningPanelDebugBoxes(ctx, selectedActor, effectAssets, {
      activeSetupPartKey: selectionState.getActivePartKeyGlobal(),
      activePosePartKey: selectionState.getActivePosePartKey(),
    });
  }

  function getEditHandleGeometry() {
    return tuningEditHandleGeometry({
      isPanelOpen: isSettingsPanelOpen(),
      openEditContext: currentOpenEditContext(),
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
      characterDefs,
      getSelectedActor: () => selectedActor,
      setSelectedActor: (actor) => {
        selectedActor = actor;
      },
      getGroupEditValues: groupEditState.getValues,
      setGroupEditValues: groupEditState.setValues,
      createDefaultGroupEditValues: groupEditState.createDefaultValues,
      applyActorTuning,
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
      characterDefs,
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
      refreshStagePsdAsset,
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
      actors,
      characterDefs,
      world,
      playerActor,
      effectAssets,
      effectAssetSources,
      getSelectedActor: () => selectedActor,
      setActiveActor,
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
      reorderSelectedLayer,
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

    function reorderSelectedLayer(sourceLayer, targetLayer, placement) {
      reorderTuningLayer({
        layerOrder,
        actor: selectedActor,
        sourceLayer,
        targetLayer,
        placement,
        pushUndoSnapshot,
        applyActorTuning,
        saveState,
      });
    }

    function applySelected() {
      syncActorHealthCapacity(
        selectedActor,
        Number(selectedActor.maxHpPips) !== Number(selectedActor.tuning.maxHpPips)
      );
      applyActorTuning(selectedActor);
      saveState();
    }

    function applyActorTuning(actor) {
      actor.player.applyTuning(actor.tuning);
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
      openWorkflowSection(panelElements.partSection, partController.openPartSection);
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

function createTuningPanelEditingState() {
  let editFocusContext = null;
  let editFocusPartKey = null;

  return {
    getEditFocusContext: () => editFocusContext,
    setEditFocusContext: (value) => {
      editFocusContext = value;
    },
    getEditFocusPartKey: () => editFocusPartKey,
    setEditFocusPartKey: (value) => {
      editFocusPartKey = value;
    },
  };
}

function createTuningPanelWorkflowSessionState({ initialSession = DEFAULT_TUNING_PANEL_WORKFLOW_SESSION } = {}) {
  let activeSession = normalizeTuningPanelWorkflowSession(initialSession);

  return {
    getActiveSession: () => activeSession,
    setActiveSession: (session) => {
      activeSession = normalizeTuningPanelWorkflowSession(session);
    },
    resetActiveSession: () => {
      activeSession = DEFAULT_TUNING_PANEL_WORKFLOW_SESSION;
    },
  };
}
