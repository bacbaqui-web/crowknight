export function createStageRulesPanelController({
  elements,
  getSceneSession = () => null,
  saveState = () => {},
  stageRulesController,
  world = null,
  beginChange = () => {},
  commitChange = () => {},
} = {}) {
  const {
    stageFloorScreenY,
    worldPhysicsGravity,
    worldPhysicsInertia,
    worldPhysicsAirControl,
    worldPhysicsCameraShakePower,
    worldPhysicsCameraShakeFrames,
    worldPhysicsCameraShakeDecay,
    difficultyBossKillInterval,
    difficultyBossHpPerLevel,
    difficultySwordmanSpawnPerLevel,
    difficultyArcherSpawnPerLevel,
    difficultyWarningText,
  } = elements;

  bindStageFloorScreenInput(stageFloorScreenY);
  bindWorldPhysicsNumberInput(worldPhysicsGravity, 'gravity');
  bindWorldPhysicsNumberInput(worldPhysicsInertia, 'inertia');
  bindWorldPhysicsNumberInput(worldPhysicsAirControl, 'airControl');
  bindWorldPhysicsNumberInput(worldPhysicsCameraShakePower, 'cameraShakePower');
  bindWorldPhysicsNumberInput(worldPhysicsCameraShakeFrames, 'cameraShakeFrames');
  bindWorldPhysicsCheckboxInput(worldPhysicsCameraShakeDecay, 'cameraShakeDecay');
  bindDifficultyNumberInput(difficultyBossKillInterval, 'bossKillInterval');
  bindDifficultyNumberInput(difficultyBossHpPerLevel, 'bossHpPerLevel');
  bindDifficultySpawnIncreaseInput(difficultySwordmanSpawnPerLevel, 'swordman');
  bindDifficultySpawnIncreaseInput(difficultyArcherSpawnPerLevel, 'archer');
  bindDifficultyWarningTextInput(difficultyWarningText);

  function sync() {
    renderWorldPhysicsPanel();
    renderDifficultyPanel();
  }

  function bindWorldPhysicsNumberInput(input, prop) {
    input?.addEventListener('input', () => updateWorldPhysicsValue(prop, input.value));
    input?.addEventListener('change', commitChange);
    input?.addEventListener('blur', commitChange);
  }

  function bindStageFloorScreenInput(input) {
    input?.addEventListener('input', () => updateStageFloorScreenY(input.value));
    input?.addEventListener('change', commitChange);
    input?.addEventListener('blur', commitChange);
  }

  function bindWorldPhysicsCheckboxInput(input, prop) {
    input?.addEventListener('change', () => {
      updateWorldPhysicsValue(prop, input.checked ? 1 : 0);
      commitChange();
    });
  }

  function bindDifficultyNumberInput(input, prop) {
    input?.addEventListener('input', () => updateDifficultyValue(prop, input.value));
    input?.addEventListener('change', commitChange);
    input?.addEventListener('blur', commitChange);
  }

  function bindDifficultySpawnIncreaseInput(input, actorId) {
    input?.addEventListener('input', () => updateDifficultySpawnIncrease(actorId, input.value));
    input?.addEventListener('change', commitChange);
    input?.addEventListener('blur', commitChange);
  }

  function bindDifficultyWarningTextInput(input) {
    input?.addEventListener('input', () => updateDifficultyValue('warningText', input.value));
    input?.addEventListener('change', commitChange);
    input?.addEventListener('blur', commitChange);
  }

  function renderWorldPhysicsPanel() {
    const rules = stageRulesController.getWorldPhysicsRules();
    syncNumberInput(stageFloorScreenY, currentFloorScreenY());
    syncNumberInput(worldPhysicsGravity, rules.gravity);
    syncNumberInput(worldPhysicsInertia, rules.inertia);
    syncNumberInput(worldPhysicsAirControl, rules.airControl);
    syncNumberInput(worldPhysicsCameraShakePower, rules.cameraShakePower);
    syncNumberInput(worldPhysicsCameraShakeFrames, rules.cameraShakeFrames);
    syncCheckboxInput(worldPhysicsCameraShakeDecay, rules.cameraShakeDecay);
  }

  function renderDifficultyPanel() {
    const rules = stageRulesController.getEnemyDifficultyRules?.() || {};
    syncNumberInput(difficultyBossKillInterval, rules.bossKillInterval);
    syncNumberInput(difficultyBossHpPerLevel, rules.bossHpPerLevel);
    syncNumberInput(difficultySwordmanSpawnPerLevel, rules.spawnIncreaseByActor?.swordman || 0);
    syncNumberInput(difficultyArcherSpawnPerLevel, rules.spawnIncreaseByActor?.archer || 0);
    syncTextInput(difficultyWarningText, rules.warningText);
  }

  function updateWorldPhysicsValue(prop, value) {
    beginChange();
    stageRulesController.setWorldPhysicsRules({ [prop]: value });
    renderWorldPhysicsPanel();
  }

  function updateDifficultyValue(prop, value) {
    beginChange();
    stageRulesController.setEnemyDifficultyRules?.({ [prop]: value });
    renderDifficultyPanel();
  }

  function updateDifficultySpawnIncrease(actorId, value) {
    beginChange();
    const current = stageRulesController.getEnemyDifficultyRules?.() || {};
    stageRulesController.setEnemyDifficultyRules?.({
      spawnIncreaseByActor: {
        ...(current.spawnIncreaseByActor || {}),
        [actorId]: value,
      },
    });
    renderDifficultyPanel();
  }

  function updateStageFloorScreenY(value) {
    beginChange();
    const session = getSceneSession();
    if (session) {
      session.view ||= {};
      session.view.floorScreenY = clampNumber(value, 0, 4000, currentFloorScreenY());
    }
    saveState();
    renderWorldPhysicsPanel();
  }

  function currentFloorScreenY() {
    const sessionValue = getSceneSession()?.view?.floorScreenY;
    if (Number.isFinite(sessionValue)) return sessionValue;
    return Number.isFinite(world?.viewH) ? Math.round(world.viewH / 2) : 480;
  }

  return {
    sync,
  };
}

function syncNumberInput(input, value) {
  if (input) input.value = String(value ?? 0);
}

function syncTextInput(input, value) {
  if (input) input.value = String(value || '');
}

function syncCheckboxInput(input, value) {
  if (input) input.checked = Number(value || 0) >= 0.5;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
