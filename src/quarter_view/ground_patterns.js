import { forestHash, forestTerrain } from './forest_layout.js';
export const GROUND_PATTERNS = [
  { id: 'grass', label: '풀밭', file: 'terrain-grass-v2.webp', color: [78, 121, 63] },
  { id: 'earth', label: '맨흙 · 흙길', file: 'terrain-earth-v2.webp', color: [151, 108, 70] },
  { id: 'tile', label: '폐허 판석 타일', file: 'terrain-tile-v2.webp', color: [139, 143, 143] },
  { id: 'road', label: '자갈 돌길', file: 'terrain-road-v2.webp', color: [122, 126, 119] },
  { id: 'water', label: '연못 물', file: 'terrain-water-v2.webp', color: [44, 115, 145] },
  { id: 'sand', label: '모래 물가', file: 'soil-dry-v1.webp', color: [186, 166, 112] },
  { id: 'gravel', label: '폐허 쇄석', file: 'stone-rubble-v1.webp', color: [128, 124, 110] },
  { id: 'mud', label: '젖은 진흙', file: 'soil-cracked-v1.webp', color: [91, 78, 61] },
];
export const GROUND_TRANSITIONS = [
  ['grass', 'earth', '풀밭 → 흙길'],
  ['earth', 'grass', '흙 공터 → 풀밭'],
  ['tile', 'gravel', '판석 → 쇄석'],
  ['gravel', 'grass', '폐허 가장자리 → 풀밭'],
  ['road', 'earth', '돌길 → 흙길'],
  ['earth', 'road', '흙길 → 돌길'],
  ['water', 'mud', '연못 → 젖은 물가'],
  ['mud', 'sand', '진흙 → 모래'],
  ['sand', 'grass', '모래 물가 → 풀밭'],
  ['grass', 'sand', '풀밭 → 모래 물가'],
  ['gravel', 'tile', '쇄석 → 판석'],
  ['grass', 'gravel', '풀밭 → 폐허'],
  ['sand', 'mud', '마른 물가 → 젖은 물가'],
  ['mud', 'water', '물가 → 연못'],
  ['road', 'grass', '돌길 → 풀밭'],
  ['tile', 'earth', '타일 → 흙'],
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
const wrap = (v) => ((v % SIZE) + SIZE) % SIZE;
export function materialColor(id, x, z) {
  const def = definitions[id],
    data = samples.get(id);
  const tx = wrap(Math.floor((x * SIZE) / 400)),
    tz = wrap(Math.floor((z * SIZE) / 400));
  const p = (tz * SIZE + tx) * 4;
  const noise = (forestHash(Math.floor(x / 3), Math.floor(z / 3)) - 0.5) * 7;
  if (!data) return def.color.map((c) => c + noise);
  if (['sand', 'mud', 'gravel'].includes(id)) {
    const light = (data[p] + data[p + 1] + data[p + 2]) / 3 - 112;
    return def.color.map((c) => c + light * 0.48);
  }
  return [data[p], data[p + 1], data[p + 2]];
}
export function terrainColor(x, z, terrain = forestTerrain(x, z)) {
  const a = materialColor(terrain.a, x, z);
  if (terrain.mix <= 0 || terrain.a === terrain.b) return a;
  const b = materialColor(terrain.b, x, z);
  const t = terrain.mix * terrain.mix * (3 - 2 * terrain.mix);
  return a.map((c, i) => c * (1 - t) + b[i] * t);
}
