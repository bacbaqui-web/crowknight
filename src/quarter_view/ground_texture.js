export const GROUND_TILE_SIZE = { x: 800, z: 800 };
export function createGroundTexture(size = 256) {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2,
        v = (y / size) * Math.PI * 2;
      const path = Math.abs(Math.sin(u + Math.sin(v) * 0.65));
      const dirt = Math.max(0, Math.min(1, (0.24 - path) * 12));
      const noise = (((Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0) % 17) - 8;
      const patch = Math.sin(u * 3 + v * 2) * 5 + Math.cos(v * 4 - u) * 3;
      const grass = [60, 78, 48],
        soil = [111, 93, 62];
      const color = grass.map((channel, i) => channel * (1 - dirt) + soil[i] * dirt + patch + noise);
      if (dirt < 0.3 && (x * 17 + y * 31) % 47 < 2) {
        color[0] += 18;
        color[1] += 23;
        color[2] += 10;
      }
      const i = (y * size + x) * 4;
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }
  return { width: size, height: size, pixels };
}
