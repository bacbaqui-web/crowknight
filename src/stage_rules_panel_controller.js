export function createStageRulesPanelController({
  elements,
  stageRulesController,
  beginChange = () => {},
  commitChange = () => {},
} = {}) {
  const { worldPhysicsGravity, worldPhysicsInertia } = elements;

  bindWorldPhysicsNumberInput(worldPhysicsGravity, 'gravity');
  bindWorldPhysicsNumberInput(worldPhysicsInertia, 'inertia');

  function sync() {
    renderWorldPhysicsPanel();
  }

  function bindWorldPhysicsNumberInput(input, prop) {
    input?.addEventListener('input', () => updateWorldPhysicsValue(prop, input.value));
    input?.addEventListener('change', commitChange);
    input?.addEventListener('blur', commitChange);
  }

  function renderWorldPhysicsPanel() {
    const rules = stageRulesController.getWorldPhysicsRules();
    syncNumberInput(worldPhysicsGravity, rules.gravity);
    syncNumberInput(worldPhysicsInertia, rules.inertia);
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
