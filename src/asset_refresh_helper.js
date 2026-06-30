import { defaultEffectImageKey } from './animation_frame_data.js';
import { EFFECT_ASSET_PATHS, loadCharacterAssets, loadEffectAsset } from './asset_loader_helper.js';
import { imagePartKeys } from './part_source_registry.js';

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
  actor.assetSources = {
    psd: `./assets/characters/${actor.folder}/${result.psd}?v=${result.updatedAt || Date.now()}`,
  };
  syncCharacterRigToAssetSizes(actor.tuning.rig, actor.player.assets);
  return true;
}

export async function refreshEffectAsset({ effectAssets, effectAssetSources = {}, effectKey, file = null }) {
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
  const sourcePath = EFFECT_ASSET_PATHS[assetKey];
  if (sourcePath) {
    const version = result.updatedAt || Date.now();
    effectAssetSources[assetKey] = `${sourcePath}?v=${version}`;
    if (!file || file.name?.toLowerCase().endsWith('.psd')) {
      effectAssetSources[`${assetKey}Psd`] = `${sourcePath.replace(/\.[^.]+$/, '.psd')}?v=${version}`;
    }
  }
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

function syncCharacterRigToAssetSizes(rig, assets) {
  imagePartKeys().forEach((partKey) => {
    const part = rig?.[partKey];
    const image = assets?.[partKey];
    if (!part || !image) return;

    const width = Number(image.naturalWidth || image.width || 0);
    const height = Number(image.naturalHeight || image.height || 0);
    if (width <= 0 || height <= 0) return;

    const previousBaseW = Math.max(1, Number(part.baseW || part.w || width));
    const previousBaseH = Math.max(1, Number(part.baseH || part.h || height));
    const scaleX = width / previousBaseW;
    const scaleY = height / previousBaseH;

    part.ax = Number(part.ax ?? previousBaseW / 2) * scaleX;
    part.ay = Number(part.ay ?? previousBaseH / 2) * scaleY;
    if ('ox' in part) part.ox = Number(part.ox || 0) * scaleX;
    if ('oy' in part) part.oy = Number(part.oy || 0) * scaleY;
    part.w = width;
    part.h = height;
    part.baseW = width;
    part.baseH = height;
  });
}
