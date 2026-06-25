import { defaultTuningFor } from './actorTuning.js';
import { replaceObject } from './tuningNormalize.js';
import { closeTuningPanelShell, openTuningPanelShell, syncActorSelectLabels } from './tuningPanelDom.js';
import { clearActorEditPreviews } from './previewState.js';

export function createTuningPanelLifecycleController({
  elements,
  actors,
  playerActor,
  selectedPosePartKeys,
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
}) {
  const { panel, backdrop, actorSelect, actorName } = elements;

  function openPanel() {
    syncPanel();
    openTuningPanelShell(panel, backdrop);
    syncPanelToggle();
  }

  function closePanel() {
    closeTuningPanelShell(panel, backdrop);
    syncPanelToggle();
    clearPanelSelectionState();
    effectTimeline.stopPreview();
    setEditFocusPartKey(null);
    setEditFocusContext(null);
    clearEditHandleState();
    partController.syncPartPickers();
    clearActorEditPreviews(actors);
    document.activeElement?.blur();
  }

  function clearPanelSelectionState({ clearCopiedEffect = false } = {}) {
    selectedPosePartKeys.clear();
    setActivePartKeyGlobal(null);
    setActivePartKey(null);
    setActivePosePartKey(null);
    poseTimeline.resetSelectionState();
    effectTimeline.resetSelectionState();
    if (clearCopiedEffect) effectTimeline.clearCopiedFrame();
    resetGroupEditValues();
  }

  function resetSelectedActorTuning() {
    const selectedActor = getSelectedActor();
    pushUndoSnapshot();
    replaceObject(selectedActor.tuning, defaultTuningFor(selectedActor));
    selectedActor.name = selectedActor.label;
    clearPanelSelectionState({ clearCopiedEffect: true });
    selectedActor.player.applyTuning(selectedActor.tuning);
    selectedActor.hp = 100;
    saveState();
    syncPanel();
  }

  function handleActorChange() {
    setActiveActor(actors.find((actor) => actor.id === actorSelect.value) || playerActor);
    clearPanelSelectionState({ clearCopiedEffect: true });
    syncPanel();
  }

  function handleActorNameInput() {
    const selectedActor = getSelectedActor();
    selectedActor.name = actorName.value || selectedActor.label;
    saveState();
    syncActorOptions();
  }

  function handleEffectChange() {
    setEditContext('effect');
    effectTimeline.stopPreview();
    effectTimeline.resetSelectionState();
    effectTimeline.ensureActiveFrame();
    effectTimeline.renderFields();
    effectTimeline.syncPreview();
  }

  function syncActorOptions() {
    syncActorSelectLabels(actorSelect, actors);
  }

  return {
    handleActorChange,
    handleActorNameInput,
    handleEffectChange,
    openPanel,
    closePanel,
    resetSelectedActorTuning,
    syncActorOptions,
  };
}
