import { mergePsdBackgroundLayers } from './sceneSession.js';

const PSD_PREVIEW_MANIFEST_URL = './runtime/background-preview.json';
const PSD_REFRESH_API_URL = './api/psd/refresh';

let lastLoadedUpdatedAt = null;

export async function refreshPsdBackground({ getSceneSession, onUpdate, force = false, psdFile = null }) {
  try {
    const manifest = await loadPsdManifest(force, psdFile);
    if (!manifest?.preview || !manifest.updatedAt) return false;
    if (!force && manifest.updatedAt === lastLoadedUpdatedAt) return false;

    lastLoadedUpdatedAt = manifest.updatedAt;
    const session = getSceneSession();
    session.background.psdPreview = {
      enabled: true,
      url: `./runtime/${manifest.preview}?v=${manifest.updatedAt}`,
      updatedAt: manifest.updatedAt,
      width: manifest.width,
      height: manifest.height,
    };
    session.background.psdLayers = mergePsdBackgroundLayers(
      session.background.psdLayers,
      versionPsdLayerImages(manifest.layers, manifest.updatedAt)
    );
    onUpdate?.(session.background);
    return true;
  } catch {
    // The runtime preview file only exists while the local PSD exporter is in use.
    return false;
  }
}

async function loadPsdManifest(force, psdFile) {
  if (psdFile) {
    const uploaded = await uploadPsdFileForRefresh(psdFile);
    if (uploaded?.preview) return uploaded;
  }

  if (force) {
    const refreshed = await fetchJson(`${PSD_REFRESH_API_URL}?t=${Date.now()}`);
    if (refreshed?.preview) return refreshed;
  }
  return fetchJson(`${PSD_PREVIEW_MANIFEST_URL}?t=${Date.now()}`);
}

async function uploadPsdFileForRefresh(file) {
  const response = await window.fetch(`${PSD_REFRESH_API_URL}?t=${Date.now()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Psd-Filename': encodeURIComponent(file.name || 'background.psd'),
    },
    body: file,
  });
  if (!response.ok) return null;
  return response.json();
}

function versionPsdLayerImages(layers, updatedAt) {
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

export function startPsdBackgroundRuntime(options) {
  refreshPsdBackground(options);
  return null;
}

async function fetchJson(url) {
  const response = await window.fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}
