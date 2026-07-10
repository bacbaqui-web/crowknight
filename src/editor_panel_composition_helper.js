import { createBackgroundPanelController } from './background_panel_controller.js';
import { createStageAiPanelController } from './stage_ai_panel_controller.js';
import { createStageRulesController } from './stage_rules_controller.js';
import { createStageRulesPanelController } from './stage_rules_panel_controller.js';
import { createTuningPanelCanvasController } from './transform_editor_controller.js';
import { createTuningPanelLifecycleController } from './editor_lifecycle_controller.js';
import { createTuningPanelPartController } from './part_editor_controller.js';
import { createTuningPanelTimelines } from './editor_timeline_section_controller.js';
import { syncWorldPhysicsToWorld } from './scene_session_data.js';

export function createTuningPanelComposition({
  actors,
  characterDefs,
  applySelected,
  beginUndoSnapshot,
  canvas,
  clearEditHandleState,
  commitUndoSnapshot,
  effectAssets,
  elements,
  actionEditSessions,
  getActivePartKey,
  getActivePartKeyGlobal,
  getActiveActionPartKey,
  getEditTarget,
  getEditFocusContext,
  getEditFocusPartKey,
  getEditHandleAt,
  getEditContext,
  getGroupEditHandleGeometry,
  getGroupEditValues,
  getOpenEditContext,
  getSceneSession,
  getSelectedActor,
  panel,
  playerActor,
  pushUndoSnapshot,
  refreshStagePsdAsset,
  resetGroupEditValues,
  resetGroupTransformValues,
  saveState,
  scrubCallbacks,
  selectedActionParts,
  setActiveActor,
  setActivePartKey,
  setActivePartKeyGlobal,
  setActiveActionPartKey,
  setEditContext,
  setEditFocusContext,
  setEditFocusPartKey,
  setEditHandleActiveMode,
  setEditHandleHover,
  setFrameSelectionActive,
  syncAnchorDebugPart,
  syncPanel,
  syncPanelToggle,
  undoState,
  world,
}) {
  const { partSection, actionSection, effectSection, actionSelect, effectSelect } = elements;
  let canvasController = null;
  let partController = null;

  const { actionTimeline, effectTimeline } = createTuningPanelTimelines({
    actors,
    effectAssets,
    elements,
    undoState,
    scrubCallbacks,
    selectedActionParts,
    actionTimelineSelection: actionEditSessions.timelineSelection,
    getSelectedActor,
    getActiveActionPartKey,
    getEditTarget,
    setFrameSelectionActive,
    setEditContext,
    resetGroupEditValues,
    renderActionPartFields: () => partController?.renderActionPartFields(),
    beginUndoSnapshot,
    commitUndoSnapshot,
    applySelected,
  });

  const timelineFrameActions = createTuningPanelTimelineFrameActions({
    getOpenEditContext,
    getActionTimeline: () => actionTimeline,
    getEffectTimeline: () => effectTimeline,
  });

  const backgroundController = createBackgroundPanelController({
    elements,
    getSceneSession,
    saveState,
    refreshStagePsdAsset,
  });
  const stageRulesController = createStageRulesController({
    initialRules: getSceneSession()?.stageRules,
    onChange: (stageRules) => {
      const session = getSceneSession();
      if (!session) return;
      session.stageRules = stageRules;
      syncWorldPhysicsToWorld(world, stageRules);
      saveState();
    },
  });
  const stageRulesPanelController = createStageRulesPanelController({
    actors,
    beginChange: beginUndoSnapshot,
    commitChange: commitUndoSnapshot,
    elements,
    getSceneSession,
    saveState,
    stageRulesController,
    world,
  });
  const stageAiPanelController = createStageAiPanelController({
    actors,
    beginChange: beginUndoSnapshot,
    commitChange: commitUndoSnapshot,
    elements,
    saveState,
    stageRulesController,
  });

  partController = createTuningPanelPartController({
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
    getCanvasController: () => canvasController,
    beginUndoSnapshot,
    applySelected,
  });

  canvasController = createTuningPanelCanvasController({
    canvas,
    panel,
    sections: {
      part: partSection,
      action: actionSection,
      effect: effectSection,
    },
    getSelectedActor,
    getEditTarget,
    setEditFocusPartKey,
    getEditFocusContext,
    getEditContext,
    setEditContext,
    getActivePartKey: getActivePartKeyGlobal,
    getGroupEditValues,
    getEditHandleAt,
    getGroupEditHandleGeometry,
    setEditHandleHover,
    setEditHandleActiveMode,
    resetGroupTransformValues,
    actionTimeline,
    effectTimeline,
    getActionKey: () => actionSelect.value,
    getEffectKey: () => effectSelect.value,
    applySelected,
    saveState,
    renderPartFields: partController.renderPartFields,
    renderActionPartFields: partController.renderActionPartFields,
    selectCanvasPart: partController.selectCanvasPart,
    pushUndoSnapshot,
    beginUndoSnapshot,
    commitUndoSnapshot,
  });

  const lifecycleController = createTuningPanelLifecycleController({
    elements,
    actors,
    characterDefs,
    playerActor,
    selectedActionParts,
    getSelectedActor,
    setActiveActor,
    setActivePartKey,
    setActivePartKeyGlobal,
    setActiveActionPartKey,
    setEditContext,
    setEditFocusPartKey,
    setEditFocusContext,
    resetGroupEditValues,
    resetActionEditSessions: actionEditSessions.resetAllSessions,
    clearEditHandleState,
    actionTimeline,
    effectTimeline,
    partController,
    syncPanel,
    syncPanelToggle,
    pushUndoSnapshot,
    saveState,
  });

  return {
    backgroundController,
    canvasController,
    effectTimeline,
    lifecycleController,
    partController,
    actionTimeline,
    stageRulesController,
    stageRulesPanelController,
    stageAiPanelController,
    timelineFrameActions,
  };
}

function createTuningPanelTimelineFrameActions({ getOpenEditContext, getActionTimeline, getEffectTimeline }) {
  function activeTimelineController() {
    return getOpenEditContext() === 'effect' ? getEffectTimeline() : getActionTimeline();
  }

  return {
    copyCurrentFrame() {
      activeTimelineController().copyFrame();
    },
    hasActionFrameTarget() {
      return Boolean(getActionTimeline().hasFrameTarget?.());
    },
    pasteCurrentFrame() {
      activeTimelineController().pasteFrame();
    },
    hasCurrentFrameSelection() {
      return Boolean(activeTimelineController().hasFrameSelection?.());
    },
  };
}
