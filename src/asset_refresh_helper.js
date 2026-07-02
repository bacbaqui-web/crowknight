import { defaultEffectImageKey } from './animation_frame_data.js';
import {
  CHARACTER_ASSET_PATHS,
  EFFECT_ASSET_PATHS,
  loadCharacterAssets,
  loadEffectAsset,
} from './asset_loader_helper.js';
import {
  characterPsdStorageFileName,
  characterPsdStorageUrl,
  uploadCharacterPsdFileToFirebase,
} from './firebase_asset_storage.js';
import { imagePartKeys } from './part_source_registry.js';

const CHARACTER_REFRESH_API_URL = './api/character/refresh';
const CHARACTER_CREATE_API_URL = './api/character/create';
const CHARACTER_MOVE_API_URL = './api/character/move';
const CHARACTER_DELETE_API_URL = './api/character/delete';
const EFFECT_REFRESH_API_URL = './api/effect/refresh';

export async function refreshCharacterPsdAssets({ actor, psdFile = null, createFolder = false }) {
  if (!actor?.folder) return false;

  const url = createFolder ? characterCreateUrl(actor.folder) : characterRefreshUrl(actor.folder);
  if (createFolder && psdFile) {
    const result = await uploadBinaryAsset({
      url,
      file: psdFile,
      headerName: 'X-Character-Filename',
      fallbackFileName: characterPsdStorageFileName(actor),
    });
    if (!result?.ok) return false;

    const storageUrl = await uploadCharacterPsdFileToFirebase(actor, psdFile);
    if (!storageUrl) return false;

    await applyCharacterRefreshResult(actor, result, storageUrl);
    return true;
  }

  const storageUrl = psdFile ? await uploadCharacterPsdFileToFirebase(actor, psdFile) : characterPsdStorageUrl(actor);
  if (!storageUrl) return false;

  const sourceFile = psdFile || (await fetchStoragePsdFile(storageUrl, characterPsdStorageFileName(actor)));
  if (!sourceFile) return false;

  const result = await uploadBinaryAsset({
    url,
    file: sourceFile,
    headerName: 'X-Character-Filename',
    fallbackFileName: characterPsdStorageFileName(actor),
  });
  if (!result?.ok) return false;

  await applyCharacterRefreshResult(actor, result, storageUrl);
  return true;
}

export async function moveCharacterAssetFolder(fromFolder, toFolder) {
  if (!fromFolder || !toFolder || fromFolder === toFolder) return false;
  const response = await window.fetch(characterMoveUrl(fromFolder, toFolder), { method: 'POST' });
  return response.ok;
}

export async function deleteCharacterAssetFolder(folder) {
  if (!folder) return false;
  const response = await window.fetch(characterDeleteUrl(folder), { method: 'POST' });
  return response.ok;
}

async function applyCharacterRefreshResult(actor, result, storageUrl) {
  const assets = await loadCharacterAssets(actor.folder, result.updatedAt || Date.now());
  if (actor.player) actor.player.assets = assets;
  actor.assetSources = nextCharacterPsdSources(actor.assetSources, storageUrl);
  syncCharacterRigToAssetSizes(actor.tuning?.rig, assets);
}

function nextCharacterPsdSources(currentSources, psdUrl) {
  const sources = { ...(currentSources || {}), psd: psdUrl };
  Object.keys(CHARACTER_ASSET_PATHS).forEach((partKey) => {
    delete sources[partKey];
  });
  return sources;
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

function characterCreateUrl(folder) {
  return `${CHARACTER_CREATE_API_URL}?folder=${encodeURIComponent(folder)}&t=${Date.now()}`;
}

function characterMoveUrl(fromFolder, toFolder) {
  const query = new window.URLSearchParams({
    from: fromFolder,
    to: toFolder,
    t: String(Date.now()),
  });
  return `${CHARACTER_MOVE_API_URL}?${query.toString()}`;
}

function characterDeleteUrl(folder) {
  return `${CHARACTER_DELETE_API_URL}?folder=${encodeURIComponent(folder)}&t=${Date.now()}`;
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

async function fetchStoragePsdFile(url, filename) {
  const response = await window.fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) return null;

  const blob = await response.blob();
  if (typeof window.File === 'function') {
    return new window.File([blob], filename, { type: blob.type || 'image/vnd.adobe.photoshop' });
  }

  Object.defineProperty(blob, 'name', { value: filename });
  return blob;
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
