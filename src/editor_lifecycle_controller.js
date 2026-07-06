import { defaultTuningFor } from './actor_tuning_helper.js';
import { normalizeCharacterGroup } from './character_group_data.js';
import { replaceObject } from './project_data_normalizer_helper.js';
import {
  closeTuningPanelShell,
  openTuningPanelShell,
  syncActorGroupOptions,
  syncActorSelectLabels,
} from './editor_panel_dom_helper.js';
import { clearActorEditPreviews } from './preview_state.js';

export function createTuningPanelLifecycleController({
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
  resetActionEditSessions,
  clearEditHandleState,
  actionTimeline,
  effectTimeline,
  partController,
  syncPanel,
  syncPanelToggle,
  pushUndoSnapshot,
  saveState,
}) {
  const { panel, backdrop, actorGroupSelect, actorSelect, actorName, effectName, effectSelect } = elements;

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
    selectedActionParts.clear();
    resetActionEditSessions?.();
    setActivePartKeyGlobal(null);
    setActivePartKey(null);
    setActiveActionPartKey(null);
    actionTimeline.resetSelectionState();
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
    setActiveActor(visibleActorsForActiveGroup().find((actor) => actor.id === actorSelect.value) || playerActor);
    clearPanelSelectionState({ clearCopiedEffect: true });
    syncPanel();
  }

  function handleActorGroupChange() {
    const firstActor = visibleActorsForActiveGroup()[0] || playerActor;
    setActiveActor(firstActor);
    clearPanelSelectionState({ clearCopiedEffect: true });
    syncPanel();
  }

  function handleActorNameInput() {
    const selectedActor = getSelectedActor();
    selectedActor.name = actorName.value || selectedActor.label;
    const def = characterDefs?.find((item) => item.id === selectedActor.id);
    if (def) def.name = selectedActor.name;
    saveState();
    syncActorOptions();
  }

  function handleEffectChange() {
    setEditContext('effect');
    syncEffectName();
    effectTimeline.stopPreview();
    effectTimeline.resetSelectionState();
    effectTimeline.ensureActiveFrame();
    effectTimeline.renderFields();
    effectTimeline.syncPreview();
  }

  function syncActorOptions() {
    const selectedActor = getSelectedActor();
    const group = normalizeCharacterGroup(selectedActor?.group || actorGroupSelect?.value || 'players');
    syncActorGroupOptions(actorGroupSelect, group);
    syncActorSelectLabels(actorSelect, visibleActorsForActiveGroup());
  }

  function visibleActorsForActiveGroup() {
    const group = normalizeCharacterGroup(actorGroupSelect?.value || getSelectedActor()?.group || 'players');
    return actors.filter((actor) => normalizeCharacterGroup(actor.group) === group);
  }

  function syncEffectName() {
    if (!effectName || !effectSelect) return;
    effectName.value = effectSelect.selectedOptions[0]?.textContent || '';
  }

  return {
    handleActorChange,
    handleActorGroupChange,
    handleActorNameInput,
    handleEffectChange,
    openPanel,
    closePanel,
    resetSelectedActorTuning,
    syncActorOptions,
  };
}
