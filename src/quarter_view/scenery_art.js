import { FOREST_ASSET_CATALOG, BOULDER_PROFILES } from './scenery_catalog.js';
const images = new Map();
let loading;
const asset = (name) => new globalThis.URL(`../../assets/quarter-forest/${name}.webp`, import.meta.url).href;
export const SCENERY_ASSETS = Object.freeze({
  tree: asset('tree-upright-v7'),
  fork: asset('tree-fork-v7'),
  bent: asset('tree-bent-v7'),
  bush: asset('bush-v3'),
  ...Object.fromEntries(BOULDER_PROFILES.map((p) => [p.id, asset(p.file)])),
  rock: asset('rock-flat-v2'),
  stones: asset('stones-v3'),
  hut: asset('ruin-flat-v2'),
  pillar: asset('pillar-v3'),
  ...Object.fromEntries(FOREST_ASSET_CATALOG.map((entry) => [entry.id, asset(entry.file.replace('.webp', ''))])),
});
export const SCENERY_FRAME = Object.freeze({ width: 420, height: 450, anchorX: 210, anchorY: 390 });
const variants = {
  tree: ['tree', 'fork', 'bent'],
  rock: ['rock', 'stones'],
  hut: ['hut', 'pillar'],
  bush: ['bush'],
  boulder: BOULDER_PROFILES.map((p) => p.id),
};
for (const entry of FOREST_ASSET_CATALOG) variants[entry.type].push(entry.id);
export const SCENERY_VARIANT_COUNTS = Object.freeze(
  Object.fromEntries(Object.entries(variants).map(([type, list]) => [type, list.length]))
);
export function sceneryVariant(type, variant = 0) {
  return variant % variants[type].length;
}
export function fitSceneryBounds(bounds, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  return { width: bounds.width * scale, height: bounds.height * scale };
}
function opaqueBounds(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  let left = image.width,
    top = image.height,
    right = 0,
    bottom = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (data[(y * image.width + x) * 4 + 3] < 16) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
    }
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
export function preloadSceneryArt() {
  return (loading ||= Promise.all(
    Object.entries(SCENERY_ASSETS).map(async ([type, url]) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      images.set(type, { image, bounds: opaqueBounds(image) });
    })
  ));
}
function stamp(ctx, key, x, y, maxWidth, maxHeight) {
  const entry = images.get(key);
  if (!entry) return;
  const b = entry.bounds;
  const size = fitSceneryBounds(b, maxWidth, maxHeight);
  ctx.drawImage(entry.image, b.x, b.y, b.width, b.height, x - size.width / 2, y - size.height, size.width, size.height);
}
// Alpha bounds, scale and ground-contact decorations are baked once per variant.
export function createScenerySprite(type, createSurface = () => document.createElement('canvas'), variant = 0) {
  const canvas = createSurface();
  canvas.width = SCENERY_FRAME.width;
  canvas.height = SCENERY_FRAME.height;
  const ctx = canvas.getContext('2d');
  ctx.translate(SCENERY_FRAME.anchorX, SCENERY_FRAME.anchorY);
  const n = sceneryVariant(type, variant);
  const groundCover = variants.bush[n % variants.bush.length];
  ctx.fillStyle = '#59664b24';
  ctx.beginPath();
  ctx.ellipse(0, 0, type === 'tree' ? 36 : 75, type === 'tree' ? 13 : 24, -0.12, 0, Math.PI * 2);
  ctx.fill();
  if (type === 'bush') {
    stamp(ctx, variants.bush[n], 0, 4, 105, 42);
  } else if (type === 'tree') {
    stamp(ctx, groundCover, n === 1 ? -30 : 26, -4, 95, 42);
    stamp(ctx, variants.tree[n], 0, 3, 300, 330);
    stamp(ctx, groundCover, n === 2 ? 26 : -18, 9, 68, 28);
  } else if (type === 'boulder') {
    const profile = BOULDER_PROFILES[n];
    stamp(ctx, profile.id, 0, 5, profile.width, profile.height);
    stamp(ctx, groundCover, -95, 10, 65, 24);
    stamp(ctx, variants.bush[(n + 2) % variants.bush.length], 90, 8, 58, 22);
  } else {
    stamp(ctx, variants[type][n], 0, 5, type === 'rock' ? 155 : 270, type === 'rock' ? 90 : 140);
    stamp(ctx, groundCover, -100, 9, 60, 24);
    stamp(ctx, variants.bush[(n + 2) % variants.bush.length], 105, 4, 70, 27);
    stamp(ctx, variants.bush[(n + 3) % variants.bush.length], 20, 12, 48, 18);
  }
  return canvas;
}
