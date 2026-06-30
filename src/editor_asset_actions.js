import { defaultTuningFor } from './actorTuning.js';
import { refreshCharacterPsdAssets, refreshEffectAsset } from './asset_refresh_helper.js';
import { showPanelActionFeedback } from './panel_action_feedback.js';
import { clone } from './utils.js';

export function bindTuningPanelAssetActions({
  elements,
  effectAssets,
  effectAssetSources,
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
  bindEffectAssetButtons({ elements, effectAssets, effectAssetSources, getEffectTimeline, saveState });
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
    await runPanelButtonAction(characterPsdUpload, 'PSD 업로드', () =>
      refreshSelectedCharacterPsd({
        actor: getSelectedActor(),
        psdFile,
        pushUndoSnapshot,
        saveState,
        syncPanel,
      })
    );
  });
  characterPsdRefresh?.addEventListener('click', async () => {
    await runPanelButtonAction(characterPsdRefresh, 'PSD 새로고침', () =>
      refreshSelectedCharacterPsd({
        actor: getSelectedActor(),
        pushUndoSnapshot,
        saveState,
        syncPanel,
      })
    );
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

async function refreshSelectedCharacterPsd({ actor, psdFile = null, pushUndoSnapshot, saveState, syncPanel }) {
  if (!actor) return false;
  pushUndoSnapshot();
  const ok = await refreshCharacterPsdAssets({ actor, psdFile });
  if (!ok) return false;

  actor.player.applyTuning(actor.tuning);
  saveState();
  syncPanel();
  return true;
}

function bindEffectAssetButtons({ elements, effectAssets, effectAssetSources, getEffectTimeline, saveState }) {
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
      refreshCurrentEffectAsset({
        effectAssets,
        effectAssetSources,
        effectKey: effectSelect.value,
        effectFile,
        getEffectTimeline,
        saveState,
      })
    );
  });
  effectAssetRefresh?.addEventListener('click', async () => {
    await runPanelButtonAction(effectAssetRefresh, '효과 새로고침', () =>
      refreshCurrentEffectAsset({
        effectAssets,
        effectAssetSources,
        effectKey: effectSelect.value,
        getEffectTimeline,
        saveState,
      })
    );
  });
  effectAssetReset?.addEventListener('click', () => {
    if (!window.confirm('현재 효과를 초기화할까요?')) return;
    getEffectTimeline()?.resetAnimation();
  });
}

async function refreshCurrentEffectAsset({
  effectAssets,
  effectAssetSources,
  effectKey,
  effectFile = null,
  getEffectTimeline,
  saveState,
}) {
  const ok = await refreshEffectAsset({ effectAssets, effectAssetSources, effectKey, file: effectFile });
  if (!ok) return false;

  const effectTimeline = getEffectTimeline();
  effectTimeline?.renderFields();
  effectTimeline?.syncPreview();
  saveState?.();
  return true;
}

async function runPanelButtonAction(button, label, action) {
  if (!button || !action || button.disabled) return;

  button.disabled = true;
  button.classList.add('is-working');
  button.classList.remove('is-success', 'is-error');
  button.setAttribute('aria-label', `${label} 처리중`);
  showPanelActionFeedback(label, 'working');

  let ok;
  try {
    ok = await action();
  } catch {
    ok = false;
  }

  button.classList.remove('is-working');
  button.classList.toggle('is-success', Boolean(ok));
  button.classList.toggle('is-error', !ok);
  button.setAttribute('aria-label', `${label} ${ok ? '완료' : '실패'}`);
  showPanelActionFeedback(label, ok ? 'success' : 'error');

  window.setTimeout(() => {
    button.classList.remove('is-success', 'is-error');
    button.setAttribute('aria-label', label);
    button.disabled = false;
  }, 1200);
}
