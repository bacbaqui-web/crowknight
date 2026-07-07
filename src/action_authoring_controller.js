import {
  actionGroup,
  actionOptionsForGroup,
  canDeleteAction,
  createAction,
  deleteAction,
  actionName as actionDisplayName,
  moveActionToGroup,
  renameAction,
} from './action_authoring_data.js';
import {
  ACTION_GROUPS,
  actionGroupLabel,
  normalizeActionGroup,
  normalizeActionGroupInput,
} from './action_group_helper.js';
import {
  bindTriggerControls,
  cancelTriggerRecording,
  populateTriggerControls,
  syncTriggerControls,
} from './action_trigger_controller.js';

export function syncActionAuthoringControls(elements, tuning) {
  const { actionSelect, actionName: actionNameInput, actionDelete } = elements;
  if (!actionSelect || !actionNameInput) return;

  const previousValue = actionSelect.value;
  const activeGroup = activeActionGroup(elements, tuning, previousValue);
  syncActionGroupOptions(elements.actionGroupSelect, activeGroup);
  syncActionGroupSelect(elements, activeGroup);
  replaceSelectOptions(actionSelect, actionOptionsForGroup(tuning, activeGroup));
  if (
    previousValue &&
    actionGroup(tuning, previousValue) === activeGroup &&
    hasSelectOption(actionSelect, previousValue)
  ) {
    actionSelect.value = previousValue;
  }
  actionNameInput.value = actionDisplayName(tuning, actionSelect.value);
  if (actionDelete) actionDelete.disabled = !canDeleteAction(tuning, actionSelect.value);
  syncTriggerControls(elements, tuning, actionSelect.value);
}

export function bindActionAuthoringControls(elements, callbacks) {
  const {
    actionAdd,
    actionDelete,
    actionGroupSelect,
    actionMove,
    actionName: actionNameInput,
    actionSelect,
  } = elements;
  if (!actionSelect || !actionNameInput) return;
  syncActionGroupOptions(actionGroupSelect, activeActionGroup(elements, callbacks.getTuning(), actionSelect.value));
  populateTriggerControls(elements, replaceSelectOptions);
  syncTriggerControls(elements, callbacks.getTuning(), actionSelect.value);

  actionAdd?.addEventListener('click', () => {
    callbacks.beginUndoSnapshot();
    const key = createAction(
      callbacks.getTuning(),
      activeActionGroup(elements, callbacks.getTuning(), actionSelect.value)
    );
    syncActionAuthoringControls(elements, callbacks.getTuning());
    actionSelect.value = key;
    syncSelectedAction(elements, callbacks, { apply: true });
    callbacks.commitUndoSnapshot();
  });

  actionGroupSelect?.addEventListener('change', () => {
    syncActionAuthoringControls(elements, callbacks.getTuning());
    syncSelectedAction(elements, callbacks, { apply: true });
  });

  actionMove?.addEventListener('click', () => {
    const tuning = callbacks.getTuning();
    const key = actionSelect.value;
    const current = actionGroup(tuning, key);
    const input = window.prompt(
      `이동할 그룹을 입력하세요: ${ACTION_GROUPS.map((group) => group.label).join(', ')}`,
      actionGroupLabel(current)
    );
    if (input === null) return;
    const nextGroup = normalizeActionGroupInput(input, current);
    if (nextGroup === current) return;

    callbacks.beginUndoSnapshot();
    moveActionToGroup(tuning, key, nextGroup);
    syncActionGroupSelect(elements, nextGroup);
    syncActionAuthoringControls(elements, tuning);
    actionSelect.value = key;
    syncSelectedAction(elements, callbacks, { apply: true });
    callbacks.commitUndoSnapshot();
  });

  actionDelete?.addEventListener('click', () => {
    const tuning = callbacks.getTuning();
    if (!canDeleteAction(tuning, actionSelect.value)) return;
    if (!window.confirm('현재 Action을 삭제할까요? 대기는 삭제할 수 없습니다.')) return;

    callbacks.beginUndoSnapshot();
    const nextKey = deleteAction(tuning, actionSelect.value);
    syncActionAuthoringControls(elements, tuning);
    if (nextKey && hasSelectOption(actionSelect, nextKey)) actionSelect.value = nextKey;
    else if (actionSelect.options[0]) actionSelect.value = actionSelect.options[0].value;
    syncSelectedAction(elements, callbacks, { apply: true });
    callbacks.commitUndoSnapshot();
  });

  actionNameInput.addEventListener('focus', callbacks.beginUndoSnapshot);
  actionSelect.addEventListener('change', () => syncSelectedAction(elements, callbacks));
  actionNameInput.addEventListener('input', () => {
    renameAction(callbacks.getTuning(), actionSelect.value, actionNameInput.value);
    syncSelectedActionOption(actionSelect, callbacks.getTuning());
    callbacks.applySelected();
  });
  actionNameInput.addEventListener('change', callbacks.commitUndoSnapshot);
  actionNameInput.addEventListener('blur', callbacks.commitUndoSnapshot);
  bindTriggerControls(elements, callbacks);
}

function syncSelectedAction(elements, callbacks, { apply = false } = {}) {
  const { actionDelete, actionName: actionNameInput, actionSelect } = elements;
  const tuning = callbacks.getTuning();
  const key = actionSelect.value;
  cancelTriggerRecording();
  actionNameInput.value = actionDisplayName(tuning, key);
  syncDeleteButton(actionDelete, tuning, key);
  syncTriggerControls(elements, tuning, key);
  callbacks.handleActionChange();
  if (apply) callbacks.applySelected();
}

function activeActionGroup(elements, tuning, key = '') {
  if (elements.actionGroupSelect?.value) return normalizeActionGroup(elements.actionGroupSelect.value);
  return normalizeActionGroup(actionGroup(tuning, key), 'base');
}

function syncActionGroupSelect(elements, activeGroup) {
  const group = normalizeActionGroup(activeGroup, 'base');
  if (elements.actionGroupSelect) elements.actionGroupSelect.value = group;
}

function syncActionGroupOptions(select, activeGroup) {
  if (!select) return;
  const options = ACTION_GROUPS.map((group) => ({ value: group.key, label: group.label }));
  const optionIds = Array.from(select.options).map((option) => option.value);
  const needsReplace =
    options.length !== optionIds.length || options.some((option, index) => option.value !== optionIds[index]);
  if (needsReplace) replaceSelectOptions(select, options);
  select.value = normalizeActionGroup(activeGroup, 'base');
}

function syncDeleteButton(button, tuning, key) {
  if (button) button.disabled = !canDeleteAction(tuning, key);
}

function syncSelectedActionOption(actionSelect, tuning) {
  const selected = actionSelect.selectedOptions[0];
  if (selected) selected.textContent = actionDisplayName(tuning, actionSelect.value);
}

function hasSelectOption(select, value) {
  return Array.from(select.options).some((option) => option.value === value);
}

function replaceSelectOptions(select, options) {
  if (!select) return;
  select.innerHTML = '';
  options.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
}
