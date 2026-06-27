import { replaceObject } from './tuningNormalize.js';
import { clone } from './utils.js';

const MAX_UNDO_SNAPSHOTS = 80;

export function createTuningPanelUndoState({
  actors,
  getSelectedActor,
  setSelectedActor,
  getGroupEditValues,
  setGroupEditValues,
  createDefaultGroupEditValues,
  applyActorTuning,
  saveState,
  syncPanel,
  syncPoseToolbarButtons,
}) {
  const undoStack = [];
  let editSnapshotOpen = false;
  let stageRulesAccessors = null;

  function beginUndoSnapshot() {
    if (editSnapshotOpen) return;
    pushUndoSnapshot();
    editSnapshotOpen = true;
  }

  function commitUndoSnapshot() {
    editSnapshotOpen = false;
  }

  function pushUndoSnapshot() {
    const selectedActor = getSelectedActor();
    const stageRules = stageRulesAccessors?.getStageRules?.();
    const snapshot = {
      actorId: selectedActor.id,
      tuning: clone(selectedActor.tuning),
      groupEditValues: clone(getGroupEditValues()),
    };
    if (stageRules) snapshot.stageRules = clone(stageRules);
    undoStack.push(snapshot);
    if (undoStack.length > MAX_UNDO_SNAPSHOTS) undoStack.shift();
  }

  function setStageRulesAccessors(accessors) {
    stageRulesAccessors = accessors;
  }

  function undoTuningChange() {
    const snapshot = undoStack.pop();
    if (!snapshot) return;

    const selectedActor = getSelectedActor();
    const actor = actors.find((item) => item.id === snapshot.actorId) || selectedActor;
    setSelectedActor(actor);
    replaceObject(actor.tuning, snapshot.tuning);
    setGroupEditValues(snapshot.groupEditValues ? clone(snapshot.groupEditValues) : createDefaultGroupEditValues());
    if (snapshot.stageRules) stageRulesAccessors?.setStageRules?.(clone(snapshot.stageRules));
    applyActorTuning(actor);
    saveState();
    editSnapshotOpen = false;
    syncPanel();
    syncPoseToolbarButtons();
  }

  return {
    get undoCount() {
      return undoStack.length;
    },
    beginUndoSnapshot,
    commitUndoSnapshot,
    pushUndoSnapshot,
    setStageRulesAccessors,
    undoTuningChange,
  };
}
