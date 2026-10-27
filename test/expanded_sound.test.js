import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { COMBAT_SOUNDS, soundPlacement } from '../src/combat_sound_catalog.js';
import { createCombatSoundController } from '../src/combat_sound_controller.js';
import { createProjectileSoundEvents } from '../src/projectile_sound_events.js';
function actor(id = 'trapper', group = 'mobs') {
  return {
    id,
    group,
    quarterDepth: 0,
    player: { x: 0, y: 500, animTime: 0, onGround: true, dead: false, actionKey: 'idle', attackInteractionRegions: [] },
  };
}
function recorder() {
  const calls = [];
  return {
    calls,
    play: (name) => {
      assert.ok(COMBAT_SOUNDS[name], name);
      calls.push(name);
    },
  };
}
test('movement sounds follow actual displacement, jump/land transitions and stop under root', () => {
  const r = recorder(),
    s = createCombatSoundController(r.play),
    a = actor('player_01', 'players');
  s.update([a]);
  a.player.x = 10;
  a.player.animTime = 0.03;
  s.update([a]);
  assert.deepEqual(r.calls, ['footstep']);
  s.update([a]);
  assert.equal(r.calls.length, 1);
  a.player.trapRootTime = 1;
  a.player.animTime = 1;
  a.player.x += 10;
  s.update([a]);
  assert.equal(r.calls.length, 1);
  a.player.onGround = false;
  s.update([a]);
  a.player.onGround = true;
  s.update([a]);
  assert.deepEqual(r.calls.slice(-2), ['jump', 'land']);
});
test('balloon pop, falling impact and boss collision each fire once', () => {
  const r = recorder(),
    s = createCombatSoundController(r.play),
    a = actor('balloon_bomber');
  a.player.balloonState = { phase: 'hover' };
  s.update([a]);
  a.player.balloonState.phase = 'falling';
  s.update([a]);
  s.update([a]);
  assert.equal(r.calls.filter((x) => x === 'balloonPop').length, 1);
  a.player.balloonState.phase = 'impact';
  a.player.dead = true;
  s.update([a]);
  s.update([a]);
  assert.equal(r.calls.filter((x) => x === 'bodyFall').length, 1);
  const tank = actor('ram_tank', 'bosses');
  s.update([tank]);
  tank.player.bossStunned = true;
  s.update([tank]);
  s.update([tank]);
  assert.equal(r.calls.filter((x) => x === 'tankCrash').length, 1);
});
test('traps produce distinct placement, arming, snap and break without repeat', () => {
  const r = recorder(),
    s = createProjectileSoundEvents(r.play),
    t = { active: true, ratTrap: true, phase: 'arming' };
  s.update([t]);
  t.phase = 'armed';
  s.update([t]);
  s.update([t]);
  t.phase = 'closed';
  s.update([t]);
  s.update([t]);
  assert.deepEqual(r.calls, ['trapSet', 'trapArm', 'trapSnap']);
  const other = { active: true, ratTrap: true, phase: 'broken' };
  s.update([other]);
  assert.equal(r.calls.at(-1), 'trapBreak');
});
test('bomb fuse, explosion, bow, spear and fire use the corresponding samples', () => {
  const r = recorder(),
    s = createProjectileSoundEvents(r.play),
    bomb = { active: true, powderBomb: true, phase: 'flight', phaseTime: 0 };
  s.update([bomb]);
  bomb.phase = 'fuse';
  s.update([bomb]);
  bomb.phaseTime = 0.91;
  s.update([bomb]);
  bomb.phase = 'blast';
  s.update([bomb]);
  s.update([bomb]);
  assert.equal(r.calls.filter((x) => x === 'explosion').length, 1);
  assert.ok(r.calls.includes('bombLand'));
  assert.ok(r.calls.includes('fuse'));
  s.update([
    { active: true, ownerId: 'archer' },
    { active: true, linearSpear: true },
    { active: true, mageFire: true, phase: 'burn', age: 1 },
  ]);
  for (const key of ['bowRelease', 'spearThrow', 'fireCast', 'fireBurn']) assert.ok(r.calls.includes(key));
  const punch = { active: true, bossHazard: 'punch', powderBomb: true, phase: 'blast' };
  s.update([punch]);
  assert.equal(r.calls.at(-1), 'bossSwing');
});
test('distance attenuates both axes and pans left/right; distant enemies are silent', () => {
  const listener = { player: { x: 0 }, quarterDepth: 0 };
  assert.equal(soundPlacement(null, listener).gain, 1);
  assert.equal(soundPlacement({ x: 1500 }, listener).gain, 0);
  assert.ok(soundPlacement({ x: -300 }, listener).pan < 0);
  assert.ok(soundPlacement({ x: 300 }, listener).pan > 0);
  assert.ok(soundPlacement({ x: 0, quarterDepth: 500 }, listener).gain < 0.5);
});
test('death and restart do not replay stale phases; projectile history resets independently', () => {
  const r = recorder(),
    s = createCombatSoundController(r.play),
    a = actor();
  s.update([a]);
  a.player.dead = true;
  s.update([a]);
  s.update([a]);
  assert.equal(r.calls.length, 1);
  s.reset();
  a.player.dead = false;
  s.update([a]);
  a.player.dead = true;
  s.update([a]);
  assert.equal(r.calls.length, 2);
});
test('every catalog file exists and new recordings have headroom and finite short duration', () => {
  for (const file of new Set(Object.values(COMBAT_SOUNDS).flatMap((x) => x.files)))
    assert.ok(readFileSync(new URL('../assets/audio/combat/' + file, import.meta.url)).length > 100);
  const sources = JSON.parse(readFileSync(new URL('../assets/audio/combat/v2/sources.json', import.meta.url)));
  const files = new Set(Object.values(COMBAT_SOUNDS).flatMap((x) => x.files));
  const selected = JSON.parse(readFileSync(new URL('../assets/audio/combat/selected/sources.json', import.meta.url)));
  const pixabay = JSON.parse(readFileSync(new URL('../assets/audio/combat/pixabay/sources.json', import.meta.url)));
  const known = new Set([...sources, ...selected, ...pixabay].map((x) => x.file));
  assert.ok([...files].every((file) => known.has(file)));
  for (const [name, sound] of Object.entries(COMBAT_SOUNDS))
    assert.equal(sound.rate, { parry: 0.85, arrivalLand: 0.9 }[name] ?? 1);
  assert.ok(COMBAT_SOUNDS.arrivalLand.gain < COMBAT_SOUNDS.land.gain / 2);
  for (const item of sources) {
    assert.equal(item.license, 'CC0-1.0');
    assert.ok(item.duration > 0 && item.duration <= 2.1);
    const b = readFileSync(new URL('../assets/audio/combat/' + item.file, import.meta.url));
    assert.equal(b.toString('ascii', 0, 4), 'RIFF');
    let peak = 0;
    for (let i = 44; i < b.length - 1; i += 2) peak = Math.max(peak, Math.abs(b.readInt16LE(i)));
    assert.ok(peak > 1000 && peak < 28000, item.file);
    assert.ok(item.sources.every((s) => s.url.startsWith('https://') && s.sha256.length === 64));
  }
});
