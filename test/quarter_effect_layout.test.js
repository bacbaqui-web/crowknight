import test from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_DIRECTIONS, EFFECT_EDIT_DIRECTIONS } from '../src/quarter_view/effect_directions.js';
import {
  DEFAULT_EFFECT_LAYOUT,
  createEffectProfile,
  updateEffectProfile,
  readEffectLayoutState,
  saveEffectLayoutState,
  normalizeEffectLayoutState,
  effectLayoutFor,
} from '../src/quarter_view/effect_layout.js';
import { effectPoint } from '../src/quarter_view/attack_geometry.js';
import { drawActorEffectLayers } from '../src/quarter_view/attack_effects.js';

test('five independent directions ignore legacy linking and left attacks reuse their right counterpart', () => {
  const profile = createEffectProfile({ linked: true });
  assert.deepEqual(Object.keys(profile.directions), ['up', 'up-right', 'right', 'down-right', 'down']);
  updateEffectProfile(profile, 'up', { width: 2, rotation: 41 });
  for (const direction of EFFECT_EDIT_DIRECTIONS)
    assert.equal(profile.directions[direction.key].width, direction.key === 'up' ? 2 : 1);
  updateEffectProfile(profile, 'right', { width: 1.7 });
  const actor = { player: { actionKey: 'slash' }, quarterEffectLayouts: { slash: profile } };
  assert.equal(effectLayoutFor(actor, 'left'), profile.directions.right);
  assert.equal(effectLayoutFor(actor, 'up-left'), profile.directions['up-right']);
  assert.equal(effectLayoutFor(actor, 'down-left'), profile.directions['down-right']);
  assert.equal(profile.directions.up.width, 2);
  assert.equal(profile.directions.down.width, 1);
  const restored = createEffectProfile({ ...profile, linked: true });
  updateEffectProfile(restored, 'down', { width: 2.5 });
  assert.equal(restored.directions.right.width, 1.7);
  assert.equal(restored.directions.up.width, 2);
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
  assert.deepEqual(state.profiles.hero.slash.directions.up, {
    ...DEFAULT_EFFECT_LAYOUT,
    distance: 400,
    side: -250,
    width: 0.25,
    height: 1,
  });
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
test('independent offsets rotate with all eight arrows and sizes share the same direction-local axes', () => {
  const profile = createEffectProfile();
  const actor = {
    player: { x: 480, y: 430, facing: 1, actionKey: 'slash' },
    quarterDepth: 0,
    quarterFloorY: 430,
    quarterEffectLayouts: { slash: profile },
  };
  const center = { x: 500, y: 350 };
  for (const { key } of EFFECT_EDIT_DIRECTIONS)
    updateEffectProfile(profile, key, { distance: 50, side: 20, width: 2, height: 0.5 });
  for (const aim of EFFECT_DIRECTIONS) {
    actor.quarterAim = aim;
    const mirror = aim.x < 0 ? -1 : 1;
    const point = effectPoint(actor, center, center, 'ground', 100);
    assert.ok(Math.abs(point.x - (480 + aim.x * 150 - aim.z * 20 * mirror)) < 1e-6);
    assert.ok(Math.abs(point.depth - (aim.z * 150 + aim.x * 20 * mirror)) < 1e-6);
    const tip = effectPoint(actor, { x: center.x + 10, y: center.y - 10 }, center, 'ground', 100);
    assert.ok(Math.abs((tip.x - point.x) * aim.x + (tip.depth - point.depth) * aim.z - 20) < 1e-6);
    assert.ok(Math.abs(-(tip.x - point.x) * aim.z + (tip.depth - point.depth) * aim.x - 5 * mirror) < 1e-6);
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

test('rotation and anchor preserve mirrored pairs and place the source pivot at the arrow tip', () => {
  const profile = createEffectProfile({ linked: false });
  updateEffectProfile(profile, 'left', { rotation: 37, anchorX: 23, anchorY: -14, side: 17, width: 1.4 });
  assert.equal(profile.directions.right.rotation, 37);
  const actor = {
    player: { x: 480, y: 430, facing: 1, actionKey: 'slash' },
    quarterDepth: 0,
    quarterFloorY: 430,
    quarterEffectLayouts: { slash: profile },
  };
  const center = { x: 500, y: 350 };
  for (const plane of ['ground', 'height']) {
    for (const pair of [
      ['right', 'left'],
      ['up-right', 'up-left'],
      ['down-right', 'down-left'],
    ]) {
      updateEffectProfile(profile, pair[0], profile.directions.right);
      const points = pair.map((key) => {
        actor.quarterAim = EFFECT_DIRECTIONS.find((d) => d.key === key);
        return effectPoint(actor, { x: 539, y: 321 }, center, plane, 100);
      });
      assert.ok(Math.abs(points[0].x + points[1].x - 960) < 1e-6);
      assert.ok(Math.abs(points[0].depth - points[1].depth) < 1e-6);
      assert.equal(points[0].y, points[1].y);
    }
  }
  actor.quarterAim = EFFECT_DIRECTIONS[0];
  const pivot = effectPoint(actor, { x: 523, y: 364 }, center, 'ground', 100);
  assert.deepEqual(pivot, { x: 580, depth: 17, y: 430 });
});
