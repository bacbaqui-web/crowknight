import {
  ACTOR_DEFS,
  KILL_SCORE,
  KILL_SCORE_WEIGHT,
  SURVIVAL_SCORE_PER_SECOND,
  SURVIVAL_SCORE_WEIGHT,
} from './gameConfig.js';

export const STAGE_RULES_VERSION = 1;

export function createStageRulesState(initialRules = null) {
  let stageRules = normalizeStageRules(initialRules);

  return {
    getStageRules: () => stageRules,
    setStageRules: (nextRules) => {
      stageRules = normalizeStageRules(nextRules);
      return stageRules;
    },
    resetStageRules: () => {
      stageRules = createDefaultStageRules();
      return stageRules;
    },
    createDefaultStageRules,
    normalizeStageRules,
  };
}

export function createDefaultStageRules() {
  return {
    version: STAGE_RULES_VERSION,
    progression: createDefaultProgressionRules(),
    enemy: createDefaultEnemyRules(),
    reward: createDefaultRewardRules(),
    score: createDefaultScoreRules(),
  };
}

export function normalizeStageRules(saved) {
  return {
    version: Number.isInteger(saved?.version) && saved.version > 0 ? saved.version : STAGE_RULES_VERSION,
    progression: normalizeProgressionRules(saved?.progression),
    enemy: normalizeEnemyRules(saved?.enemy),
    reward: normalizeRewardRules(saved?.reward),
    score: normalizeScoreRules(saved?.score),
  };
}

function createDefaultProgressionRules() {
  return {
    mode: 'endless',
    durationSec: 60,
    distance: null,
    clearCondition: { type: 'none' },
    failCondition: { type: 'playerDeath' },
    difficultyCurve: {
      type: 'linear',
      start: 1,
      end: 1,
      rampSec: 0,
    },
    spawnBudget: {
      base: defaultEnemyActorIds().length,
      perMinute: 0,
      max: defaultEnemyActorIds().length,
    },
  };
}

function createDefaultEnemyRules() {
  const maxAlive = defaultEnemyActorIds().length;
  return {
    pool: defaultEnemyActorIds().map((actorId) => ({
      actorId,
      weight: 1,
      maxAlive: 1,
      tags: [],
    })),
    spawnRule: {
      mode: 'cameraRespawn',
      intervalSec: 2,
      batchSize: 1,
      maxAlive,
      side: 'front',
      cameraOffsetMin: 740,
      cameraOffsetMax: 960,
    },
    growth: {
      hpMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      perMinute: 0,
      curve: 'linear',
    },
    pattern: {
      aiPreset: 'default',
      aggression: 1,
      spacing: 1,
      attackCooldownScale: 1,
    },
  };
}

function createDefaultRewardRules() {
  return {
    cardPool: [],
    dropRules: [],
    unlockCondition: { type: 'none' },
  };
}

function createDefaultScoreRules() {
  return {
    survival: {
      pointsPerSecond: SURVIVAL_SCORE_PER_SECOND,
      weight: SURVIVAL_SCORE_WEIGHT,
    },
    kill: {
      points: KILL_SCORE,
      weight: KILL_SCORE_WEIGHT,
    },
    clearBonus: 0,
    penalty: {
      damageTaken: 0,
      death: 0,
    },
    rankThresholds: [],
    display: {
      showSurvival: true,
      showKills: true,
      showScore: true,
    },
  };
}

function normalizeProgressionRules(saved) {
  const defaults = createDefaultProgressionRules();
  return {
    mode: normalizeChoice(saved?.mode, ['endless', 'fixed'], defaults.mode),
    durationSec: nullableNumber(saved?.durationSec, 1, 60 * 60, defaults.durationSec),
    distance: nullableNumber(saved?.distance, 100, 100000, defaults.distance),
    clearCondition: normalizeCondition(saved?.clearCondition, defaults.clearCondition),
    failCondition: normalizeCondition(saved?.failCondition, defaults.failCondition),
    difficultyCurve: {
      type: normalizeChoice(saved?.difficultyCurve?.type, ['linear', 'step', 'flat'], defaults.difficultyCurve.type),
      start: clampNumber(saved?.difficultyCurve?.start, 0.1, 20, defaults.difficultyCurve.start),
      end: clampNumber(saved?.difficultyCurve?.end, 0.1, 20, defaults.difficultyCurve.end),
      rampSec: clampNumber(saved?.difficultyCurve?.rampSec, 0, 60 * 60, defaults.difficultyCurve.rampSec),
    },
    spawnBudget: {
      base: clampNumber(saved?.spawnBudget?.base, 0, 200, defaults.spawnBudget.base),
      perMinute: clampNumber(saved?.spawnBudget?.perMinute, 0, 200, defaults.spawnBudget.perMinute),
      max: clampNumber(saved?.spawnBudget?.max, 0, 200, defaults.spawnBudget.max),
    },
  };
}

function normalizeEnemyRules(saved) {
  const defaults = createDefaultEnemyRules();
  return {
    pool: normalizeEnemyPool(saved?.pool, defaults.pool),
    spawnRule: {
      mode: normalizeChoice(saved?.spawnRule?.mode, ['cameraRespawn', 'interval', 'wave'], defaults.spawnRule.mode),
      intervalSec: clampNumber(saved?.spawnRule?.intervalSec, 0.1, 300, defaults.spawnRule.intervalSec),
      batchSize: clampNumber(saved?.spawnRule?.batchSize, 1, 50, defaults.spawnRule.batchSize),
      maxAlive: clampNumber(saved?.spawnRule?.maxAlive, 0, 200, defaults.spawnRule.maxAlive),
      side: normalizeChoice(saved?.spawnRule?.side, ['front', 'back', 'both'], defaults.spawnRule.side),
      cameraOffsetMin: clampNumber(saved?.spawnRule?.cameraOffsetMin, -4000, 4000, defaults.spawnRule.cameraOffsetMin),
      cameraOffsetMax: clampNumber(saved?.spawnRule?.cameraOffsetMax, -4000, 4000, defaults.spawnRule.cameraOffsetMax),
    },
    growth: {
      hpMultiplier: clampNumber(saved?.growth?.hpMultiplier, 0.1, 100, defaults.growth.hpMultiplier),
      damageMultiplier: clampNumber(saved?.growth?.damageMultiplier, 0.1, 100, defaults.growth.damageMultiplier),
      speedMultiplier: clampNumber(saved?.growth?.speedMultiplier, 0.1, 10, defaults.growth.speedMultiplier),
      perMinute: clampNumber(saved?.growth?.perMinute, 0, 100, defaults.growth.perMinute),
      curve: normalizeChoice(saved?.growth?.curve, ['linear', 'step', 'flat'], defaults.growth.curve),
    },
    pattern: {
      aiPreset: nonEmptyString(saved?.pattern?.aiPreset) || defaults.pattern.aiPreset,
      aggression: clampNumber(saved?.pattern?.aggression, 0, 10, defaults.pattern.aggression),
      spacing: clampNumber(saved?.pattern?.spacing, 0, 10, defaults.pattern.spacing),
      attackCooldownScale: clampNumber(
        saved?.pattern?.attackCooldownScale,
        0.1,
        10,
        defaults.pattern.attackCooldownScale
      ),
    },
  };
}

function normalizeRewardRules(saved) {
  const defaults = createDefaultRewardRules();
  return {
    cardPool: normalizeWeightedPool(saved?.cardPool, 'cardId'),
    dropRules: Array.isArray(saved?.dropRules) ? saved.dropRules.map(normalizeDropRule).filter(Boolean) : [],
    unlockCondition: normalizeCondition(saved?.unlockCondition, defaults.unlockCondition),
  };
}

function normalizeScoreRules(saved) {
  const defaults = createDefaultScoreRules();
  return {
    survival: {
      pointsPerSecond: clampNumber(saved?.survival?.pointsPerSecond, 0, 100000, defaults.survival.pointsPerSecond),
      weight: clampNumber(saved?.survival?.weight, 0, 100, defaults.survival.weight),
    },
    kill: {
      points: clampNumber(saved?.kill?.points, 0, 1000000, defaults.kill.points),
      weight: clampNumber(saved?.kill?.weight, 0, 100, defaults.kill.weight),
    },
    clearBonus: clampNumber(saved?.clearBonus, 0, 10000000, defaults.clearBonus),
    penalty: {
      damageTaken: clampNumber(saved?.penalty?.damageTaken, 0, 1000000, defaults.penalty.damageTaken),
      death: clampNumber(saved?.penalty?.death, 0, 1000000, defaults.penalty.death),
    },
    rankThresholds: normalizeRankThresholds(saved?.rankThresholds),
    display: {
      showSurvival: saved?.display?.showSurvival !== false,
      showKills: saved?.display?.showKills !== false,
      showScore: saved?.display?.showScore !== false,
    },
  };
}

function normalizeEnemyPool(pool, fallbackPool) {
  if (!Array.isArray(pool)) return fallbackPool;
  const normalized = pool.map(normalizeEnemyPoolEntry).filter(Boolean);
  return normalized.length ? normalized : fallbackPool;
}

function normalizeEnemyPoolEntry(entry) {
  const actorId = nonEmptyString(entry?.actorId);
  if (!actorId) return null;
  return {
    actorId,
    weight: clampNumber(entry?.weight, 0, 1000, 1),
    maxAlive: clampNumber(entry?.maxAlive, 0, 200, 1),
    tags: normalizeTags(entry?.tags),
  };
}

function normalizeWeightedPool(pool, idField) {
  if (!Array.isArray(pool)) return [];
  return pool
    .map((entry) => {
      const id = nonEmptyString(entry?.[idField]);
      if (!id) return null;
      return {
        [idField]: id,
        weight: clampNumber(entry?.weight, 0, 1000, 1),
        tags: normalizeTags(entry?.tags),
      };
    })
    .filter(Boolean);
}

function normalizeDropRule(rule) {
  const trigger = normalizeChoice(rule?.trigger, ['kill', 'waveClear', 'stageClear'], '');
  if (!trigger) return null;
  return {
    trigger,
    chance: clampNumber(rule?.chance, 0, 1, 1),
    count: clampNumber(rule?.count, 0, 100, 1),
    pool: normalizeWeightedPool(rule?.pool, 'cardId'),
    unlockCondition: normalizeCondition(rule?.unlockCondition, { type: 'none' }),
  };
}

function normalizeRankThresholds(thresholds) {
  if (!Array.isArray(thresholds)) return [];
  return thresholds
    .map((threshold) => {
      const rank = nonEmptyString(threshold?.rank);
      if (!rank) return null;
      return {
        rank,
        score: clampNumber(threshold?.score, 0, 100000000, 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
}

function normalizeCondition(condition, fallback) {
  const type = nonEmptyString(condition?.type) || fallback.type;
  const normalized = { type };
  if (condition && 'value' in condition) normalized.value = condition.value;
  if (condition && 'target' in condition) normalized.target = condition.target;
  return normalized;
}

function defaultEnemyActorIds() {
  return ACTOR_DEFS.filter((actor) => actor.id !== 'player').map((actor) => actor.id);
}

function normalizeChoice(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(nonEmptyString).filter(Boolean);
}

function nullableNumber(value, min, max, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  return clampNumber(value, min, max, fallback);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
