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
  } = elements;

  bindStageFloorScreenInput(stageFloorScreenY);
  bindWorldPhysicsNumberInput(worldPhysicsGravity, 'gravity');
  bindWorldPhysicsNumberInput(worldPhysicsInertia, 'inertia');
  bindWorldPhysicsNumberInput(worldPhysicsAirControl, 'airControl');
  bindWorldPhysicsNumberInput(worldPhysicsCameraShakePower, 'cameraShakePower');
  bindWorldPhysicsNumberInput(worldPhysicsCameraShakeFrames, 'cameraShakeFrames');
  bindWorldPhysicsCheckboxInput(worldPhysicsCameraShakeDecay, 'cameraShakeDecay');

  function sync() {
    renderWorldPhysicsPanel();
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

  function updateWorldPhysicsValue(prop, value) {
    beginChange();
    stageRulesController.setWorldPhysicsRules({ [prop]: value });
    renderWorldPhysicsPanel();
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

function syncCheckboxInput(input, value) {
  if (input) input.checked = Number(value || 0) >= 0.5;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
