import { FIREBASE_PROJECT_STATE_CONFIG } from './firebaseConfig.js';
import { CHARACTER_ASSET_PATHS, EFFECT_ASSET_PATHS } from './asset_loader_helper.js';

const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0';

export async function uploadGameAssetsToFirebase({ actors, effectAssetSources = {} }) {
  if (!isFirebaseStorageEnabled()) return false;

  try {
    await Promise.all([uploadCharacterAssetsToFirebase(actors), uploadEffectAssetsToFirebase(effectAssetSources)]);
    return true;
  } catch (error) {
    window.console?.warn('Firebase game asset upload failed.', error);
    return false;
  }
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
      const psdUrl = await uploadFirstAvailableAsset(
        characterPsdSourceCandidates(actor, sources),
        () => characterPsdStoragePath(actor),
        version
      );
      actor.assetSources = {
        ...sources,
        ...Object.fromEntries(entries),
        ...(psdUrl ? { psd: psdUrl } : {}),
      };
    })
  );
}

export async function uploadCharacterPsdFileToFirebase(actor, file, version = Date.now()) {
  if (!isFirebaseStorageEnabled() || !actor || !file) return null;
  try {
    return await uploadBlob(file, characterPsdStoragePath(actor), version, file.type || 'image/vnd.adobe.photoshop');
  } catch (error) {
    window.console?.warn('Firebase character PSD upload failed.', error);
    return null;
  }
}

export async function moveCharacterPsdFileInFirebase(actor, nextStorageFolder, version = Date.now()) {
  if (!isFirebaseStorageEnabled() || !actor || !nextStorageFolder) return null;
  const previousPath = characterPsdStoragePath(actor);
  const nextActor = { ...actor, storageFolder: nextStorageFolder, folder: nextStorageFolder };
  const nextPath = characterPsdStoragePath(nextActor);

  try {
    const sourceUrl = actor.assetSources?.psd || downloadUrl(previousPath, version);
    const response = await window.fetch(`${sourceUrl}${sourceUrl.includes('?') ? '&' : '?'}t=${version}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const blob = await response.blob();
    const nextUrl = await uploadBlob(blob, nextPath, version, blob.type || 'image/vnd.adobe.photoshop');
    await deleteStorageObject(previousPath);
    return nextUrl;
  } catch (error) {
    window.console?.warn('Firebase character PSD move failed.', error);
    return null;
  }
}

export async function deleteCharacterPsdFileFromFirebase(actor) {
  if (!isFirebaseStorageEnabled() || !actor) return true;
  try {
    return await deleteStorageObject(characterPsdStoragePath(actor));
  } catch (error) {
    window.console?.warn('Firebase character PSD delete failed.', error);
    return false;
  }
}

export function characterPsdStorageUrl(actor, version = Date.now()) {
  return downloadUrl(characterPsdStoragePath(actor), version);
}

export function characterPsdStorageFileName(actor) {
  if (actor?.psdFileName) return sanitizePathPart(actor.psdFileName);
  return characterStorageFolder(actor) === 'player' ? 'player.psd' : 'enemy.psd';
}

async function uploadEffectAssetsToFirebase(effectAssetSources) {
  await Promise.all(
    Object.keys(EFFECT_ASSET_PATHS).map((assetKey) => uploadEffectAssetToFirebase(effectAssetSources, assetKey))
  );
}

export async function uploadEffectAssetToFirebase(effectAssetSources, assetKey, version = Date.now()) {
  if (!isFirebaseStorageEnabled()) return false;

  const path = EFFECT_ASSET_PATHS[assetKey];
  if (!path) return false;

  try {
    const url = await uploadFirstAvailableAsset(
      [effectAssetSources[assetKey], path],
      objectPath(`effects/${assetKey}${extensionFromUrl(path)}`),
      version
    );
    if (!url) throw new Error(`Effect asset upload failed: ${assetKey}`);

    const sourceKey = `${assetKey}Psd`;
    const psdUrl = await uploadFirstAvailableAsset(
      [effectAssetSources[sourceKey], path.replace(/\.[^.]+$/, '.psd')],
      () => objectPath(`effects/${assetKey}.psd`),
      version
    );

    Object.assign(effectAssetSources, {
      [assetKey]: url,
      ...(psdUrl ? { [sourceKey]: psdUrl } : {}),
    });
    return true;
  } catch (error) {
    window.console?.warn(`Firebase effect asset upload failed: ${assetKey}`, error);
    return false;
  }
}

export async function uploadScenePsdAssetsToFirebase(background) {
  if (!isFirebaseStorageEnabled() || !background) return false;

  const version = background.psdPreview?.updatedAt || Date.now();
  const uploadTasks = [];
  const sourceUrl = background.psdPreview?.sourceUrl || './assets/backgrounds/background_01.psd';

  uploadTasks.push(
    uploadFirstAvailableAsset([sourceUrl], () => objectPath('backgrounds/source.psd'), version).then((url) => {
      if (!url) return;
      background.psdPreview = {
        ...(background.psdPreview || {}),
        sourceUrl: url,
      };
    })
  );

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

function characterPsdSourceCandidates(actor, sources) {
  const folder = actor.folder || actor.id;
  return [
    sources.psd,
    `./assets/characters/${folder}/${folder}.psd`,
    `./assets/characters/${folder}/${actor.id}.psd`,
    `./assets/characters/${folder}/player.psd`,
    `./assets/characters/${folder}/enemy.psd`,
  ];
}

function characterStorageFolder(actor) {
  if (actor?.storageFolder) return sanitizeStoragePath(actor.storageFolder);
  const folder = actor?.folder || actor?.id || '';
  if (folder === 'player') return 'player';
  if (folder.startsWith('enemy')) return 'enemy';
  return sanitizeStoragePath(folder || 'character');
}

function characterPngStoragePath(actor, filename) {
  return objectPath(`characters/${characterStorageFolder(actor)}/${filename}`);
}

function characterPsdStoragePath(actor) {
  return objectPath(`characters/${characterStorageFolder(actor)}/${characterPsdStorageFileName(actor)}`);
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
