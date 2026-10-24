import test from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_DIRECTIONS, EFFECT_EDIT_DIRECTIONS } from '../src/quarter_view/effect_directions.js';
import {
  DEFAULT_EFFECT_LAYOUT,
  createEffectProfile,
  updateEffectProfile,
  resetEffectAdjustment,
  readEffectLayoutState,
  saveEffectLayoutState,
  normalizeEffectLayoutState,
  effectLayoutFor,
} from '../src/quarter_view/effect_layout.js';
import { effectPoint } from '../src/quarter_view/attack_geometry.js';
import { drawActorEffectLayers } from '../src/quarter_view/attack_effects.js';

test('right base propagates to five rotated directions while each adjustment survives base edits and persistence', () => {
  const profile = createEffectProfile();
  updateEffectProfile(profile, 'right', { width: 1.5, distance: 30, rotation: 20 });
  for (const { key } of EFFECT_EDIT_DIRECTIONS) assert.deepEqual(profile.directions[key], profile.directions.right);
  updateEffectProfile(profile, 'up', { width: 1.8, distance: 42, rotation: 27 });
  assert.equal(profile.directions.right.width, 1.5);
  updateEffectProfile(profile, 'right', { width: 2, distance: 50, rotation: 40 });
  assert.equal(profile.directions.up.width, 2.4);
  assert.equal(profile.directions.up.distance, 62);
  assert.equal(profile.directions.up.rotation, 47);
  assert.deepEqual(profile.directions.down, profile.directions.right);
  const restored = createEffectProfile(JSON.parse(JSON.stringify(profile)));
  assert.deepEqual(restored, profile);
  resetEffectAdjustment(restored, 'up');
  assert.deepEqual(restored.directions.up, restored.directions.right);
  const actor = { player: { actionKey: 'slash' }, quarterEffectLayouts: { slash: profile } };
  assert.equal(effectLayoutFor(actor, 'up-left'), profile.directions['up-right']);
  const migrated = createEffectProfile({ directions: { right: { width: 1.5 }, up: { width: 1.8 } } });
  assert.ok(Math.abs(migrated.directions.up.width - 1.8) < 1e-9);
  updateEffectProfile(migrated, 'right', { width: 2 });
  assert.equal(migrated.directions.up.width, 2.4);
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
  updateEffectProfile(profile, 'right', { distance: 50, side: 20, width: 2, height: 0.5 });
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
