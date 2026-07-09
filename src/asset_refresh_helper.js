import { defaultEffectImageKey } from './animation_frame_data.js';
import { CHARACTER_ASSET_PATHS, effectAssetPath, loadCharacterAssets, loadEffectAsset } from './asset_loader_helper.js';
import { characterPsdStorageFileName } from './firebase_asset_storage_helper.js';
import { imagePartKeys } from './part_source_data.js';

const CHARACTER_REFRESH_API_URL = './api/character/refresh';
const CHARACTER_CREATE_API_URL = './api/character/create';
const CHARACTER_MOVE_API_URL = './api/character/move';
const CHARACTER_COPY_API_URL = './api/character/copy';
const CHARACTER_DELETE_API_URL = './api/character/delete';
const EFFECT_REFRESH_API_URL = './api/effect/refresh';
const EFFECT_UPLOAD_API_URL = './api/effect/upload';

export async function refreshCharacterPsdAssets({ actor, psdFile = null, createFolder = false }) {
  const result = await refreshCharacterPsdAssetResult({ actor, psdFile, createFolder });
  return result.ok;
}

export async function refreshCharacterPsdAssetResult({ actor, psdFile = null, createFolder = false }) {
  if (!actor?.folder) return { ok: false, status: 0, error: '선택된 캐릭터 폴더가 없습니다.' };

  const url = createFolder ? characterCreateUrl(actor.folder) : characterRefreshUrl(actor.folder);
  if (createFolder && psdFile) {
    const result = await uploadBinaryAssetResult({
      url,
      file: psdFile,
      headerName: 'X-Character-Filename',
      fallbackFileName: characterPsdStorageFileName(actor),
    });
    if (!result.ok) return result;

    return finalizeCharacterRefreshResult(actor, result, { syncRigToAssetSizes: true });
  }

  const result = psdFile
    ? await uploadBinaryAssetResult({
        url,
        file: psdFile,
        headerName: 'X-Character-Filename',
        fallbackFileName: characterPsdStorageFileName(actor),
      })
    : await fetchJsonResult(url);
  if (!result.ok) return result;

  return finalizeCharacterRefreshResult(actor, result, { syncRigToAssetSizes: false });
}

export async function createCharacterPsdAssets({ actor, psdFile }) {
  if (!actor?.folder || !psdFile) return { ok: false, status: 0, error: 'Missing character data' };

  const result = await uploadBinaryAssetResult({
    url: characterCreateUrl(actor.folder),
    file: psdFile,
    headerName: 'X-Character-Filename',
    fallbackFileName: characterPsdStorageFileName(actor),
  });
  if (!result.ok) return result;

  return finalizeCharacterRefreshResult(actor, result, { syncRigToAssetSizes: true });
}

export async function moveCharacterAssetFolder(fromFolder, toFolder) {
  if (!fromFolder || !toFolder || fromFolder === toFolder) return false;
  const response = await window.fetch(characterMoveUrl(fromFolder, toFolder), { method: 'POST' });
  if (response.ok) return true;

  window.console?.warn('Character folder move failed.', {
    fromFolder,
    toFolder,
    status: response.status,
    body: await responseText(response),
  });
  return false;
}

export async function copyCharacterAssetFolder(fromFolder, toFolder) {
  if (!fromFolder || !toFolder || fromFolder === toFolder) return false;
  const response = await window.fetch(characterCopyUrl(fromFolder, toFolder), { method: 'POST' });
  if (response.ok) return true;

  window.console?.warn('Character folder copy failed.', {
    fromFolder,
    toFolder,
    status: response.status,
    body: await responseText(response),
  });
  return false;
}

export async function deleteCharacterAssetFolder(folder) {
  if (!folder) return false;
  const response = await window.fetch(characterDeleteUrl(folder), { method: 'POST' });
  return response.ok;
}

async function applyCharacterRefreshResult(actor, result, { syncRigToAssetSizes = false } = {}) {
  const assets = await loadCharacterAssets(actor.folder, result.updatedAt || Date.now());
  if (actor.player) actor.player.assets = assets;
  actor.assetSources = nextCharacterPsdSources(actor.assetSources, localCharacterPsdSource(actor, result));
  if (syncRigToAssetSizes) syncCharacterRigToAssetSizes(actor.tuning?.rig, assets);
}

async function finalizeCharacterRefreshResult(actor, result, { syncRigToAssetSizes = false } = {}) {
  if (Number(result.data?.exported || 0) <= 0) {
    return {
      ...result,
      ok: false,
      error:
        'PSD에서 내보낼 파츠 레이어를 찾지 못했습니다. 레이어 이름이 body, head, cape, shield, upper_arm_l 같은 규칙과 맞는지 확인해 주세요.',
    };
  }

  try {
    await applyCharacterRefreshResult(actor, result.data, { syncRigToAssetSizes });
    return { ok: true, data: result.data };
  } catch (error) {
    return {
      ...result,
      ok: false,
      error: `PNG 갱신 후 이미지 로딩 실패: ${error?.message || error}`,
    };
  }
}

function nextCharacterPsdSources(currentSources, psdUrl) {
  const sources = { ...(currentSources || {}), psd: psdUrl };
  Object.keys(CHARACTER_ASSET_PATHS).forEach((partKey) => {
    delete sources[partKey];
  });
  return sources;
}

function localCharacterPsdSource(actor, result) {
  const filename = result?.psd || characterPsdStorageFileName(actor);
  return `./assets/characters/${actor.folder}/${filename}`;
}

export async function refreshEffectAsset({
  effectAssets,
  effectAssetSources = {},
  effectKey,
  imageKey = null,
  file = null,
}) {
  const result = await refreshEffectAssetResult({ effectAssets, effectAssetSources, effectKey, imageKey, file });
  return result.ok;
}

export async function refreshEffectAssetResult({
  effectAssets,
  effectAssetSources = {},
  effectKey,
  imageKey = null,
  file = null,
}) {
  const assetKey = imageKey || defaultEffectImageKey(effectKey);
  const url = file ? effectUploadUrl(assetKey) : effectRefreshUrl(assetKey);
  const debug = {
    effectKey,
    imageKey: assetKey,
    uploadUrl: url,
    fileName: file?.name || '',
    fileSize: Number(file?.size || 0),
  };

  if (!effectAssets) {
    return { ok: false, error: '효과 에셋 저장소가 준비되지 않았습니다.', debug };
  }
  if (assetKey === 'none') {
    return { ok: false, error: '업로드할 효과 이미지 슬롯이 없습니다.', debug };
  }

  const result = file
    ? await uploadBinaryAssetResult({
        url,
        file,
        headerName: 'X-Effect-Filename',
        fallbackFileName: `${assetKey}.psd`,
      })
    : await fetchJsonResult(url);
  debug.responseStatus = result.status || 0;
  debug.responseBody = result.data ?? result.error ?? '';
  if (!result.ok) return { ok: false, error: result.error || `효과 업로드 실패 (${result.status || 0})`, debug };

  const data = result.data;
  const asset = await loadEffectAsset(assetKey, data.updatedAt || Date.now());
  if (!asset) {
    return { ok: false, error: '업로드된 효과 이미지를 다시 불러오지 못했습니다.', debug };
  }

  effectAssets[assetKey] = asset;
  const sourcePath = effectAssetPath(assetKey);
  if (sourcePath) {
    const version = data.updatedAt || Date.now();
    effectAssetSources[assetKey] = `${sourcePath}?v=${version}`;
    if (!file || file.name?.toLowerCase().endsWith('.psd')) {
      effectAssetSources[`${assetKey}Psd`] = `${sourcePath.replace(/\.[^.]+$/, '.psd')}?v=${version}`;
    }
  }
  debug.effectAsset = effectAssetDebugInfo(effectAssets[assetKey]);
  debug.effectAssetSource = effectAssetSources[assetKey] || '';
  return { ok: true, assetKey, debug };
}

function effectAssetDebugInfo(asset) {
  if (!asset) return null;
  return {
    width: Number(asset.naturalWidth || asset.width || 0),
    height: Number(asset.naturalHeight || asset.height || 0),
    complete: Boolean(asset.complete),
    src: asset.currentSrc || asset.src || '',
  };
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

function characterCopyUrl(fromFolder, toFolder) {
  const query = new window.URLSearchParams({
    from: fromFolder,
    to: toFolder,
    t: String(Date.now()),
  });
  return `${CHARACTER_COPY_API_URL}?${query.toString()}`;
}

function characterDeleteUrl(folder) {
  return `${CHARACTER_DELETE_API_URL}?folder=${encodeURIComponent(folder)}&t=${Date.now()}`;
}

function effectRefreshUrl(assetKey) {
  return `${EFFECT_REFRESH_API_URL}?asset=${encodeURIComponent(assetKey)}&t=${Date.now()}`;
}

function effectUploadUrl(assetKey) {
  return `${EFFECT_UPLOAD_API_URL}?asset=${encodeURIComponent(assetKey)}&t=${Date.now()}`;
}

async function uploadBinaryAssetResult({ url, file, headerName, fallbackFileName }) {
  try {
    const response = await window.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        [headerName]: encodeURIComponent(file.name || fallbackFileName),
      },
      body: file,
    });
    const data = await responseJson(response);
    return {
      ok: response.ok && Boolean(data?.ok),
      status: response.status,
      data,
      error: data?.error || '',
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: `로컬 dev server 연결 실패: ${error?.message || error}`,
    };
  }
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchJsonResult(url) {
  try {
    const response = await window.fetch(url, { cache: 'no-store' });
    const data = await responseJson(response);
    return {
      ok: response.ok && Boolean(data?.ok),
      status: response.status,
      data,
      error: data?.error || '',
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: `로컬 dev server 연결 실패: ${error?.message || error}`,
    };
  }
}

async function responseText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
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
