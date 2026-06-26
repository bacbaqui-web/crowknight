import { loadCharacterAssets } from './assetLoaders.js';

const CHARACTER_REFRESH_API_URL = './api/character/refresh';

export async function refreshCharacterPsdAssets({ actor, psdFile = null }) {
  if (!actor?.folder) return false;

  const result = psdFile ? await uploadCharacterPsd(actor.folder, psdFile) : await refreshCharacterPsd(actor.folder);
  if (!result?.ok) return false;

  actor.player.assets = await loadCharacterAssets(actor.folder, result.updatedAt || Date.now());
  return true;
}

async function refreshCharacterPsd(folder) {
  return fetchJson(`${CHARACTER_REFRESH_API_URL}?folder=${encodeURIComponent(folder)}&t=${Date.now()}`);
}

async function uploadCharacterPsd(folder, file) {
  const response = await window.fetch(
    `${CHARACTER_REFRESH_API_URL}?folder=${encodeURIComponent(folder)}&t=${Date.now()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Character-Filename': encodeURIComponent(file.name || `${folder}.psd`),
      },
      body: file,
    }
  );
  if (!response.ok) return null;
  return response.json();
}

async function fetchJson(url) {
  const response = await window.fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}
