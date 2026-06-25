export const DEFAULT_SCENE_SESSION_ID = 'default';

export const BACKGROUND_TYPES = [
  { key: 'layers', label: '레이어' },
  { key: 'preset', label: '프리셋' },
  { key: 'color', label: '색상' },
  { key: 'image', label: '이미지' },
  { key: 'none', label: '없음' },
];

export const BACKGROUND_LAYER_COUNT = 10;
export const CLIP_LAYER_ROLES = ['back', 'ground', 'front'];
export const BACKGROUND_LAYER_ASSETS = Array.from({ length: BACKGROUND_LAYER_COUNT }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    id: `background_${number}`,
    label: `배경 ${number}`,
    src: `./assets/backgrounds/background_${number}.png`,
  };
});

const DEFAULT_LAYER_SPEEDS = [0.06, 0.1, 0.16, 0.24, 0.34, 0.46, 0.6, 0.76, 0.94, 1.15];

export const BACKGROUND_PRESETS = [
  { key: 'training', label: '기본 훈련장' },
  { key: 'moonlit', label: '달빛 숲' },
  { key: 'ember', label: '붉은 하늘' },
  { key: 'castle', label: '성벽' },
];

export const BACKGROUND_FITS = [
  { key: 'cover', label: '채우기' },
  { key: 'contain', label: '맞추기' },
  { key: 'stretch', label: '늘이기' },
  { key: 'repeat', label: '반복' },
];

export function createDefaultSceneSession() {
  return {
    id: DEFAULT_SCENE_SESSION_ID,
    name: '기본 세션',
    background: createDefaultBackground(),
    world: createDefaultWorldSettings(),
  };
}

export function createDefaultBackground() {
  return {
    type: 'layers',
    preset: 'training',
    color: '#171720',
    imageSrc: '',
    fit: 'cover',
    opacity: 1,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    parallaxStrength: 1,
    clipPreview: createDefaultClipPreviewBackground(),
    clipLayers: [],
    layers: createDefaultBackgroundLayers(),
  };
}

export function createDefaultClipPreviewBackground() {
  return {
    enabled: false,
    url: '',
    updatedAt: null,
    width: null,
    height: null,
  };
}

export function createDefaultBackgroundLayers() {
  return BACKGROUND_LAYER_ASSETS.map((asset, index) => ({
    id: asset.id,
    enabled: false,
    src: asset.src,
    speed: DEFAULT_LAYER_SPEEDS[index],
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    opacity: 1,
  }));
}

export function createDefaultWorldSettings() {
  return {
    gravity: 1800,
    floorY: 430,
    minX: 80,
    maxX: null,
  };
}

export function createWorldFromSceneSession(session) {
  const settings = normalizeWorldSettings(session?.world);
  return {
    gravity: settings.gravity,
    floorY: settings.floorY,
    minX: settings.minX,
    maxX: settings.maxX ?? Infinity,
    viewW: 960,
    viewH: 540,
  };
}

export function syncWorldToSceneSession(session, world) {
  session.world = {
    gravity: world.gravity,
    floorY: world.floorY,
    minX: world.minX,
    maxX: Number.isFinite(world.maxX) ? world.maxX : null,
  };
}

export function normalizeSceneSession(saved) {
  const defaults = createDefaultSceneSession();
  const id = nonEmptyString(saved?.id) || defaults.id;

  return {
    id,
    name: nonEmptyString(saved?.name) || defaults.name,
    background: normalizeSceneBackground(saved?.background),
    world: normalizeWorldSettings(saved?.world),
  };
}

export function normalizeSceneSessions(savedSessions, activeSessionId) {
  const entries = savedSessions && typeof savedSessions === 'object' ? Object.entries(savedSessions) : [];
  const sessions = {};

  entries.forEach(([key, value]) => {
    const session = normalizeSceneSession({ ...value, id: value?.id || key });
    sessions[session.id] = session;
  });

  const activeId = sessions[activeSessionId] ? activeSessionId : DEFAULT_SCENE_SESSION_ID;
  if (!sessions[activeId]) sessions[activeId] = createDefaultSceneSession();

  return {
    activeSessionId: activeId,
    sessions,
    sceneSession: sessions[activeId],
  };
}

export function normalizeSceneBackground(saved) {
  const defaults = createDefaultBackground();
  const type = includesKey(BACKGROUND_TYPES, saved?.type) ? saved.type : defaults.type;
  const preset = includesKey(BACKGROUND_PRESETS, saved?.preset) ? saved.preset : defaults.preset;
  const fit = includesKey(BACKGROUND_FITS, saved?.fit) ? saved.fit : defaults.fit;

  return {
    type,
    preset,
    color: normalizeColor(saved?.color, defaults.color),
    imageSrc: typeof saved?.imageSrc === 'string' ? saved.imageSrc : defaults.imageSrc,
    fit,
    opacity: clampNumber(saved?.opacity, 0, 1, defaults.opacity),
    scale: clampNumber(saved?.scale, 0.2, 3, defaults.scale),
    offsetX: clampNumber(saved?.offsetX, -1200, 1200, defaults.offsetX),
    offsetY: clampNumber(saved?.offsetY, -1200, 1200, defaults.offsetY),
    parallaxStrength: clampNumber(saved?.parallaxStrength, 0, 2, defaults.parallaxStrength),
    clipPreview: normalizeClipPreviewBackground(saved?.clipPreview),
    clipLayers: normalizeClipBackgroundLayers(saved?.clipLayers),
    layers: normalizeBackgroundLayers(saved?.layers),
  };
}

function normalizeClipPreviewBackground(saved) {
  const defaults = createDefaultClipPreviewBackground();
  return {
    enabled: Boolean(saved?.enabled),
    url: typeof saved?.url === 'string' ? saved.url : defaults.url,
    updatedAt: Number.isFinite(saved?.updatedAt) ? saved.updatedAt : defaults.updatedAt,
    width: Number.isFinite(saved?.width) ? saved.width : defaults.width,
    height: Number.isFinite(saved?.height) ? saved.height : defaults.height,
  };
}

export function normalizeBackgroundLayers(savedLayers) {
  const savedById = new Map(
    Array.isArray(savedLayers) ? savedLayers.map((layer) => [layer?.id, layer]).filter(([id]) => id) : []
  );

  return createDefaultBackgroundLayers().map((defaults) => {
    const saved = savedById.get(defaults.id) || {};
    return {
      id: defaults.id,
      enabled: Boolean(saved.enabled),
      src: typeof saved.src === 'string' && saved.src.trim() ? saved.src.trim() : defaults.src,
      speed: clampNumber(saved.speed, 0, 2, defaults.speed),
      offsetX: clampNumber(saved.offsetX, -1200, 1200, defaults.offsetX),
      offsetY: clampNumber(saved.offsetY, -1200, 1200, defaults.offsetY),
      scale: clampNumber(saved.scale, 0.2, 3, defaults.scale),
      opacity: clampNumber(saved.opacity, 0, 1, defaults.opacity),
    };
  });
}

export function normalizeClipBackgroundLayers(savedLayers) {
  if (!Array.isArray(savedLayers)) return [];
  return savedLayers.map((layer, index) => normalizeClipBackgroundLayer(layer, index)).filter((layer) => layer.id);
}

export function getActiveClipGroundLayer(background) {
  const normalized = normalizeSceneBackground(background);
  return (
    normalized.clipLayers.find((layer) => layer.enabled && layer.role === 'ground' && layer.imageSrc.trim()) || null
  );
}

export function usesClipGround(background) {
  return Boolean(getActiveClipGroundLayer(background));
}

export function mergeClipBackgroundLayers(savedLayers, manifestLayers) {
  const savedLayersNormalized = normalizeClipBackgroundLayers(savedLayers);
  const savedById = new Map(savedLayersNormalized.map((layer) => [layer.id, layer]));
  const savedByName = uniqueLayerNameMap(savedLayersNormalized);
  const manifestList = Array.isArray(manifestLayers) ? manifestLayers : [];
  const merged = manifestList
    .map((manifestLayer, index) => {
      const id = nonEmptyString(manifestLayer?.id);
      if (!id) return null;
      const manifestName = nonEmptyString(manifestLayer?.name);
      const saved = savedById.get(id) || savedByName.get(manifestName);
      const hasLayerImage = typeof manifestLayer?.image === 'string' && manifestLayer.image.trim();
      const savedHadLayerImage = typeof saved?.imageSrc === 'string' && saved.imageSrc.trim();
      return normalizeClipBackgroundLayer(
        {
          ...saved,
          id,
          name: manifestName || saved?.name || `레이어 ${index + 1}`,
          sourceId: manifestLayer?.sourceId ?? saved?.sourceId ?? null,
          imageSrc: hasLayerImage ? `./runtime/${manifestLayer.image}` : saved?.imageSrc,
          enabled: saved?.enabled ?? manifestLayer?.visible ?? true,
          opacity: saved?.opacity ?? manifestLayer?.opacity ?? 1,
          offsetX: hasLayerImage && !savedHadLayerImage ? 0 : (saved?.offsetX ?? manifestLayer?.offsetX ?? 0),
          offsetY: hasLayerImage && !savedHadLayerImage ? 0 : (saved?.offsetY ?? manifestLayer?.offsetY ?? 0),
        },
        index
      );
    })
    .filter(Boolean);

  return merged.sort((a, b) => a.order - b.order);
}

function uniqueLayerNameMap(layers) {
  const counts = new Map();
  layers.forEach((layer) => {
    counts.set(layer.name, (counts.get(layer.name) || 0) + 1);
  });

  return new Map(layers.filter((layer) => counts.get(layer.name) === 1).map((layer) => [layer.name, layer]));
}

function normalizeClipBackgroundLayer(layer, fallbackOrder) {
  const id = nonEmptyString(layer?.id);
  if (!id) return { id: '' };
  const role = CLIP_LAYER_ROLES.includes(layer?.role) ? layer.role : 'back';
  return {
    id,
    sourceId: Number.isFinite(layer?.sourceId) ? layer.sourceId : null,
    name: nonEmptyString(layer?.name) || id,
    imageSrc: typeof layer?.imageSrc === 'string' ? layer.imageSrc : '',
    role,
    enabled: layer?.enabled !== false,
    influence: clampNumber(layer?.influence, 0, 2, defaultClipLayerInfluence(fallbackOrder)),
    verticalInfluence: clampNumber(
      layer?.verticalInfluence,
      0,
      2,
      defaultClipLayerVerticalInfluence(role, fallbackOrder)
    ),
    offsetX: clampNumber(layer?.offsetX, -1200, 1200, 0),
    offsetY: clampNumber(layer?.offsetY, -1200, 1200, 0),
    scale: clampNumber(layer?.scale, 0.2, 3, 1),
    opacity: clampNumber(layer?.opacity, 0, 1, 1),
    order: clampNumber(layer?.order, -1000, 1000, fallbackOrder),
  };
}

function defaultClipLayerInfluence(index) {
  return clampNumber((index + 1) * 0.08, 0, 2, 0.08);
}

function defaultClipLayerVerticalInfluence(role, index) {
  if (role === 'ground') return 1;
  if (role === 'front') return 0.45;
  return clampNumber((index + 1) * 0.035, 0, 0.4, 0.04);
}

function normalizeWorldSettings(saved) {
  const defaults = createDefaultWorldSettings();
  return {
    gravity: clampNumber(saved?.gravity, 100, 5000, defaults.gravity),
    floorY: clampNumber(saved?.floorY, 120, 4000, defaults.floorY),
    minX: clampNumber(saved?.minX, -4000, 4000, defaults.minX),
    maxX: Number.isFinite(saved?.maxX) ? saved.maxX : defaults.maxX,
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
}

function includesKey(list, key) {
  return list.some((item) => item.key === key);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
