import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInteractionDamage } from '../src/combat_reaction_helper.js';
import { createDamageNumbers } from '../src/quarter_view/damage_numbers.js';

test('damage popup receives actual HP loss, including guard and lethal hit; evade produces none', () => {
  const hits = [];
  const attacker = { player: { x: 0, actions: [] } };
  const target = { hp: 100, maxHp: 100, player: { x: 0, actions: [], runSkills: {} } };
  const args = {
    attacker,
    target,
    playerActor: target,
    onPlayerDeath() {},
    world: { quarterView: { showDamage: (a, n) => hits.push([a, n]) } },
  };
  applyInteractionDamage({ ...args, damage: 20, guarded: true });
  assert.equal(hits[0][1], 4);
  target.player.runEvadeTime = 1;
  applyInteractionDamage({ ...args, damage: 20 });
  assert.equal(hits.length, 1);
  target.player.runEvadeTime = 0;
  target.hp = 7;
  applyInteractionDamage({ ...args, damage: 100 });
  assert.equal(hits[1][1], 7);
});

test('damage numbers are bounded, rise, expire, pause and reset', () => {
  const text = [];
  const ctx = { save() {}, restore() {}, strokeText() {}, fillText: (...args) => text.push(args) };
  const numbers = createDamageNumbers(ctx, { floorY: 430 });
  const target = { player: { x: 0, y: 430 }, quarterDepth: 20 };
  numbers.show(target, 12.34);
  const view = { x: 0, depth: 0, width: 800, height: 600, zoom: 1 };
  numbers.draw(view, 0);
  const y = text.at(-1)[2];
  assert.equal(text[0][0], '12.3');
  numbers.draw(view, 0);
  assert.equal(text.at(-1)[2], y);
  numbers.draw(view, 0.1);
  assert.ok(text.at(-1)[2] < y);
  for (let i = 2; i <= 9; i++) numbers.draw(view, i / 10);
  assert.equal(numbers.count, 0);
  for (let i = 0; i < 120; i++) numbers.show(target, 1);
  assert.equal(numbers.count, 96);
  numbers.reset();
  assert.equal(numbers.count, 0);
});
