import { FOREST_PERIOD, forestGround, forestHash } from './forest_layout.js';
export const GROUND_TILE_SIZE = { x: FOREST_PERIOD, z: FOREST_PERIOD };
let cached;
export function createGroundTexture(size = 1024) {
  if (cached?.width === size) return cached;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const wx = (x / size) * FOREST_PERIOD,
        wz = (y / size) * FOREST_PERIOD;
      const { edge, clearingDistance } = forestGround(wx, wz);
      const grain = forestHash(x, y),
        patch = forestHash(Math.floor(wx / 45), Math.floor(wz / 45));
      const dirt = Math.max(0, Math.min(1, (18 - edge + (patch - 0.5) * 20) / 42));
      const light =
        Math.sin(((wx * Math.PI * 2) / FOREST_PERIOD) * 3) * 3 + Math.cos(((wz * Math.PI * 2) / FOREST_PERIOD) * 4) * 3;
      let color = [56, 99, 101].map((c, i) => c * (1 - dirt) + [139, 132, 94][i] * dirt + light + (grain - 0.5) * 13);
      // Broken stone paving around the old crossroads, with soil-filled seams and missing stones.
      const row = Math.floor(wz / 38),
        col = Math.floor((wx + (row % 2) * 26) / 52);
      const stone = forestHash(col, row);
      if (clearingDistance < 250 && stone > 0.32) {
        const px = (wx + (row % 2) * 26) % 52,
          pz = wz % 38;
        if (px > 4 + grain * 3 && px < 48 - grain * 3 && pz > 4 + grain * 3 && pz < 34 - grain * 3) {
          const shade = stone * 18 + (pz < 7 ? 9 : 0) - (px > 44 || pz > 30 ? 12 : 0);
          color = [113 + shade, 128 + shade, 114 + shade];
        } else color = [105, 112, 84];
      }
      // Leaf litter, tiny pebbles and grass are baked once, never drawn as per-frame objects.
      if (grain > 0.977) {
        color = dirt > 0.65 ? [154, 146, 109] : [100, 150, 151];
      }
      if (grain < 0.012 && dirt < 0.65) color = [40, 79, 84];
      const tuftX = wx % 42,
        tuftZ = wz % 38;
      if (dirt < 0.3 && patch > 0.48 && tuftZ > 12 && tuftZ < 25 && Math.abs(tuftX - 19 - (tuftZ - 12) * 0.3) < 1.8)
        color = [92, 140, 143];
      const i = (y * size + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }
  cached = { width: size, height: size, pixels };
  return cached;
}
