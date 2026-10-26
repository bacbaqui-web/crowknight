import { forestHash } from './forest_layout.js';
import { DUAL_LAYERS, dualCellAt, dualCoverage } from './dual_grid.js';
export const GROUND_PATTERNS = [
  { id: 'grass', label: '풀밭', file: 'dual-grass-v3.webp', color: [78, 121, 63] },
  { id: 'earth', label: '맨흙 · 흙길', file: 'dual-earth-v3.webp', color: [151, 108, 70] },
  { id: 'tile', label: '폐허 판석 타일', file: 'dual-tile-v3.webp', color: [139, 143, 143] },
  { id: 'road', label: '자갈 돌길', file: 'dual-road-v3.webp', color: [122, 126, 119] },
  { id: 'water', label: '연못 물', file: 'dual-water-v3.webp', color: [44, 115, 145] },
  { id: 'sand', label: '모래 물가', file: 'dual-shore-v3.webp', color: [186, 166, 112] },
  { id: 'gravel', label: '폐허 쇄석', file: 'stone-rubble-v1.webp', color: [128, 124, 110] },
  { id: 'mud', label: '젖은 진흙', file: 'soil-cracked-v1.webp', color: [91, 78, 61] },
];
const SIZE = 256;
const samples = new Map();
const definitions = Object.fromEntries(GROUND_PATTERNS.map((p) => [p.id, p]));
let loading;
export function preloadGroundPatterns() {
  return (loading ||= Promise.all(
    GROUND_PATTERNS.map(async (entry) => {
      const image = new Image();
      image.src = new globalThis.URL('../../assets/quarter-ground/' + entry.file, import.meta.url).href;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, SIZE, SIZE);
      samples.set(entry.id, ctx.getImageData(0, 0, SIZE, SIZE).data);
    })
  ));
}
// Select one crop across most of each patch; crossfade only narrow patch seams.
const PATCH = 200;
const smooth = (v) => v * v * (3 - 2 * v);
export function materialSample(data, x, z) {
  const gx = x / PATCH,
    gz = z / PATCH;
  const cx = Math.floor(gx),
    cz = Math.floor(gz);
  const u = smooth(gx - cx),
    v = smooth(gz - cz);
  const color = [0, 0, 0];
  let totalWeight = 0;
  for (let dz = 0; dz < 2; dz++)
    for (let dx = 0; dx < 2; dx++) {
      const ix = (((cx + dx) % 16) + 16) % 16;
      const iz = (((cz + dz) % 16) + 16) % 16;
      const ox = 100 + forestHash(ix + 19, iz + 61) * 55;
      const oz = 100 + forestHash(ix + 71, iz + 29) * 55;
      const tx = Math.floor(ox + (gx - cx - dx) * 100);
      const tz = Math.floor(oz + (gz - cz - dz) * 100);
      const p = (tz * SIZE + tx) * 4;
      const weight = Math.pow((dx ? u : 1 - u) * (dz ? v : 1 - v), 16);
      totalWeight += weight;
      for (let c = 0; c < 3; c++) color[c] += data[p + c] * weight;
    }
  return color.map((c) => c / totalWeight);
}
export function materialColor(id, x, z) {
  const def = definitions[id],
    data = samples.get(id);
  const noise = (forestHash(Math.floor(x / 3), Math.floor(z / 3)) - 0.5) * 7;
  if (!data) return def.color.map((c) => c + noise);
  const color = materialSample(data, x, z);
  if (['mud', 'gravel'].includes(id)) {
    const light = (color[0] + color[1] + color[2]) / 3 - 112;
    return def.color.map((c) => c + light * 0.48);
  }
  return color;
}
export function transitionColor(a, b, mask, u, v, x, z, variant = 0) {
  const cover = dualCoverage(mask, u, v, variant, b === 'water' ? 0.008 : 0.09);
  const bg = materialColor(a, x, z),
    fg = materialColor(b, x, z);
  return bg.map((c, i) => c * (1 - cover) + fg[i] * cover);
}
export function terrainColor(x, z) {
  const cell = dualCellAt(x, z);
  let color = materialColor('grass', x, z);
  for (let i = 0; i < DUAL_LAYERS.length; i++) {
    const layer = DUAL_LAYERS[i];
    const cover = dualCoverage(cell.masks[i], cell.u, cell.v, cell.variant, layer.id === 'water' ? 0.008 : 0.09);
    if (cover <= 0) continue;
    const fg = materialColor(layer.id, x, z);
    color = color.map((c, j) => c * (1 - cover) + fg[j] * cover);
  }
  return color;
}
