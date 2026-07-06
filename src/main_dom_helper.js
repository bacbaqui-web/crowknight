export function getMainDomElements() {
  const canvas = document.querySelector('#game');

  return {
    canvas,
    ctx: canvas.getContext('2d'),
    isFullStage: document.body.classList.contains('full-stage'),
    startBattleButton: document.querySelector('#startBattle'),
    endBattleButton: document.querySelector('#endBattle'),
    homeStartButton: document.querySelector('#homeStart'),
    startScreen: document.querySelector('#startScreen'),
    resultScreen: document.querySelector('#resultScreen'),
    rankingList: document.querySelector('#rankingList'),
    settingsRankingList: document.querySelector('#settingsRankingList'),
    settingsRankingPanel: document.querySelector('.settings-ranking-panel'),
    settingsRankingToggle: document.querySelector('#rankingToggle'),
    rankingForm: document.querySelector('#rankingForm'),
    rankingName: document.querySelector('#rankingName'),
    rankingMessage: document.querySelector('#rankingMessage'),
    resultScore: document.querySelector('#resultScore'),
    resultSurvival: document.querySelector('#resultSurvival'),
    resultKills: document.querySelector('#resultKills'),
    hudSurvivalTime: document.querySelector('#hudSurvivalTime'),
    hudKills: document.querySelector('#hudKills'),
    retryRunButton: document.querySelector('#retryRun'),
  };
}
