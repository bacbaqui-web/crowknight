import { normalizeCharacterGroup } from './character_group_data.js';
import { getRunScore } from './run_hud_view.js';

export function createRunLifecycleController({
  deathSequenceDuration = 0,
  onRunStarted,
  onRunStopped,
  onPlayerDeathStarted,
  onResultReady,
  onResultClosed,
} = {}) {
  let battleActive = false;
  let playerDeathPending = false;
  let resultOpen = false;
  let resultReady = false;
  let deathSequenceTime = 0;
  let runSurvivalTime = 0;
  let runKills = 0;
  let bossKills = 0;
  let lastRecordedScore = 0;

  function start() {
    closeResult();
    battleActive = true;
    playerDeathPending = false;
    resultOpen = false;
    resultReady = false;
    deathSequenceTime = 0;
    runSurvivalTime = 0;
    runKills = 0;
    bossKills = 0;
    lastRecordedScore = 0;
    onRunStarted?.();
    return getSnapshot();
  }

  function stop({ showResult = false } = {}) {
    if (!battleActive && !showResult) return false;

    if (battleActive) lastRecordedScore = currentScore();
    battleActive = false;
    onRunStopped?.({ showResult });
    if (showResult) openResult();
    return true;
  }

  function updateSurvivalTime(dt) {
    if (!battleActive || playerDeathPending || resultOpen) return runSurvivalTime;
    runSurvivalTime += Math.max(0, Number(dt) || 0);
    return runSurvivalTime;
  }

  function startPlayerDeath() {
    if (playerDeathPending || resultOpen) return false;

    lastRecordedScore = currentScore();
    playerDeathPending = true;
    deathSequenceTime = 0;
    battleActive = false;
    onPlayerDeathStarted?.();
    return true;
  }

  function updateDeathSequence(dt) {
    if (!playerDeathPending) return false;

    deathSequenceTime += Math.max(0, Number(dt) || 0);
    if (deathSequenceTime < deathSequenceDuration) return false;

    playerDeathPending = false;
    stop({ showResult: true });
    return true;
  }

  function recordEnemyDeath(actor) {
    if (!isBossActor(actor) || actor.runtimeBossKillCounted) return false;

    actor.runtimeBossKillCounted = true;
    bossKills += 1;
    return true;
  }

  function recordPlayerKill(actor) {
    if (!isMobActor(actor)) return false;

    runKills += 1;
    return true;
  }

  function openResult() {
    if (resultReady) return resultOpen;

    resultReady = true;
    const nextResultOpen = onResultReady?.(getRunResult());
    resultOpen = nextResultOpen === undefined ? true : Boolean(nextResultOpen);
    return resultOpen;
  }

  function closeResult() {
    const nextResultOpen = onResultClosed?.();
    resultOpen = nextResultOpen === undefined ? false : Boolean(nextResultOpen);
    return resultOpen;
  }

  function currentScore() {
    return getRunScore(runSurvivalTime, runKills, bossKills);
  }

  function getRunResult() {
    return {
      score: lastRecordedScore,
      survivalTime: runSurvivalTime,
      kills: runKills,
      bossKills,
    };
  }

  function getSnapshot() {
    return {
      battleActive,
      playerDeathPending,
      resultOpen,
      deathSequenceTime,
      runSurvivalTime,
      runKills,
      bossKills,
      lastRecordedScore,
    };
  }

  function isRunActive() {
    return battleActive;
  }

  function isDeathPending() {
    return playerDeathPending;
  }

  function isResultOpen() {
    return resultOpen;
  }

  function hasActiveRunActors() {
    return battleActive || playerDeathPending || resultOpen;
  }

  return {
    getRunResult,
    getSnapshot,
    hasActiveRunActors,
    isDeathPending,
    isResultOpen,
    isRunActive,
    recordEnemyDeath,
    recordPlayerKill,
    start,
    startPlayerDeath,
    stop,
    updateDeathSequence,
    updateSurvivalTime,
  };
}

function isMobActor(actor) {
  return normalizeCharacterGroup(actor?.group, '') === 'mobs';
}

function isBossActor(actor) {
  return normalizeCharacterGroup(actor?.group, '') === 'bosses';
}
