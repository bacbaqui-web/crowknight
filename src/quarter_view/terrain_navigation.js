import { depthOf, normalizeDirection } from './camera.js';

// Slab intersection is shared by route visibility and swept arrow collision.
export function segmentBox(a, b, min, max) {
  let enter = 0,
    exit = 1;
  for (const axis of Object.keys(min)) {
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-8) {
      if (a[axis] <= min[axis] || a[axis] >= max[axis]) return false;
      continue;
    }
    let t0 = (min[axis] - a[axis]) / d,
      t1 = (max[axis] - a[axis]) / d;
    if (t0 > t1) [t0, t1] = [t1, t0];
    enter = Math.max(enter, t0);
    exit = Math.min(exit, t1);
    if (enter > exit) return false;
  }
  return exit > 0 && enter < 1;
}
function box(o, pad = 14) {
  return {
    min: { x: o.x - o.w / 2 - pad, z: o.z - o.d / 2 - pad },
    max: { x: o.x + o.w / 2 + pad, z: o.z + o.d / 2 + pad },
  };
}
export function routeAround(start, goal, objects) {
  const boxes = objects.map((o) => box(o));
  goal = { ...goal };
  for (const b of boxes)
    if (goal.x > b.min.x && goal.x < b.max.x && goal.z > b.min.z && goal.z < b.max.z) {
      const options = [
        { x: b.min.x - 2, z: goal.z },
        { x: b.max.x + 2, z: goal.z },
        { x: goal.x, z: b.min.z - 2 },
        { x: goal.x, z: b.max.z + 2 },
      ];
      options.sort((a, b) => Math.hypot(a.x - start.x, a.z - start.z) - Math.hypot(b.x - start.x, b.z - start.z));
      goal = options[0];
    }
  const clear = (a, b) => !boxes.some((o) => segmentBox(a, b, o.min, o.max));
  if (clear(start, goal)) return [goal];
  const nodes = [start, goal];
  for (const b of boxes)
    for (const x of [b.min.x - 2, b.max.x + 2]) for (const z of [b.min.z - 2, b.max.z + 2]) nodes.push({ x, z });
  const cost = nodes.map(() => Infinity),
    parent = [],
    visited = new Set();
  cost[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (u < 0 || cost[i] < cost[u])) u = i;
    if (u < 0 || !Number.isFinite(cost[u])) break;
    if (u === 1) break;
    visited.add(u);
    for (let v = 1; v < nodes.length; v++)
      if (!visited.has(v) && clear(nodes[u], nodes[v])) {
        const next = cost[u] + Math.hypot(nodes[u].x - nodes[v].x, nodes[u].z - nodes[v].z);
        if (next < cost[v]) {
          cost[v] = next;
          parent[v] = u;
        }
      }
  }
  if (!Number.isFinite(cost[1])) return [];
  const path = [];
  for (let i = 1; i !== 0; i = parent[i]) path.unshift(nodes[i]);
  return path;
}
export function createTerrainNavigation(environment, world) {
  const cache = new WeakMap();
  return (actor, target, direction) => {
    if (!direction || !actor.player.onGround) return direction;
    const start = { x: actor.player.x, z: depthOf(actor) },
      goal = { x: target.player.x, z: depthOf(target) };
    if (direction.x * (goal.x - start.x) + direction.z * (goal.z - start.z) < 0) return direction;
    const now = actor.player.animTime || 0;
    let saved = cache.get(actor);
    if (
      !saved ||
      now < saved.time ||
      now - saved.time > 0.4 ||
      Math.hypot(goal.x - saved.goal.x, goal.z - saved.goal.z) > 90
    ) {
      const height = world.floorY - actor.player.y;
      const objects = environment
        .nearby(
          (start.x + goal.x) / 2,
          (start.z + goal.z) / 2,
          Math.min(1800, Math.abs(start.x - goal.x) / 2 + 300),
          Math.min(1800, Math.abs(start.z - goal.z) / 2 + 300)
        )
        .filter((o) => !o.climbable || height < o.height - 1);
      saved = { goal, time: now, path: routeAround(start, goal, objects) };
      cache.set(actor, saved);
    }
    while (saved.path.length > 1 && Math.hypot(saved.path[0].x - start.x, saved.path[0].z - start.z) < 12)
      saved.path.shift();
    const next = saved.path[0];
    return next ? normalizeDirection(next.x - start.x, next.z - start.z) || direction : direction;
  };
}
export function terrainBlocksProjectile(p, environment, world) {
  if (p.powderBomb || p.mageFire || p.quarterDepth == null) return false;
  const a = { x: p.previousX ?? p.x, z: p.previousDepth ?? p.quarterDepth, y: p.previousY ?? p.y },
    b = { x: p.x, z: p.quarterDepth, y: p.y };
  const aim = p.quarterAim || { x: 1, z: 0 },
    half = (p.hitboxWidth || 8) / 2;
  const px = Math.abs(aim.x) * half + 3,
    pz = Math.abs(aim.z) * half + 3,
    py = (p.hitboxHeight || 4) / 2;
  return environment
    .nearby((a.x + b.x) / 2, (a.z + b.z) / 2, Math.abs(b.x - a.x) / 2 + 200, Math.abs(b.z - a.z) / 2 + 200)
    .some((o) =>
      segmentBox(
        a,
        b,
        { x: o.x - o.w / 2 - px, z: o.z - o.d / 2 - pz, y: world.floorY - o.height - py },
        { x: o.x + o.w / 2 + px, z: o.z + o.d / 2 + pz, y: world.floorY + py }
      )
    );
}
