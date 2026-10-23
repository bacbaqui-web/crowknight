import test from 'node:test';
import assert from 'node:assert/strict';
import {
  project,
  unproject,
  unit,
  inStrike,
  createState,
  tick,
  attack,
  spawnWave,
  move,
  LIMIT,
} from '../src/quarter_view/simulation.js';

test('projection round trips and screen controls retain direction', () => {
  for (const [x, z] of [
    [80, -40],
    [-300, 100],
    [0, 0],
  ]) {
    const screen = project(x, z),
      world = unproject(screen.x, screen.y);
    assert.ok(Math.abs(world.x - x) < 0.0001);
    assert.ok(Math.abs(world.z - z) < 0.0001);
  }
  const diagonal = unit(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 0.0001);
});
test('strike respects depth, direction, cooldown and one kill per enemy', () => {
  const state = createState();
  state.hero.aim = unit(1, 0);
  const enemy = { x: 70, z: 0, hp: 1 };
  state.enemies = [enemy];
  assert.equal(inStrike(state.hero, { x: -70, z: 0 }), false);
  assert.equal(inStrike(state.hero, { x: 50, z: 150 }), false);
  assert.equal(attack(state), true);
  assert.equal(state.kills, 1);
  assert.equal(attack(state), false);
  state.hero.cooldown = 0;
  attack(state);
  assert.equal(state.kills, 1);
});
test('pause, dodge immunity, death and boundaries', () => {
  const state = createState();
  spawnWave(state);
  state.paused = true;
  const before = JSON.stringify(state);
  tick(state, 0.1, unit(1, 0), true, true);
  assert.equal(JSON.stringify(state), before);
  state.paused = false;
  state.enemies = [{ x: 45, z: 0, hp: 3, warning: 0.01, cooldown: 0, flash: 0, swing: 0, aim: unit(1, 0) }];
  tick(state, 0.02, unit(0, 0), false, true);
  assert.equal(state.hero.hp, 100);
  assert.ok(state.hero.dashCooldown > 0);
  move(state.hero, unit(1, 0), 99999);
  assert.equal(state.hero.x, LIMIT);
  state.hero.hp = 0;
  const dead = JSON.stringify(state);
  tick(state, 0.1, unit(1, 0), true, true);
  assert.equal(JSON.stringify(state), dead);
});
test('cleared wave heals and spawns bounded enemies', () => {
  const state = createState();
  state.hero.hp = 50;
  tick(state, 1.6, unit(0, 0), false, false);
  assert.equal(state.wave, 1);
  assert.equal(state.hero.hp, 65);
  assert.equal(state.enemies.length, 4);
});
