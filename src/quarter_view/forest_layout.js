// One periodic field drives both the painted ground and obstacle placement.
export const FOREST_PERIOD = 3200;
const K = (Math.PI * 2) / FOREST_PERIOD;
const wrap = (v) => ((((v + FOREST_PERIOD / 2) % FOREST_PERIOD) + FOREST_PERIOD) % FOREST_PERIOD) - FOREST_PERIOD / 2;
export function forestGround(x, z) {
  const roadZ = 150 * Math.sin((x - 480) * K) + 65 * Math.sin((x - 480) * K * 2);
  const roadX = 480 + 180 * Math.sin(z * K);
  const roadDistance = Math.min(Math.abs(wrap(z - roadZ)), Math.abs(wrap(x - roadX)));
  const cx = wrap(x - 480),
    cz = wrap(z);
  const clearingDistance = Math.hypot(cx, cz * 0.9);
  const edge = Math.min(roadDistance - 88, clearingDistance - 310);
  return { edge, roadDistance, clearingDistance };
}
export function forestHash(x, z) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
