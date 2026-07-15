import assert from 'node:assert/strict';
import test from 'node:test';

import { createRunLifecycleController } from '../src/run_lifecycle_controller.js';

function createController(overrides = {}) {
  const calls = {
    runStarted: 0,
    runStopped: [],
    playerDeathStarted: 0,
    resultReady: [],
    resultClosed: 0,
  };
  const controller = createRunLifecycleController({
    deathSequenceDuration: 2,
    onRunStarted: () => {
      calls.runStarted += 1;
    },
    onRunStopped: (options) => calls.runStopped.push(options),
    onPlayerDeathStarted: () => {
      calls.playerDeathStarted += 1;
    },
    onResultReady: (result) => {
      calls.resultReady.push(result);
      return true;
    },
    onResultClosed: () => {
      calls.resultClosed += 1;
      return false;
    },
    ...overrides,
  });
  return { calls, controller };
}

test('Run 시작은 상태를 초기화하고 시작 callback을 매번 한 번 호출한다', () => {
  const { calls, controller } = createController();

  controller.start();
  controller.updateSurvivalTime(3);
  controller.recordPlayerKill({ group: 'mobs' });
  controller.recordEnemyDeath({ group: 'bosses', runtimeBossKillCounted: false });
  controller.startPlayerDeath();
  controller.updateDeathSequence(2);
  controller.start();

  assert.deepEqual(controller.getSnapshot(), {
    battleActive: true,
    playerDeathPending: false,
    resultOpen: false,
    deathSequenceTime: 0,
    runSurvivalTime: 0,
    runKills: 0,
    bossKills: 0,
    lastRecordedScore: 0,
  });
  assert.equal(calls.runStarted, 2);
  assert.equal(calls.resultClosed, 2);
});

test('생존 시간은 활성 Run에서만 증가한다', () => {
  const { controller } = createController();

  controller.updateSurvivalTime(1);
  assert.equal(controller.getSnapshot().runSurvivalTime, 0);
  controller.start();
  controller.updateSurvivalTime(1.25);
  assert.equal(controller.getSnapshot().runSurvivalTime, 1.25);
  controller.startPlayerDeath();
  controller.updateSurvivalTime(1);
  assert.equal(controller.getSnapshot().runSurvivalTime, 1.25);
  controller.updateDeathSequence(2);
  controller.updateSurvivalTime(1);
  assert.equal(controller.getSnapshot().runSurvivalTime, 1.25);
});

test('일반 적 처치는 mobs만 집계하고 Player, Boss와 잘못된 Actor는 제외한다', () => {
  const { controller } = createController();
  controller.start();

  assert.equal(controller.recordPlayerKill({ group: 'mobs' }), true);
  assert.equal(controller.recordPlayerKill({ group: 'bosses' }), false);
  assert.equal(controller.recordPlayerKill({ group: 'players', type: 'player' }), false);
  assert.equal(controller.recordPlayerKill(null), false);
  assert.equal(controller.getSnapshot().runKills, 1);
});

test('Boss 처치는 한 번만 별도 집계하고 HP나 난이도 상태를 변경하지 않는다', () => {
  const { controller } = createController();
  const boss = { group: 'bosses', runtimeBossKillCounted: false, hpPips: 0 };
  const mob = { group: 'mobs', runtimeBossKillCounted: false };
  controller.start();

  assert.equal(controller.recordEnemyDeath(mob), false);
  assert.equal(controller.recordEnemyDeath(boss), true);
  assert.equal(controller.recordEnemyDeath(boss), false);
  assert.equal(controller.getSnapshot().bossKills, 1);
  assert.equal(controller.getSnapshot().runKills, 0);
  assert.equal(boss.hpPips, 0);
  assert.equal('difficulty' in controller.getSnapshot(), false);
});

test('Player 사망은 한 번만 시작하며 duration 전에는 결과를 열지 않는다', () => {
  const { calls, controller } = createController();
  controller.start();
  controller.updateSurvivalTime(1);

  assert.equal(controller.startPlayerDeath(), true);
  controller.updateDeathSequence(0.75);
  assert.equal(controller.startPlayerDeath(), false);
  assert.equal(controller.getSnapshot().deathSequenceTime, 0.75);
  assert.equal(controller.isRunActive(), false);
  assert.equal(controller.isDeathPending(), true);
  assert.equal(controller.isResultOpen(), false);
  assert.equal(calls.playerDeathStarted, 1);
  assert.equal(calls.resultReady.length, 0);

  controller.updateDeathSequence(1.25);
  controller.updateDeathSequence(1);
  assert.equal(controller.isDeathPending(), false);
  assert.equal(controller.isResultOpen(), true);
  assert.equal(calls.resultReady.length, 1);
  assert.equal(calls.runStopped.length, 1);
});

test('결과는 생존 시간, 처치 수와 기존 점수 산식으로 한 번만 확정한다', () => {
  const { calls, controller } = createController();
  controller.start();
  controller.updateSurvivalTime(2);
  controller.recordPlayerKill({ group: 'mobs' });
  controller.recordEnemyDeath({ group: 'bosses', runtimeBossKillCounted: false });
  controller.startPlayerDeath();
  controller.updateDeathSequence(2);

  assert.deepEqual(controller.getRunResult(), {
    score: 1110,
    survivalTime: 2,
    kills: 1,
    bossKills: 1,
  });
  assert.deepEqual(calls.resultReady, [controller.getRunResult()]);
  controller.stop({ showResult: true });
  assert.equal(calls.resultReady.length, 1);
});

test('수동 종료는 활성 Run 점수를 확정하고 기존 종료 callback 분기를 전달한다', () => {
  const { calls, controller } = createController();
  controller.start();
  controller.updateSurvivalTime(4);
  controller.recordPlayerKill({ group: 'mobs' });

  assert.equal(controller.stop(), true);
  assert.equal(controller.stop(), false);
  assert.equal(controller.getRunResult().score, 120);
  assert.deepEqual(calls.runStopped, [{ showResult: false }]);
  assert.equal(controller.isRunActive(), false);
  assert.equal(controller.isResultOpen(), false);
});

test('Snapshot을 수정해도 Controller 내부 상태는 변경되지 않는다', () => {
  const { controller } = createController();
  controller.start();
  const snapshot = controller.getSnapshot();

  snapshot.battleActive = false;
  snapshot.runKills = 99;

  assert.equal(controller.isRunActive(), true);
  assert.equal(controller.getSnapshot().runKills, 0);
});
