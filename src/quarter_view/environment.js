import { BOULDER_PROFILES } from './scenery_catalog.js';
import { dualWater } from './dual_grid.js';
import { forestGround, forestHash } from './forest_layout.js';
import { stunTankOnTerrain } from '../boss_pattern_runtime.js';
import { depthOf } from './camera.js';

const CELL = 560;
export const SCENERY_TYPES = Object.freeze({
  boulder: { w: 180, d: 130, height: 120, climbable: true },
  rock: { w: 144, d: 120, height: 52.8, climbable: true },
  hut: { w: 204, d: 168, height: 98.4, climbable: true },
  tree: { w: 50.4, d: 52.8, height: 396, climbable: false },
});
export function createEnvironment() {
  const preview = Number(new globalThis.URLSearchParams(globalThis.location?.search || '').get('boulder'));
  const startVariant = Number.isInteger(preview) && preview >= 0 && preview < BOULDER_PROFILES.length ? preview : 0;
  let originX = 480;
  const cache = new Map();
  function cell(x, z) {
    const key = `${x}:${z}`;
    if (cache.has(key)) return cache.get(key);
    const objects = [];
    if (x === 0 && z === 0) {
      objects.push(
        make('boulder', originX + 190, 0, 'start-boulder', startVariant),
        make('rock', originX + 320, -150, 'start-stones'),
        make('hut', originX - 260, 240, 'start-hut', 4),
        make('hut', originX - 340, 500, 'start-wall', 2),
        make('tree', originX + 100, -300, 'start-tree', 3),
        make('tree', originX - 65, -500, 'start-tree-left', 5),
        make('tree', originX + 235, -530, 'start-tree-right', 7)
      );
    } else {
      const density = 4 + Math.floor(forestHash(x + 301, z - 71) * 3);
      let boulderIndex =
        (((x * 3 + z * 5) % BOULDER_PROFILES.length) + BOULDER_PROFILES.length) % BOULDER_PROFILES.length;
      let treeIndex = (((x * 4 + z * 7) % 9) + 9) % 9;
      for (let i = 0; i < density; i++) {
        const seed = forestHash(x * 7 + i, z);
        const px = originX + x * CELL + (forestHash(x * 11 + i, z + 81) - 0.5) * 380;
        const pz = z * CELL + (forestHash(x + 71, z * 13 + i) - 0.5) * 380;
        const terrain = forestGround(px, pz);
        // Keep the road and clearing walkable, including the obstacle's footprint.
        if (terrain.edge < 130 || dualWater(px, pz)) continue;
        if (i >= 2 && terrain.edge < 200) continue;
        const type =
          terrain.edge < 230 ? (seed < 0.28 ? 'hut' : 'rock') : seed < 0.1 ? 'hut' : seed < 0.3 ? 'rock' : 'tree';
        const actualType = type === 'rock' && forestHash(x * 31 + i, z + 15) > 0.4 ? 'boulder' : type;
        const object = make(actualType, px, pz, `${key}:${i}`, actualType === 'boulder' ? boulderIndex++ : undefined);
        if (type === 'tree') object.variant = treeIndex++ % 9;
        if (objects.some((o) => Math.hypot(o.x - px, o.z - pz) < (o.type === 'tree' && type === 'tree' ? 100 : 170)))
          continue;
        objects.push(object);
      }
    }
    // Low ground cover follows the verge and gathers at existing scenery bases.
    const anchors = objects.slice();
    for (let i = 0; i < 10; i++) {
      const px = originX + x * CELL + (forestHash(x * 19 + i, z + 901) - 0.5) * CELL;
      const pz = z * CELL + (forestHash(x + 411, z * 17 + i) - 0.5) * CELL;
      const edge = forestGround(px, pz).edge;
      if (edge > -18 && edge < 200) addCover(px, pz, i);
    }
    for (const [i, o] of anchors.entries()) {
      addCover(o.x - o.w * 0.6 - 25, o.z + 15, i + 10);
      if (o.type !== 'tree') addCover(o.x + o.w * 0.65, o.z - 25, i + 20);
    }
    function addCover(px, pz, i) {
      if (dualWater(px, pz)) return;
      objects.push({
        type: 'bush',
        x: px,
        z: pz,
        w: 0,
        d: 0,
        height: 42,
        decorative: true,
        id: `${key}:cover:${i}`,
        variant: (((x * 3 + z * 5 + i) % 6) + 6) % 6,
      });
    }
    cache.set(key, objects);
    if (cache.size > 100) cache.delete(cache.keys().next().value);
    return objects;
  }
  function make(type, x, z, id, variant = Math.floor(forestHash(Math.floor(x), Math.floor(z)) * 256)) {
    const profile = type === 'boulder' ? BOULDER_PROFILES[variant % BOULDER_PROFILES.length] : null;
    const groundDecoration = type === 'rock' || (type === 'hut' && [0, 4, 5].includes(variant % 6));
    return {
      ...SCENERY_TYPES[type],
      ...(profile
        ? { w: profile.w, d: profile.d, height: profile.landing, topW: profile.topW, topD: profile.topD }
        : {}),
      ...(groundDecoration
        ? { w: 0, d: 0, height: 0, climbable: false, decorative: true, groundDecoration: true }
        : {}),
      type,
      x,
      z,
      id,
      variant,
    };
  }
  function nearby(x, z, radiusX = 300, radiusZ = radiusX, includeDecor = false) {
    const result = [];
    for (let cz = Math.floor((z - radiusZ) / CELL) - 1; cz <= Math.ceil((z + radiusZ) / CELL) + 1; cz++)
      for (
        let cx = Math.floor((x - originX - radiusX) / CELL) - 1;
        cx <= Math.ceil((x - originX + radiusX) / CELL) + 1;
        cx++
      )
        for (const object of cell(cx, cz))
          if (
            (includeDecor || !object.decorative) &&
            Math.abs(object.x - x) < radiusX + 180 &&
            Math.abs(object.z - z) < radiusZ + 180
          )
            result.push(object);
    return result;
  }
  const inside = (o, x, z, pad = 0) => Math.abs(x - o.x) < o.w / 2 + pad && Math.abs(z - o.z) < o.d / 2 + pad;
  const onTop = (o, x, z) => Math.abs(x - o.x) < (o.topW || o.w) / 2 && Math.abs(z - o.z) < (o.topD || o.d) / 2;
  function support(actor, world) {
    const height = world.floorY - actor.player.y;
    return nearby(actor.player.x, depthOf(actor))
      .filter((o) => o.climbable && onTop(o, actor.player.x, depthOf(actor)) && height >= o.height - 2)
      .sort((a, b) => b.height - a.height)[0];
  }
  function before(actor, world, motionWorld) {
    const platform = support(actor, world);
    motionWorld.floorY = world.floorY - (platform?.height || 0);
    actor.quarterTerrainStart = { x: actor.player.x, z: depthOf(actor), y: actor.player.y };
  }
  function after(actor, world) {
    const p = actor.player,
      start = actor.quarterTerrainStart || { x: p.x, z: depthOf(actor), y: p.y };
    const objects = nearby(
      (start.x + p.x) / 2,
      (start.z + depthOf(actor)) / 2,
      Math.abs(p.x - start.x) / 2 + 250,
      Math.abs(depthOf(actor) - start.z) / 2 + 250
    );
    const height = world.floorY - Math.min(start.y, p.y);
    const blocks = objects.filter((o) => !o.climbable || height < o.height - 1);
    const endX = p.x,
      endZ = depthOf(actor);
    let x = start.x,
      z = start.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(endX - x, endZ - z) / 12));
    const dx = (endX - x) / steps,
      dz = (endZ - z) / steps;
    for (let i = 0; i < steps; i++) {
      if (!blocks.some((o) => inside(o, x + dx, z, 14))) x += dx;
      if (!blocks.some((o) => inside(o, x, z + dz, 14))) z += dz;
    }
    if (Math.hypot(endX - x, endZ - z) > 1 && actor.bossPattern) stunTankOnTerrain(actor);
    p.x = x;
    actor.quarterDepth = z;
    // Resolve spawn/knockback overlaps with the nearest face, without trapping the actor.
    for (const o of blocks)
      if (inside(o, x, z, 14)) {
        const choices = [
          { axis: 'x', v: o.x - o.w / 2 - 15 },
          { axis: 'x', v: o.x + o.w / 2 + 15 },
          { axis: 'z', v: o.z - o.d / 2 - 15 },
          { axis: 'z', v: o.z + o.d / 2 + 15 },
        ];
        choices.sort((a, b) => Math.abs(a.v - (a.axis === 'x' ? x : z)) - Math.abs(b.v - (b.axis === 'x' ? x : z)));
        const c = choices[0];
        if (c.axis === 'x') x = c.v;
        else z = c.v;
      }
    p.x = x;
    actor.quarterDepth = z;
    p.quarterDepth = z;
    const landing = objects
      .filter(
        (o) =>
          o.climbable &&
          onTop(o, x, z) &&
          start.y <= world.floorY - o.height + 2 &&
          p.y >= world.floorY - o.height &&
          p.vy >= 0
      )
      .sort((a, b) => b.height - a.height)[0];
    if (landing) {
      p.y = world.floorY - landing.height;
      p.vy = 0;
      p.onGround = true;
    }
    const platform = support(actor, world);
    actor.quarterPlatform = platform || null;
    p.floorY = world.floorY - (platform?.height || 0);
    if (p.y < p.floorY - 1 && p.vy >= 0) p.onGround = false;
    delete actor.quarterTerrainStart;
  }
  return {
    nearby,
    before,
    after,
    reset(x) {
      originX = x;
      cache.clear();
    },
    get cacheSize() {
      return cache.size;
    },
  };
}
