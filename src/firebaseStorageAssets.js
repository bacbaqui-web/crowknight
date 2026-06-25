import { FIREBASE_PROJECT_STATE_CONFIG } from './firebaseConfig.js';

const FIREBASE_STORAGE_BASE_URL = 'https://firebasestorage.googleapis.com/v0';

export async function uploadSceneClipAssetsToFirebase(background) {
  if (!isFirebaseStorageEnabled() || !background?.clipPreview) return false;

  const version = background.clipPreview.updatedAt || Date.now();
  const uploadTasks = [];

  if (isLocalRuntimeAsset(background.clipPreview.url)) {
    uploadTasks.push(
      uploadAsset(
        background.clipPreview.url,
        objectPath(`clip/preview${extensionFromUrl(background.clipPreview.url)}`),
        version
      ).then((url) => {
        background.clipPreview.url = url;
      })
    );
  }

  if (Array.isArray(background.clipLayers)) {
    background.clipLayers.forEach((layer) => {
      if (!isLocalRuntimeAsset(layer?.imageSrc)) return;
      const extension = extensionFromUrl(layer.imageSrc);
      uploadTasks.push(
        uploadAsset(
          layer.imageSrc,
          objectPath(`clip/layers/${sanitizePathPart(layer.id || layer.name)}${extension}`),
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

function extensionFromUrl(url) {
  const pathname = new window.URL(url, window.location.href).pathname.toLowerCase();
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg';
  if (pathname.endsWith('.webp')) return '.webp';
  return '.png';
}

function contentTypeFromPath(path) {
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
