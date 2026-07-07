import {
  interactionFrameValueFromInput,
  readInteractionDisplayValue,
  renderInteractionEditor,
} from './interaction_editor_engine.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import { interactionObjectPartKeyForRole, interactionObjectRole } from './interaction_object_editor_controller.js';

export function createActionInteractionPanelController({
  applySelected,
  beginUndoSnapshot,
  getDefaultValue,
  getActionKey,
  getTuning,
  getWriteTargetKey,
  rerender,
}) {
  let currentTargetKey = null;

  function render(container, { targetKey, scrubCallbacks }) {
    currentTargetKey = targetKey;
    renderInteractionEditor(container, {
      title: '상호작용',
      frameValue: actionInteractionValue(targetKey),
      targetKey,
      fixedRole: interactionObjectRole(targetKey),
      defaultValue: getDefaultValue?.(targetKey),
      defaultValueForRole: (role) => getDefaultValue?.(partKeyForRole(role)),
      readValue: (prop, role) => readInteractionDisplayValue(actionInteractionValue(partKeyForRole(role)), prop),
      targetKeyForRole: (role) => partKeyForRole(role),
      scrubCallbacks,
      onWrite: (prop, value, { role = null, rerender: shouldRerender = true } = {}) =>
        update(prop, value, { role, rerender: shouldRerender }),
    });
  }

  function update(prop, value, { role = null, rerender: shouldRerender = true } = {}) {
    beginUndoSnapshot();
    const partKey = partKeyForRole(role);
    const nextValue = interactionFrameValueFromInput(prop, value);
    const valueTarget = ensureActionInteractionValue(partKey);
    valueTarget[prop] = nextValue;
    applySelected();
    if (shouldRerender) rerender?.();
    return readInteractionDisplayValue(valueTarget, prop);
  }

  function partKeyForRole(role) {
    return interactionObjectPartKeyForRole(role) || currentTargetKey || getWriteTargetKey?.() || MASTER_PART_KEY;
  }

  function actionInteractionValue(partKey) {
    return actionSettings().interactions?.[partKey] || {};
  }

  function ensureActionInteractionValue(partKey) {
    const settings = actionSettings();
    settings.interactions ||= {};
    settings.interactions[partKey] ||= {};
    return settings.interactions[partKey];
  }

  function actionSettings() {
    const tuning = getTuning();
    const actionKey = getActionKey();
    tuning.actionSettings ||= {};
    tuning.actionSettings[actionKey] ||= {};
    tuning.actionSettings[actionKey].interactions ||= {};
    return tuning.actionSettings[actionKey];
  }

  return { render, update };
}
