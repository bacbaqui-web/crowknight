import test from 'node:test';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { requestRuntimeAction } from '../src/action_trigger_engine.js';
import { resetPlayerActionState } from '../src/actor_state.js';
import { updateBattleActorMotion } from '../src/enemy_runtime_engine.js';
import { resolveProjectileCombat, updateActorCombatTimers } from '../src/combat_engine.js';
import { resolveTrapCombat } from '../src/trap_combat.js';
import {
  makeTrap,
  advanceTrap,
  canStepOnTrap,
  rootInTrap,
  enforceTrapRoot,
  updateTrapperAi,
  collectTraps,
} from '../src/trapper_runtime.js';
import {
  resetProjectileRuntime,
  updateProjectileRuntime,
  activeProjectiles,
} from '../src/projectile_runtime_engine.js';
import { preparePlaneMotion, finishPlaneMotion } from '../src/quarter_view/motion.js';
const data = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url)));
const world = { floorY: 600, minX: -2000, maxX: 2000 };
function actor(id = 'trapper') {
  const player = new PuppetPlayer(300, 600, {});
  player.applyTuning(mergeTuning(DEFAULT_PLAYER_TUNING, data.actors[id].tuning));
  player.onGround = true;
  return {
    id,
    player,
    group: id === 'trapper' ? 'mobs' : 'players',
    hp: 100,
    maxHp: 100,
    invulnTime: 0,
    hurtCooldown: 0,
    hitStun: 0,
    lastHitSerials: {},
    quarterDepth: 0,
  };
}
function trap(a = actor()) {
  const t = makeTrap(a, world);
  advanceTrap(t, 0.56);
  return t;
}
function options(a, extra = {}) {
  return { playerActor: a, world, onPlayerDeath() {}, onPlayerKill() {}, onEnemyDeath() {}, ...extra };
}
function swing(t, quarter = false) {
  return [{ key: 'swing', x: t.x - 40, y: quarter ? t.quarterDepth - 30 : t.y - 40, w: 80, h: 50, reaction: {} }];
}

test('stepping on an armed trap deals 15 damage once and roots for one second', () => {
  const a = actor('player_01'),
    t = trap();
  resolveProjectileCombat({ ...options(a), actors: [a], projectiles: [t] });
  assert.equal(a.hp, 85);
  assert.equal(a.player.trapRootTime, 1);
  assert.equal(t.phase, 'closed');
  resolveProjectileCombat({ ...options(a), actors: [a], projectiles: [t] });
  assert.equal(a.hp, 85);
  updateActorCombatTimers([a], 0.99);
  assert.ok(a.player.trapRootTime > 0);
  updateActorCombatTimers([a], 0.02);
  assert.equal(a.player.trapRootTime, 0);
  assert.equal(a.player.trapAnchor, null);
});
test('arming delay, jumping, rolling, invulnerability and different platform height avoid traps', () => {
  const a = actor('player_01'),
    t = makeTrap(actor(), world);
  resolveTrapCombat(t, options(a), []);
  assert.equal(a.hp, 100);
  advanceTrap(t, 0.6);
  a.player.onGround = false;
  resolveTrapCombat(t, options(a), []);
  assert.equal(a.hp, 100);
  a.player.onGround = true;
  a.invulnTime = 1;
  assert.equal(canStepOnTrap(t, a, false), false);
  a.invulnTime = 0;
  a.player.y -= 60;
  assert.equal(canStepOnTrap(t, a, false), false);
});
test('a ground attack breaks a trap before foot contact without damage', () => {
  const a = actor('player_01'),
    t = trap();
  resolveTrapCombat(t, options(a), swing(t));
  assert.equal(t.phase, 'broken');
  assert.equal(a.hp, 100);
  assert.equal(a.player.trapRootTime || 0, 0);
  advanceTrap(t, 1.21);
  assert.equal(t.active, false);
});
test('air attacks do not break floor traps; quarter ground attack and depth are respected', () => {
  const a = actor('player_01'),
    t = trap();
  a.player.onGround = false;
  resolveTrapCombat(t, options(a), swing(t));
  assert.equal(t.phase, 'armed');
  a.player.onGround = true;
  a.quarterDepth = 100;
  assert.equal(canStepOnTrap(t, a, true), false);
  a.quarterDepth = 0;
  assert.equal(canStepOnTrap(t, a, true), true);
  resolveTrapCombat(t, options(a, { world: { ...world, quarterView: {} } }), swing(t, true));
  assert.equal(t.phase, 'broken');
});
test('root blocks walking, jump and roll but permits attacks; native motion stays fixed', () => {
  const a = actor('player_01');
  rootInTrap(a);
  for (const key of ['customAction1', 'customAction3', 'customAction5'])
    assert.equal(requestRuntimeAction(a.player, key), false);
  assert.equal(requestRuntimeAction(a.player, 'customAction4'), true);
  for (let i = 0; i < 15; i++)
    updateBattleActorMotion({
      actors: [a],
      playerActor: a,
      keys: new Set(['ArrowRight', 'Space']),
      pressed: new Set(),
      world,
      dt: 1 / 60,
    });
  assert.equal(a.player.x, 300);
  assert.equal(a.player.y, 600);
  assert.ok(a.player.trapRootTime > 0.7);
  updateActorCombatTimers([a], 1);
  resetPlayerActionState(a.player);
  assert.equal(requestRuntimeAction(a.player, 'customAction1'), true);
});
test('root also blocks quarter depth displacement, attack lunges and collision pushes', () => {
  const a = actor('player_01');
  a.quarterDepth = 80;
  rootInTrap(a);
  preparePlaneMotion(a, { x: 0, z: 1 }, new Set(['QuarterDown']), new Set());
  a.player.x += 40;
  finishPlaneMotion(a, world);
  enforceTrapRoot(a);
  assert.equal(a.player.x, 300);
  assert.equal(a.quarterDepth, 80);
  a.player.x += 60;
  a.quarterDepth += 60;
  enforceTrapRoot(a);
  assert.equal(a.player.x, 300);
  assert.equal(a.quarterDepth, 80);
});
test('short post-root immunity prevents chained trapping, reset clears all root state', () => {
  const a = actor('player_01');
  rootInTrap(a);
  updateActorCombatTimers([a], 1.01);
  const t = trap();
  resolveTrapCombat(t, options(a), []);
  assert.equal(a.hp, 100);
  updateActorCombatTimers([a], 0.5);
  resolveTrapCombat(t, options(a), []);
  assert.equal(a.hp, 85);
  resetPlayerActionState(a.player);
  assert.equal(a.player.trapRootTime, 0);
  assert.equal(a.player.trapAnchor, null);
  assert.equal(a.player.trapImmunity, 0);
});
test('AI approaches, retreats, plants once at placement frame, and caps three active traps', () => {
  const a = actor(),
    target = actor('player_01');
  target.player.x = 450;
  updateTrapperAi(a, target, world, 0.01);
  assert.equal(a.player.actionKey, 'trapWalk');
  assert.equal(a.player.facing, -1);
  a.player.facing = 1;
  updateTrapperAi(a, target, world, 0.01);
  assert.equal(a.player.facing, -1);
  resetPlayerActionState(a.player);
  updateTrapperAi(a, target, world, 1.3);
  assert.equal(a.player.actionKey, 'trapSet');
  for (let i = 0; i < 24; i++) a.player.updateNpc(1 / 60, target.player, world);
  assert.equal(collectTraps(a, world, []).length, 0);
  for (let i = 0; i < 24; i++) a.player.updateNpc(1 / 60, target.player, world);
  assert.equal(collectTraps(a, world, []).length, 1);
  assert.equal(collectTraps(a, world, []).length, 0);
  a.player.trapperState.placed = false;
  assert.equal(collectTraps(a, world, [trap(a), trap(a), trap(a)]).length, 0);
});
test('dead owners cannot lay new traps; existing traps survive, expire and reset with projectile pool', () => {
  const a = actor();
  a.player.trapperState = { placed: false };
  requestRuntimeAction(a.player, 'trapSet');
  a.player.customActionElapsed = 0.6;
  resetProjectileRuntime();
  updateProjectileRuntime({ actors: [a], world, dt: 0 });
  assert.equal(activeProjectiles().length, 1);
  a.player.dead = true;
  a.player.trapperState.placed = false;
  updateProjectileRuntime({ actors: [a], world, dt: 1 });
  assert.equal(activeProjectiles().length, 1);
  updateProjectileRuntime({ actors: [a], world, dt: 18 });
  assert.equal(activeProjectiles().length, 0);
  a.player.dead = false;
  updateProjectileRuntime({ actors: [a], world, dt: 0 });
  resetProjectileRuntime();
  assert.equal(activeProjectiles().length, 0);
});
test('lethal trap triggers player death once without immobilizing a corpse', () => {
  const a = actor('player_01'),
    t = trap();
  a.hp = 10;
  let deaths = 0;
  resolveTrapCombat(
    t,
    options(a, {
      onPlayerDeath() {
        deaths++;
        a.player.dead = true;
      },
    }),
    []
  );
  resolveTrapCombat(
    t,
    options(a, {
      onPlayerDeath() {
        deaths++;
      },
    }),
    []
  );
  assert.equal(a.hp, 0);
  assert.equal(deaths, 1);
  assert.equal(a.player.trapRootTime || 0, 0);
});
