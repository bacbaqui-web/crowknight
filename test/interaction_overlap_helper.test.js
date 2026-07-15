import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attackRegionOverlaps,
  convexPolygonsOverlap,
  interactionRegionsOverlap,
  projectPolygon,
  rectsOverlap,
} from '../src/interaction_overlap_helper.js';

test('rectsOverlap은 교차 영역만 overlap으로 판정한다', () => {
  const source = { x: 0, y: 0, w: 10, h: 10 };

  assert.equal(rectsOverlap(source, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(rectsOverlap(source, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(rectsOverlap(source, { x: 20, y: 20, w: 5, h: 5 }), false);
});

test('convexPolygonsOverlap은 볼록 다각형의 SAT overlap을 판정한다', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ];
  const overlappingDiamond = [
    { x: 2, y: -1 },
    { x: 5, y: 2 },
    { x: 2, y: 5 },
    { x: -1, y: 2 },
  ];
  const separatedSquare = square.map((point) => ({ x: point.x + 10, y: point.y }));

  assert.equal(convexPolygonsOverlap(square, overlappingDiamond), true);
  assert.equal(convexPolygonsOverlap(square, separatedSquare), false);
});

test('projectPolygon은 SAT 축의 최소·최대 projection을 유지한다', () => {
  const points = [
    { x: -2, y: 1 },
    { x: 3, y: 4 },
    { x: 1, y: -1 },
  ];

  assert.deepEqual(projectPolygon(points, { x: 1, y: 0 }), { min: -2, max: 3 });
  assert.deepEqual(projectPolygon(points, { x: 0, y: 1 }), { min: -1, max: 4 });
});

test('interactionRegionsOverlap은 polygon과 rect의 실제 교차를 판정한다', () => {
  const triangle = {
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ],
  };

  assert.equal(interactionRegionsOverlap(triangle, { x: 1, y: 1, w: 2, h: 2 }), true);
  assert.equal(interactionRegionsOverlap(triangle, { x: 8, y: 8, w: 1, h: 1 }), false);
});

test('attackRegionOverlaps은 trace 공격의 이전·현재 swept overlap을 판정한다', () => {
  const attacker = {
    player: { actionKey: 'slash' },
    previousAttackRegions: [
      {
        key: 'blade',
        actionKey: 'slash',
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        points: null,
        reaction: { hitMode: 'trace' },
      },
    ],
  };
  const currentAttackRegion = {
    key: 'blade',
    x: 20,
    y: 0,
    w: 2,
    h: 2,
    points: null,
    reaction: { hitMode: 'trace' },
  };
  const crossedTarget = { x: 10, y: 0, w: 2, h: 2 };

  assert.equal(rectsOverlap(currentAttackRegion, crossedTarget), false);
  assert.equal(attackRegionOverlaps(attacker, currentAttackRegion, crossedTarget), true);

  attacker.player.actionKey = 'other-action';
  assert.equal(attackRegionOverlaps(attacker, currentAttackRegion, crossedTarget), false);
});
