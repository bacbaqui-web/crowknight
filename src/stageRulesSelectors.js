import { normalizeStageRules } from './stageRulesState.js';

export function selectStageRules(source) {
  return normalizeStageRules(resolveStageRulesSource(source));
}

export function getProgressionRules(source) {
  return selectStageRules(source).progression;
}

export function getEnemyRules(source) {
  return selectStageRules(source).enemy;
}

export function getEnemyPool(source) {
  return getEnemyRules(source).pool;
}

export function getEnemySpawnRule(source) {
  return getEnemyRules(source).spawnRule;
}

export function getEnemyGrowthRules(source) {
  return getEnemyRules(source).growth;
}

export function getEnemyPatternRules(source) {
  return getEnemyRules(source).pattern;
}

export function getRewardRules(source) {
  return selectStageRules(source).reward;
}

export function getRewardCardPool(source) {
  return getRewardRules(source).cardPool;
}

export function getRewardDropRules(source) {
  return getRewardRules(source).dropRules;
}

export function getScoreRules(source) {
  return selectStageRules(source).score;
}

export function getScoreSurvivalRules(source) {
  return getScoreRules(source).survival;
}

export function getScoreKillRules(source) {
  return getScoreRules(source).kill;
}

function resolveStageRulesSource(source) {
  if (!source || typeof source !== 'object') return null;
  if ('stageRules' in source) return source.stageRules;
  return source;
}
