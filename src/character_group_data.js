export const CHARACTER_GROUPS = [
  { key: 'players', label: '주인공' },
  { key: 'mobs', label: '잡몹' },
  { key: 'bosses', label: '보스' },
  { key: 'trash', label: '휴지통' },
];

export const CHARACTER_TRASH_GROUP = 'trash';

const CHARACTER_GROUP_KEYS = new Set(CHARACTER_GROUPS.map((group) => group.key));
const CREATE_CHARACTER_GROUPS = CHARACTER_GROUPS.filter((group) => group.key !== CHARACTER_TRASH_GROUP);

export function normalizeCharacterGroup(value, fallback = 'mobs') {
  const key = String(value || '').trim();
  if (CHARACTER_GROUP_KEYS.has(key)) return key;
  if (key === CHARACTER_TRASH_GROUP) return key;
  return fallback;
}

export function visibleCharacterGroups() {
  return CHARACTER_GROUPS;
}

export function creatableCharacterGroups() {
  return CREATE_CHARACTER_GROUPS;
}

export function characterGroupLabel(value) {
  return CHARACTER_GROUPS.find((group) => group.key === value)?.label || '잡몹';
}

export function normalizeCharacterGroupInput(value, fallback = 'mobs') {
  const raw = String(value || '').trim();
  const match = CHARACTER_GROUPS.find((group) => group.key === raw || group.label === raw);
  return match ? match.key : normalizeCharacterGroup(raw, fallback);
}

export function inferCharacterGroup(def) {
  if (def?.group) return normalizeCharacterGroup(def.group);
  if (def?.deleted) return CHARACTER_TRASH_GROUP;
  if (def?.id === 'player' || def?.type === 'player') return 'players';
  if (
    String(def?.type || '')
      .toLowerCase()
      .includes('boss')
  )
    return 'bosses';
  return 'mobs';
}

export function isTrashCharacter(def) {
  return Boolean(def?.deleted) || normalizeCharacterGroup(def?.group, '') === CHARACTER_TRASH_GROUP;
}

export function isPlayerCharacter(def) {
  return def?.id === 'player' || def?.type === 'player' || normalizeCharacterGroup(def?.group, '') === 'players';
}

export function characterAssetFolder(group, englishName) {
  return `${normalizeCharacterGroup(group)}/${sanitizeCharacterAssetName(englishName)}`;
}

export function characterPsdFileNameForGroup(group) {
  return normalizeCharacterGroup(group) === 'players' ? 'player.psd' : 'enemy.psd';
}

export function legacyCharacterFolder(value) {
  const folder = String(value || '').trim();
  if (folder === 'player') return 'players/player_01';
  if (folder === 'enemy' || /^enemy\d*$/.test(folder)) return 'mobs/enemy_01';
  return folder;
}

export function sanitizeCharacterAssetName(value) {
  const safe = String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return safe || `character_${Date.now()}`;
}
