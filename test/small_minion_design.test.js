import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { URL } from 'node:url';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
const data = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
test('small minions reuse swordsman body art at 70 percent scale with independent props', () => {
  const sword = data.actors.swordman;
  for (const id of ['trapper', 'balloon_bomber']) {
    const a = data.actors[id];
    assert.equal(a.tuning.transform.scale, sword.tuning.transform.scale * 0.7);
    for (const key of ['head', 'body', 'upperArmL', 'lowerLegR']) assert.equal(a.assets[key], sword.assets[key]);
    for (const [key, path] of Object.entries(a.assets))
      if (!key.startsWith('__')) assert.ok(existsSync(new URL('../' + path.slice(2), import.meta.url)), path);
  }
  assert.notEqual(data.actors.trapper.assets.backpack, data.actors.balloon_bomber.assets.backpack);
});
test('waist harness layers survive normalization and the hands do not hold suspension ropes', () => {
  const t = mergeTuning(DEFAULT_PLAYER_TUNING, data.actors.balloon_bomber.tuning);
  assert.ok(t.layerOrder.includes('balloonRopes'));
  assert.ok(t.layerOrder.includes('balloonBelt'));
  assert.ok(t.actionOffsets.balloonHover.shoulderL.keyframes.every((frame) => frame.rot === 10));
  assert.equal(t.rig.backpack.opacity, 0);
});
