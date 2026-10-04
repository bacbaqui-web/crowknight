import assert from 'node:assert/strict';
import test from 'node:test';

import { createRunActorState } from '../src/run_actor_state.js';

function createActor({ id, group, type = 'enemy', maxHpPips = 5, assets = null } = {}) {
  const sharedAssets = assets || { body: `${id}.png` };
  return {
    id,
    name: id,
    group,
    type,
    maxHp: maxHpPips * 20,
    hp: maxHpPips * 20,
    respawnTargetX: 100,
    tuning: {
      maxHpPips,
      actionSettings: { idle: { duration: 0.2 } },
      customActions: [],
    },
    player: {
      x: 100,
      assets: sharedAssets,
      debugInteractionObjects: false,
    },
  };
}

function createFakeRuntimePlayer(source, world) {
  return {
    x: source.player.x,
    y: world.floorY,
    assets: source.player.assets,
    actionSettings: {},
    customActionKey: null,
    dead: false,
    applyTuning(tuning) {
      this.actionSettings = Object.fromEntries(
        Object.entries(tuning.actionSettings || {}).map(([key, settings]) => [key, { ...settings }])
      );
      this.customActions = (tuning.customActions || []).map((action) => ({ ...action }));
    },
  };
}

function createState(actors, world = {}) {
  return createRunActorState({ actors, world, createRuntimePlayer: createFakeRuntimePlayer });
}

test('선택 Player가 유효하면 사용하고 없거나 Enemy이면 기본 Player로 fallback한다', () => {
  const playerA = createActor({ id: 'player-a', group: 'players', type: 'player' });
  const playerB = createActor({ id: 'player-b', group: 'players', type: 'player' });
  const enemy = createActor({ id: 'mob-a', group: 'mobs' });
  const state = createState([playerA, playerB, enemy]);
  const editorSelection = { current: playerB };

  assert.equal(state.findBaseActor('player-b'), playerB);
  assert.equal(state.findBaseActor('missing'), null);
  assert.equal(state.resolvePlayer(editorSelection.current), playerB);
  assert.equal(editorSelection.current, playerB);
  assert.equal(state.resolvePlayer({ id: 'missing' }), playerA);
  assert.equal(state.resolvePlayer(enemy), playerA);
  assert.equal(state.getPlayer(), playerA);
});

test('Runtime Enemy clone은 원본과 다른 객체이며 mutable Runtime 상태를 공유하지 않는다', () => {
  const player = createActor({ id: 'player', group: 'players', type: 'player' });
  const enemy = createActor({ id: 'mob-a', group: 'mobs', maxHpPips: 7 });
  const state = createState([player, enemy], {
    floorY: 480,
    enemyRules: { spawnRulesByActor: { 'mob-a': { maxAlive: 2 } } },
  });

  state.resolvePlayer(player);
  const [cloneA, cloneB] = state.rebuildEnemies();

  assert.notEqual(cloneA, enemy);
  assert.notEqual(cloneA.player, enemy.player);
  assert.notEqual(cloneA.player, cloneB.player);
  assert.notEqual(cloneA.tuning, enemy.tuning);
  assert.notEqual(cloneA.tuning, cloneB.tuning);
  assert.equal(cloneA.player.assets, enemy.player.assets);
  assert.equal(cloneA.runtimeSourceActorId, 'mob-a');
  assert.equal(cloneA.runtimeInstanceId, 'mob-a#1');
  assert.equal(cloneB.runtimeInstanceId, 'mob-a#2');

  cloneA.hp = 1;
  cloneA.tuning.maxHpPips = 2;
  cloneA.aiActionCooldowns.slash = 3;
  cloneA.lastHitSerials.player = 4;
  cloneA.player.actionSettings.idle.duration = 9;

  assert.equal(enemy.hp, 140);
  assert.equal(enemy.tuning.maxHpPips, 7);
  assert.deepEqual(enemy.player, {
    x: 100,
    assets: enemy.player.assets,
    debugInteractionObjects: false,
  });
  assert.equal(cloneB.hp, 140);
  assert.equal(cloneB.tuning.maxHpPips, 7);
  assert.deepEqual(cloneB.aiActionCooldowns, {});
  assert.deepEqual(cloneB.lastHitSerials, {});
  assert.equal(cloneB.player.actionSettings.idle.duration, 0.2);
});

test('Actor별 maxAlive를 적용하고 0인 Actor는 생성하지 않는다', () => {
  const player = createActor({ id: 'player', group: 'players', type: 'player' });
  const mobA = createActor({ id: 'mob-a', group: 'mobs' });
  const mobB = createActor({ id: 'mob-b', group: 'mobs' });
  const boss = createActor({ id: 'boss-a', group: 'bosses' });
  const state = createState([player, mobA, mobB, boss], {
    floorY: 480,
    enemyRules: {
      spawnRulesByActor: {
        'mob-a': { maxAlive: 2 },
        'mob-b': { maxAlive: 0 },
      },
      pool: [{ actorId: 'boss-a', maxAlive: 3 }],
    },
  });

  const enemies = state.rebuildEnemies();

  assert.deepEqual(
    enemies.map((actor) => actor.runtimeInstanceId),
    ['mob-a#1', 'mob-a#2', 'boss-a#1', 'boss-a#2', 'boss-a#3']
  );
});

test('Run Actor는 Player, mobs, bosses 순서와 정의별 원본 순서를 유지한다', () => {
  const player = createActor({ id: 'player', group: 'players', type: 'player' });
  const bossA = createActor({ id: 'boss-a', group: 'bosses' });
  const mobA = createActor({ id: 'mob-a', group: 'mobs' });
  const bossB = createActor({ id: 'boss-b', group: 'bosses' });
  const mobB = createActor({ id: 'mob-b', group: 'mobs' });
  const state = createState([bossA, mobA, player, bossB, mobB], {
    floorY: 480,
    enemyRules: { spawnRule: { intervalSec: 2 } },
  });

  state.resolvePlayer(player);
  state.rebuildEnemies();
  const runActors = state.getRunActors();

  assert.deepEqual(
    runActors.map((actor) => actor.runtimeSourceActorId || actor.id),
    ['player', 'mob-a', 'mob-b', 'boss-a', 'boss-b']
  );
  assert.deepEqual(
    state.getRenderActors(runActors).map((actor) => actor.runtimeSourceActorId || actor.id),
    ['mob-a', 'mob-b', 'boss-a', 'boss-b', 'player']
  );
});

test('Preview는 base Actor를 유지하고 Battle은 Runtime Enemy clone만 반환한다', () => {
  const player = createActor({ id: 'player', group: 'players', type: 'player' });
  const enemy = createActor({ id: 'mob-a', group: 'mobs' });
  const trash = createActor({ id: 'trash-a', group: 'trash' });
  trash.deleted = true;
  const state = createState([player, enemy, trash], { floorY: 480 });

  state.resolvePlayer(player);
  state.rebuildEnemies();

  assert.deepEqual(state.getActiveActors({ runActive: false }), [player, enemy]);
  const battleActors = state.getActiveActors({ runActive: true });
  assert.equal(battleActors[0], player);
  assert.notEqual(battleActors[1], enemy);
  assert.equal(battleActors[1].runtimeSourceActorId, enemy.id);
  assert.equal(state.getEditorControlActor(enemy, state.getActiveActors({ runActive: false })), enemy);
});

test('rebuild하면 이전 Enemy 배열과 Runtime 상태를 재사용하지 않는다', () => {
  const player = createActor({ id: 'player', group: 'players', type: 'player' });
  const enemy = createActor({ id: 'mob-a', group: 'mobs' });
  const state = createState([player, enemy], {
    floorY: 480,
    enemyRules: { spawnRulesByActor: { 'mob-a': { maxAlive: 1 } } },
  });

  const firstEnemies = state.rebuildEnemies();
  firstEnemies[0].respawning = true;
  firstEnemies[0].enemyRespawnTimer = 9;
  firstEnemies[0].player.dead = true;
  firstEnemies[0].aiActionCooldowns.slash = 5;

  const secondEnemies = state.rebuildEnemies();

  assert.notEqual(secondEnemies, firstEnemies);
  assert.notEqual(secondEnemies[0], firstEnemies[0]);
  assert.equal(secondEnemies[0].respawning, false);
  assert.equal(secondEnemies[0].enemyRespawnTimer, undefined);
  assert.equal(secondEnemies[0].player.dead, false);
  assert.deepEqual(secondEnemies[0].aiActionCooldowns, {});
  assert.equal(enemy.respawning, undefined);
});
