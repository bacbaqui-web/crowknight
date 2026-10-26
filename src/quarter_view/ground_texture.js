import { terrainColor } from './ground_patterns.js';
import { FOREST_PERIOD } from './forest_layout.js';
export const GROUND_TILE_SIZE = { x: FOREST_PERIOD, z: FOREST_PERIOD };
let cached;
// Bake material boundaries only once. Both renderers reuse these pixels while moving.
export function createGroundTexture(size = 2048) {
  if (cached?.width === size) return cached;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const color = terrainColor((x / size) * FOREST_PERIOD, (y / size) * FOREST_PERIOD);
      const p = (y * size + x) * 4;
      pixels[p] = color[0];
      pixels[p + 1] = color[1];
      pixels[p + 2] = color[2];
      pixels[p + 3] = 255;
    }
  cached = { width: size, height: size, pixels };
  return cached;
}
