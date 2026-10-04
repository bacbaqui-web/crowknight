import { bindCharacterPsdButtons } from './editor_character_asset_view.js';
import { bindEffectAssetButtons } from './editor_effect_asset_controller.js';
import { runPanelButtonAction } from './panel_button_action_helper.js';
export function bindTuningPanelAssetActions({
  elements,
  actors,
  characterDefs,
  world,
  playerActor,
  effectAssets,
  effectAssetSources,
  getSelectedActor,
  setActiveActor,
  getEffectTimeline,
  pushUndoSnapshot,
  saveState,
  syncPanel,
  openBeta,
}) {
  bindBetaButton({ elements, openBeta });
  bindCharacterPsdButtons({
    elements,
    actors,
    characterDefs,
    world,
    playerActor,
    getSelectedActor,
    setActiveActor,
    pushUndoSnapshot,
    saveState,
    syncPanel,
    syncRemoteState: null,
  });
  bindEffectAssetButtons({
    elements,
    effectAssets,
    effectAssetSources,
    getSelectedActor,
    getEffectTimeline,
    saveState,
  });
}

function bindBetaButton({ elements, openBeta }) {
  elements.openBeta?.addEventListener('click', async () => {
    await runPanelButtonAction(elements.openBeta, '베타 저장', openBeta);
  });
}
