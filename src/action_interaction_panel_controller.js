import {
  interactionFrameValueFromInput,
  readInteractionDisplayValue,
  renderInteractionEditor,
} from './interaction_editor_engine.js';
import { MASTER_PART_KEY } from './game_config_data.js';
import {
  GUARD_INTERACTION_OBJECT_KEY,
  interactionObjectPartKeyForRole,
  interactionObjectRole,
} from './interaction_object_editor_controller.js';

export function createActionInteractionPanelController({
  applySelected,
  beginUndoSnapshot,
  getDefaultValue,
  getActionKey,
  getTotalFrames,
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
      readValue: (prop, role) => readActionInteractionValue(partKeyForRole(role), prop),
      totalFrames: getTotalFrames?.(),
      targetKeyForRole: (role) => partKeyForRole(role),
      additionalDetailRoles: () => guardAttackDetailRoles(targetKey),
      shouldRerenderOnWrite: (prop, role) => role === 'guard' && prop === 'attack',
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
    return readActionInteractionValue(partKey, prop);
  }

  function partKeyForRole(role) {
    return interactionObjectPartKeyForRole(role) || currentTargetKey || getWriteTargetKey?.() || MASTER_PART_KEY;
  }

  function guardAttackDetailRoles(targetKey) {
    if (targetKey !== GUARD_INTERACTION_OBJECT_KEY) return [];
    if (readActionInteractionValue(GUARD_INTERACTION_OBJECT_KEY, 'attack') < 0.5) return [];
    return [{ prop: 'attack', label: '공격 설정' }];
  }

  function actionInteractionValue(partKey) {
    return actionSettings().interactions?.[partKey] || {};
  }

  function readActionInteractionValue(partKey, prop) {
    const value = actionInteractionValue(partKey);
    if (prop === 'startFrame') return value.startFrame ?? 1;
    if (prop === 'endFrame') return value.endFrame ?? Math.max(1, Math.round(Number(getTotalFrames?.() || 1)));
    return readInteractionDisplayValue(value, prop);
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
