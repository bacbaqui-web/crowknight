import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGroundCollision } from '../src/quarter_view/spatial.js';
import { resolveCollisionInteractions } from '../src/combat_collision_helper.js';
import { createInteractionRegionFrameCache, cachedInteractionRegions } from '../src/combat_cache_helper.js';
import { createGroundRenderer } from '../src/quarter_view/ground_renderer.js';
import { syncRunHud } from '../src/run_hud_view.js';

function actor(x) {
  const a = { quarterDepth: 0, group: 'mobs', reads: 0, player: { x, y: 430 } };
  Object.defineProperty(a.player, 'collisionInteractionRegions', {
    get() {
      a.reads++;
      return [{ x: a.player.x - 25, y: 350, w: 50, h: 80, reaction: { noOverlap: true, pushPower: 1, resistance: 1 } }];
    },
  });
  return a;
}
test('ground collision reuses pose dimensions and preserves sequential pushes with fresh combat positions', () => {
  const native = [0, 15, 30, 45].map(actor),
    cached = [0, 15, 30, 45].map(actor),
    cache = createInteractionRegionFrameCache();
  for (let i = 0; i < native.length; i++)
    for (let j = i + 1; j < native.length; j++) resolveGroundCollision(native[i], native[j]);
  resolveCollisionInteractions(cached, cache, { quarterView: { resolveCollision: resolveGroundCollision } });
  assert.deepEqual(
    cached.map((a) => a.player.x),
    native.map((a) => a.player.x)
  );
  assert.ok(cached.every((a) => a.reads === 1));
  assert.ok(native.reduce((n, a) => n + a.reads, 0) > cached.reduce((n, a) => n + a.reads, 0));
  assert.equal(cachedInteractionRegions(cache, cached[0], 'collision')[0].x, cached[0].player.x - 25);
});
test('far ground pairs skip geometry construction entirely', () => {
  const a = actor(0),
    b = actor(1000);
  resolveGroundCollision(a, b);
  assert.equal(a.reads + b.reads, 0);
});
test('ground image is reused only while camera, viewport and tile origin are identical', () => {
  let paints = 0,
    blits = 0;
  const buffer = {
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillRect() {
      paints++;
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
  };
  const surface = { width: 0, height: 0, getContext: () => buffer };
  const ctx = {
    drawImage(image) {
      assert.equal(image, surface);
      blits++;
    },
  };
  const world = { viewW: 400, viewH: 300 },
    view = { width: 400, height: 300, x: 590, depth: 0, zoom: 1 },
    hero = { player: { x: 480 } };
  const draw = createGroundRenderer(ctx, world, () => surface);
  for (let i = 0; i < 5; i++) draw(hero, view);
  assert.equal(paints, 2);
  assert.equal(blits, 5);
  for (const change of [
    () => view.x++,
    () => view.depth++,
    () => (view.zoom = 1.1),
    () => (hero.player.x = 600),
    () => {
      world.viewW = 500;
      view.width = 500;
    },
  ]) {
    change();
    const before = paints;
    draw(hero, view);
    assert.equal(paints, before + 2);
  }
  assert.equal(surface.width, 500);
});
test('HUD values update when visible text changes rather than on every animation frame', () => {
  let writes = 0;
  const element = () => ({
    get textContent() {
      return this.value;
    },
    set textContent(value) {
      this.value = value;
      writes++;
    },
  });
  const hudSurvivalTime = element(),
    hudKills = element(),
    hudBossKills = element();
  for (let frame = 0; frame < 90; frame++)
    syncRunHud({ survivalTime: frame / 60, kills: 0, bossKills: 0, hudSurvivalTime, hudKills, hudBossKills });
  assert.equal(writes, 4);
});
