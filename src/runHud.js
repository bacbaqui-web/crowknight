import { KILL_SCORE, KILL_SCORE_WEIGHT, SURVIVAL_SCORE_PER_SECOND, SURVIVAL_SCORE_WEIGHT } from './gameConfig.js';
import { formatSurvivalTime } from './scoreFormat.js';

export function getRunScore(survivalTime, kills) {
  const survivalScore = survivalTime * SURVIVAL_SCORE_PER_SECOND * SURVIVAL_SCORE_WEIGHT;
  const killScore = kills * KILL_SCORE * KILL_SCORE_WEIGHT;
  return Math.max(0, Math.round(survivalScore + killScore));
}

export function syncRunHud({ survivalTime, kills, hudSurvivalTime, hudKills }) {
  if (hudSurvivalTime) hudSurvivalTime.textContent = formatSurvivalTime(survivalTime);
  if (hudKills) hudKills.textContent = `${kills}`;
}
