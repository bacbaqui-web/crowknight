import test from 'node:test';
import assert from 'node:assert/strict';
import { finishPlaneMotion } from '../src/quarter_view/motion.js';

test('ground movement gains 15 percent in every direction, but attacks, rolls and air movement do not', () => {
  for (const group of ['movement', 'attack', 'special'])
    for (const grounded of [true, false]) {
      for (const aim of [
        { x: 1, z: 0 },
        { x: 0, z: 1 },
        { x: Math.SQRT1_2, z: -Math.SQRT1_2 },
      ]) {
        const actor = {
          quarterMoveSpeed: 1.15,
          quarterAim: aim,
          quarterDepth: 0,
          quarterMotionStart: { x: 0, z: 0, facing: 1, serial: 1, direction: aim },
          player: {
            x: 10,
            facing: 1,
            vx: 10,
            attackSerial: 1,
            onGround: grounded,
            actionKey: 'action',
            actionSettings: { action: { group } },
          },
        };
        finishPlaneMotion(actor, { quarterView: { unbounded: true } });
        const expected = group === 'movement' && grounded ? 11.5 : 10;
        assert.ok(Math.abs(Math.hypot(actor.player.x, actor.quarterDepth) - expected) < 1e-8);
      }
    }
});
