import { defaultEffectImageKey } from './animation_frame_data.js';
import { loadCharacterAssets, loadEffectAsset } from './asset_loader_helper.js';

const CHARACTER_REFRESH_API_URL = './api/character/refresh';
const EFFECT_REFRESH_API_URL = './api/effect/refresh';

export async function refreshCharacterPsdAssets({ actor, psdFile = null }) {
  if (!actor?.folder) return false;

  const url = characterRefreshUrl(actor.folder);
  const result = psdFile
    ? await uploadBinaryAsset({
        url,
        file: psdFile,
        headerName: 'X-Character-Filename',
        fallbackFileName: `${actor.folder}.psd`,
      })
    : await fetchJson(url);
  if (!result?.ok) return false;

  actor.player.assets = await loadCharacterAssets(actor.folder, result.updatedAt || Date.now());
  return true;
}

export async function refreshEffectAsset({ effectAssets, effectKey, file = null }) {
  const assetKey = defaultEffectImageKey(effectKey);
  if (!effectAssets || assetKey === 'none') return false;

  const url = effectRefreshUrl(assetKey);
  const result = file
    ? await uploadBinaryAsset({
        url,
        file,
        headerName: 'X-Effect-Filename',
        fallbackFileName: `${assetKey}.psd`,
      })
    : await fetchJson(url);
  if (!result?.ok) return false;

  const asset = await loadEffectAsset(assetKey, result.updatedAt || Date.now());
  if (!asset) return false;

  effectAssets[assetKey] = asset;
  return true;
}

function characterRefreshUrl(folder) {
  return `${CHARACTER_REFRESH_API_URL}?folder=${encodeURIComponent(folder)}&t=${Date.now()}`;
}

function effectRefreshUrl(assetKey) {
  return `${EFFECT_REFRESH_API_URL}?asset=${encodeURIComponent(assetKey)}&t=${Date.now()}`;
}

async function uploadBinaryAsset({ url, file, headerName, fallbackFileName }) {
  const response = await window.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      [headerName]: encodeURIComponent(file.name || fallbackFileName),
    },
    body: file,
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchJson(url) {
  const response = await window.fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}
