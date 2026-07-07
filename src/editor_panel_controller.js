import { syncActorHealthCapacity } from './actor_tuning_helper.js';
import { syncActorAnchorDebugPart } from './preview_state.js';
import { renderEditHandles as renderEditHandlesView } from './edit_handle_renderer.js';
import { createPartEditHandleGeometry } from './edit_handle_geometry_helper.js';
import {
  findTuningEditHandleAt,
  tuningEditHandleGeometry,
  tuningGroupEditHandleGeometry,
} from './transform_handle_geometry_helper.js';
import { createTuningPanelUndoState } from './editor_undo_data.js';
import { currentSettingsEditContext, isSettingsPanelOpen } from './settings_panel_state.js';
import { drawTuningPanelDebugBoxes } from './editor_debug_view.js';
import { handlePanelKeyboardShortcut } from './editor_shortcut_helper.js';
import { bindTuningPanelAssetActions } from './editor_asset_controller.js';
import { reorderTuningLayer } from './editor_layer_order_helper.js';
import { createTuningPanelBootstrap } from './editor_panel_bootstrap_helper.js';
import { createTuningPanelComposition } from './editor_panel_composition_helper.js';
import { bindTuningPanelControls, openTuningPanelEffectSection } from './editor_control_binding_controller.js';
import { createTuningPanelGroupEditState } from './group_edit_state.js';
import { createTuningPanelSelectionState } from './selection_state.js';
import { createTuningPanelSync } from './editor_panel_sync_helper.js';
import { DEFAULT_TUNING_PANEL_WORKFLOW_SESSION, normalizeTuningPanelWorkflowSession } from './editor_workflow_data.js';
import { createTuningPanelWorkflowController } from './editor_workflow_controller.js';
import { createActionEditSessionStore } from './action_edit_state.js';
import {
  EDIT_CONTEXT_ACTION,
  EDIT_CONTEXT_EFFECT,
  EDIT_CONTEXT_SETUP,
  resolveEditTarget,
} from './edit_target_helper.js';
import { syncWorldPhysicsToWorld } from './scene_session_data.js';

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
  let actionFrameCopyGlobal = null;
  let actionFramePasteGlobal = null;
  let actionFrameSelectionActive = false;
  let actionFrameTargetCheckGlobal = () => actionFrameSelectionActive;
  let frameSelectionCheckGlobal = () => actionFrameSelectionActive;
  let actionEditSessions = null;
  let getCurrentActionKey = () => null;

  function activeEditPartKey() {
    return getEditTarget(currentOpenEditContext())?.targetKey || null;
  }

  function activeEditPartKeys() {
    const editTarget = getEditTarget(currentOpenEditContext());
    if (editTarget?.targetKeys?.length) return editTarget.targetKeys;
    return editTarget?.targetKey ? [editTarget.targetKey] : [];
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
      activeActionPartKey: currentActionActiveActionPartKey(),
    });
  }

  function getEditHandleGeometry() {
    const openEditContext = currentOpenEditContext();
    return tuningEditHandleGeometry({
      isPanelOpen: isSettingsPanelOpen(),
      openEditContext,
      selectedActor,
      actionFrameSelectionActive: currentActionFrameTargetActive(),
      editFocusContext: editingState.getEditFocusContext(),
      groupEditValues: currentActionGroupEditValues(),
      actionSettings: selectedActor.tuning.actionSettings?.[getCurrentActionKey()],
      editTarget: getEditTarget(openEditContext),
    });
  }

  function getGroupEditHandleGeometry() {
    return tuningGroupEditHandleGeometry({
      editFocusContext: editingState.getEditFocusContext(),
      actionFrameSelectionActive: currentActionFrameTargetActive(),
      selectedActor,
      groupEditValues: currentActionGroupEditValues(),
      editTarget: getEditTarget(EDIT_CONTEXT_ACTION),
    });
  }

  function getEditTarget(context = currentOpenEditContext()) {
    return resolveEditTarget({
      context: normalizedEditTargetContext(context),
      activePartKey: selectionState.getActivePartKeyGlobal(),
      editFocusPartKey: editingState.getEditFocusPartKey(),
      hasFrameTarget: currentActionFrameTargetActive(),
      selectedActionParts: currentActionSelectedActionParts(),
      activeActionPartKey: currentActionActiveActionPartKey(),
    });
  }

  function normalizedEditTargetContext(context) {
    if (context === 'action') return EDIT_CONTEXT_ACTION;
    if (context === 'effect') return EDIT_CONTEXT_EFFECT;
    return EDIT_CONTEXT_SETUP;
  }

  function currentActionSelectedActionParts() {
    return actionEditSessions?.selectedParts || selectionState.actionParts;
  }

  function currentActionActiveActionPartKey() {
    return actionEditSessions?.getActivePartKey() ?? selectionState.getActiveActionPartKey();
  }

  function currentActionGroupEditValues() {
    return actionEditSessions?.getGroupValues() || groupEditState.getValues();
  }

  function currentActionFrameTargetActive() {
    return Boolean(actionFrameTargetCheckGlobal?.());
  }

  function getEditHandleAt(point) {
    return findTuningEditHandleAt(point, getEditHandleGeometry()) || getEditHandleTargetAt(point);
  }

  function getEditHandleTargetAt(point) {
    const openEditContext = currentOpenEditContext();
    if (openEditContext !== 'part' && openEditContext !== EDIT_CONTEXT_ACTION) return null;

    const hitRegion = [...(selectedActor.player.hitRegions || [])]
      .reverse()
      .find((region) => pointInRegion(point, region));
    if (!hitRegion?.key) return null;

    const geometry = createPartEditHandleGeometry({
      editFocusPartKey: hitRegion.key,
      editHandleInfo: selectedActor.player.editHandles?.[hitRegion.key],
      actionFrameSelectionActive: currentActionFrameTargetActive(),
    });
    return geometry ? { mode: 'move', geometry } : null;
  }

  function pointInRegion(point, region) {
    const bounds = region?.bounds;
    if (!bounds) return false;
    return (
      point.x >= bounds.x && point.x <= bounds.x + bounds.w && point.y >= bounds.y && point.y <= bounds.y + bounds.h
    );
  }

  function buildTuningPanel() {
    const bootstrap = createTuningPanelBootstrap();
    if (!bootstrap) return;

    const { panel, elements: panelElements, syncPanelToggle } = bootstrap;
    const { layerOrder } = panelElements;
    getCurrentActionKey = () => panelElements.actionSelect?.value;
    actionEditSessions = createActionEditSessionStore({
      getActionKey: getCurrentActionKey,
    });
    let actionTimeline;
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
      getGroupEditValues: actionEditSessions.getGroupValues,
      setGroupEditValues: actionEditSessions.setGroupValues,
      createDefaultGroupEditValues: actionEditSessions.createDefaultGroupValues,
      applyActorTuning,
      saveState,
      syncPanel,
      syncActionToolbarButtons: () => actionTimeline?.syncToolbarButtons(),
    });
    const { beginUndoSnapshot, commitUndoSnapshot, pushUndoSnapshot, undoTuningChange } = undoState;
    undoTuningChangeGlobal = undoTuningChange;

    const scrubCallbacks = {
      beginChange: beginUndoSnapshot,
      commitChange: commitUndoSnapshot,
    };
    ({
      actionTimeline,
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
      actionEditSessions,
      undoState,
      scrubCallbacks,
      getActivePartKey: selectionState.getActivePartKey,
      getActivePartKeyGlobal: selectionState.getActivePartKeyGlobal,
      getActiveActionPartKey: actionEditSessions.getActivePartKey,
      getEditTarget,
      getEditFocusContext: editingState.getEditFocusContext,
      getEditFocusPartKey: editingState.getEditFocusPartKey,
      getEditContext: selectionState.getEditContext,
      getEditHandleAt,
      getGroupEditHandleGeometry,
      getGroupEditValues: actionEditSessions.getGroupValues,
      getOpenEditContext: currentOpenEditContext,
      getSceneSession,
      getSelectedActor: () => selectedActor,
      panel,
      playerActor,
      pushUndoSnapshot,
      refreshStagePsdAsset,
      resetGroupEditValues: actionEditSessions.resetGroupValues,
      resetGroupTransformValues: actionEditSessions.resetGroupTransformValues,
      saveState,
      selectedActionParts: actionEditSessions.selectedParts,
      setActiveActor,
      setActivePartKey: selectionState.setActivePartKey,
      setActivePartKeyGlobal: selectionState.setActivePartKeyGlobal,
      setActiveActionPartKey: actionEditSessions.setActivePartKey,
      setFrameSelectionActive: (value) => {
        actionFrameSelectionActive = value;
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
      world,
    }));
    undoState.setStageRulesAccessors({
      getStageRules: stageRulesController.getStageRules,
      setStageRules: (stageRules) => {
        const restoredStageRules = stageRulesController.setStageRules(stageRules, { notify: false });
        const session = getSceneSession();
        if (session) session.stageRules = restoredStageRules;
        syncWorldPhysicsToWorld(world, restoredStageRules);
      },
    });
    actionFrameCopyGlobal = timelineFrameActions.copyCurrentFrame;
    actionFramePasteGlobal = timelineFrameActions.pasteCurrentFrame;
    actionFrameTargetCheckGlobal = timelineFrameActions.hasActionFrameTarget;
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
      actionTimeline,
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
      actionTimeline,
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
        currentActionSelectedActionParts().size() > 1 ? null : editingState.getEditFocusPartKey()
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
      if (session === 'animation' && nextSession !== 'animation') actionTimeline?.stopPreview();
      if (session === 'effect' && nextSession !== 'effect') effectTimeline?.stopPreview();
      clearEditHandleState();
    }

    function enterSetupWorkflowSession() {
      openWorkflowSection(panelElements.collisionSection);
      openWorkflowSection(panelElements.partSection, partController.openPartSection);
      openWorkflowSection(panelElements.layerSection);
    }

    function enterAnimationWorkflowSession() {
      openWorkflowSection(panelElements.actionSection, partController.openActionSection);
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
      openWorkflowSection(panelElements.worldPhysicsSection);
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
      copyFrame: actionFrameCopyGlobal,
      pasteFrame: actionFramePasteGlobal,
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
