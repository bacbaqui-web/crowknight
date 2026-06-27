import { TUNING_FIELDS } from './gameConfig.js';
import { syncNumericFields } from './tuningPanelDom.js';
import { renderTuningLayerOrder } from './tuningPanelLayerOrder.js';
import { normalizeTuningPanelWorkflowSession } from './tuningPanelWorkflow.js';

export function createTuningPanelSync({
  elements,
  getSelectedActor,
  lifecycleController,
  partController,
  effectTimeline,
  backgroundController,
  stageRulesPanelController,
  poseTimeline,
  syncAnchorDebugPart,
}) {
  const { actorSelect, actorName, layerOrder } = elements;

  function syncActorControls() {
    const selectedActor = getSelectedActor();

    actorSelect.value = selectedActor.id;
    actorName.value = selectedActor.name;
    lifecycleController.syncActorOptions();
  }

  function syncSetup(selectedLayerValue = layerOrder.value) {
    const selectedActor = getSelectedActor();

    syncNumericFields(TUNING_FIELDS, selectedActor.tuning);
    partController.renderPartFields();
    partController.syncPartPickers();
    syncAnchorDebugPart();
    renderTuningLayerOrder(layerOrder, selectedActor, selectedLayerValue);
  }

  function syncAnimation() {
    partController.renderPosePartFields();
    partController.syncMotionRows();
    partController.syncPartPickers();
    syncAnchorDebugPart();
    poseTimeline.syncPreview();
  }

  function syncEffect() {
    effectTimeline.renderFields();
    effectTimeline.syncPreview();
  }

  function syncStage() {
    backgroundController.sync();
    stageRulesPanelController.sync();
  }

  function sync(selectedLayerValue = layerOrder.value) {
    syncActorControls();
    syncSetup(selectedLayerValue);
    syncAnimation();
    syncEffect();
    syncStage();
  }

  function syncSession(session, selectedLayerValue = layerOrder.value) {
    const activeSession = normalizeTuningPanelWorkflowSession(session);
    syncActorControls();

    if (activeSession === 'setup') syncSetup(selectedLayerValue);
    else if (activeSession === 'animation') syncAnimation();
    else if (activeSession === 'effect') syncEffect();
    else if (activeSession === 'stage') syncStage();
  }

  return {
    sync,
    syncSession,
  };
}
