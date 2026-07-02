import { TUNING_FIELDS } from './game_config.js';
import { syncNumericFields } from './editor_panel_dom.js';
import { renderTuningLayerOrder } from './editor_layer_order.js';
import { normalizeTuningPanelWorkflowSession } from './editor_workflow_data.js';
import { syncPoseActionAuthoringControls } from './pose_action_authoring_controls.js';

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
  const { actorSelect, actorName, characterDelete, effectName, effectSelect, layerOrder } = elements;

  function syncActorControls() {
    const selectedActor = getSelectedActor();

    lifecycleController.syncActorOptions();
    actorSelect.value = selectedActor.id;
    actorName.value = selectedActor.name;
    if (characterDelete) characterDelete.disabled = selectedActor.id === 'player';
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
    syncPoseActionAuthoringControls(elements, getSelectedActor().tuning);
    partController.renderPosePartFields();
    partController.syncMotionRows();
    partController.syncPartPickers();
    syncAnchorDebugPart();
    poseTimeline.syncPreview();
  }

  function syncEffect() {
    if (effectName && effectSelect) {
      effectName.value = effectSelect.selectedOptions[0]?.textContent || '';
    }
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
