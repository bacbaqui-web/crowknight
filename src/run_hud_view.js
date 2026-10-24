import {
  BOSS_KILL_SCORE,
  KILL_SCORE,
  KILL_SCORE_WEIGHT,
  SURVIVAL_SCORE_PER_SECOND,
  SURVIVAL_SCORE_WEIGHT,
} from './game_config_data.js';
import { formatSurvivalTime } from './score_format_helper.js';

export function getRunScore(survivalTime, kills, bossKills = 0) {
  const survivalScore = survivalTime * SURVIVAL_SCORE_PER_SECOND * SURVIVAL_SCORE_WEIGHT;
  const killScore = kills * KILL_SCORE * KILL_SCORE_WEIGHT;
  const bossKillScore = bossKills * BOSS_KILL_SCORE;
  return Math.max(0, Math.round(survivalScore + killScore + bossKillScore));
}

export function syncRunHud({ survivalTime, kills, bossKills, hudSurvivalTime, hudKills, hudBossKills }) {
  syncText(hudSurvivalTime, formatSurvivalTime(survivalTime));
  syncText(hudKills, `${kills}`);
  syncText(hudBossKills, `${bossKills}`);
}

function syncText(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}
