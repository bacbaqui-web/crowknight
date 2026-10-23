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
import { combatTargetRegions, resolveGroundCollision, sameGroundContact } from '../src/quarter_view/spatial.js';
import { resolveCombat } from '../src/combat_engine.js';

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
  targetRegions: combatTargetRegions,
  resolveCollision: resolveGroundCollision,
  sameGroundContact,
  afterHit() {},
};
const world = { floorY: 430, minX: -10000, maxX: 10000, worldPhysics: { gravity: 1, inertia: 30 }, quarterView: plane };
const particles = { triggerHitImpact() {}, shakeScreen() {} };

for (const side of [-1, 1])
  for (const z of [-1, 1]) {
    test(`${side < 0 ? 'left' : 'right'} sprite / ${z < 0 ? 'up' : 'down'} attack damages only the forward depth lane while the actor keeps its side-facing rig`, () => {
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
        makeActor('swordman', hero.player.x, hero.quarterDepth - z * 180),
        makeActor('swordman', hero.player.x + 180, hero.quarterDepth),
      ];
      targets.forEach((target, index) => {
        target.id = `target-${index}`;
        target.runtimeInstanceId = target.id;
      });
      const originalHp = targets.map((target) => target.hp);
      preparePlaneMotion(hero, null, new Set(['KeyQ']), new Set(['KeyQ']));
      assert.equal(requestRuntimeAction(hero.player, hero.tuning.skillActions.firstStrike, facing, 'tap'), true);
      finishPlaneMotion(hero);
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
      }
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
