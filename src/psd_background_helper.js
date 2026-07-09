import { mergePsdBackgroundLayers } from './scene_session_data.js';

const PSD_PREVIEW_MANIFEST_URL = './assets/backgrounds/current/background-preview.json';
const PSD_REFRESH_API_URL = './api/psd/refresh';

let lastLoadedUpdatedAt = null;

export async function refreshPsdBackground({ getSceneSession, onUpdate, force = false, psdFile = null }) {
  try {
    const manifest = await loadPsdManifest(force, psdFile);
    if (!manifest?.preview || !manifest.updatedAt) return false;
    if (!force && manifest.updatedAt === lastLoadedUpdatedAt) return false;

    lastLoadedUpdatedAt = manifest.updatedAt;
    const session = getSceneSession();
    const assetBase = backgroundAssetBase(manifest);
    session.background.psdPreview = {
      enabled: true,
      url: versionBackgroundAssetPath(manifest.preview, manifest.updatedAt, assetBase),
      sourceUrl: manifest.sourceUrl || session.background.psdPreview?.sourceUrl || '',
      updatedAt: manifest.updatedAt,
      width: manifest.width,
      height: manifest.height,
    };
    const savedLayers = Array.isArray(session.background.psdLayers) ? session.background.psdLayers : [];
    const useManifestOrder = Boolean(psdFile) || savedLayers.length === 0;
    session.background.psdLayers = mergePsdBackgroundLayers(
      savedLayers,
      versionPsdLayerImages(manifest.layers, manifest.updatedAt, assetBase),
      { useManifestOrder }
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

function versionPsdLayerImages(layers, updatedAt, assetBase) {
  if (!Array.isArray(layers)) return layers;
  return layers.map((layer) => {
    if (typeof layer?.image !== 'string' || !layer.image.trim()) return layer;
    const image = backgroundAssetPath(layer.image, assetBase);
    const separator = image.includes('?') ? '&' : '?';
    return {
      ...layer,
      image: `${image}${separator}v=${updatedAt}`,
    };
  });
}

function versionBackgroundAssetPath(path, updatedAt, assetBase) {
  const image = backgroundAssetPath(path, assetBase);
  const separator = image.includes('?') ? '&' : '?';
  return `${image}${separator}v=${updatedAt}`;
}

function backgroundAssetBase(manifest = {}) {
  return typeof manifest.assetBase === 'string' && manifest.assetBase.trim() ? manifest.assetBase.trim() : './runtime';
}

function backgroundAssetPath(path, assetBase) {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^(?:https?:|data:|\.\/|\/)/.test(value)) return value;
  const base = String(assetBase || './runtime').replace(/\/+$/, '');
  return `${base}/${value}`;
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
