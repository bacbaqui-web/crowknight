import test from 'node:test';
import assert from 'node:assert/strict';
import { maintainBossEncounter } from '../src/boss_encounter_flow.js';
import { bossEdgeMarker } from '../src/quarter_view/boss_compass.js';
import { createSurroundingSpawner } from '../src/quarter_view/bounds.js';
import { groundPoint, QUARTER_PROJECTION } from '../src/quarter_view/camera.js';
const boss = (id) => ({ id, group: 'bosses', player: { x: 0, y: 500, dead: false }, quarterDepth: 0 });
test('one random boss lives, next draw only occurs after its death', () => {
  const bosses = [boss('original'), boss('bomb'), boss('mage'), boss('tank')];
  let draws = 0,
    spawns = 0;
  const hooks = {
    hide: (a) => {
      a.respawning = true;
      a.player.dead = true;
    },
    respawn: (a) => {
      spawns++;
      a.respawning = false;
      a.player.dead = false;
    },
    eligible: () => true,
    random: () => {
      draws++;
      return draws === 1 ? 0.65 : 0.95;
    },
  };
  maintainBossEncounter(bosses, hooks);
  assert.equal(bosses.filter((a) => !a.player.dead).length, 1);
  assert.equal(bosses[2].player.dead, false);
  bosses[2].player.x = 1e8;
  for (let i = 0; i < 100; i++) maintainBossEncounter(bosses, hooks);
  assert.equal(draws, 1);
  assert.equal(spawns, 1);
  bosses[2].player.dead = true;
  maintainBossEncounter(bosses, hooks);
  assert.equal(bosses[3].player.dead, false);
  assert.equal(draws, 2);
  assert.equal(bosses.filter((a) => !a.player.dead).length, 1);
});
test('disabled pool and new-run actors do not retain an old encounter', () => {
  const hooks = {
    hide: (a) => {
      a.respawning = true;
      a.player.dead = true;
    },
    respawn: (a) => {
      a.respawning = false;
      a.player.dead = false;
    },
    eligible: () => false,
  };
  const a = boss('a');
  maintainBossEncounter([a], hooks);
  assert.equal(a.player.dead, true);
  const b = boss('b');
  maintainBossEncounter([b], { ...hooks, eligible: () => true });
  assert.equal(b.player.dead, false);
});
test('every projected spawn is outside the viewport, across sizes, zooms and jumps', () => {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [2560, 1440],
  ])
    for (const zoom of [0.5, 1, 1.5])
      for (const jump of [0, 200]) {
        const target = { player: { x: 12345, y: 500 - jump }, quarterDepth: -9000 };
        const view = {
          width,
          height,
          x: target.player.x + 110,
          depth: target.quarterDepth - jump / QUARTER_PROJECTION.slope,
          zoom,
        };
        const world = { viewW: width, viewH: height, floorY: 500, quarterView: { getCameraView: () => view } };
        const spawn = createSurroundingSpawner(world, () => 0.5);
        for (let i = 0; i < 8; i++) {
          const enemy = { player: {} };
          spawn(enemy, target);
          const p = groundPoint(enemy.player.x, enemy.quarterDepth, view);
          assert.ok(
            p.x + 120 * zoom < 0 || p.x - 120 * zoom > width || p.y < 0 || p.y - 200 * zoom > height,
            `${width} ${height} ${zoom} ${jump} ${i}: ${JSON.stringify(p)}`
          );
        }
      }
});
test('skull follows all eight edges and disappears when boss enters view or dies', () => {
  const view = { width: 1280, height: 720, x: 0, depth: 0, zoom: 1 };
  const a = boss('boss');
  assert.equal(bossEdgeMarker(a, view, 500), null);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    a.player.x = Math.cos(angle) * 10000;
    a.quarterDepth = Math.sin(angle) * 10000;
    const m = bossEdgeMarker(a, view, 500);
    assert.ok(m);
    assert.ok(m.x >= 33.9 && m.x <= 1246.1 && m.y >= 33.9 && m.y <= 686.1);
  }
  a.player.dead = true;
  assert.equal(bossEdgeMarker(a, view, 500), null);
});

test('boss replacement preserves moving death fragments through their fade, including the same boss draw', async () => {
  const { startDeathRagdoll, updateDeathRagdoll, drawDeathRagdoll, isDeathRagdollVisible } = await import('../src/death_ragdoll_engine.js');
  const a = boss('tank');
  a.player.assets = { body: { width: 100, height: 100 } };
  let spawns = 0;
  const hooks = {
    eligible: () => true, random: () => 0,
    hide(actor) { actor.respawning = true; actor.player.dead = true; actor.player.deathRagdoll = null; },
    respawn(actor) { spawns++; actor.respawning = false; actor.player.dead = false; actor.player.deathRagdoll = null; },
  };
  maintainBossEncounter([a], hooks);
  startDeathRagdoll(a.player, { shatter: true }, { floorY: 500 });
  a.player.dead = true;
  const fragments = a.player.deathRagdoll;
  assert.equal(fragments.parts.length, 4);
  const initialX = fragments.parts[0].x;
  for (let frame = 0; frame < 170; frame++) {
    updateDeathRagdoll(a.player, 1 / 60, { floorY: 500 });
    maintainBossEncounter([a], hooks);
    assert.equal(a.respawning, false);
    assert.equal(a.player.deathRagdoll, fragments);
    assert.equal(spawns, 1);
  }
  assert.notEqual(fragments.parts[0].x, initialX);
  let draws = 0;
  drawDeathRagdoll(a.player, { globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage() { draws++; } });
  assert.equal(draws, 4);
  updateDeathRagdoll(a.player, .1, { floorY: 500 });
  assert.equal(isDeathRagdollVisible(a.player), false);
  maintainBossEncounter([a], hooks);
  assert.equal(spawns, 2);
  assert.equal(a.player.dead, false);
});
