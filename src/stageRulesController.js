import { createStageRulesState, normalizeStageRules } from './stageRulesState.js';

export function createStageRulesController({ stageRulesState = null, initialRules = null, onChange = null } = {}) {
  const state = stageRulesState || createStageRulesState(initialRules);

  function readStageRules() {
    return state.getStageRules();
  }

  function commitStageRules(nextRules, { notify = true } = {}) {
    const normalized = state.setStageRules(nextRules);
    if (notify) onChange?.(normalized);
    return normalized;
  }

  function setRulesSection(sectionKey, nextSection) {
    const currentRules = selectStageRules(readStageRules());
    const currentSection = currentRules[sectionKey];
    const nextRules = {
      ...currentRules,
      [sectionKey]: mergePlainObject(currentSection, nextSection),
    };
    return commitStageRules(nextRules)[sectionKey];
  }

  function setEnemyRules(nextEnemyRules) {
    return setRulesSection('enemy', nextEnemyRules);
  }

  function setRewardRules(nextRewardRules) {
    return setRulesSection('reward', nextRewardRules);
  }

  function setScoreRules(nextScoreRules) {
    return setRulesSection('score', nextScoreRules);
  }

  return {
    getStageRules: readStageRules,
    setStageRules: commitStageRules,
    getProgressionRules: () => selectProgressionRules(readStageRules()),
    setProgressionRules: (nextProgressionRules) => setRulesSection('progression', nextProgressionRules),
    getEnemyRules: () => selectEnemyRules(readStageRules()),
    setEnemyRules,
    getEnemyPool: () => selectEnemyPool(readStageRules()),
    setEnemyPool: (pool) => setEnemyRules({ pool }).pool,
    getEnemySpawnRule: () => selectEnemySpawnRule(readStageRules()),
    setEnemySpawnRule: (spawnRule) =>
      setEnemyRules({ spawnRule: mergePlainObject(selectEnemySpawnRule(readStageRules()), spawnRule) }).spawnRule,
    getEnemyGrowthRules: () => selectEnemyGrowthRules(readStageRules()),
    setEnemyGrowthRules: (growth) =>
      setEnemyRules({ growth: mergePlainObject(selectEnemyGrowthRules(readStageRules()), growth) }).growth,
    getEnemyPatternRules: () => selectEnemyPatternRules(readStageRules()),
    setEnemyPatternRules: (pattern) =>
      setEnemyRules({ pattern: mergePlainObject(selectEnemyPatternRules(readStageRules()), pattern) }).pattern,
    getRewardRules: () => selectRewardRules(readStageRules()),
    setRewardRules,
    getRewardCardPool: () => selectRewardCardPool(readStageRules()),
    setRewardCardPool: (cardPool) => setRewardRules({ cardPool }).cardPool,
    getRewardDropRules: () => selectRewardDropRules(readStageRules()),
    setRewardDropRules: (dropRules) => setRewardRules({ dropRules }).dropRules,
    getScoreRules: () => selectScoreRules(readStageRules()),
    setScoreRules,
    getScoreSurvivalRules: () => selectScoreSurvivalRules(readStageRules()),
    setScoreSurvivalRules: (survival) =>
      setScoreRules({ survival: mergePlainObject(selectScoreSurvivalRules(readStageRules()), survival) }).survival,
    getScoreKillRules: () => selectScoreKillRules(readStageRules()),
    setScoreKillRules: (kill) =>
      setScoreRules({ kill: mergePlainObject(selectScoreKillRules(readStageRules()), kill) }).kill,
    resetStageRules: () => {
      const resetRules = state.resetStageRules();
      onChange?.(resetRules);
      return resetRules;
    },
  };
}

function mergePlainObject(currentValue, nextValue) {
  if (!isPlainObject(currentValue) || !isPlainObject(nextValue)) return nextValue;
  return {
    ...currentValue,
    ...nextValue,
  };
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function selectStageRules(source) {
  return normalizeStageRules(resolveStageRulesSource(source));
}

function selectProgressionRules(source) {
  return selectStageRules(source).progression;
}

function selectEnemyRules(source) {
  return selectStageRules(source).enemy;
}

function selectEnemyPool(source) {
  return selectEnemyRules(source).pool;
}

function selectEnemySpawnRule(source) {
  return selectEnemyRules(source).spawnRule;
}

function selectEnemyGrowthRules(source) {
  return selectEnemyRules(source).growth;
}

function selectEnemyPatternRules(source) {
  return selectEnemyRules(source).pattern;
}

function selectRewardRules(source) {
  return selectStageRules(source).reward;
}

function selectRewardCardPool(source) {
  return selectRewardRules(source).cardPool;
}

function selectRewardDropRules(source) {
  return selectRewardRules(source).dropRules;
}

function selectScoreRules(source) {
  return selectStageRules(source).score;
}

function selectScoreSurvivalRules(source) {
  return selectScoreRules(source).survival;
}

function selectScoreKillRules(source) {
  return selectScoreRules(source).kill;
}

function resolveStageRulesSource(source) {
  if (!source || typeof source !== 'object') return null;
  if ('stageRules' in source) return source.stageRules;
  return source;
}
