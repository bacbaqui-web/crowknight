import { TUNING_FIELDS } from './game_config_data.js';
import { syncNumericFields } from './editor_panel_dom_helper.js';
import { renderTuningLayerOrder } from './editor_layer_order_helper.js';
import { normalizeTuningPanelWorkflowSession } from './editor_workflow_data.js';
import { syncActionAuthoringControls, syncEffectAuthoringControls } from './action_authoring_controller.js';
import { isPlayerCharacter } from './character_group_data.js';

export function createTuningPanelSync({
  elements,
  getSelectedActor,
  lifecycleController,
  partController,
  effectTimeline,
  backgroundController,
  stageRulesPanelController,
  stageAiPanelController,
  actionTimeline,
  syncAnchorDebugPart,
}) {
  const { actorSelect, actorName, characterDelete, layerOrder } = elements;

  function syncActorControls() {
    const selectedActor = getSelectedActor();

    lifecycleController.syncActorOptions();
    actorSelect.value = selectedActor.id;
    actorName.value = selectedActor.name;
    if (characterDelete) characterDelete.disabled = isPlayerCharacter(selectedActor);
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
    syncActionAuthoringControls(elements, getSelectedActor().tuning);
    partController.renderActionPartFields();
    partController.syncMotionRows();
    partController.syncPartPickers();
    syncAnchorDebugPart();
    actionTimeline.syncPreview();
  }

  function syncEffect() {
    syncEffectAuthoringControls(elements, getSelectedActor().tuning);
    effectTimeline.renderFields();
    effectTimeline.syncPreview();
  }

  function syncBg() {
    backgroundController.sync();
  }

  function syncStage() {
    stageRulesPanelController.sync();
    stageAiPanelController.sync();
  }

  function sync(selectedLayerValue = layerOrder.value) {
    syncActorControls();
    syncSetup(selectedLayerValue);
    syncAnimation();
    syncEffect();
    syncBg();
    syncStage();
  }

  function syncSession(session, selectedLayerValue = layerOrder.value) {
    const activeSession = normalizeTuningPanelWorkflowSession(session);
    syncActorControls();

    if (activeSession === 'setup') syncSetup(selectedLayerValue);
    else if (activeSession === 'animation') syncAnimation();
    else if (activeSession === 'effect') syncEffect();
    else if (activeSession === 'bg') syncBg();
    else if (activeSession === 'stage') syncStage();
  }

  return {
    sync,
    syncSession,
  };
}
