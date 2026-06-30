import { FIREBASE_PROJECT_STATE_CONFIG } from './firebaseConfig.js';
import { CHARACTER_ASSET_PATHS, EFFECT_ASSET_PATHS } from './asset_loader_helper.js';

const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0';

export async function uploadGameAssetsToFirebase({ actors, effectAssetSources = {} }) {
  if (!isFirebaseStorageEnabled()) return false;

  try {
    await Promise.all([uploadCharacterAssetsToFirebase(actors), uploadEffectAssetsToFirebase(effectAssetSources)]);
    return true;
  } catch {
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
          const sourceUrl = sources[partKey] || `./assets/characters/${actor.folder}/${filename}`;
          const url = await uploadAssetUnlessRemote(
            sourceUrl,
            objectPath(`characters/${sanitizePathPart(actor.folder || actor.id)}/${filename}`),
            version
          );
          return [partKey, url];
        })
      );
      const psdUrl = await uploadFirstAvailableAsset(
        characterPsdSourceCandidates(actor, sources),
        (sourceUrl) =>
          objectPath(
            `characters/${sanitizePathPart(actor.folder || actor.id)}/${sanitizeFileName(
              filenameFromUrl(sourceUrl) || `${actor.folder || actor.id}.psd`
            )}`
          ),
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

async function uploadEffectAssetsToFirebase(effectAssetSources) {
  const version = Date.now();
  const entries = await Promise.all(
    Object.entries(EFFECT_ASSET_PATHS).map(async ([assetKey, path]) => {
      const sourceUrl = effectAssetSources[assetKey] || path;
      const url = await uploadAssetUnlessRemote(
        sourceUrl,
        objectPath(`effects/${assetKey}${extensionFromUrl(path)}`),
        version
      );
      return [assetKey, url];
    })
  );
  const psdEntries = await Promise.all(
    Object.entries(EFFECT_ASSET_PATHS).map(async ([assetKey, path]) => {
      const sourceKey = `${assetKey}Psd`;
      const url = await uploadFirstAvailableAsset(
        [effectAssetSources[sourceKey], path.replace(/\.[^.]+$/, '.psd')],
        () => objectPath(`effects/${assetKey}.psd`),
        version
      );
      return url ? [sourceKey, url] : null;
    })
  );
  Object.assign(effectAssetSources, Object.fromEntries([...entries, ...psdEntries.filter(Boolean)]));
}

export async function uploadScenePsdAssetsToFirebase(background) {
  if (!isFirebaseStorageEnabled() || !background) return false;

  const version = background.psdPreview?.updatedAt || Date.now();
  const uploadTasks = [];
  const sourceUrl = background.psdPreview?.sourceUrl || './assets/backgrounds/background_01.psd';

  uploadTasks.push(
    uploadFirstAvailableAsset([sourceUrl], () => objectPath('psd/source.psd'), version).then((url) => {
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
        objectPath(`psd/preview${extensionFromUrl(background.psdPreview.url)}`),
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
          objectPath(`psd/layers/${sanitizePathPart(layer.id || layer.name)}${extension}`),
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
  } catch {
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
  const uploadResponse = await window.fetch(uploadUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': blob.type || contentTypeFromPath(path) },
    body: blob,
  });

  if (!uploadResponse.ok) throw new Error(`Firebase Storage upload failed: ${path}`);
  return downloadUrl(path, version);
}

async function uploadAssetUnlessRemote(sourceUrl, path, version) {
  if (isFirebaseStorageAsset(sourceUrl)) return sourceUrl;
  return uploadAsset(sourceUrl, path, version);
}

async function uploadFirstAvailableAsset(sourceUrls, pathForSource, version) {
  const candidates = [...new Set(sourceUrls.filter((sourceUrl) => typeof sourceUrl === 'string' && sourceUrl.trim()))];
  for (const sourceUrl of candidates) {
    try {
      const path = typeof pathForSource === 'function' ? pathForSource(sourceUrl) : pathForSource;
      return await uploadAssetUnlessRemote(sourceUrl, path, version);
    } catch {
      // Optional source assets are skipped when a local PSD does not exist yet.
    }
  }
  return null;
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

function filenameFromUrl(url) {
  try {
    const pathname = new window.URL(url, window.location.href).pathname;
    return pathname.split('/').filter(Boolean).at(-1) || '';
  } catch {
    return '';
  }
}

function sanitizePathPart(value) {
  const sanitized = String(value || 'layer')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return sanitized || 'layer';
}

function sanitizeFileName(value) {
  const sanitized = String(value || 'asset')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return sanitized || 'asset';
}
