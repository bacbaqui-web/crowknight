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
  const roadWidth = 88 + 15 * Math.sin(x * K * 3) * Math.cos(z * K * 2);
  const clearingEdge = clearingDistance - 310 + 25 * Math.sin(x * K * 7) * Math.cos(z * K * 5);
  const edge = Math.min(roadDistance - roadWidth, clearingEdge);
  return { edge, roadDistance, clearingDistance };
}
export function forestHash(x, z) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const clamp = (v) => Math.max(0, Math.min(1, v));
// Distinct connected land uses. Geometry is periodic and shared with scenery placement.
export function forestTerrain(x, z) {
  x = ((x % FOREST_PERIOD) + FOREST_PERIOD) % FOREST_PERIOD;
  z = ((z % FOREST_PERIOD) + FOREST_PERIOD) % FOREST_PERIOD;
  const ground = forestGround(x, z);
  const wave = 9 * Math.sin(x * K * 19) * Math.cos(z * K * 17);
  const pond =
    (Math.hypot(wrap(x - 1210) / 430, wrap(z + 470) / 300) - 1) * 300 +
    35 * Math.sin(x * K * 4 + z * K * 3) +
    22 * Math.cos(x * K * 7 - z * K * 5) +
    wave;
  const plaza =
    (Math.hypot(wrap(x - 220) / 220, wrap(z - 240) / 180) - 1) * 180 + 24 * Math.sin(x * K * 13 + z * K * 9) + wave;
  const vertical = Math.abs(wrap(x - 480 - 180 * Math.sin(z * K))) - 62;
  const soil = (Math.hypot(wrap(x - 2350) / 340, wrap(z - 1750) / 260) - 1) * 260 + wave;
  const transition = (a, b, edge, width = 20) => ({ a, b, mix: clamp((edge + width) / (width * 2)) });
  if (pond < -32 && ground.edge > 70) return transition('water', 'mud', pond + 45, 13);
  if (pond < 4 && ground.edge > 65) return transition('mud', 'sand', pond + 14, 18);
  if (pond < 46 && ground.edge > 45) return transition('sand', 'grass', pond - 23, 23);
  if (plaza < 24) return transition('tile', 'gravel', plaza, 24);
  if (plaza < 62) return transition('gravel', ground.edge < 26 ? 'earth' : 'grass', plaza - 43, 19);
  if (vertical < 20) return transition('road', 'earth', vertical, 20);
  if (ground.edge < 26) return transition('earth', 'grass', ground.edge + wave, 26);
  if (soil < 25) return transition('earth', 'grass', soil, 25);
  return { a: 'grass', b: 'grass', mix: 0 };
}
export function forestWater(x, z) {
  const t = forestTerrain(x, z);
  return t.a === 'water' && t.mix < 0.95;
}
