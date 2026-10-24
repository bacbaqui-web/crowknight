import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { PuppetPlayer } from '../src/actor_runtime_engine.js';
import { defaultTuningFor } from '../src/actor_tuning_helper.js';
import { mergeTuning } from '../src/project_data_normalizer_helper.js';
import { prepareSkillActions } from '../src/skill_runtime_helper.js';
import { requestRuntimeAction } from '../src/action_trigger_engine.js';
import { preparePlaneMotion, finishPlaneMotion, movementInput } from '../src/quarter_view/motion.js';
import {
  combatTargetRegions,
  resolveGroundCollision,
  sameGroundContact,
  groundProjectileRegion,
} from '../src/quarter_view/spatial.js';
import { captureAttackRegions, groundAttackRegions } from '../src/quarter_view/attack_geometry.js';
import { alignEffectRegions } from '../src/quarter_view/effect_geometry.js';
import { EFFECT_DIRECTIONS } from '../src/quarter_view/effect_directions.js';
import { createRuntimeEffectReader } from '../src/runtime_effect_reader.js';
import { alignEnemyWeaponRegions } from '../src/quarter_view/weapon_contact.js';
import { attackPlane } from '../src/attack_plane_helper.js';
import { resolveCombat, resolveProjectileCombat } from '../src/combat_engine.js';

const saved = JSON.parse(readFileSync(new URL('../data/published.json', import.meta.url)));
function makeActor(id, x, depth) {
  const def = saved.characters.find((actor) => actor.id === id);
  const tuning = mergeTuning(defaultTuningFor(def), saved.actors[id].tuning);
  if (id === 'player_01') prepareSkillActions(tuning);
  const player = new PuppetPlayer(x, 430, {});
  player.applyTuning(tuning);
  return {
    ...def,
    tuning,
    player,
    hp: tuning.maxHp,
    maxHp: tuning.maxHp,
    quarterDepth: depth,
    quarterAim: { x: 1, z: 0 },
    lastHitSerials: {},
    invulnTime: 0,
    hurtCooldown: 0,
    hitStun: 0,
    respawning: false,
  };
}
const plane = {
  captureAttackRegions,
  attackRegions: groundAttackRegions,
  targetRegions: combatTargetRegions,
  projectileRegion: groundProjectileRegion,
  resolveCollision: resolveGroundCollision,
  sameGroundContact,
  afterHit() {},
};
const world = { floorY: 430, minX: -10000, maxX: 10000, worldPhysics: { gravity: 1, inertia: 30 }, quarterView: plane };
const particles = { triggerHitImpact() {}, shakeScreen() {} };

for (const altitude of [0, 200])
  for (const side of [-1, 1])
    for (const z of [-1, 1]) {
      test(`${altitude ? 'airborne' : 'ground'} target / ${side < 0 ? 'left' : 'right'} sprite / ${z < 0 ? 'up' : 'down'} attack damages only the forward depth lane while the actor keeps its side-facing rig`, () => {
        const hero = makeActor('player_01', 480, 0);
        hero.player.facing = side;
        hero.quarterAim = { x: side, z: 0 };
        const controls = new Set([z < 0 ? 'QuarterUp' : 'QuarterDown']);
        const input = preparePlaneMotion(hero, movementInput(controls), controls, new Set(controls));
        hero.player.update(1 / 60, input.keys, input.pressed, world);
        finishPlaneMotion(hero);
        const facing = hero.player.facing,
          rig = JSON.stringify(hero.player.rig),
          layers = [...hero.player.layerOrder];
        const targets = [
          makeActor('swordman', hero.player.x, hero.quarterDepth + z * 80),
          makeActor('swordman', hero.player.x, hero.quarterDepth - z * 80),
          makeActor('swordman', hero.player.x + 180, hero.quarterDepth),
        ];
        targets.forEach((target, index) => {
          target.player.y -= altitude;
          target.id = `target-${index}`;
          target.runtimeInstanceId = target.id;
        });
        const originalHp = targets.map((target) => target.hp);
        preparePlaneMotion(hero, null, new Set(['KeyQ']), new Set(['KeyQ']));
        assert.equal(requestRuntimeAction(hero.player, hero.tuning.skillActions.firstStrike, facing, 'tap'), true);
        finishPlaneMotion(hero);
        let sawActiveHitbox = false;
        for (let frame = 0; frame < 30; frame++) {
          preparePlaneMotion(hero, null);
          hero.player.updateNpc(1 / 60, null, world);
          finishPlaneMotion(hero);
          resolveCombat({
            actors: [hero, ...targets],
            playerActor: hero,
            world,
            particleEffects: particles,
            onPlayerDeath() {},
            onPlayerKill() {},
            onEnemyDeath() {},
          });
          if (hero.quarterAttackRegions.length) sawActiveHitbox = true;
        }
        assert.equal(sawActiveHitbox, true, 'combat must expose its actual active hitbox for the overlay');
        assert.ok(targets[0].hp < originalHp[0], 'forward target should be hit by the authored attack');
        assert.equal(targets[1].hp, originalHp[1], 'rear target must not be hit');
        assert.equal(targets[2].hp, originalHp[2], 'side target must not be hit');
        assert.equal(hero.player.facing, facing);
        assert.equal(JSON.stringify(hero.player.rig), rig);
        assert.deepEqual(hero.player.layerOrder, layers);
        assert.equal(hero.player.viewProjection, undefined);
        assert.deepEqual(hero.quarterAim, { x: 0, z });
      });
    }

for (const mode of ['ground', 'height']) {
  test(`published first strike ${mode} mode respects the selected altitude rule`, () => {
    const hero = makeActor('player_01', 480, 0);
    hero.quarterAttackPlanes = { [hero.tuning.skillActions.firstStrike]: mode };
    const target = makeActor('swordman', 550, 0);
    target.player.y -= 300;
    const hp = target.hp;
    assert.ok(requestRuntimeAction(hero.player, hero.tuning.skillActions.firstStrike, 1, 'tap'));
    for (let i = 0; i < 30; i++) {
      hero.player.updateNpc(1 / 60, null, world);
      resolveCombat({
        actors: [hero, target],
        playerActor: hero,
        world,
        particleEffects: particles,
        onPlayerDeath() {},
        onPlayerKill() {},
        onEnemyDeath() {},
      });
    }
    assert.equal(target.hp < hp, mode === 'ground');
  });
}

test('published jump, dive and archer actions automatically use height while regular strike stays ground', () => {
  const hero = makeActor('player_01', 480, 0),
    archer = makeActor('archer', 700, 0);
  for (const name of ['공중공격', '낙하공격']) {
    const key = hero.player.customActions.find((action) => action.name === name).key;
    assert.equal(attackPlane(hero, key), 'height');
  }
  assert.equal(attackPlane(hero, hero.tuning.skillActions.firstStrike), 'ground');
  const shot = archer.player.customActions.find((action) => action.name === '공격').key;
  assert.equal(attackPlane(archer, shot, true), 'height');
});
test('real projectile combat misses a different height and hits a matching height after the owner turns away', () => {
  const owner = makeActor('archer', 480, 0),
    target = makeActor('player_01', 480, 120);
  target.player.y = 230;
  const hurt = target.player.hurtInteractionRegions[0];
  const projectile = {
    active: true,
    owner,
    key: 'arrow-test',
    x: 480,
    y: hurt.y + hurt.h / 2,
    quarterDepth: 120,
    quarterPlane: 'height',
    quarterAim: { x: 0, z: 1 },
    hitboxWidth: 30,
    hitboxHeight: 10,
    hitTargets: new Set(),
    reaction: { hitMode: 'box', knockback: 0 },
  };
  owner.quarterAim = { x: -1, z: 0 };
  const hp = target.hp;
  target.player.y = 430;
  const run = () =>
    resolveProjectileCombat({
      projectiles: [projectile],
      actors: [owner, target],
      playerActor: target,
      world,
      particleEffects: particles,
      onPlayerDeath() {},
      onPlayerKill() {},
      onEnemyDeath() {},
    });
  run();
  assert.equal(target.hp, hp);
  assert.equal(projectile.active, true);
  target.player.y = 230;
  run();
  assert.ok(target.hp < hp);
  assert.equal(projectile.active, false);
});

test('real player and enemy combat consume the weapon-aligned region captured for effects and the debug overlay', () => {
  for (const id of ['player_01', 'enemy_01', 'swordman']) {
    const enemy = makeActor(id, 480, 0),
      hero = makeActor(id === 'player_01' ? 'enemy_01' : 'player_01', 480, 0);
    enemy.player.attackSerial = 7;
    const attack = enemy.player.customActions.find((a) => enemy.player.actionSettings[a.key]?.group === 'attack');
    let raw;
    for (let i = 0; i <= 100; i++) {
      enemy.player.actionPreview = { action: attack.key, t: i / 100 };
      raw = enemy.player.attackInteractionRegions;
      if (raw.length) break;
    }
    assert.ok(raw.length);
    const aligned = alignEnemyWeaponRegions(enemy, raw);
    const flat = groundAttackRegions(enemy, aligned)[0];
    hero.player.x = flat.x + flat.w / 2;
    hero.quarterDepth = flat.y + flat.h / 2;
    Object.defineProperty(hero.player, 'hurtInteractionRegions', {
      value: [
        {
          key: 'body',
          x: hero.player.x - 5,
          y: flat.y + flat.h / 2 - 5,
          w: 10,
          h: 10,
          reaction: { hurtByAttack: true },
        },
      ],
    });
    Object.defineProperty(hero.player, 'guardInteractionRegions', { value: [] });
    for (const actor of [hero, enemy])
      Object.defineProperty(actor.player, 'collisionInteractionRegions', { value: [] });
    let captured;
    const stage = {
      ...world,
      quarterView: {
        ...plane,
        prepareAttackRegions: alignEnemyWeaponRegions,
        captureAttackRegions(actor, regions, projected) {
          captureAttackRegions(actor, regions, projected);
          if (actor === enemy) captured = regions;
        },
      },
    };
    const hp = hero.hp;
    resolveCombat({
      actors: [enemy, hero],
      playerActor: hero,
      world: stage,
      particleEffects: particles,
      onPlayerDeath() {},
      onPlayerKill() {},
      onEnemyDeath() {},
    });
    assert.ok(hero.hp < hp, `${id} fitted hitbox must deal actual damage`);
    assert.deepEqual(captured[0].points, aligned[0].points);
    assert.deepEqual(captured[0].reaction, { ...raw[0].reaction, hitMode: 'trace' });
  }
});

for (const facing of [-1, 1])
  for (const z of [-1, 1])
    test(`weapon-derived live combat keeps native facing ${facing} and damages the ${z < 0 ? 'up' : 'down'} lane only`, () => {
      const hero = makeActor('player_01', 480, 0);
      hero.player.facing = facing;
      hero.quarterAim = { x: 0, z };
      const action = hero.player.customActions.find(
        (action) => hero.player.actionSettings[action.key]?.group === 'attack'
      );
      let aligned, flat;
      for (let i = 0; i <= 100; i++) {
        hero.player.actionPreview = { action: action.key, t: i / 100 };
        aligned = alignEnemyWeaponRegions(hero, hero.player.attackInteractionRegions);
        flat = groundAttackRegions(hero, aligned)[0];
        if (flat && (z > 0 ? flat.y > 20 : flat.y + flat.h < -20)) break;
      }
      assert.ok(flat && (z > 0 ? flat.y > 20 : flat.y + flat.h < -20));
      const native = JSON.stringify(hero.player.weaponAnchorTransform());
      const front = makeActor('swordman', flat.x + flat.w / 2, flat.y + flat.h / 2);
      front.id = 'front';
      const back = makeActor('swordman', front.player.x, -front.quarterDepth);
      back.id = 'back';
      for (const actor of [hero, front, back])
        Object.defineProperty(actor.player, 'collisionInteractionRegions', { value: [] });
      for (const target of [front, back]) {
        Object.defineProperty(target.player, 'hurtInteractionRegions', {
          value: [{ key: 'body', x: target.player.x - 1, y: 350, w: 2, h: 80, reaction: { hurtByAttack: true } }],
        });
        Object.defineProperty(target.player, 'guardInteractionRegions', { value: [] });
      }
      const frontHp = front.hp,
        backHp = back.hp;
      resolveCombat({
        actors: [hero, front, back],
        playerActor: hero,
        world: { ...world, quarterView: { ...plane, prepareAttackRegions: alignEnemyWeaponRegions } },
        particleEffects: particles,
        onPlayerDeath() {},
        onPlayerKill() {},
        onEnemyDeath() {},
      });
      assert.ok(front.hp < frontHp);
      assert.equal(back.hp, backHp);
      assert.equal(hero.player.facing, facing);
      assert.equal(JSON.stringify(hero.player.weaponAnchorTransform()), native);
    });

for (const direction of EFFECT_DIRECTIONS)
  test(`effect-image live damage uses the ${direction.key} placement and excludes its opposite`, () => {
    const hero = makeActor('player_01', 480, 0),
      read = createRuntimeEffectReader();
    hero.quarterAim = direction;
    const action = hero.player.customActions.find((a) => hero.player.actionSettings[a.key]?.group === 'attack');
    let flat;
    for (let frame = 0; frame <= 100; frame++) {
      hero.player.actionPreview = { action: action.key, t: frame / 100 };
      const raw = alignEffectRegions(hero, hero.player.attackInteractionRegions, read);
      flat = groundAttackRegions(hero, raw)[0];
      if (flat) break;
    }
    assert.ok(flat);
    const front = makeActor('swordman', flat.x + flat.w / 2, flat.y + flat.h / 2);
    front.id = 'effect-front';
    const back = makeActor('swordman', 960 - front.player.x, -front.quarterDepth);
    back.id = 'effect-back';
    for (const actor of [hero, front, back])
      Object.defineProperty(actor.player, 'collisionInteractionRegions', { value: [] });
    for (const target of [front, back]) {
      Object.defineProperty(target.player, 'hurtInteractionRegions', {
        value: [{ key: 'body', x: target.player.x - 1, y: 350, w: 2, h: 80, reaction: { hurtByAttack: true } }],
      });
      Object.defineProperty(target.player, 'guardInteractionRegions', { value: [] });
    }
    const hp = front.hp,
      backHp = back.hp;
    resolveCombat({
      actors: [hero, front, back],
      playerActor: hero,
      world: {
        ...world,
        quarterView: { ...plane, prepareAttackRegions: (actor, raw) => alignEffectRegions(actor, raw, read) },
      },
      particleEffects: particles,
      onPlayerDeath() {},
      onPlayerKill() {},
      onEnemyDeath() {},
    });
    assert.ok(front.hp < hp);
    assert.equal(back.hp, backHp);
  });
