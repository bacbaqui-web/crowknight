import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { alignEnemyWeaponRegions, syncEnemyWeaponFacing } from '../src/quarter_view/weapon_contact.js';

const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
for (const id of ['player_01', 'enemy_01', 'swordman'])
  test(`${id}: every active authored melee attack follows its weapon or shield at both visual facings`, () => {
    const def = saved.characters.find((a) => a.id === id),
      tuning = mergeTuning(defaultTuningFor(def), saved.actors[id].tuning);
    const player = new PuppetPlayer(480, 430, {});
    player.applyTuning(tuning);
    const actor = { ...def, player };
    let checked = 0;
    const original = JSON.stringify(tuning);
    for (const facing of [-1, 1])
      for (const action of player.customActions.filter((a) => player.actionSettings[a.key]?.group === 'attack')) {
        for (let frame = 0; frame <= 100; frame++) {
          player.facing = facing;
          player.actionPreview = { action: action.key, t: frame / 100 };
          const raw = player.attackInteractionRegions;
          if (!raw.length) continue;
          const aligned = alignEnemyWeaponRegions(actor, raw);
          assert.equal(aligned.length, raw.length);
          for (let i = 0; i < raw.length; i++) {
            if (!['attackInteractionObject', 'guardInteractionObject'].includes(raw[i].key)) continue;
            const partKey = raw[i].key === 'guardInteractionObject' || /방패/.test(action.name) ? 'shield' : 'weapon',
              part = player.rig[partKey],
              offset = player.getPartOffset(partKey);
            const m = partKey === 'shield' ? player.shieldAnchorTransform() : player.weaponAnchorTransform();
            const det = m.a * m.d - m.b * m.c;
            const width = part.w + (offset.w || 0),
              height = part.h + (offset.h || 0);
            const ax = (((part.ax ?? part.ox ?? 0) + (offset.ax || 0)) * width) / (part.baseW || part.w);
            const ay = (((part.ay ?? part.oy ?? 0) + (offset.ay || 0)) * height) / (part.baseH || part.h);
            for (const p of aligned[i].points) {
              const x = (m.d * (p.x - m.e) - m.c * (p.y - m.f)) / det + ax;
              const y = (-m.b * (p.x - m.e) + m.a * (p.y - m.f)) / det + ay;
              assert.ok(x >= -1e-6 && x <= width + 1e-6);
              assert.ok(y >= -1e-6 && y <= height + 1e-6);
            }
            assert.deepEqual(aligned[i].reaction, { ...raw[i].reaction, hitMode: 'trace' });
            checked++;
          }
        }
      }
    assert.ok(checked > 20);
    assert.equal(JSON.stringify(tuning), original);
  });
test('arrows retain projectile handling and melee reach upgrades still expand the weapon-bound geometry', () => {
  const def = saved.characters.find((a) => a.id === 'archer'),
    tuning = mergeTuning(defaultTuningFor(def), saved.actors.archer.tuning);
  const player = new PuppetPlayer(480, 430, {});
  player.applyTuning(tuning);
  player.actionPreview = { action: 'customAction2', t: 0.5 };
  const raw = [{ key: 'attackInteractionObject', x: 0, y: 0, w: 20, h: 20, reaction: {} }];
  assert.equal(alignEnemyWeaponRegions({ ...def, player }, raw), raw);
  player.actionPreview = null;
  player.runUpgrades = { reach: 1 };
  const actor = { id: 'swordman', player };
  const a = alignEnemyWeaponRegions(actor, raw)[0];
  player.runUpgrades.reach = 1.5;
  const b = alignEnemyWeaponRegions(actor, raw)[0];
  assert.ok(Math.abs(b.w / a.w - 1.5) < 1e-6);
});

test('an attacking enemy turning its sprite also mirrors the attack aim without sweeping through its body', () => {
  const actor = {
    quarterAim: { x: 0.8, z: 0.6 },
    previousAttackRegions: [{ key: 'old' }],
    player: { facing: -1, actionKey: 'slash', actionSettings: { slash: { group: 'attack' } } },
  };
  syncEnemyWeaponFacing(actor);
  assert.deepEqual(actor.quarterAim, { x: -0.8, z: 0.6 });
  assert.deepEqual(actor.previousAttackRegions, []);
  actor.quarterAim = { x: 0, z: 1 };
  syncEnemyWeaponFacing(actor);
  assert.deepEqual(actor.quarterAim, { x: 0, z: 1 });
});
