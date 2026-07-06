import {
  characterPsdFileNameForGroup,
  normalizeCharacterGroup,
  sanitizeCharacterAssetName,
} from './character_group_data.js';

const LOCAL_CHARACTER_INDEX_URL = './assets/characters/index.json';

export async function loadCharacterStateFromLocalAssets() {
  try {
    const response = await window.fetch(`${LOCAL_CHARACTER_INDEX_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;

    const payload = await response.json();
    const characters = Array.isArray(payload?.characters)
      ? payload.characters.map(normalizeLocalCharacterDef).filter((def) => def.id && def.folder)
      : [];
    return characters.length ? { characters } : null;
  } catch {
    return null;
  }
}

function normalizeLocalCharacterDef(def) {
  const group = normalizeCharacterGroup(def?.group || String(def?.folder || '').split('/')[0]);
  const id = sanitizeCharacterAssetName(
    def?.id ||
      String(def?.folder || '')
        .split('/')
        .at(-1)
  );
  const folder = String(def?.folder || `${group}/${id}`).trim();
  return {
    id,
    type: String(def?.type || (group === 'players' ? 'player' : 'enemy')).trim(),
    label: String(def?.label || def?.name || id).trim(),
    name: String(def?.name || def?.label || id).trim(),
    x: Number.isFinite(Number(def?.x)) ? Number(def.x) : 480,
    folder,
    storageFolder: String(def?.storageFolder || folder).trim(),
    group,
    deleted: Boolean(def?.deleted),
    psdFileName: String(def?.psdFileName || characterPsdFileNameForGroup(group)),
    tint: String(def?.tint || '#7cc3a2'),
    deletable: Boolean(def?.deletable),
  };
}
