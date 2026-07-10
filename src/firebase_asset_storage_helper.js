import { FIREBASE_PROJECT_STATE_CONFIG } from './firebase_config_data.js';
import { CHARACTER_ASSET_PATHS, EFFECT_ASSET_PATHS, effectAssetPath } from './asset_loader_helper.js';
import {
  CHARACTER_GROUPS,
  characterGroupLabel,
  characterPsdFileNameForGroup,
  legacyCharacterFolder,
  normalizeCharacterGroup,
  sanitizeCharacterAssetName,
} from './character_group_data.js';

const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0';
const CHARACTER_METADATA_FILE = 'character.json';
const CHARACTER_METADATA_INDEX_FILE = 'index.json';
const CHARACTER_GROUP_KEYS = CHARACTER_GROUPS.map((group) => group.key);

export async function uploadGameAssetsToFirebase({ actors, effectAssetSources = {} }) {
  if (!isFirebaseStorageEnabled()) return false;

  try {
    await Promise.all([
      uploadCharacterAssetsToFirebase(actors),
      uploadCharacterMetadataSetToFirebase(actors),
      uploadEffectAssetsToFirebase(effectAssetSources),
    ]);
    return true;
  } catch (error) {
    window.console?.warn('Firebase game asset upload failed.', error);
    return false;
  }
}

export async function uploadDeploymentAssetsToFirebase({
  actors,
  effectAssetSources = {},
  background = null,
  version = Date.now(),
}) {
  if (!isFirebaseStorageEnabled()) return { ok: false, error: 'Firebase Storage is not configured.' };

  try {
    const [characterAssetSourcesByActor, deployedEffectSources, deployedBackground] = await Promise.all([
      uploadCharacterDeploymentAssets(actors, version),
      uploadEffectDeploymentAssets(effectAssetSources, version),
      uploadBackgroundDeploymentAssets(background, version),
    ]);
    return {
      ok: true,
      characterAssetSourcesByActor,
      effectAssetSources: deployedEffectSources,
      background: deployedBackground,
      releaseVersion: version,
    };
  } catch (error) {
    window.console?.warn('Firebase deployment asset upload failed.', error);
    return { ok: false, error: error?.message || String(error || '') };
  }
}

export async function loadCharacterStateFromFirebaseStorage() {
  if (!isFirebaseStorageEnabled()) return null;

  try {
    const objectsPromise = listStorageObjects(objectPath('characters/'));
    const metadataIndexPromise = loadCharacterMetadataIndex();
    const objects = await objectsPromise;
    const folders = characterFoldersFromStorageObjects(objects);
    if (!folders.length) return null;

    const metadataCache = await characterMetadataCacheFromStorage(folders, metadataIndexPromise);
    const entries = folders.map((folder) => loadCharacterStorageEntry(folder, objects, metadataCache.get(folder)));
    const validEntries = entries.filter(Boolean).sort(compareCharacterEntries);
    if (!validEntries.length) return null;

    return {
      characters: validEntries.map((entry) => entry.def),
      actors: Object.fromEntries(validEntries.map((entry) => [entry.def.id, entry.actorState])),
    };
  } catch (error) {
    window.console?.warn('Firebase character storage scan failed.', error);
    return null;
  }
}

export async function uploadCharacterMetadataSetToFirebase(actors, version = Date.now()) {
  if (!isFirebaseStorageEnabled() || !Array.isArray(actors)) return false;

  try {
    const metadataSet = actors.map((actor) => characterMetadataSnapshot(actor, version));
    await Promise.all([
      ...metadataSet.map((metadata) => uploadCharacterMetadataSnapshotToFirebase(metadata, version)),
      uploadCharacterMetadataIndexToFirebase(metadataSet, version),
    ]);
    return true;
  } catch (error) {
    window.console?.warn('Firebase character metadata upload failed.', error);
    return false;
  }
}

export async function uploadCharacterMetadataToFirebase(actor, version = Date.now()) {
  if (!isFirebaseStorageEnabled() || !actor?.folder) return false;
  const metadata = characterMetadataSnapshot(actor, version);
  await uploadCharacterMetadataSnapshotToFirebase(metadata, version);
  return true;
}

async function uploadCharacterMetadataSnapshotToFirebase(metadata, version) {
  const blob = new window.Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  await uploadBlob(blob, characterMetadataStoragePath(metadata), version, 'application/json');
  return true;
}

async function uploadCharacterMetadataIndexToFirebase(metadataSet, version) {
  const index = {
    version: 1,
    updatedAt: version,
    characters: metadataSet,
  };
  const blob = new window.Blob([JSON.stringify(index, null, 2)], { type: 'application/json' });
  await uploadBlob(blob, characterMetadataIndexStoragePath(), version, 'application/json');
  return true;
}

async function uploadCharacterAssetsToFirebase(actors) {
  await Promise.all(
    actors.map(async (actor) => {
      const version = Date.now();
      const sources = { ...(actor.assetSources || {}) };
      const entries = await Promise.all(
        Object.entries(CHARACTER_ASSET_PATHS).map(async ([partKey, filename]) => {
          const localUrl = `./assets/characters/${actor.folder}/${filename}`;
          const url = await uploadFirstAvailableAsset(
            [sources[partKey], localUrl],
            characterPngStoragePath(actor, filename),
            version
          );
          if (!url) throw new Error(`Character asset upload failed: ${actor.folder}/${filename}`);
          return [partKey, url];
        })
      );
      actor.assetSources = {
        ...sources,
        ...Object.fromEntries(entries),
      };
    })
  );
}

async function uploadCharacterDeploymentAssets(actors, version) {
  const entries = await Promise.all(
    (actors || []).map(async (actor) => {
      const sources = { ...(actor.assetSources || {}) };
      const uploaded = await Promise.all(
        Object.entries(CHARACTER_ASSET_PATHS).map(async ([partKey, filename]) => {
          const localUrl = `./assets/characters/${actor.folder}/${filename}`;
          const url = await uploadFirstAvailableAsset(
            [localUrl, sources[partKey]],
            characterPngStoragePath(actor, filename),
            version
          );
          if (!url) throw new Error(`Character asset upload failed: ${actor.folder}/${filename}`);
          return [partKey, url];
        })
      );
      return [actor.id, Object.fromEntries(uploaded)];
    })
  );
  return Object.fromEntries(entries);
}

export async function uploadCharacterPsdFileToFirebase(actor, file, version = Date.now()) {
  if (actor || file || version) {
    window.console?.warn('Firebase PSD upload is disabled. PSD files are local authoring assets only.');
  }
  return null;
}

export async function moveCharacterPsdFileInFirebase(actor, nextStorageFolder, version = Date.now()) {
  return transferCharacterAssetsInFirebase(actor, nextStorageFolder, { deletePrevious: true, version });
}

export async function copyCharacterAssetsInFirebase(actor, nextStorageFolder, version = Date.now()) {
  return transferCharacterAssetsInFirebase(actor, nextStorageFolder, { deletePrevious: false, version });
}

async function transferCharacterAssetsInFirebase(actor, nextStorageFolder, { deletePrevious, version }) {
  if (!isFirebaseStorageEnabled() || !actor || !nextStorageFolder) return null;
  const nextActor = { ...actor, storageFolder: nextStorageFolder, folder: nextStorageFolder };

  try {
    const movedSources = {};

    const partEntries = await Promise.all(
      Object.entries(CHARACTER_ASSET_PATHS).map(async ([partKey, filename]) => {
        const url = await moveStorageObject({
          sourceUrl: actor.assetSources?.[partKey],
          previousPath: characterPngStoragePath(actor, filename),
          nextPath: characterPngStoragePath(nextActor, filename),
          version,
          contentType: 'image/png',
          deletePrevious,
        });
        return url ? [partKey, url] : null;
      })
    );
    Object.assign(movedSources, Object.fromEntries(partEntries.filter(Boolean)));
    if (deletePrevious) await deleteStorageObject(characterMetadataStoragePath(actor));
    return movedSources;
  } catch (error) {
    window.console?.warn('Firebase character asset transfer failed.', error);
    return null;
  }
}

export async function deleteCharacterPsdFileFromFirebase(actor) {
  if (!isFirebaseStorageEnabled() || !actor) return true;
  try {
    const deleted = await Promise.all([
      deleteStorageObject(characterMetadataStoragePath(actor)),
      deleteStorageObject(characterPsdStoragePath(actor)),
      ...Object.values(CHARACTER_ASSET_PATHS).map((filename) =>
        deleteStorageObject(characterPngStoragePath(actor, filename))
      ),
    ]);
    return deleted.every(Boolean);
  } catch (error) {
    window.console?.warn('Firebase character asset delete failed.', error);
    return false;
  }
}

export function characterPsdStorageUrl(actor, version = Date.now()) {
  return downloadUrl(characterPsdStoragePath(actor), version);
}

export function characterPsdStorageFileName(actor) {
  if (actor?.psdFileName) return sanitizePathPart(actor.psdFileName);
  return characterStorageFolder(actor).startsWith('players/') ? 'player.psd' : 'enemy.psd';
}

async function uploadEffectAssetsToFirebase(effectAssetSources) {
  await Promise.all(
    effectAssetKeys(effectAssetSources).map((assetKey) => uploadEffectAssetToFirebase(effectAssetSources, assetKey))
  );
}

async function uploadEffectDeploymentAssets(effectAssetSources = {}, version) {
  const nextSources = { ...(effectAssetSources || {}) };
  const results = await Promise.all(
    effectAssetKeys(nextSources).map(async (assetKey) => {
      const path = effectAssetPath(assetKey);
      if (!path) return null;
      const url = await uploadFirstAvailableAsset(
        [nextSources[assetKey], path],
        objectPath(`effects/${assetKey}${extensionFromUrl(path)}`),
        version
      );
      return url ? [assetKey, url] : null;
    })
  );
  results.filter(Boolean).forEach(([assetKey, url]) => {
    nextSources[assetKey] = url;
    delete nextSources[`${assetKey}Psd`];
  });
  return nextSources;
}

export async function uploadEffectAssetToFirebase(effectAssetSources, assetKey, version = Date.now()) {
  if (!isFirebaseStorageEnabled()) return false;

  const path = effectAssetPath(assetKey);
  if (!path) return false;

  try {
    const url = await uploadFirstAvailableAsset(
      [effectAssetSources[assetKey], path],
      objectPath(`effects/${assetKey}${extensionFromUrl(path)}`),
      version
    );
    if (!url) throw new Error(`Effect asset upload failed: ${assetKey}`);

    Object.assign(effectAssetSources, {
      [assetKey]: url,
    });
    delete effectAssetSources[`${assetKey}Psd`];
    return true;
  } catch (error) {
    window.console?.warn(`Firebase effect asset upload failed: ${assetKey}`, error);
    return false;
  }
}

function effectAssetKeys(effectAssetSources = {}) {
  return Array.from(
    new Set([
      ...Object.keys(EFFECT_ASSET_PATHS),
      ...Object.keys(effectAssetSources).filter((key) => !key.endsWith('Psd')),
    ])
  );
}

export async function uploadScenePsdAssetsToFirebase(background) {
  if (!isFirebaseStorageEnabled() || !background) return false;

  const version = background.psdPreview?.updatedAt || Date.now();
  const uploadTasks = [];
  if (isLocalRuntimeAsset(background.psdPreview?.url)) {
    uploadTasks.push(
      uploadAsset(
        background.psdPreview.url,
        objectPath(`backgrounds/preview${extensionFromUrl(background.psdPreview.url)}`),
        version
      ).then((url) => {
        background.psdPreview.url = url;
      })
    );
  }

  if (Array.isArray(background.psdLayers)) {
    background.psdLayers.forEach((layer) => {
      if (!isLocalRuntimeAsset(layer?.imageSrc)) return;
      const extension = extensionFromUrl(layer.imageSrc);
      uploadTasks.push(
        uploadAsset(
          layer.imageSrc,
          objectPath(`backgrounds/layers/${sanitizePathPart(layer.id || layer.name)}${extension}`),
          version
        ).then((url) => {
          layer.imageSrc = url;
        })
      );
    });
  }

  if (!uploadTasks.length) return true;

  try {
    await Promise.all(uploadTasks);
    return true;
  } catch (error) {
    window.console?.warn('Firebase scene asset upload failed.', error);
    return false;
  }
}

async function uploadBackgroundDeploymentAssets(background, version) {
  if (!background) return background;

  const deployed = structuredCloneSafe(background);
  const previewUrl = deployed.psdPreview?.url;
  if (previewUrl) {
    const extension = extensionFromUrl(previewUrl);
    const uploadedPreviewUrl = await uploadFirstAvailableAsset(
      [previewUrl],
      objectPath(`backgrounds/current/background-preview${extension}`),
      version
    );
    if (!uploadedPreviewUrl) throw new Error(`Background preview upload failed: ${previewUrl}`);
    deployed.psdPreview = {
      ...(deployed.psdPreview || {}),
      url: uploadedPreviewUrl,
    };
    delete deployed.psdPreview.sourceUrl;
  }

  if (Array.isArray(deployed.psdLayers)) {
    const layers = await Promise.all(
      deployed.psdLayers.map(async (layer, index) => {
        if (!layer?.imageSrc) return layer;
        const extension = extensionFromUrl(layer.imageSrc);
        const layerId = sanitizePathPart(layer.id || layer.name || `layer_${index + 1}`);
        const uploadedLayerUrl = await uploadFirstAvailableAsset(
          [layer.imageSrc],
          objectPath(`backgrounds/current/layers/${layerId}${extension}`),
          version
        );
        if (!uploadedLayerUrl) throw new Error(`Background layer upload failed: ${layer.imageSrc}`);
        return {
          ...layer,
          imageSrc: uploadedLayerUrl,
        };
      })
    );
    deployed.psdLayers = layers;
  }

  return deployed;
}

function isFirebaseStorageEnabled() {
  return Boolean(
    FIREBASE_PROJECT_STATE_CONFIG.enabled &&
    FIREBASE_PROJECT_STATE_CONFIG.storageBucket.trim() &&
    FIREBASE_PROJECT_STATE_CONFIG.storagePath.trim()
  );
}

async function uploadAsset(sourceUrl, path, version) {
  const response = await window.fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Asset not found: ${sourceUrl}`);

  const blob = await response.blob();
  return uploadBlob(blob, path, version, blob.type || contentTypeFromPath(path));
}

async function moveStorageObject({ sourceUrl, previousPath, nextPath, version, contentType, deletePrevious = true }) {
  const url = sourceUrl || downloadUrl(previousPath, version);
  const response = await window.fetch(`${url}${url.includes('?') ? '&' : '?'}t=${version}`, { cache: 'no-store' });
  if (!response.ok) return null;

  const blob = await response.blob();
  const nextUrl = await uploadBlob(blob, nextPath, version, blob.type || contentType);
  if (deletePrevious) await deleteStorageObject(previousPath);
  return nextUrl;
}

async function uploadBlob(blob, path, version, contentType) {
  const uploadResponse = await window.fetch(uploadUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': contentType || contentTypeFromPath(path) },
    body: blob,
  });

  if (!uploadResponse.ok) {
    const message = await responseText(uploadResponse);
    throw new Error(`Firebase Storage upload failed: ${path} (${uploadResponse.status}) ${message}`);
  }
  return downloadUrl(path, version);
}

async function uploadAssetUnlessRemote(sourceUrl, path, version) {
  if (isCurrentFirebaseStorageAsset(sourceUrl)) return sourceUrl;
  return uploadAsset(sourceUrl, path, version);
}

async function uploadFirstAvailableAsset(sourceUrls, pathForSource, version) {
  const candidates = [...new Set(sourceUrls.filter((sourceUrl) => typeof sourceUrl === 'string' && sourceUrl.trim()))];
  for (const sourceUrl of candidates) {
    try {
      const path = typeof pathForSource === 'function' ? pathForSource(sourceUrl) : pathForSource;
      return await uploadAssetUnlessRemote(sourceUrl, path, version);
    } catch (error) {
      window.console?.warn(`Firebase asset source skipped: ${sourceUrl}`, error);
    }
  }
  return null;
}

async function responseText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function characterMetadataSnapshot(actor, version) {
  const group = normalizeCharacterGroup(actor.group || characterStorageFolder(actor).split('/')[0]);
  const folder = characterStorageFolder(actor);
  const id = sanitizeCharacterAssetName(actor.id || folder.split('/').at(-1));
  return {
    version: 1,
    id,
    type: actor.type || (group === 'players' ? 'player' : 'enemy'),
    label: actor.label || actor.name || characterGroupLabel(group),
    name: actor.name || actor.label || id,
    x: Number.isFinite(Number(actor.x)) ? Number(actor.x) : 480,
    folder,
    storageFolder: folder,
    group,
    deleted: Boolean(actor.deleted),
    psdFileName: characterPsdStorageFileName(actor),
    tint: actor.tint || '#7cc3a2',
    tuning: actor.tuning || null,
    assets: characterMetadataAssetSources(actor.assetSources),
    updatedAt: version,
  };
}

function loadCharacterStorageEntry(folder, objects, metadata = null) {
  const objectMap = objectsByFolder(objects, folder);
  const group = normalizeCharacterGroup(metadata?.group || folder.split('/')[0]);
  const id = sanitizeCharacterAssetName(metadata?.id || folder.split('/').at(-1));
  const psdFileName = metadata?.psdFileName || firstPsdFileName(objectMap) || characterPsdFileNameForGroup(group);
  const assets = characterPsdSourceFromObjects(objectMap, psdFileName);
  const def = {
    id,
    type: metadata?.type || (group === 'players' ? 'player' : 'enemy'),
    label: metadata?.label || metadata?.name || characterGroupLabel(group),
    name: metadata?.name || metadata?.label || characterGroupLabel(group),
    x: Number.isFinite(Number(metadata?.x)) ? Number(metadata.x) : defaultCharacterX(group),
    folder,
    storageFolder: folder,
    group,
    deleted: Boolean(metadata?.deleted),
    psdFileName,
    tint: metadata?.tint || defaultCharacterTint(group),
    deletable: id !== 'player' && id !== 'player_01',
  };
  return {
    def,
    actorState: {
      name: def.name,
      tuning: metadata?.tuning || null,
      assets: {
        ...characterMetadataAssetSources(metadata?.assets),
        ...assets,
      },
    },
  };
}

function characterFoldersFromStorageObjects(objects) {
  const base = objectPath('characters/');
  const folders = new Set();
  objects.forEach((item) => {
    const name = item?.name || '';
    if (!name.startsWith(base)) return;
    const relative = name.slice(base.length);
    const [group, characterId, filename] = relative.split('/');
    if (!CHARACTER_GROUP_KEYS.includes(group) || !characterId || !filename) return;
    folders.add(`${group}/${characterId}`);
  });
  return [...folders];
}

async function characterMetadataCacheFromStorage(folders, metadataIndexPromise) {
  const index = await metadataIndexPromise;
  const cache = characterMetadataCacheFromIndex(index);
  const missingFolders = folders.filter((folder) => !cache.has(folder));
  if (!missingFolders.length) return cache;

  const metadataEntries = await Promise.all(missingFolders.map((folder) => loadCharacterMetadata(folder)));
  metadataEntries.filter(Boolean).forEach((metadata) => {
    cache.set(characterStorageFolder(metadata), metadata);
  });
  return cache;
}

async function loadCharacterMetadataIndex() {
  try {
    const response = await window.fetch(downloadUrl(characterMetadataIndexStoragePath(), Date.now()), {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const json = await response.json();
    return json && typeof json === 'object' ? json : null;
  } catch {
    return null;
  }
}

async function loadCharacterMetadata(folder) {
  try {
    const response = await window.fetch(
      downloadUrl(objectPath(`characters/${folder}/${CHARACTER_METADATA_FILE}`), Date.now()),
      {
        cache: 'no-store',
      }
    );
    if (!response.ok) return null;
    const json = await response.json();
    return json && typeof json === 'object' ? json : null;
  } catch {
    return null;
  }
}

function characterMetadataCacheFromIndex(index) {
  const cache = new Map();
  if (!Array.isArray(index?.characters)) return cache;

  index.characters.forEach((def) => {
    const folder = characterStorageFolder(def);
    cache.set(folder, {
      ...def,
      folder,
      storageFolder: folder,
    });
  });
  return cache;
}

function objectsByFolder(objects, folder) {
  const prefix = objectPath(`characters/${folder}/`);
  return objects.filter((item) => item?.name?.startsWith(prefix));
}

function characterPsdSourceFromObjects(objects, psdFileName) {
  const byFile = new Map(objects.map((item) => [item.name.split('/').at(-1), item.name]));
  const psdPath = byFile.get(psdFileName) || [...byFile.entries()].find(([filename]) => filename.endsWith('.psd'))?.[1];
  return psdPath ? { psd: downloadUrl(psdPath, Date.now()) } : {};
}

function characterMetadataAssetSources() {
  return {};
}

function firstPsdFileName(objects) {
  return objects.map((item) => item.name.split('/').at(-1)).find((filename) => filename.endsWith('.psd')) || '';
}

function defaultCharacterX(group) {
  if (group === 'players') return 480;
  if (group === 'bosses') return 760;
  return 260;
}

function defaultCharacterTint(group) {
  if (group === 'players') return '#7cc3a2';
  if (group === 'bosses') return '#9a8df0';
  return '#ef767a';
}

function compareCharacterEntries(left, right) {
  const leftGroup = CHARACTER_GROUP_KEYS.indexOf(left.def.group);
  const rightGroup = CHARACTER_GROUP_KEYS.indexOf(right.def.group);
  if (leftGroup !== rightGroup) return leftGroup - rightGroup;
  return left.def.id.localeCompare(right.def.id);
}

function characterStorageFolder(actor) {
  if (actor?.storageFolder) return sanitizeStoragePath(actor.storageFolder);
  const folder = actor?.folder || actor?.id || '';
  if (folder === 'player') return 'players/player_01';
  if (folder === 'enemy' || /^enemy\d*$/.test(folder)) return 'mobs/enemy_01';
  return legacyCharacterFolder(sanitizeStoragePath(folder || 'character'));
}

function characterPngStoragePath(actor, filename) {
  return objectPath(`characters/${characterStorageFolder(actor)}/${filename}`);
}

function characterPsdStoragePath(actor) {
  return objectPath(`characters/${characterStorageFolder(actor)}/${characterPsdStorageFileName(actor)}`);
}

function characterMetadataStoragePath(actor) {
  return objectPath(`characters/${characterStorageFolder(actor)}/${CHARACTER_METADATA_FILE}`);
}

function characterMetadataIndexStoragePath() {
  return objectPath(`characters/${CHARACTER_METADATA_INDEX_FILE}`);
}

async function listStorageObjects(prefix) {
  const query = new window.URLSearchParams({ prefix });
  if (FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim()) query.set('key', FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim());
  const response = await window.fetch(`${storageBucketUrl()}/o?${query.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Firebase Storage list failed: ${response.status} ${await responseText(response)}`);
  const payload = await response.json();
  return Array.isArray(payload.items) ? payload.items : [];
}

function uploadUrl(path) {
  const query = new window.URLSearchParams({
    uploadType: 'media',
    name: path,
  });
  if (FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim()) query.set('key', FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim());
  return `${storageBucketUrl()}/o?${query.toString()}`;
}

function downloadUrl(path, version) {
  const query = new window.URLSearchParams({
    alt: 'media',
    v: String(version),
  });
  return `${storageBucketUrl()}/o/${encodeURIComponent(path)}?${query.toString()}`;
}

async function deleteStorageObject(path) {
  const query = new window.URLSearchParams();
  if (FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim()) query.set('key', FIREBASE_PROJECT_STATE_CONFIG.apiKey.trim());
  const url = `${storageBucketUrl()}/o/${encodeURIComponent(path)}${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await window.fetch(url, { method: 'DELETE' });
  return response.ok || response.status === 404;
}

function storageBucketUrl() {
  return `${FIREBASE_STORAGE_BASE_URL}/b/${encodeURIComponent(FIREBASE_PROJECT_STATE_CONFIG.storageBucket.trim())}`;
}

function objectPath(path) {
  return `${FIREBASE_PROJECT_STATE_CONFIG.storagePath.trim().replace(/^\/+|\/+$/g, '')}/${path}`;
}

function isLocalRuntimeAsset(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const resolved = new window.URL(url, window.location.href);
    return resolved.origin === window.location.origin && resolved.pathname.includes('/runtime/');
  } catch {
    return false;
  }
}

function isFirebaseStorageAsset(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    return new window.URL(url, window.location.href).hostname === 'firebasestorage.googleapis.com';
  } catch {
    return false;
  }
}

function isCurrentFirebaseStorageAsset(url) {
  if (!isFirebaseStorageAsset(url)) return false;
  const path = firebaseStorageObjectPath(url);
  if (!path) return false;
  const basePath = FIREBASE_PROJECT_STATE_CONFIG.storagePath.trim().replace(/^\/+|\/+$/g, '');
  return path === basePath || path.startsWith(`${basePath}/`);
}

function firebaseStorageObjectPath(url) {
  try {
    const parsed = new window.URL(url, window.location.href);
    const marker = '/o/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex < 0) return '';
    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return '';
  }
}

function extensionFromUrl(url) {
  const pathname = new window.URL(url, window.location.href).pathname.toLowerCase();
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg';
  if (pathname.endsWith('.webp')) return '.webp';
  return '.png';
}

function contentTypeFromPath(path) {
  if (path.endsWith('.psd')) return 'image/vnd.adobe.photoshop';
  if (path.endsWith('.jpg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function sanitizePathPart(value) {
  const sanitized = String(value || 'layer')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return sanitized || 'layer';
}

function sanitizeStoragePath(value) {
  const parts = String(value || 'character')
    .split('/')
    .map((part) => sanitizePathPart(part))
    .filter(Boolean);
  return parts.length ? parts.join('/') : 'character';
}

function structuredCloneSafe(value) {
  if (typeof window.structuredClone === 'function') return window.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
