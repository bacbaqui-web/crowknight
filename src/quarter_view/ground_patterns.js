import { FOREST_PERIOD, forestGround, forestHash } from './forest_layout.js';
export const GROUND_PATTERNS = [
  {
    id: 'soil-dry',
    label: '마른 흙',
    file: 'soil-dry-v1.webp',
  },
  {
    id: 'soil-packed',
    label: '다져진 흙',
    file: 'soil-packed-v1.webp',
  },
  {
    id: 'soil-cracked',
    label: '갈라진 흙',
    file: 'soil-cracked-v1.webp',
  },
  {
    id: 'soil-gravel',
    label: '자갈 흙',
    file: 'soil-gravel-v1.webp',
  },
  {
    id: 'soil-roots',
    label: '뿌리 흙',
    file: 'soil-roots-v1.webp',
  },
  {
    id: 'soil-leaves',
    label: '낙엽 흙',
    file: 'soil-leaves-v1.webp',
  },
  {
    id: 'grass-short',
    label: '짧은 풀',
    file: 'grass-short-v1.webp',
  },
  {
    id: 'grass-long',
    label: '긴 풀',
    file: 'grass-long-v1.webp',
  },
  {
    id: 'grass-sparse',
    label: '성긴 풀',
    file: 'grass-sparse-v1.webp',
  },
  {
    id: 'grass-dense',
    label: '빽빽한 풀',
    file: 'grass-dense-v1.webp',
  },
  {
    id: 'grass-dry',
    label: '마른 풀',
    file: 'grass-dry-v1.webp',
  },
  {
    id: 'grass-edge',
    label: '풀 흙 경계',
    file: 'grass-edge-v1.webp',
  },
  {
    id: 'moss-soft',
    label: '부드러운 이끼',
    file: 'moss-soft-v1.webp',
  },
  {
    id: 'moss-stone',
    label: '돌 이끼',
    file: 'moss-stone-v1.webp',
  },
  {
    id: 'moss-roots',
    label: '뿌리 이끼',
    file: 'moss-roots-v1.webp',
  },
  {
    id: 'moss-leaves',
    label: '낙엽 이끼',
    file: 'moss-leaves-v1.webp',
  },
  {
    id: 'leaves-oak',
    label: '참나무 낙엽',
    file: 'leaves-oak-v1.webp',
  },
  {
    id: 'leaves-twigs',
    label: '잔가지 낙엽',
    file: 'leaves-twigs-v1.webp',
  },
  {
    id: 'stone-buried',
    label: '묻힌 돌',
    file: 'stone-buried-v1.webp',
  },
  {
    id: 'stone-paving',
    label: '옛 돌바닥',
    file: 'stone-paving-v1.webp',
  },
  {
    id: 'stone-rubble',
    label: '돌 부스러기',
    file: 'stone-rubble-v1.webp',
  },
  {
    id: 'stone-cracked',
    label: '금간 판석',
    file: 'stone-cracked-v1.webp',
  },
  {
    id: 'clearing-worn',
    label: '공터 흙',
    file: 'clearing-worn-v1.webp',
  },
  {
    id: 'clearing-flower',
    label: '공터 들풀',
    file: 'clearing-flower-v1.webp',
  },
];
const SIZE = 128;
const samples = [];
let loading;
export function preloadGroundPatterns() {
  return (loading ||= Promise.all(
    GROUND_PATTERNS.map(async (entry, i) => {
      const image = new Image();
      image.src = new globalThis.URL('../../assets/quarter-ground/' + entry.file, import.meta.url).href;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, SIZE, SIZE);
      samples[i] = ctx.getImageData(0, 0, SIZE, SIZE).data;
    })
  ));
}
const wrap = (v, n) => ((v % n) + n) % n;
export function groundPatternIndex(cx, cz) {
  cx = wrap(cx, 16);
  cz = wrap(cz, 16);
  const { edge, clearingDistance } = forestGround(cx * 200, cz * 200);
  const h = forestHash(cx + 39, cz - 61);
  const pool =
    clearingDistance < 300
      ? [18, 19, 20, 21, 22, 23]
      : edge < -20
        ? [0, 1, 2, 3, 4, 5, 22]
        : edge < 130
          ? [3, 6, 8, 10, 11, 16, 17, 18, 19, 20, 21]
          : [6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 23];
  return pool[Math.floor(h * pool.length)];
}
// Blend four irregular material patches once into the existing repeating GPU texture.
// Runtime movement only changes UVs; it never decodes images or rebuilds this layer.
export function blendGroundPatterns(pixels, size) {
  if (samples.length !== GROUND_PATTERNS.length) return;
  const grid = Array.from({ length: 256 }, (_, i) => samples[groundPatternIndex(i % 16, Math.floor(i / 16))]);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const wx = (x / size) * FOREST_PERIOD,
        wz = (y / size) * FOREST_PERIOD;
      const gx = wx / 200,
        gz = wz / 200;
      const cx = Math.floor(gx),
        cz = Math.floor(gz);
      const fx = gx - cx,
        fz = gz - cz;
      const sx = fx * fx * (3 - 2 * fx),
        sz = fz * fz * (3 - 2 * fz);
      const color = [0, 0, 0];
      for (let dz = 0; dz < 2; dz++)
        for (let dx = 0; dx < 2; dx++) {
          const ax = wrap(cx + dx, 16),
            az = wrap(cz + dz, 16);
          const data = grid[az * 16 + ax];
          const seed = forestHash(ax, az);
          const tx = wrap(Math.floor((wx * SIZE) / 400 + seed * 100), SIZE);
          const ty = wrap(Math.floor((wz * SIZE) / 400 + seed * 73), SIZE);
          const p = (ty * SIZE + tx) * 4;
          const weight = (dx ? sx : 1 - sx) * (dz ? sz : 1 - sz);
          for (let c = 0; c < 3; c++) color[c] += data[p + c] * weight;
        }
      const p = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) pixels[p + c] = pixels[p + c] * 0.22 + color[c] * 0.78;
    }
}
