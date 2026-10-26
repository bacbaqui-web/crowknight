import { forestGround, forestHash } from './forest_layout.js';
import { stunTankOnTerrain } from '../boss_pattern_runtime.js';
import { depthOf } from './camera.js';

const CELL = 560;
export const SCENERY_TYPES = Object.freeze({
  rock: { w: 120, d: 100, height: 44, climbable: true },
  hut: { w: 170, d: 140, height: 82, climbable: true },
  tree: { w: 42, d: 44, height: 260, climbable: false },
});
export function createEnvironment() {
  let originX = 480;
  const cache = new Map();
  function cell(x, z) {
    const key = `${x}:${z}`;
    if (cache.has(key)) return cache.get(key);
    const objects = [];
    if (x === 0 && z === 0) {
      objects.push(
        make('rock', originX + 190, 0, 'start-rock'),
        make('hut', originX - 260, 240, 'start-hut'),
        make('tree', originX + 100, -300, 'start-tree')
      );
    } else {
      for (let i = 0; i < 3; i++) {
        const seed = forestHash(x * 7 + i, z);
        const px = originX + x * CELL + (forestHash(x * 11 + i, z + 81) - 0.5) * 380;
        const pz = z * CELL + (forestHash(x + 71, z * 13 + i) - 0.5) * 380;
        const terrain = forestGround(px, pz);
        // Keep the road and clearing walkable, including the obstacle's footprint.
        if (terrain.edge < 130) continue;
        if (i === 2 && terrain.edge < 330) continue;
        const type = i > 0 ? 'tree' : seed < 0.24 ? 'hut' : seed < 0.5 ? 'rock' : 'tree';
        const object = make(type, px, pz, `${key}:${i}`);
        if (objects.some((o) => Math.hypot(o.x - px, o.z - pz) < 170)) continue;
        objects.push(object);
      }
    }
    cache.set(key, objects);
    if (cache.size > 100) cache.delete(cache.keys().next().value);
    return objects;
  }
  function make(type, x, z, id) {
    return {
      ...SCENERY_TYPES[type],
      type,
      x,
      z,
      id,
      variant: Math.floor(forestHash(Math.floor(x), Math.floor(z)) * 3),
    };
  }
  function nearby(x, z, radiusX = 300, radiusZ = radiusX) {
    const result = [];
    for (let cz = Math.floor((z - radiusZ) / CELL) - 1; cz <= Math.ceil((z + radiusZ) / CELL) + 1; cz++)
      for (
        let cx = Math.floor((x - originX - radiusX) / CELL) - 1;
        cx <= Math.ceil((x - originX + radiusX) / CELL) + 1;
        cx++
      )
        for (const object of cell(cx, cz))
          if (Math.abs(object.x - x) < radiusX + 180 && Math.abs(object.z - z) < radiusZ + 180) result.push(object);
    return result;
  }
  const inside = (o, x, z, pad = 0) => Math.abs(x - o.x) < o.w / 2 + pad && Math.abs(z - o.z) < o.d / 2 + pad;
  function support(actor, world) {
    const height = world.floorY - actor.player.y;
    return nearby(actor.player.x, depthOf(actor))
      .filter((o) => o.climbable && inside(o, actor.player.x, depthOf(actor)) && height >= o.height - 2)
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
          inside(o, x, z) &&
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
