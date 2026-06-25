import { mergeClipBackgroundLayers } from './sceneSession.js';

const CLIP_PREVIEW_MANIFEST_URL = './runtime/background-preview.json';
const CLIP_REFRESH_API_URL = './api/clip/refresh';

let lastLoadedUpdatedAt = null;

export async function refreshClipBackground({ getSceneSession, onUpdate, force = false, clipFile = null }) {
  try {
    const manifest = await loadClipManifest(force, clipFile);
    if (!manifest?.preview || !manifest.updatedAt) return false;
    if (!force && manifest.updatedAt === lastLoadedUpdatedAt) return false;

    lastLoadedUpdatedAt = manifest.updatedAt;
    const session = getSceneSession();
    session.background.clipPreview = {
      enabled: true,
      url: `./runtime/${manifest.preview}?v=${manifest.updatedAt}`,
      updatedAt: manifest.updatedAt,
      width: manifest.width,
      height: manifest.height,
    };
    session.background.clipLayers = mergeClipBackgroundLayers(
      session.background.clipLayers,
      versionClipLayerImages(manifest.layers, manifest.updatedAt)
    );
    onUpdate?.(session.background);
    return true;
  } catch {
    // The runtime preview file only exists while the local watcher is in use.
    return false;
  }
}

async function loadClipManifest(force, clipFile) {
  if (clipFile) {
    const uploaded = await uploadClipFileForRefresh(clipFile);
    if (uploaded?.preview) return uploaded;
  }

  if (force) {
    const refreshed = await fetchJson(`${CLIP_REFRESH_API_URL}?t=${Date.now()}`);
    if (refreshed?.preview) return refreshed;
  }
  return fetchJson(`${CLIP_PREVIEW_MANIFEST_URL}?t=${Date.now()}`);
}

async function uploadClipFileForRefresh(file) {
  const response = await window.fetch(`${CLIP_REFRESH_API_URL}?t=${Date.now()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Clip-Filename': encodeURIComponent(file.name || 'background.psd'),
    },
    body: file,
  });
  if (!response.ok) return null;
  return response.json();
}

function versionClipLayerImages(layers, updatedAt) {
  if (!Array.isArray(layers)) return layers;
  return layers.map((layer) => {
    if (typeof layer?.image !== 'string' || !layer.image.trim()) return layer;
    const separator = layer.image.includes('?') ? '&' : '?';
    return {
      ...layer,
      image: `${layer.image}${separator}v=${updatedAt}`,
    };
  });
}

export function startClipBackgroundRuntime(options) {
  refreshClipBackground(options);
  return null;
}

async function fetchJson(url) {
  const response = await window.fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}
