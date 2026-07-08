export function createStageRulesPanelController({
  elements,
  stageRulesController,
  beginChange = () => {},
  commitChange = () => {},
} = {}) {
  const {
    worldPhysicsGravity,
    worldPhysicsInertia,
    worldPhysicsAirControl,
    worldPhysicsCameraShakePower,
    worldPhysicsCameraShakeFrames,
    worldPhysicsCameraShakeDecay,
  } = elements;

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

  function bindWorldPhysicsCheckboxInput(input, prop) {
    input?.addEventListener('change', () => {
      updateWorldPhysicsValue(prop, input.checked ? 1 : 0);
      commitChange();
    });
  }

  function renderWorldPhysicsPanel() {
    const rules = stageRulesController.getWorldPhysicsRules();
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
