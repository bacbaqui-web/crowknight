import test from 'node:test';
import assert from 'node:assert/strict';
import { effectHandleFrame, dragEffectPatch } from '../src/quarter_view/effect_editor_handles.js';
import { createEffectProfile, updateEffectProfile } from '../src/quarter_view/effect_layout.js';
import { EFFECT_DIRECTIONS } from '../src/quarter_view/effect_directions.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
for (const plane of ['ground', 'height'])
  test(`${plane}: pointer moves position, pivot and rotation in all eight mirrored directions`, () => {
    for (const aim of EFFECT_DIRECTIONS) {
      const profile = createEffectProfile();
      updateEffectProfile(profile, aim.key, { rotation: 23, anchorX: 8, anchorY: -12 });
      const actor = {
        player: { x: 0, y: 430, facing: 1, actionKey: 'slash' },
        quarterFloorY: 430,
        quarterDepth: 0,
        quarterAim: aim,
        quarterAttackPlanes: { slash: plane },
        quarterEffectLayouts: { slash: profile },
      };
      const geometry = {
        center: { x: 70, y: 350 },
        radius: 100,
        points: [
          { x: 30, y: 320 },
          { x: 110, y: 320 },
          { x: 110, y: 380 },
          { x: 30, y: 380 },
        ],
      };
      const build = () =>
        effectHandleFrame(actor, geometry, { floorY: 430 }, { width: 640, height: 400, x: 0, depth: 0, zoom: 0.9 });
      for (const mode of ['position', 'anchor']) {
        const before = build();
        const point = { x: before.pivot.x + 7, y: before.pivot.y + 4 };
        const patch = dragEffectPatch(before, mode, before.pivot, point);
        updateEffectProfile(profile, aim.key, patch);
        const after = build();
        close(after.pivot.x, point.x);
        close(after.pivot.y, point.y);
        for (let i = 0; i < 4; i++) {
          close(after.polygon[i].x, before.polygon[i].x + (mode === 'position' ? 7 : 0));
          close(after.polygon[i].y, before.polygon[i].y + (mode === 'position' ? 4 : 0));
        }
      }
      const before = build();
      const radians = ((before.layout.rotation + 30) * Math.PI) / 180;
      const target = {
        x: before.pivot.x + 60 * (before.rotateX.x * Math.cos(radians) + before.rotateY.x * Math.sin(radians)),
        y: before.pivot.y + 60 * (before.rotateX.y * Math.cos(radians) + before.rotateY.y * Math.sin(radians)),
      };
      const patch = dragEffectPatch(before, 'rotation', before.handle, target);
      close(patch.rotation, before.layout.rotation + 30);
      updateEffectProfile(profile, aim.key, patch);
      const after = build();
      close(after.pivot.x, before.pivot.x);
      close(after.pivot.y, before.pivot.y);
    }
  });
