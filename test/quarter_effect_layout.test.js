import test from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_DIRECTIONS } from '../src/quarter_view/effect_directions.js';
import {
  DEFAULT_EFFECT_LAYOUT,
  createEffectProfile,
  updateEffectProfile,
  linkEffectProfile,
  readEffectLayoutState,
  saveEffectLayoutState,
  normalizeEffectLayoutState,
  effectLayoutFor,
} from '../src/quarter_view/effect_layout.js';
import { effectPoint } from '../src/quarter_view/attack_geometry.js';
import { drawActorEffectLayers } from '../src/quarter_view/attack_effects.js';

test('one linked direction calibrates all eight; unlinked edits remain local and relinking uses the selected direction', () => {
  const profile = createEffectProfile();
  updateEffectProfile(profile, 'up', { distance: 70, side: -25, width: 1.6, height: 0.8 });
  for (const direction of EFFECT_DIRECTIONS)
    assert.deepEqual(profile.directions[direction.key], { distance: 70, side: -25, width: 1.6, height: 0.8 });
  linkEffectProfile(profile, 'up', false);
  updateEffectProfile(profile, 'up', { width: 2 });
  assert.equal(profile.directions.up.width, 2);
  assert.equal(profile.directions.down.width, 1.6);
  linkEffectProfile(profile, 'down', true);
  for (const direction of EFFECT_DIRECTIONS) assert.equal(profile.directions[direction.key].width, 1.6);
});
test('profile persistence clamps invalid values and preserves independent actors and attacks', () => {
  const state = normalizeEffectLayoutState({
    guides: false,
    profiles: {
      hero: {
        slash: { linked: false, directions: { up: { distance: 999, width: 0, height: Infinity, side: -999 } } },
        jump: createEffectProfile(),
      },
      enemy: { slash: createEffectProfile() },
    },
  });
  assert.deepEqual(state.profiles.hero.slash.directions.up, { distance: 400, side: -250, width: 0.25, height: 1 });
  let data;
  const storage = {
    setItem(_key, value) {
      data = value;
    },
    getItem() {
      return data;
    },
  };
  assert.ok(saveEffectLayoutState(storage, state));
  assert.deepEqual(readEffectLayoutState(storage), state);
  data = 'invalid';
  assert.equal(readEffectLayoutState(storage).guides, true);
  assert.equal(
    saveEffectLayoutState(
      {
        setItem() {
          throw Error('disabled');
        },
      },
      state
    ),
    false
  );
  const actor = { player: { actionKey: 'slash' }, quarterEffectLayouts: state.profiles.hero };
  assert.equal(effectLayoutFor(actor, 'up').width, 0.25);
  actor.player.actionKey = 'unconfigured';
  assert.equal(effectLayoutFor(actor, 'up'), DEFAULT_EFFECT_LAYOUT);
});
test('linked offsets rotate with all eight arrows and sizes share the same direction-local axes', () => {
  const profile = createEffectProfile();
  const actor = {
    player: { x: 480, y: 430, facing: 1, actionKey: 'slash' },
    quarterDepth: 0,
    quarterFloorY: 430,
    quarterEffectLayouts: { slash: profile },
  };
  const center = { x: 500, y: 350 };
  updateEffectProfile(profile, 'right', { distance: 50, side: 20, width: 2, height: 0.5 });
  for (const aim of EFFECT_DIRECTIONS) {
    actor.quarterAim = aim;
    const point = effectPoint(actor, center, center, 'ground', 100);
    assert.ok(Math.abs(point.x - (480 + aim.x * 150 - aim.z * 20)) < 1e-6);
    assert.ok(Math.abs(point.depth - (aim.z * 150 + aim.x * 20)) < 1e-6);
    const tip = effectPoint(actor, { x: center.x + 10, y: center.y - 10 }, center, 'ground', 100);
    assert.ok(Math.abs((tip.x - point.x) * aim.x + (tip.depth - point.depth) * aim.z - 20) < 1e-6);
    assert.ok(Math.abs(-(tip.x - point.x) * aim.z + (tip.depth - point.depth) * aim.x - 5) < 1e-6);
  }
});
test('only the three upper directions are covered by the unchanged character sprite', () => {
  for (const aim of EFFECT_DIRECTIONS) {
    const order = [];
    drawActorEffectLayers(
      { quarterAim: aim, player: { facing: 1 } },
      () => order.push('actor'),
      () => order.push('effect')
    );
    assert.deepEqual(order, aim.z < 0 ? ['effect', 'actor'] : ['actor', 'effect']);
  }
});
