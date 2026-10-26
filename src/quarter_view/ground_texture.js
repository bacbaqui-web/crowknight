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
      let color = [43, 61, 46].map((c, i) => c * (1 - dirt) + [103, 91, 65][i] * dirt + light + (grain - 0.5) * 9);
      // Broken stone paving around the old crossroads, with soil-filled seams and missing stones.
      const row = Math.floor(wz / 38),
        col = Math.floor((wx + (row % 2) * 26) / 52);
      const stone = forestHash(col, row);
      if (clearingDistance < 250 && stone > 0.32) {
        const px = (wx + (row % 2) * 26) % 52,
          pz = wz % 38;
        if (px > 4 && px < 48 && pz > 4 && pz < 34) {
          const shade = stone * 18 + (pz < 7 ? 9 : 0) - (px > 44 || pz > 30 ? 12 : 0);
          color = [84 + shade, 89 + shade, 73 + shade];
        } else color = [58, 65, 49];
      }
      // Leaf litter, tiny pebbles and grass are baked once, never drawn as per-frame objects.
      if (grain > 0.977) {
        color = dirt > 0.65 ? [127, 116, 86] : [85, 96, 57];
      }
      if (grain < 0.012 && dirt < 0.65) color = [27, 44, 34];
      const i = (y * size + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }
  cached = { width: size, height: size, pixels };
  return cached;
}
