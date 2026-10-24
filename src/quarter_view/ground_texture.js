export const GROUND_TILE_SIZE = { x: 200, z: 160 };
const COLORS = [
  [45, 65, 53],
  [41, 61, 49],
];

// The same world point keeps its color as the camera/hero crosses tile boundaries.
export function groundTileColor(x, z) {
  if (z < 0) {
    x = -x;
    z = -z;
  }
  const u = Math.floor(x / 100 + z / 160 + 0.5);
  const v = Math.floor(x / 100 - z / 160 + 0.5);
  const row = u - v,
    parity = ((row % 2) + 2) % 2;
  const col = (u + v - parity) / 2;
  return COLORS[(((col + row) % 2) + 2) % 2];
}
export function createGroundTexture(size = 256) {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const color = groundTileColor(((x + 0.5) * GROUND_TILE_SIZE.x) / size, ((y + 0.5) * GROUND_TILE_SIZE.z) / size);
      const i = (y * size + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }
  return { width: size, height: size, pixels };
}
