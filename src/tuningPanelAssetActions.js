import { defaultTuningFor } from './actorTuning.js';
import { refreshCharacterPsdAssets } from './characterPsdRuntime.js';
import { refreshEffectAsset } from './effectAssetRuntime.js';
import { runPanelButtonAction } from './tuningPanelButtonAction.js';
import { clone } from './utils.js';

export function bindTuningPanelAssetActions({
  elements,
  effectAssets,
  getSelectedActor,
  getEffectTimeline,
  pushUndoSnapshot,
  saveState,
  syncPanel,
  uploadSettings,
  downloadSettings,
}) {
  bindFirebaseButtons({ elements, uploadSettings, downloadSettings });
  bindCharacterPsdButtons({ elements, getSelectedActor, pushUndoSnapshot, saveState, syncPanel });
  bindEffectAssetButtons({ elements, effectAssets, getEffectTimeline });
}

function bindFirebaseButtons({ elements, uploadSettings, downloadSettings }) {
  const { firebaseUpload, firebaseDownload } = elements;

  firebaseUpload?.addEventListener('click', async () => {
    await runPanelButtonAction(firebaseUpload, '업로드', uploadSettings);
  });
  firebaseDownload?.addEventListener('click', async () => {
    await runPanelButtonAction(firebaseDownload, '다운로드', downloadSettings);
  });
}

function bindCharacterPsdButtons({ elements, getSelectedActor, pushUndoSnapshot, saveState, syncPanel }) {
  const { characterPsdUpload, characterPsdFile, characterPsdRefresh, characterPartReset } = elements;

  characterPsdUpload?.addEventListener('click', () => {
    if (characterPsdUpload.disabled || !characterPsdFile) return;
    characterPsdFile.value = '';
    characterPsdFile.click();
  });
  characterPsdFile?.addEventListener('change', async () => {
    const psdFile = characterPsdFile.files?.[0];
    if (!psdFile) return;
    await runPanelButtonAction(characterPsdUpload, 'PSD 업로드', async () => {
      const actor = getSelectedActor();
      const ok = await refreshCharacterPsdAssets({ actor, psdFile });
      if (ok) actor.player.applyTuning(actor.tuning);
      return ok;
    });
  });
  characterPsdRefresh?.addEventListener('click', async () => {
    await runPanelButtonAction(characterPsdRefresh, 'PSD 새로고침', async () => {
      const actor = getSelectedActor();
      const ok = await refreshCharacterPsdAssets({ actor });
      if (ok) actor.player.applyTuning(actor.tuning);
      return ok;
    });
  });
  characterPartReset?.addEventListener('click', () => {
    if (!window.confirm('선택 캐릭터의 파츠 위치를 초기화할까요?')) return;
    const actor = getSelectedActor();
    pushUndoSnapshot();
    actor.tuning.rig = clone(defaultTuningFor(actor).rig);
    actor.player.applyTuning(actor.tuning);
    saveState();
    syncPanel();
  });
}

function bindEffectAssetButtons({ elements, effectAssets, getEffectTimeline }) {
  const { effectAssetUpload, effectAssetFile, effectAssetRefresh, effectAssetReset, effectSelect } = elements;

  effectAssetUpload?.addEventListener('click', () => {
    if (effectAssetUpload.disabled || !effectAssetFile) return;
    effectAssetFile.value = '';
    effectAssetFile.click();
  });
  effectAssetFile?.addEventListener('change', async () => {
    const effectFile = effectAssetFile.files?.[0];
    if (!effectFile) return;
    await runPanelButtonAction(effectAssetUpload, '효과 업로드', async () =>
      refreshCurrentEffectAsset({ effectAssets, effectKey: effectSelect.value, effectFile, getEffectTimeline })
    );
  });
  effectAssetRefresh?.addEventListener('click', async () => {
    await runPanelButtonAction(effectAssetRefresh, '효과 새로고침', () =>
      refreshCurrentEffectAsset({ effectAssets, effectKey: effectSelect.value, getEffectTimeline })
    );
  });
  effectAssetReset?.addEventListener('click', () => {
    if (!window.confirm('현재 효과를 초기화할까요?')) return;
    getEffectTimeline()?.resetAnimation();
  });
}

async function refreshCurrentEffectAsset({ effectAssets, effectKey, effectFile = null, getEffectTimeline }) {
  const ok = await refreshEffectAsset({ effectAssets, effectKey, file: effectFile });
  if (!ok) return false;

  const effectTimeline = getEffectTimeline();
  effectTimeline?.renderFields();
  effectTimeline?.syncPreview();
  return true;
}
