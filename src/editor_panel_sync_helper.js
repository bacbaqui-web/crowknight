import { TUNING_FIELDS } from './game_config_data.js';
import { syncNumericFields } from './editor_panel_dom_helper.js';
import { renderTuningLayerOrder } from './editor_layer_order_helper.js';
import { normalizeTuningPanelWorkflowSession } from './editor_workflow_data.js';
import { syncActionAuthoringControls } from './action_authoring_controller.js';
import { isPlayerCharacter } from './character_group_data.js';

export function createTuningPanelSync({
  elements,
  getSelectedActor,
  lifecycleController,
  partController,
  effectTimeline,
  backgroundController,
  stageRulesPanelController,
  actionTimeline,
  syncAnchorDebugPart,
}) {
  const { actorSelect, actorName, characterDelete, effectName, effectSelect, layerOrder } = elements;

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
