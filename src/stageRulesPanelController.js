export function createStageRulesPanelController({
  elements,
  stageRulesController,
  beginChange = () => {},
  commitChange = () => {},
} = {}) {
  const {
    progressionMode,
    progressionDurationSec,
    progressionDurationSecNumber,
    progressionRulesFields,
    enemySpawnMode,
    enemyRulesFields,
    rewardRulesFields,
    scoreRulesFields,
  } = elements;

  progressionMode?.addEventListener('change', () => updateProgressionMode(progressionMode.value));
  progressionDurationSec?.addEventListener('input', () => updateProgressionDuration(progressionDurationSec.value));
  progressionDurationSecNumber?.addEventListener('input', () =>
    updateProgressionDuration(progressionDurationSecNumber.value)
  );
  progressionDurationSec?.addEventListener('change', commitChange);
  progressionDurationSecNumber?.addEventListener('change', commitChange);
  progressionDurationSecNumber?.addEventListener('blur', commitChange);
  enemySpawnMode?.addEventListener('change', () => updateEnemySpawnMode(enemySpawnMode.value));

  function sync() {
    renderProgressionPanel();
    renderEnemyPanel();
    renderRewardPanel();
    renderScorePanel();
  }

  function renderProgressionPanel() {
    const rules = stageRulesController.getProgressionRules();
    if (progressionMode) progressionMode.value = rules.mode;
    syncProgressionDurationInputs(rules.durationSec, [progressionDurationSec, progressionDurationSecNumber]);
    renderMetricList(progressionRulesFields, [
      ['모드', rules.mode],
      ['제한 시간', formatDuration(rules.durationSec)],
      ['실패 조건', rules.failCondition.type],
      ['스폰 예산', rules.spawnBudget.max],
    ]);
  }

  function updateProgressionMode(value) {
    beginChange();
    stageRulesController.setProgressionRules({ mode: value });
    commitChange();
    renderProgressionPanel();
  }

  function updateProgressionDuration(value) {
    beginChange();
    stageRulesController.setProgressionRules({ durationSec: value });
    renderProgressionPanel();
  }

  function renderEnemyPanel() {
    const rules = stageRulesController.getEnemyRules();
    if (enemySpawnMode) enemySpawnMode.value = rules.spawnRule.mode;
    renderMetricList(enemyRulesFields, [
      ['풀', rules.pool.length],
      ['스폰', rules.spawnRule.mode],
      ['최대 생존', rules.spawnRule.maxAlive],
      ['성장', rules.growth.curve],
      ['패턴', rules.pattern.aiPreset],
    ]);
  }

  function updateEnemySpawnMode(value) {
    beginChange();
    stageRulesController.setEnemySpawnRule({ mode: value });
    commitChange();
    renderEnemyPanel();
  }

  function renderRewardPanel() {
    const rules = stageRulesController.getRewardRules();
    renderMetricList(rewardRulesFields, [
      ['카드 풀', rules.cardPool.length],
      ['드랍 규칙', rules.dropRules.length],
      ['해금 조건', rules.unlockCondition.type],
    ]);
  }

  function renderScorePanel() {
    const rules = stageRulesController.getScoreRules();
    renderMetricList(scoreRulesFields, [
      ['생존 점수', `${rules.survival.pointsPerSecond} / ${rules.survival.weight}`],
      ['처치 점수', `${rules.kill.points} / ${rules.kill.weight}`],
      ['클리어 보너스', rules.clearBonus],
    ]);
  }

  return {
    sync,
  };
}

function syncProgressionDurationInputs(durationSec, inputs) {
  const value = String(durationSec ?? 60);
  inputs.filter(Boolean).forEach((input) => {
    input.value = value;
  });
}

function formatDuration(durationSec) {
  return durationSec === null ? '없음' : `${durationSec}s`;
}

function renderMetricList(container, rows) {
  if (!container) return;
  container.replaceChildren(...rows.map(([label, value]) => createMetricRow(label, value)));
}

function createMetricRow(label, value) {
  const row = document.createElement('div');
  row.className = 'metric';

  const labelElement = document.createElement('span');
  labelElement.textContent = label;

  const valueElement = document.createElement('strong');
  valueElement.textContent = String(value ?? '-');

  row.append(labelElement, valueElement);
  return row;
}
