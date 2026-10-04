import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatSoundController } from '../src/combat_sound_controller.js';
import { applyInteractionDamage } from '../src/combat_reaction_helper.js';

test('실제 공격 판정 시작에 종류별 휘두르기를 내고 같은 판정은 반복하지 않는다', () => {
  const calls = [];
  const sounds = createCombatSoundController((name) => calls.push(name));
  const actors = ['players', 'mobs', 'bosses'].map((group) => ({
    group, player: { attackSerial: 1, attackInteractionRegions: [{}], customActionKey: 'attack' },
  }));
  sounds.update(actors);
  sounds.update(actors);
  assert.deepEqual(calls, ['clubSwing', 'swordSwing', 'bossSwing']);
  actors[0].player.attackSerial++;
  sounds.update(actors);
  assert.equal(calls.at(-1), 'clubSwing');
  assert.equal(calls.length, 4);
  actors[0].player.attackInteractionRegions = [];
  sounds.update(actors);
  assert.equal(calls.length, 4);
  sounds.reset();
  sounds.update(actors);
  assert.equal(calls.length, 6);
});

test('실제 피해와 방어/패링을 구분하고 회피에는 타격음을 내지 않는다', () => {
  const calls = [];
  const sounds = createCombatSoundController((name) => calls.push(name));
  const world = { combatSounds: sounds };
  const attacker = { group: 'players', player: { x: 0, actions: [], customActions: [] } };
  const target = { hp: 100, player: { x: 20, actions: [], customActions: [] } };
  const hit = () => applyInteractionDamage({ attacker, target, damage: 20, world, playerActor: attacker });
  hit();
  assert.equal(target.hp, 80);
  assert.deepEqual(calls, ['clubHit']);
  target.player.runEvadeTime = 0.2;
  hit();
  assert.equal(calls.length, 1);
  target.player.runEvadeTime = 0;
  target.player.runSkills = { parry: 1 };
  target.player.runSkillActions = { guard: 'guard' };
  target.player.customActionKey = 'guard';
  target.player.runParryTime = 0.15;
  hit();
  hit();
  assert.deepEqual(calls, ['clubHit', 'parry', 'block']);
  assert.equal(target.hp, 80);
});
