import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { DEFAULT_PLAYER_TUNING } from '../src/player_default_tuning_data.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { BALLOON_BOMBER, canHitBalloon, popBalloon, collectBalloonBombs } from '../src/balloon_bomber_runtime.js';
import { resetPlayerActionState } from '../src/actor_state.js';
import { applyInteractionDamage } from '../src/combat_reaction_helper.js';
import { resolveProjectileCombat, shouldSkipTarget } from '../src/combat_engine.js';
import { advancePowderBomb, powderBlastRegion } from '../src/powder_bomb_runtime.js';
import {
  activeProjectiles,
  resetProjectileRuntime,
  updateProjectileRuntime,
} from '../src/projectile_runtime_engine.js';
import { combatTargetRegions, groundProjectileRegion } from '../src/quarter_view/spatial.js';

const data = JSON.parse(readFileSync(new URL('../data/draft.json', import.meta.url)));
const world = { floorY: 600, gravity: 1800, minX: -2000, maxX: 2000 };
function actor(id = 'balloon_bomber') {
  const player = new PuppetPlayer(300, 600, {});
  player.applyTuning(mergeTuning(DEFAULT_PLAYER_TUNING, data.actors[id].tuning));
  return {
    id,
    player,
    group: id === 'balloon_bomber' ? 'mobs' : 'players',
    hp: 20,
    maxHp: 20,
    invulnTime: 0,
    hurtCooldown: 0,
    hitStun: 0,
    lastHitSerials: {},
  };
}
function step(a, dt) {
  a.player.updateNpc(dt, { x: 300, y: 600 }, world);
}
function jumper() {
  const a = actor('player_01');
  a.player.onGround = false;
  a.player.customActionKey = 'customAction9';
  a.player.customActionTime = 1;
  a.player.customActionDuration = 1;
  return a;
}

test('normalized grunt has only balloon hurt region, no body collision or attacks', () => {
  const a = actor();
  step(a, 0.01);
  const p = a.player;
  assert.equal(p.onGround, false);
  assert.ok(p.y < world.floorY - 50);
  assert.equal(p.collisionInteractionRegions.length, 0);
  assert.equal(p.attackInteractionRegions.length, 0);
  const hurt = p.hurtInteractionRegions[0];

  assert.ok(hurt.y + hurt.h < p.y - 100 * p.transform.scale);
  assert.equal(data.actors.balloon_bomber.assets.__parts.length, 15);
});
test('only airborne attacking player can damage balloon; standing or jumping alone cannot', () => {
  const a = actor();
  step(a, 0.01);
  const p = jumper();
  assert.equal(canHitBalloon(p, a), true);
  p.player.onGround = true;
  assert.equal(shouldSkipTarget(p, a), true);
  p.player.onGround = false;
  p.player.customActionKey = 'customAction3';
  assert.equal(canHitBalloon(p, a), false);
});
test('bomb drops recur independently without pause duplicates or resume burst', () => {
  const a = actor();
  step(a, 1);
  assert.equal(collectBalloonBombs(a, world).length, 0);
  step(a, 0.21);
  assert.equal(collectBalloonBombs(a, world).length, 1);
  assert.equal(collectBalloonBombs(a, world).length, 0);
  step(a, 1.81);
  assert.equal(collectBalloonBombs(a, world).length, 1);
  step(a, 100);
  assert.equal(collectBalloonBombs(a, world).length, 1);
  assert.equal(collectBalloonBombs(a, world).length, 0);
});
test('bombs fall vertically from their release point and explode once after a ground fuse', () => {
  const a = actor();
  step(a, 1.3);
  const bomb = collectBalloonBombs(a, world)[0],
    x = bomb.x;
  a.player.x += 100;
  advancePowderBomb(bomb, 0.3);
  assert.equal(bomb.x, x);
  assert.equal(powderBlastRegion(bomb).active, false);
  advancePowderBomb(bomb, 0.4);
  assert.equal(bomb.phase, 'fuse');
  assert.equal(bomb.y, 600);
  advancePowderBomb(bomb, 1.2);
  assert.equal(bomb.phase, 'blast');
  assert.equal(powderBlastRegion(bomb).active, true);
  bomb.damageSpent = true;
  assert.equal(powderBlastRegion(bomb).active, false);
});
test('air hit pops balloon immediately, suppresses drops and awards death only at impact once', () => {
  const a = actor(),
    attacker = jumper();
  step(a, 1.3);
  let kills = 0,
    deaths = 0;
  const args = {
    attacker,
    target: a,
    playerActor: attacker,
    damage: 20,
    world,
    onPlayerKill: () => kills++,
    onEnemyDeath: () => deaths++,
  };
  assert.equal(applyInteractionDamage(args), true);
  assert.equal(a.hp, 0);
  assert.equal(a.player.dead, false);
  assert.equal(kills, 0);
  assert.equal(collectBalloonBombs(a, world).length, 0);
  assert.equal(applyInteractionDamage(args), false);
  for (let i = 0; i < 90; i++) step(a, 1 / 60);
  assert.equal(a.player.balloonState.phase, 'impact');
  assert.equal(a.player.dead, true);
  assert.equal(kills, 1);
  assert.equal(deaths, 1);
  assert.equal(a.player.y, world.floorY - 20 * a.player.transform.scale);
});
test('grounded attacks and airborne projectiles never pop a balloon', () => {
  const a = actor(),
    p = jumper();
  step(a, 0.1);
  p.player.onGround = true;
  assert.equal(applyInteractionDamage({ attacker: p, target: a, damage: 200, world }), false);
  assert.equal(a.hp, 20);
  p.player.onGround = false;
  const bomb = {
    active: true,
    powderBomb: true,
    phase: 'blast',
    targetX: 300,
    targetY: 350,
    x: 300,
    y: 350,
    radius: 1000,
    owner: p,
    hitTargets: new Set(),
    reaction: { hurtByAttack: true },
  };
  resolveProjectileCombat({ projectiles: [bomb], actors: [a], playerActor: p, world });
  assert.equal(a.player.balloonState.phase, 'hover');
});
test('falling and impact freeze with zero delta, reset discards old kill callback', () => {
  const a = actor();
  step(a, 0.1);
  let kills = 0;
  popBalloon(a, () => kills++);
  step(a, 0.15);
  const y = a.player.y,
    t = a.player.balloonState.fallTime;
  step(a, 0);
  assert.equal(a.player.y, y);
  assert.equal(a.player.balloonState.fallTime, t);
  resetPlayerActionState(a.player);
  a.hp = 20;
  step(a, 2);
  assert.equal(kills, 0);
  assert.equal(a.player.balloonState.phase, 'hover');
});
test('quarter airborne height filter rejects a low swing even when ground footprint overlaps', () => {
  const a = actor(),
    p = jumper();
  step(a, 0.1);
  a.quarterDepth = p.quarterDepth = 0;
  const regions = a.player.hurtInteractionRegions;
  assert.equal(combatTargetRegions(p, a, regions, { quarterPlane: 'ground', quarterElevation: 550 }).length, 0);
  assert.equal(combatTargetRegions(p, a, regions, { quarterPlane: 'ground', quarterElevation: 400 }).length, 1);
});
test('quarter bombs preserve release depth and floor-centered blast radius', () => {
  const a = actor();
  a.quarterDepth = 220;
  step(a, 1.3);
  const bomb = collectBalloonBombs(a, { ...world, quarterView: {} })[0];
  a.quarterDepth = 0;
  advancePowderBomb(bomb, 2);
  const region = groundProjectileRegion(bomb, powderBlastRegion(bomb));
  assert.equal(bomb.quarterDepth, 220);
  assert.equal(region.y, 220 - BALLOON_BOMBER.radius);
});
test('projectile runtime resets remaining bombs and respawning actors emit nothing', () => {
  resetProjectileRuntime();
  const a = actor();
  step(a, 1.3);
  updateProjectileRuntime({ actors: [a], world, dt: 0.01 });
  assert.equal(activeProjectiles().length, 1);
  a.respawning = true;
  step(a, 3);
  assert.equal(collectBalloonBombs(a, world).length, 0);
  resetProjectileRuntime();
  assert.equal(activeProjectiles().length, 0);
});

test('ground impact separates intact body parts once and continues ragdoll physics', () => {
  const a = actor();
  a.player.assets.head = { width: 40, height: 40 };
  a.player.assets.body = { width: 50, height: 60 };
  step(a, 0.01);
  popBalloon(a, () => {});
  step(a, 0.3);
  assert.equal(a.player.deathRagdoll, null);
  for (let i = 0; i < 90 && !a.player.dead; i++) step(a, 1 / 60);
  assert.equal(a.player.deathRagdoll.parts.length, 2);
  assert.ok(a.player.deathRagdoll.parts.every((part) => !part.crop));
  const rag = a.player.deathRagdoll,
    before = rag.parts[0].y;
  step(a, 0.1);
  assert.equal(a.player.deathRagdoll, rag);
  assert.ok(rag.elapsed > 0);
  assert.notEqual(rag.parts[0].y, before);
});

test('drooping balloon pose drops recurring bombs from its lowered weapon hand', () => {
  const a = actor();
  step(a, 1.3);
  const hand = a.player.weaponAnchorTransform();
  const first = collectBalloonBombs(a, world)[0];
  assert.equal(first.startX, hand.e);
  assert.equal(first.startY, hand.f + 9);
  assert.ok(hand.f > a.player.y - 25);
  step(a, BALLOON_BOMBER.interval);
  assert.equal(collectBalloonBombs(a, world).length, 1);
  assert.ok(a.player.rig.body.rot >= 60);
  assert.ok(a.player.rig.head.y > a.player.rig.body.y);
});
