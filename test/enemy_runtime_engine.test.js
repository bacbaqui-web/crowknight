import assert from 'node:assert/strict';
import test from 'node:test';

import { maintainEnemyFlow, resolveEnemyActorSpawnRule, updateBattleActorMotion } from '../src/enemy_runtime_engine.js';

function createPlayerActor({ x = 0, updateOrder = null } = {}) {
  return {
    id: 'player',
    group: 'players',
    hurtCooldown: 0,
    hitStun: 0,
    invulnTime: 0,
    hitCancelFlashTime: 0,
    player: {
      x,
      y: 0,
      update() {
        updateOrder?.push('player');
      },
    },
  };
}

function createEnemy({ id = 'mob', group = 'mobs', active = true, x = 0, hp = 3, maxHp = 5, updateOrder = null } = {}) {
  return {
    id,
    group,
    tuning: { maxHpPips: maxHp },
    hpPips: hp,
    maxHpPips: maxHp,
    respawning: !active,
    enemyRespawnTimer: null,
    invulnTime: 0,
    hurtCooldown: 0,
    hitStun: 0,
    hitCancelFlashTime: 0,
    lastHitSerials: { old: 1 },
    aiActionCooldowns: {},
    runtimeBossKillCounted: true,
    player: {
      x,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 1,
      dead: !active,
      deathRagdoll: null,
      hurtTime: 0,
      actionKey: 'idle',
      actionSettings: {},
      actions: [],
      attackSerial: 0,
      onGround: true,
      isCustomActionActive: false,
      getActionFrameProgress: () => 0,
      getActionDuration: () => 0.6,
      updateNpc() {
        updateOrder?.push(id);
      },
      updateState() {},
    },
  };
}

function aliveCount(actors) {
  return actors.filter((actor) => !actor.respawning && !actor.player.dead).length;
}

test('maintainEnemyFlow은 Actor rule, pool rule, 기본 maxAlive 순서를 유지한다', () => {
  const playerActor = createPlayerActor();

  assert.deepEqual(
    resolveEnemyActorSpawnRule(
      {
        enemyRules: {
          spawnRulesByActor: { 'actor-rule': { maxAlive: 1.6 } },
          pool: [{ actorId: 'actor-rule', maxAlive: 1 }],
        },
      },
      'actor-rule'
    ),
    { maxAlive: 2, intervalSec: 2 }
  );

  const actorRuleEnemies = Array.from({ length: 3 }, () => createEnemy({ id: 'actor-rule' }));
  maintainEnemyFlow({
    actors: [playerActor, ...actorRuleEnemies],
    playerActor,
    world: {
      enemyRules: {
        spawnRulesByActor: { 'actor-rule': { maxAlive: 1.6 } },
        pool: [{ actorId: 'actor-rule', maxAlive: 1 }],
      },
    },
    dt: 0,
  });
  assert.equal(aliveCount(actorRuleEnemies), 2);

  const poolRuleEnemies = Array.from({ length: 3 }, () => createEnemy({ id: 'pool-rule' }));
  maintainEnemyFlow({
    actors: [playerActor, ...poolRuleEnemies],
    playerActor,
    world: { enemyRules: { pool: [{ actorId: 'pool-rule', maxAlive: 1 }] } },
    dt: 0,
  });
  assert.equal(aliveCount(poolRuleEnemies), 1);

  const defaultRuleEnemies = Array.from({ length: 2 }, () => createEnemy({ id: 'default-rule' }));
  maintainEnemyFlow({ actors: [playerActor, ...defaultRuleEnemies], playerActor, world: {}, dt: 0 });
  assert.equal(aliveCount(defaultRuleEnemies), 1);

  const negativeRuleEnemies = Array.from({ length: 2 }, () => createEnemy({ id: 'negative-rule' }));
  maintainEnemyFlow({
    actors: [playerActor, ...negativeRuleEnemies],
    playerActor,
    world: { enemyRules: { spawnRulesByActor: { 'negative-rule': { maxAlive: -5 } } } },
    dt: 0,
  });
  assert.equal(aliveCount(negativeRuleEnemies), 0);
});

test('maintainEnemyFlow은 Actor 종류와 mobs/bosses 활성 수를 섞지 않는다', () => {
  const playerActor = createPlayerActor();
  const wolves = [createEnemy({ id: 'wolf' }), createEnemy({ id: 'wolf' })];
  const crows = [createEnemy({ id: 'crow' }), createEnemy({ id: 'crow' })];
  const bosses = [createEnemy({ id: 'crow-boss', group: 'bosses' }), createEnemy({ id: 'crow-boss', group: 'bosses' })];
  const world = {
    enemyRules: {
      spawnRulesByActor: {
        wolf: { maxAlive: 1 },
        crow: { maxAlive: 2 },
        'crow-boss': { maxAlive: 1 },
      },
    },
  };

  maintainEnemyFlow({ actors: [playerActor, ...wolves, ...crows, ...bosses], playerActor, world, dt: 0 });

  assert.equal(aliveCount(wolves), 1);
  assert.equal(aliveCount(crows), 2);
  assert.equal(aliveCount(bosses), 1);
});

test('전투 전 dt 0은 필요한 수만 활성화하고 사망 Enemy timer를 진행하지 않는다', () => {
  const playerActor = createPlayerActor();
  const active = createEnemy({ id: 'mob' });
  const hiddenA = createEnemy({ id: 'mob', active: false });
  const hiddenB = createEnemy({ id: 'mob', active: false });
  const killed = createEnemy({ id: 'other', active: true });
  killed.player.dead = true;
  killed.respawning = false;
  const world = {
    enemyRules: {
      spawnRulesByActor: {
        mob: { maxAlive: 2 },
        other: { maxAlive: 1, intervalSec: 2 },
      },
    },
  };

  maintainEnemyFlow({ actors: [playerActor, active, hiddenA, hiddenB, killed], playerActor, world, dt: 0 });

  assert.equal(aliveCount([active, hiddenA, hiddenB]), 2);
  assert.equal(hiddenA.respawning, false);
  assert.equal(hiddenB.respawning, true);
  assert.equal(killed.player.dead, true);
  assert.equal(killed.enemyRespawnTimer, 2);
});

test('전투 후 Enemy Flow는 timer 완료 뒤 위치와 Runtime 상태를 초기화한다', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5;
  try {
    const playerActor = createPlayerActor({ x: 100 });
    const survivor = createEnemy({ id: 'mob', hp: 2 });
    survivor.aiActionCooldowns = { keep: 4 };
    const killed = createEnemy({ id: 'mob', hp: 0 });
    killed.player.dead = true;
    killed.respawning = false;
    killed.player.x = -200;
    killed.player.y = 300;
    killed.player.vx = 10;
    killed.player.vy = -20;
    killed.invulnTime = 3;
    killed.aiActionCooldowns = { old: 5 };
    const world = {
      floorY: 480,
      enemyRules: {
        spawnRulesByActor: { mob: { maxAlive: 2, intervalSec: 2 } },
        spawnRule: { cameraOffsetMin: 700, cameraOffsetMax: 900, intervalSec: 2 },
      },
    };

    maintainEnemyFlow({ actors: [playerActor, survivor, killed], playerActor, world, dt: 1.5 });
    assert.equal(killed.player.dead, true);
    assert.equal(killed.enemyRespawnTimer, 0.5);

    maintainEnemyFlow({ actors: [playerActor, survivor, killed], playerActor, world, dt: 0.5 });
    assert.equal(killed.player.dead, false);
    assert.equal(killed.respawning, false);
    assert.equal(killed.enemyRespawnTimer, null);
    assert.equal(killed.hpPips, 5);
    assert.equal(killed.player.x, 900);
    assert.equal(killed.player.y, 480);
    assert.equal(killed.player.vx, 0);
    assert.equal(killed.player.vy, 0);
    assert.equal(killed.invulnTime, 0);
    assert.deepEqual(killed.aiActionCooldowns, {});
    assert.deepEqual(killed.lastHitSerials, {});
    assert.equal(killed.runtimeBossKillCounted, false);
    assert.equal(survivor.hpPips, 2);
    assert.deepEqual(survivor.aiActionCooldowns, { keep: 4 });
  } finally {
    Math.random = originalRandom;
  }
});

test('Enemy 방향, AI 선택, cooldown과 Player/NPC update 순서를 유지한다', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.25;
  try {
    const updateOrder = [];
    const playerActor = createPlayerActor({ x: 100, updateOrder });
    const enemy = createEnemy({ id: 'mob', x: 0, updateOrder });
    enemy.aiActionCooldowns = { old: 0.2 };
    enemy.player.actionSettings = {
      idle: {
        duration: 0.2,
        formulas: [{ type: 'lock', enabled: true, startFrame: 1, endFrame: 1, direction: 'away' }],
      },
      slash: {
        formulas: [{ type: 'ai', enabled: true, startFrame: 1, endFrame: 1 }],
        ai: { enabled: true, minRange: 0, maxRange: 200, cooldown: 1, chance: 50, priority: 3 },
      },
    };
    enemy.player.actions = [{ key: 'slash' }];

    updateBattleActorMotion({
      actors: [playerActor, enemy],
      playerActor,
      keys: new Set(),
      pressed: new Set(),
      world: {},
      dt: 0.1,
    });

    assert.deepEqual(updateOrder, ['player', 'mob']);
    assert.equal(enemy.player.facing, -1);
    assert.equal(enemy.player.customActionKey, 'slash');
    assert.equal(enemy.player.customActionFacing, -1);
    assert.equal(enemy.aiActionCooldowns.old, 0.1);
    assert.equal(enemy.aiActionCooldowns.slash, 1);
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(Math.random, originalRandom);
});

test('Enemy가 Action 실행 불가능 상태이면 새 AI Action을 시작하지 않는다', () => {
  const playerActor = createPlayerActor({ x: 100 });
  const enemy = createEnemy({ id: 'mob', x: 0 });
  enemy.player.isCustomActionActive = true;
  enemy.player.customActionKey = 'active-action';
  enemy.player.actionSettings = {
    slash: {
      formulas: [{ type: 'ai', enabled: true, startFrame: 1, endFrame: 1 }],
      ai: { enabled: true, minRange: 0, maxRange: 200, cooldown: 1, chance: 100, priority: 3 },
    },
  };
  enemy.player.actions = [{ key: 'slash' }];

  updateBattleActorMotion({
    actors: [playerActor, enemy],
    playerActor,
    keys: new Set(),
    pressed: new Set(),
    world: {},
    dt: 0.1,
  });

  assert.equal(enemy.player.customActionKey, 'active-action');
  assert.deepEqual(enemy.aiActionCooldowns, {});
});
