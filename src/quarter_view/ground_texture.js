import { FOREST_PERIOD, forestGround, forestHash } from './forest_layout.js';
export const GROUND_TILE_SIZE = { x: FOREST_PERIOD, z: FOREST_PERIOD };
let cached;
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => v * v * (3 - 2 * v);
// Periodic layers retain the hand-painted patches across the repeating tile seam.
function brushNoise(u, v, nx, nz) {
  const x = u * nx,
    z = v * nz;
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const fx = smooth(x - ix),
    fz = smooth(z - iz);
  const sample = (a, b) => forestHash(((a % nx) + nx) % nx, ((b % nz) + nz) % nz);
  const a = sample(ix, iz) * (1 - fx) + sample(ix + 1, iz) * fx;
  const b = sample(ix, iz + 1) * (1 - fx) + sample(ix + 1, iz + 1) * fx;
  return a * (1 - fz) + b * fz;
}
export function createGroundTexture(size = 1024) {
  if (cached?.width === size) return cached;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const wx = u * FOREST_PERIOD,
        wz = v * FOREST_PERIOD;
      const { edge, clearingDistance } = forestGround(wx, wz);
      const patch = brushNoise(u, v, 18, 22);
      const stroke = brushNoise(u, v, 42, 56);
      const bristle = brushNoise(u + v, v, 240, 80);
      const grain = forestHash(x, y);
      // Warm exposed earth remains visible between grass masses. No cyan water-like speckle.
      const grass = smooth(clamp((edge + (patch - 0.5) * 260 + (stroke - 0.5) * 58 + 65) / 190));
      const cover = grass * (0.48 + patch * 0.52);
      const paper = (grain - 0.5) * 7 + (bristle - 0.5) * 10;
      const soil = [139, 132, 94],
        meadow = [102, 125, 91];
      let color = soil.map((c, i) => c * (1 - cover) + meadow[i] * cover + paper + (stroke - 0.5) * 12);
      // Broad, broken brush strokes form clumps, rather than evenly scattered dots.
      const tuft = smooth(clamp((stroke - 0.52) * 7)) * grass * smooth(clamp((patch - 0.34) * 4));
      color = color.map((c, i) => c * (1 - tuft * 0.38) + [70, 107, 88][i] * tuft * 0.38);
      if (bristle > 0.67 && tuft > 0.2) color = color.map((c, i) => c * 0.72 + [133, 154, 112][i] * 0.28);
      // Small fans of tapered dry-brush blades break up the broad underpainting.
      const cellX = Math.floor(wx / 100),
        cellZ = Math.floor(wz / 100);
      const seed = forestHash(cellX, cellZ);
      const gx = (wx % 100) - 50 - (seed - 0.5) * 30;
      const gz = (wz % 100) - 20 - forestHash(cellX + 3, cellZ) * 20;
      if (grass > 0.45 && seed > 0.35 && gz > 0 && gz < 46) {
        const t = gz / 46;
        const blade = Math.min(Math.abs(gx - t * 19), Math.abs(gx + t * 16), Math.abs(gx - 3));
        const ink = clamp((5.5 * (1 - t) - blade + (grain - 0.5) * 2) / 2) * 0.5;
        color = color.map((c, i) => c * (1 - ink) + [78, 115, 94][i] * ink);
      }
      // Sparse buried fragments, not a circular checkerboard plaza.
      const row = Math.floor(wz / 74),
        col = Math.floor((wx + (row % 2) * 43) / 88);
      const stone = forestHash(col, row);
      if (clearingDistance < 260 && stone > 0.8) {
        const px = (wx + (row % 2) * 43) % 88,
          pz = wz % 74;
        const shape = Math.abs((px - 44) / 34) + Math.abs((pz - 37) / 29);
        const amount = clamp((1 - shape + (stroke - 0.5) * 0.5) * 3) * 0.65;
        color = color.map((c, i) => c * (1 - amount) + ([150, 149, 115][i] + paper) * amount);
      }
      const i = (y * size + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }
  }
  cached = { width: size, height: size, pixels };
  return cached;
}
