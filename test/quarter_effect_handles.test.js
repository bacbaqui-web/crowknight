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

test('setting editor handle geometry and hit detection are reused for scaling', async () => {
  const { effectEditGeometry } = await import('../src/quarter_view/effect_editor_handles.js');
  const { findEditHandleAt } = await import('../src/edit_handle_geometry_helper.js');
  const frame = {
    layout: { width: 1.2, height: 0.8 },
    pivot: { x: 300, y: 200 },
    sourceX: { x: 2, y: 0 },
    sourceY: { x: 0, y: -1 },
  };
  const geometry = effectEditGeometry(frame, 2);
  assert.deepEqual(Object.keys(geometry.handles).sort(), ['anchor', 'height', 'move', 'rotate', 'size', 'width']);
  assert.equal(geometry.anchor.x, 150);
  for (const mode of ['width', 'height', 'size']) {
    const handle = geometry.handles[mode].point;
    assert.equal(findEditHandleAt(handle, geometry).mode, mode);
    const start = { x: handle.x * 2, y: handle.y * 2 };
    const end = {
      x: frame.pivot.x + 1.5 * (start.x - frame.pivot.x),
      y: frame.pivot.y + 1.5 * (start.y - frame.pivot.y),
    };
    const patch = dragEffectPatch(frame, mode, start, end);
    if (mode !== 'height') close(patch.width, 1.8);
    if (mode !== 'width') close(patch.height, 1.2);
  }
});
