import { effectImageKeyFromFileName, validEffectImageKey } from './animation_frame_data.js';
import { refreshEffectAssetResult } from './asset_refresh_helper.js';
import { ensureEffectOffset, ensureEffectSettings } from './project_data_normalizer_helper.js';
import { runPanelButtonAction } from './panel_button_action_helper.js';
export function bindEffectAssetButtons({
  elements,
  effectAssets,
  effectAssetSources,
  getSelectedActor,
  getEffectTimeline,
  saveState,
}) {
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
        getSelectedActor,
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
        getSelectedActor,
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
  getSelectedActor,
  getEffectTimeline,
  saveState,
}) {
  const actor = getSelectedActor?.();
  if (!actor?.tuning) return { ok: false, error: '선택된 캐릭터가 없습니다.' };
  ensureEffectOffset(actor.tuning, effectKey);
  ensureEffectSettings(actor.tuning);
  const effect = actor.tuning.effectOffsets?.[effectKey];
  const settings = actor.tuning.effectSettings?.[effectKey] || {};
  const effectTimeline = getEffectTimeline();
  const imageKey = effectUploadImageKey(effectKey, settings, effect, Boolean(effectFile));
  const actorId = actor.id || '';
  const diagnostic = {
    actorId,
    effectKey,
    currentImage: effect?.image || 'none',
    effectFileName: settings.fileName || '',
    imageKey,
    fileName: effectFile?.name || '',
    fileSize: Number(effectFile?.size || 0),
  };

  const result = await refreshEffectAssetResult({
    effectAssets,
    effectAssetSources,
    effectKey,
    imageKey,
    actorId,
    file: effectFile,
  });
  Object.assign(diagnostic, result.debug || {});
  if (!result.ok) return effectUploadDiagnosticResult(result, diagnostic);
  ensureEffectOffset(actor.tuning, effectKey);
  actor.tuning.effectOffsets[effectKey].image = imageKey;
  diagnostic.savedImage = actor.tuning.effectOffsets[effectKey].image || 'none';
  diagnostic.effectAsset = effectAssetDiagnosticInfo(effectAssets?.[result.assetKey]);
  diagnostic.effectAssetSource = effectAssetSources?.[result.assetKey] || diagnostic.effectAssetSource || '';

  effectTimeline?.renderFields();
  effectTimeline?.syncPreview();
  saveState?.();
  return effectUploadDiagnosticResult(result, diagnostic);
}

function effectUploadImageKey(effectKey, settings = {}, effect = {}, hasUploadFile = false) {
  if (!hasUploadFile && validEffectImageKey(effect?.image)) return effect.image;
  return effectImageKeyFromFileName(settings.fileName, effectKey);
}

function effectUploadDiagnosticResult(result, diagnostic) {
  const nextResult = {
    ...result,
    debug: diagnostic,
    feedbackDetail: formatEffectUploadDiagnostic(diagnostic),
  };
  window.console?.info?.('[EffectUpload]', diagnostic);
  return nextResult;
}

function formatEffectUploadDiagnostic(diagnostic = {}) {
  return [
    'Effect Upload Debug',
    `actorId: ${diagnostic.actorId || ''}`,
    `effectKey: ${diagnostic.effectKey || ''}`,
    `currentImage: ${diagnostic.currentImage || 'none'}`,
    `effectFileName: ${diagnostic.effectFileName || ''}`,
    `imageKey: ${diagnostic.imageKey || ''}`,
    `assetKey: ${diagnostic.assetKey || ''}`,
    `url: ${diagnostic.uploadUrl || ''}`,
    `file: ${formatEffectUploadFile(diagnostic)}`,
    `status: ${diagnostic.responseStatus ?? ''}`,
    `body: ${formatDiagnosticValue(diagnostic.responseBody)}`,
    `savedImage: ${diagnostic.savedImage || ''}`,
    `effectAssets[assetKey]: ${formatDiagnosticValue(diagnostic.effectAsset)}`,
    `effectAssetSource: ${diagnostic.effectAssetSource || ''}`,
  ].join('\n');
}

function formatEffectUploadFile(diagnostic = {}) {
  const name = diagnostic.fileName || 'none';
  const size = Number(diagnostic.fileSize || 0);
  return `${name} / ${size} bytes`;
}

function formatDiagnosticValue(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function effectAssetDiagnosticInfo(asset) {
  if (!asset) return null;
  return {
    width: Number(asset.naturalWidth || asset.width || 0),
    height: Number(asset.naturalHeight || asset.height || 0),
    complete: Boolean(asset.complete),
    src: asset.currentSrc || asset.src || '',
  };
}
