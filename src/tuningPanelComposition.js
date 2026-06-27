import { createBackgroundPanelController } from './backgroundPanelController.js';
import { createStageRulesController } from './stageRulesController.js';
import { createStageRulesPanelController } from './stageRulesPanelController.js';
import { createTuningPanelCanvasController } from './tuningPanelCanvasController.js';
import { createTuningPanelLifecycleController } from './tuningPanelLifecycleController.js';
import { createTuningPanelPartController } from './tuningPanelPartController.js';
import { createTuningPanelTimelineFrameActions } from './tuningPanelTimelineFrameActions.js';
import { createTuningPanelTimelines } from './tuningPanelTimelines.js';

export function createTuningPanelComposition({
  actors,
  applySelected,
  beginUndoSnapshot,
  canvas,
  clearEditHandleState,
  commitUndoSnapshot,
  effectAssets,
  elements,
  getActivePartKey,
  getActivePartKeyGlobal,
  getActivePosePartKey,
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
  refreshPsdSettings,
  resetGroupEditValues,
  resetGroupTransformValues,
  saveState,
  scrubCallbacks,
  selectedPoseParts,
  setActiveActor,
  setActivePartKey,
  setActivePartKeyGlobal,
  setActivePosePartKey,
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
}) {
  const { partSection, poseSection, effectSection, poseSelect, effectSelect } = elements;
  let canvasController = null;
  let partController = null;

  const { poseTimeline, effectTimeline } = createTuningPanelTimelines({
    actors,
    effectAssets,
    elements,
    undoState,
    scrubCallbacks,
    selectedPoseParts,
    getSelectedActor,
    getActivePosePartKey,
    setFrameSelectionActive,
    setEditContext,
    resetGroupEditValues,
    renderPosePartFields: () => partController?.renderPosePartFields(),
    beginUndoSnapshot,
    commitUndoSnapshot,
    applySelected,
  });

  const timelineFrameActions = createTuningPanelTimelineFrameActions({
    getOpenEditContext,
    getPoseTimeline: () => poseTimeline,
    getEffectTimeline: () => effectTimeline,
  });

  const backgroundController = createBackgroundPanelController({
    elements,
    getSceneSession,
    saveState,
    refreshPsdSettings,
  });
  const stageRulesController = createStageRulesController({
    initialRules: getSceneSession()?.stageRules,
    onChange: (stageRules) => {
      const session = getSceneSession();
      if (!session) return;
      session.stageRules = stageRules;
      saveState();
    },
  });
  const stageRulesPanelController = createStageRulesPanelController({
    beginChange: beginUndoSnapshot,
    commitChange: commitUndoSnapshot,
    elements,
    stageRulesController,
  });

  partController = createTuningPanelPartController({
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
    selectedPoseParts,
    getSelectedActor,
    getEditFocusPartKey,
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

  const lifecycleController = createTuningPanelLifecycleController({
    elements,
    actors,
    playerActor,
    selectedPoseParts,
    getSelectedActor,
    setActiveActor,
    setActivePartKey,
    setActivePartKeyGlobal,
    setActivePosePartKey,
    setEditContext,
    setEditFocusPartKey,
    setEditFocusContext,
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

  return {
    backgroundController,
    canvasController,
    effectTimeline,
    lifecycleController,
    partController,
    poseTimeline,
    stageRulesController,
    stageRulesPanelController,
    timelineFrameActions,
  };
}
