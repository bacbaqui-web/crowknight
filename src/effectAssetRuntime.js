import { defaultEffectImageKey } from './animationFrames.js';
import { loadEffectAsset } from './assetLoaders.js';

const EFFECT_REFRESH_API_URL = './api/effect/refresh';

export async function refreshEffectAsset({ effectAssets, effectKey, file = null }) {
  const assetKey = defaultEffectImageKey(effectKey);
  if (!effectAssets || assetKey === 'none') return false;

  const result = file ? await uploadEffectAsset(assetKey, file) : await refreshEffectAssetFile(assetKey);
  if (!result?.ok) return false;

  const asset = await loadEffectAsset(assetKey, result.updatedAt || Date.now());
  if (!asset) return false;

  effectAssets[assetKey] = asset;
  return true;
}

async function refreshEffectAssetFile(assetKey) {
  return fetchJson(`${EFFECT_REFRESH_API_URL}?asset=${encodeURIComponent(assetKey)}&t=${Date.now()}`);
}

async function uploadEffectAsset(assetKey, file) {
  const response = await window.fetch(
    `${EFFECT_REFRESH_API_URL}?asset=${encodeURIComponent(assetKey)}&t=${Date.now()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Effect-Filename': encodeURIComponent(file.name || `${assetKey}.psd`),
      },
      body: file,
    }
  );
  if (!response.ok) return null;
  return response.json();
}

async function fetchJson(url) {
  const response = await window.fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}
