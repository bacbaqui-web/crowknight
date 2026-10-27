import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBossHazard, advanceBossHazard } from '../src/boss_hazard_runtime.js';
import { breakContactMine } from '../src/contact_mine_combat.js';
import { prepareBossTuning } from '../src/boss_tuning_helper.js';
import { RAM_TANK } from '../src/ram_tank_runtime.js';
const world = { floorY: 500 };
const boss = { id: 'ram_tank', player: { x: 0, y: 500 } };
function target(x, y = 500) {
  return { quarterDepth: 0, player: { x, y, onGround: y === 500 } };
}
test('mine persists for ten minutes, then contact detonates and expires once', () => {
  const mine = makeBossHazard(boss, target(1000), world, 'mine', { x: 0, z: 0 });
  advanceBossHazard(mine, 600, target(1000));
  assert.equal(mine.active, true);
  assert.notEqual(mine.phase, 'blast');
  advanceBossHazard(mine, 0.016, target(0, 400));
  assert.notEqual(mine.phase, 'blast');
  advanceBossHazard(mine, 0.016, target(0));
  assert.equal(mine.phase, 'blast');
  advanceBossHazard(mine, 1.3, target(0));
  assert.equal(mine.active, false);
});
test('ground attacks disarm box mines in side and quarter views without explosion', () => {
  for (const quarter of [false, true]) {
    const mine = makeBossHazard(boss, target(1000), world, 'mine', { x: 0, z: 0 });
    const w = quarter ? { ...world, quarterView: {} } : world;
    const attacks = [{ x: -35, y: quarter ? -30 : 450, w: 70, h: 60, reaction: {} }];
    assert.equal(breakContactMine(mine, target(-50), w, []), false);
    assert.equal(breakContactMine(mine, target(-50, 400), w, attacks), false);
    assert.equal(breakContactMine(mine, target(-50), w, attacks), true);
    assert.equal(mine.active, false);
    assert.notEqual(mine.phase, 'blast');
  }
});
test('tank patrol and charge are twice the former speeds', () => {
  const tuning = { transform: { scale: 1 }, actionSettings: { tankDrive: { formulas: [{ type: 'velocity', x: 7 }] } } };
  prepareBossTuning('ram_tank', tuning);
  assert.equal(tuning.actionSettings.tankDrive.formulas[0].x, 14);
  assert.equal(RAM_TANK.speed, 1700);
});
