import test from 'node:test';
import assert from 'node:assert/strict';
import { attackFootprint, createAttackHistory } from '../src/quarter_view/attack_history.js';
import { captureAttackRegions, groundAttackRegions } from '../src/quarter_view/attack_geometry.js';
import { cloneInteractionRegionSnapshot } from '../src/interaction_swept_region_helper.js';
import { createTrajectoryView } from '../src/quarter_view/trajectory_view.js';

function actor() {
  return {
    quarterDepth: 20,
    quarterAim: { x: 0, z: 1 },
    player: {
      x: 100,
      y: 430,
      facing: 1,
      animTime: 0,
      attackSerial: 1,
      actionKey: 'slash',
      attackInteractionRegions: [{ key: 'blade', x: 130, y: 300, w: 40, h: 50, reaction: { hitMode: 'box' } }],
    },
  };
}
test('flat range removes all height edges while preserving actual forward and lateral extents', () => {
  const a = actor(),
    r = a.player.attackInteractionRegions[0],
    points = attackFootprint(a, r, 430);
  assert.equal(points.length, 4);
  assert.ok(points.every((p) => p.y === 430));
  assert.deepEqual(
    points.map((p) => p.depth),
    [50, 90, 90, 50]
  );
  assert.equal(Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)), 50);
});
test('numbered history records raw hitboxes rather than trace sweep envelopes and never duplicates paused frames', () => {
  const a = actor(),
    history = createAttackHistory(),
    region = a.player.attackInteractionRegions[0];
  region.reaction.hitMode = 'trace';
  a.previousAttackRegions = [
    cloneInteractionRegionSnapshot(groundAttackRegions(a, [{ ...region, x: 20 }])[0], 'slash'),
  ];
  captureAttackRegions(a, [region]);
  const entry = history.update(a, 430);
  assert.equal(entry.samples[0].center.x, 50);
  assert.equal(entry.samples[0].center.y, 105);
  assert.ok(a.quarterAttackRegions[0].y < groundAttackRegions(a, [region])[0].y);
  history.update(a, 430);
  assert.equal(entry.samples.length, 1);
  a.player.animTime = 1 / 60;
  captureAttackRegions(a, [{ ...region, x: 160, y: 380 }]);
  history.update(a, 430);
  assert.equal(entry.samples.length, 2);
  assert.deepEqual(entry.samples[1].center, { x: 80, y: 25 });
});
test('completed local side profile remains available, while a new attack, death or restart clears its sequence', () => {
  const a = actor(),
    history = createAttackHistory();
  const entry = history.update(a, 430),
    snapshot = JSON.stringify(entry.samples);
  a.player.animTime = 2;
  a.player.attackInteractionRegions = [];
  history.update(a, 430);
  assert.equal(entry.active, false);
  assert.equal(JSON.stringify(entry.samples), snapshot);
  a.player.attackSerial = 2;
  a.player.attackInteractionRegions = [{ key: 'blade', x: 160, y: 350, w: 30, h: 20 }];
  const next = history.update(a, 430);
  assert.notEqual(next, entry);
  assert.equal(next.samples.length, 1);
  history.reset();
  a.player.attackInteractionRegions = [];
  assert.equal(history.update(a, 430), null);
  a.player.dead = true;
  assert.equal(history.update(a, 430), null);
});
test('a long action keeps its first sample and bounds history storage', () => {
  const a = actor(),
    history = createAttackHistory();
  let entry;
  for (let i = 0; i < 200; i++) {
    a.player.animTime = i / 60;
    entry = history.update(a, 430);
  }
  assert.equal(entry.samples.length, 64);
  assert.equal(entry.samples[0].time, 0);
  assert.equal(entry.samples.at(-1).time, 199 / 60);
});
test('side diagram labels genuine sample order and completion without changing the recorded combat data', () => {
  const labels = [],
    ctx = {
      clearRect() {},
      setLineDash() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      closePath() {},
      arc() {},
      fill() {},
      fillText(text) {
        labels.push(text);
      },
    };
  const canvas = { width: 260, height: 170, getContext: () => ctx },
    status = {},
    diagram = createTrajectoryView(canvas, status);
  diagram.draw(null);
  assert.match(status.textContent, /공격하면/);
  const a = actor(),
    history = createAttackHistory();
  const entry = history.update(a, 430);
  a.player.animTime = 1 / 60;
  a.player.attackInteractionRegions = [{ key: 'blade', x: 155, y: 380, w: 30, h: 30 }];
  history.update(a, 430);
  a.player.attackInteractionRegions = [];
  history.update(a, 430);
  const before = JSON.stringify(entry);
  diagram.draw(entry);
  assert.ok(labels.includes('1') && labels.includes('2') && labels.includes('시작') && labels.includes('끝'));
  assert.match(status.textContent, /최근 공격 완료/);
  assert.equal(JSON.stringify(entry), before);
});
