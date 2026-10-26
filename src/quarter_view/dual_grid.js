import { FOREST_PERIOD, forestTerrain } from './forest_layout.js';
export const DUAL_CELL = 80;
export const DUAL_COUNT = FOREST_PERIOD / DUAL_CELL;
// NW, NE, SW, SE. Display cells join four logical terrain samples.
export const DUAL_LAYERS = [
  { id: 'earth', base: 'grass', members: ['earth', 'road', 'tile', 'gravel'] },
  { id: 'sand', base: 'grass', members: ['sand', 'mud', 'water'] },
  { id: 'road', base: 'earth', members: ['road'] },
  { id: 'tile', base: 'earth', members: ['tile'] },
  { id: 'water', base: 'sand', members: ['water'] },
];
const wrap = (v) => ((v % DUAL_COUNT) + DUAL_COUNT) % DUAL_COUNT;
export function logicalTerrain(x, z) {
  const t = forestTerrain(x, z);
  return t.mix < 0.5 ? t.a : t.b;
}
export function dualMask(cx, cz, members, field = logicalTerrain) {
  let mask = 0;
  for (let dz = 0; dz < 2; dz++)
    for (let dx = 0; dx < 2; dx++) {
      if (members.includes(field(wrap(cx + dx) * DUAL_CELL, wrap(cz + dz) * DUAL_CELL))) mask |= 1 << (dz * 2 + dx);
    }
  return mask;
}
const smooth = (v) => v * v * (3 - 2 * v);
const clamp = (v) => Math.max(0, Math.min(1, v));
// Shared edges depend on shared corner bits only. Interior variants vanish at edges.
export function dualCoverage(mask, u, v, variant = 0, fringe = 0.025) {
  if (mask === 0) return 0;
  if (mask === 15) return 1;
  const x = smooth(u),
    z = smooth(v);
  const nw = mask & 1 ? 1 : 0,
    ne = mask & 2 ? 1 : 0,
    sw = mask & 4 ? 1 : 0,
    se = mask & 8 ? 1 : 0;
  const field = (nw * (1 - x) + ne * x) * (1 - z) + (sw * (1 - x) + se * x) * z;
  const interior = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
  const brush = Math.sin(u * Math.PI * 16) * Math.cos(v * Math.PI * 12) * fringe;
  const bend = Math.sin((u + v) * Math.PI * 4 + variant) * interior * 0.045;
  return clamp((field - 0.5 + brush + bend) / 0.045 + 0.5);
}
let layout;
export function dualLayout() {
  return (layout ||= Array.from({ length: DUAL_COUNT * DUAL_COUNT }, (_, i) =>
    DUAL_LAYERS.map((layer) => dualMask(i % DUAL_COUNT, Math.floor(i / DUAL_COUNT), layer.members))
  ));
}
export function dualCellAt(x, z) {
  const gx = x / DUAL_CELL,
    gz = z / DUAL_CELL,
    cx = Math.floor(gx),
    cz = Math.floor(gz);
  return {
    masks: dualLayout()[wrap(cz) * DUAL_COUNT + wrap(cx)],
    u: gx - cx,
    v: gz - cz,
    variant: ((wrap(cx) * 7 + wrap(cz) * 13) % 4) * 1.7,
  };
}
export function dualWater(x, z) {
  const cell = dualCellAt(x, z);
  return dualCoverage(cell.masks[4], cell.u, cell.v, cell.variant, 0.008) > 0.5;
}
