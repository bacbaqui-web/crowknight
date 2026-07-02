import {
  actionTriggerKeyLabel,
  formatActionTriggerSequence,
  parseActionTriggerSequence,
  triggerKeyFromInputCode,
  ACTION_TRIGGER_KEY_OPTIONS,
  ACTION_TRIGGER_TYPE_OPTIONS,
} from './action_trigger_data.js';
import {
  canDeletePoseAction,
  createPoseAction,
  deletePoseAction,
  downloadPoseAction,
  importPoseActionFile,
  poseActionName,
  poseActionOptions,
  poseActionTrigger,
  renamePoseAction,
  writePoseActionTrigger,
} from './pose_action_authoring.js';

let activeTriggerRecording = null;

export function syncPoseActionAuthoringControls(elements, tuning) {
  const { poseSelect, poseName, poseDeleteAction } = elements;
  if (!poseSelect || !poseName) return;

  const previousValue = poseSelect.value;
  replaceSelectOptions(poseSelect, poseActionOptions(tuning));
  if (previousValue && Array.from(poseSelect.options).some((option) => option.value === previousValue)) {
    poseSelect.value = previousValue;
  }
  poseName.value = poseActionName(tuning, poseSelect.value);
  if (poseDeleteAction) poseDeleteAction.disabled = !canDeletePoseAction(tuning, poseSelect.value);
  syncTriggerControls(elements, tuning, poseSelect.value);
}

export function bindPoseActionAuthoringControls(elements, callbacks) {
  const { poseAddAction, poseDeleteAction, poseExportAction, poseImportAction, poseImportFile, poseName, poseSelect } =
    elements;
  if (!poseSelect || !poseName) return;
  populateTriggerControls(elements);
  syncTriggerControls(elements, callbacks.getTuning(), poseSelect.value);

  poseAddAction?.addEventListener('click', () => {
    callbacks.beginUndoSnapshot();
    const key = createPoseAction(callbacks.getTuning());
    syncPoseActionAuthoringControls(elements, callbacks.getTuning());
    poseSelect.value = key;
    poseName.value = poseActionName(callbacks.getTuning(), key);
    syncDeleteButton(poseDeleteAction, callbacks.getTuning(), key);
    syncTriggerControls(elements, callbacks.getTuning(), key);
    callbacks.handlePoseChange();
    callbacks.applySelected();
    callbacks.commitUndoSnapshot();
  });

  poseExportAction?.addEventListener('click', () => {
    downloadPoseAction(callbacks.getTuning(), poseSelect.value);
  });

  poseDeleteAction?.addEventListener('click', () => {
    const tuning = callbacks.getTuning();
    if (!canDeletePoseAction(tuning, poseSelect.value)) return;
    if (!window.confirm('현재 Action을 삭제할까요? 대기는 삭제할 수 없습니다.')) return;

    callbacks.beginUndoSnapshot();
    const nextKey = deletePoseAction(tuning, poseSelect.value);
    syncPoseActionAuthoringControls(elements, tuning);
    if (nextKey) poseSelect.value = nextKey;
    poseName.value = poseActionName(tuning, poseSelect.value);
    syncDeleteButton(poseDeleteAction, tuning, poseSelect.value);
    syncTriggerControls(elements, tuning, poseSelect.value);
    callbacks.handlePoseChange();
    callbacks.applySelected();
    callbacks.commitUndoSnapshot();
  });

  poseImportAction?.addEventListener('click', () => {
    poseImportFile?.click();
  });

  poseImportFile?.addEventListener('change', async () => {
    const file = poseImportFile.files?.[0];
    poseImportFile.value = '';
    if (!file) return;

    callbacks.beginUndoSnapshot();
    try {
      const key = await importPoseActionFile(callbacks.getTuning(), file);
      syncPoseActionAuthoringControls(elements, callbacks.getTuning());
      poseSelect.value = key;
      poseName.value = poseActionName(callbacks.getTuning(), key);
      syncDeleteButton(poseDeleteAction, callbacks.getTuning(), key);
      syncTriggerControls(elements, callbacks.getTuning(), key);
      callbacks.handlePoseChange();
      callbacks.applySelected();
    } catch (error) {
      window.alert('Action 파일을 불러오지 못했습니다.');
      window.console?.error(error);
    } finally {
      callbacks.commitUndoSnapshot();
    }
  });

  poseName.addEventListener('focus', callbacks.beginUndoSnapshot);
  poseSelect.addEventListener('change', () => {
    cancelTriggerRecording();
    poseName.value = poseActionName(callbacks.getTuning(), poseSelect.value);
    syncDeleteButton(poseDeleteAction, callbacks.getTuning(), poseSelect.value);
    syncTriggerControls(elements, callbacks.getTuning(), poseSelect.value);
  });
  poseName.addEventListener('input', () => {
    renamePoseAction(callbacks.getTuning(), poseSelect.value, poseName.value);
    syncSelectedActionOption(poseSelect, callbacks.getTuning());
    callbacks.applySelected();
  });
  poseName.addEventListener('change', callbacks.commitUndoSnapshot);
  poseName.addEventListener('blur', callbacks.commitUndoSnapshot);
  bindTriggerControls(elements, callbacks);
}

function syncDeleteButton(button, tuning, key) {
  if (button) button.disabled = !canDeletePoseAction(tuning, key);
}

function syncSelectedActionOption(poseSelect, tuning) {
  const selected = poseSelect.selectedOptions[0];
  if (selected) selected.textContent = poseActionName(tuning, poseSelect.value);
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

function populateTriggerControls(elements) {
  replaceSelectOptions(elements.poseTriggerType, ACTION_TRIGGER_TYPE_OPTIONS);
  [elements.poseTriggerSingleKey, elements.poseTriggerHoldKey, elements.poseTriggerPressKey].forEach((select) =>
    replaceSelectOptions(select, ACTION_TRIGGER_KEY_OPTIONS)
  );
}

function bindTriggerControls(elements, callbacks) {
  const controls = triggerControls(elements);
  if (!controls.length) return;

  const commitSelectChange = () => {
    callbacks.beginUndoSnapshot();
    writeTriggerFromControls(elements, callbacks);
    callbacks.commitUndoSnapshot();
  };

  [elements.poseTriggerType, elements.poseTriggerSingleKey, elements.poseTriggerHoldKey, elements.poseTriggerPressKey]
    .filter(Boolean)
    .forEach((select) => select.addEventListener('change', commitSelectChange));

  elements.poseTriggerMaxGapMs?.addEventListener('focus', callbacks.beginUndoSnapshot);
  elements.poseTriggerMaxGapMs?.addEventListener('input', () => writeTriggerFromControls(elements, callbacks));
  elements.poseTriggerMaxGapMs?.addEventListener('change', callbacks.commitUndoSnapshot);
  elements.poseTriggerMaxGapMs?.addEventListener('blur', callbacks.commitUndoSnapshot);

  elements.poseTriggerSequenceKeys?.addEventListener('focus', callbacks.beginUndoSnapshot);
  elements.poseTriggerSequenceKeys?.addEventListener('change', () => {
    writeTriggerFromControls(elements, callbacks);
    callbacks.commitUndoSnapshot();
  });
  elements.poseTriggerSequenceKeys?.addEventListener('blur', callbacks.commitUndoSnapshot);

  elements.poseTriggerRecord?.addEventListener('click', () => startTriggerRecording(elements, callbacks));
  elements.poseTriggerRepeat?.addEventListener('click', () => toggleTriggerRepeat(elements, callbacks));
  elements.poseTriggerRecordComplete?.addEventListener('click', () => completeTriggerRecording());
  elements.poseTriggerRecordCancel?.addEventListener('click', () => cancelTriggerRecording());
}

function writeTriggerFromControls(elements, callbacks) {
  const tuning = callbacks.getTuning();
  const key = elements.poseSelect.value;
  writePoseActionTrigger(tuning, key, readTriggerFromControls(elements, poseActionTrigger(tuning, key)));
  syncTriggerControls(elements, tuning, key);
  callbacks.applySelected();
}

function readTriggerFromControls(elements, current) {
  const type = elements.poseTriggerType.value;
  if (type === 'sequence') {
    const keys = parseActionTriggerSequence(elements.poseTriggerSequenceKeys.value);
    return withTriggerRepeat(elements, {
      type,
      keys: keys.length ? keys : current.keys,
      maxGapMs: elements.poseTriggerMaxGapMs.value,
    });
  }
  if (type === 'holdCombo') {
    return withTriggerRepeat(elements, {
      type,
      hold: elements.poseTriggerHoldKey.value,
      press: elements.poseTriggerPressKey.value,
    });
  }
  return withTriggerRepeat(elements, {
    type: 'single',
    keys: [elements.poseTriggerSingleKey.value],
  });
}

function syncTriggerControls(elements, tuning, key) {
  const controls = triggerControls(elements);
  if (!controls.length) return;
  const trigger = poseActionTrigger(tuning, key);
  const canEdit = Boolean(trigger);
  const displayTrigger = trigger || { type: 'single', keys: ['Q'] };

  elements.poseTriggerType.value = displayTrigger.type;
  elements.poseTriggerSingleKey.value = displayTrigger.keys?.[0] || 'Q';
  elements.poseTriggerSequenceKeys.value = formatActionTriggerSequence(
    displayTrigger.type === 'sequence' ? displayTrigger : { type: 'sequence', keys: ['Q', 'Q'] }
  );
  elements.poseTriggerMaxGapMs.value = displayTrigger.maxGapMs || 350;
  elements.poseTriggerHoldKey.value = displayTrigger.hold || 'Q';
  elements.poseTriggerPressKey.value = displayTrigger.press || 'E';
  if (elements.poseTriggerHint) {
    elements.poseTriggerHint.textContent = canEdit ? 'Action 발동 조건입니다.' : 'Trigger 없이 자동 상태로 재생됩니다.';
  }

  controls.forEach((control) => {
    control.disabled = !canEdit;
  });
  if (elements.poseTriggerRecord) elements.poseTriggerRecord.disabled = !canEdit;
  syncTriggerRepeatToggle(elements, trigger, canEdit);
  updateTriggerRecordStatus(elements, formatTriggerSummary(trigger));
  const card = elements.poseTriggerType?.closest('.action-trigger-card');
  card?.classList.toggle('is-disabled', !canEdit);
  syncTriggerModeVisibility(elements, displayTrigger.type);
}

function syncTriggerModeVisibility(elements, type) {
  const card = elements.poseTriggerType?.closest('.action-trigger-card');
  card?.querySelectorAll('[data-trigger-mode]').forEach((node) => {
    node.hidden = node.dataset.triggerMode !== type;
  });
}

function triggerControls(elements) {
  return [
    elements.poseTriggerType,
    elements.poseTriggerSingleKey,
    elements.poseTriggerSequenceKeys,
    elements.poseTriggerMaxGapMs,
    elements.poseTriggerHoldKey,
    elements.poseTriggerPressKey,
  ].filter(Boolean);
}

function toggleTriggerRepeat(elements, callbacks) {
  const trigger = poseActionTrigger(callbacks.getTuning(), elements.poseSelect.value);
  if (!trigger) return;
  callbacks.beginUndoSnapshot();
  writePoseActionTrigger(callbacks.getTuning(), elements.poseSelect.value, {
    ...trigger,
    repeatWhileHeld: !trigger.repeatWhileHeld,
  });
  syncTriggerControls(elements, callbacks.getTuning(), elements.poseSelect.value);
  callbacks.applySelected();
  callbacks.commitUndoSnapshot();
}

function startTriggerRecording(elements, callbacks) {
  if (elements.poseTriggerRecord?.disabled) return;
  cancelTriggerRecording();
  activeTriggerRecording = {
    elements,
    callbacks,
    keys: [],
    held: new Set(),
    holdCombo: null,
  };
  setTriggerRecordingUi(elements, true);
  updateTriggerRecordStatus(elements, '대기');
  window.addEventListener('keydown', handleTriggerRecordKeyDown, true);
  window.addEventListener('keyup', handleTriggerRecordKeyUp, true);
}

function completeTriggerRecording() {
  const recording = activeTriggerRecording;
  if (!recording) return;
  const trigger = triggerFromRecording(recording);
  if (!trigger) {
    updateTriggerRecordStatus(recording.elements, '없습니다');
    return;
  }
  const { elements, callbacks } = recording;
  callbacks.beginUndoSnapshot();
  writePoseActionTrigger(callbacks.getTuning(), elements.poseSelect.value, trigger);
  syncTriggerControls(elements, callbacks.getTuning(), elements.poseSelect.value);
  callbacks.applySelected();
  callbacks.commitUndoSnapshot();
  stopTriggerRecording();
}

function cancelTriggerRecording() {
  stopTriggerRecording('녹화 취소');
}

function stopTriggerRecording(message = '') {
  if (!activeTriggerRecording) return;
  const { elements } = activeTriggerRecording;
  window.removeEventListener('keydown', handleTriggerRecordKeyDown, true);
  window.removeEventListener('keyup', handleTriggerRecordKeyUp, true);
  activeTriggerRecording = null;
  setTriggerRecordingUi(elements, false);
  if (message) updateTriggerRecordStatus(elements, message);
}

function handleTriggerRecordKeyDown(event) {
  const recording = activeTriggerRecording;
  if (!recording) return;
  const key = triggerKeyFromInputCode(event.code);
  if (!key) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat) return;

  const [firstHeld] = recording.held;
  recording.keys.push(key);
  if (firstHeld && firstHeld !== key && !recording.holdCombo) {
    recording.holdCombo = { hold: firstHeld, press: key };
  }
  recording.held.add(key);
  updateTriggerRecordStatus(recording.elements, formatRecordingStatus(recording));
}

function handleTriggerRecordKeyUp(event) {
  const recording = activeTriggerRecording;
  if (!recording) return;
  const key = triggerKeyFromInputCode(event.code);
  if (!key) return;
  event.preventDefault();
  event.stopPropagation();
  recording.held.delete(key);
}

function triggerFromRecording(recording) {
  if (recording.holdCombo && recording.keys.length === 2) {
    return withTriggerRepeat(recording.elements, { type: 'holdCombo', ...recording.holdCombo });
  }
  if (recording.keys.length === 1) {
    return withTriggerRepeat(recording.elements, { type: 'single', keys: [recording.keys[0]] });
  }
  if (recording.keys.length > 1) {
    return withTriggerRepeat(recording.elements, {
      type: 'sequence',
      keys: recording.keys,
      maxGapMs: recording.elements.poseTriggerMaxGapMs?.value || 350,
    });
  }
  return null;
}

function formatRecordingStatus(recording) {
  if (recording.holdCombo && recording.keys.length === 2) {
    return `${actionTriggerKeyLabel(recording.holdCombo.hold)} + ${actionTriggerKeyLabel(recording.holdCombo.press)}`;
  }
  return recording.keys.map(actionTriggerKeyLabel).join(' ') || '대기';
}

function setTriggerRecordingUi(elements, recording) {
  if (elements.poseTriggerRecord) {
    elements.poseTriggerRecord.hidden = false;
    elements.poseTriggerRecord.disabled = recording;
  }
  if (elements.poseTriggerRecordComplete) elements.poseTriggerRecordComplete.hidden = !recording;
  if (elements.poseTriggerRecordCancel) elements.poseTriggerRecordCancel.hidden = !recording;
  const card = elements.poseTriggerType?.closest('.action-trigger-card');
  card?.classList.toggle('is-recording', recording);
}

function updateTriggerRecordStatus(elements, message) {
  if (elements.poseTriggerRecordStatus) elements.poseTriggerRecordStatus.textContent = message;
}

function syncTriggerRepeatToggle(elements, trigger, canEdit) {
  if (!elements.poseTriggerRepeat) return;
  const active = Boolean(trigger?.repeatWhileHeld);
  elements.poseTriggerRepeat.disabled = !canEdit;
  elements.poseTriggerRepeat.classList.toggle('is-active', active);
  elements.poseTriggerRepeat.setAttribute('aria-pressed', String(active));
}

function withTriggerRepeat(elements, trigger) {
  if (elements.poseTriggerRepeat?.getAttribute('aria-pressed') === 'true') {
    return { ...trigger, repeatWhileHeld: true };
  }
  return trigger;
}

function formatTriggerSummary(trigger) {
  if (!trigger) return '없음';
  if (trigger.type === 'holdCombo') {
    return `${actionTriggerKeyLabel(trigger.hold)} + ${actionTriggerKeyLabel(trigger.press)}`;
  }
  const keys = Array.isArray(trigger.keys) ? trigger.keys : [];
  if (!keys.length) return '없음';
  return keys.map(actionTriggerKeyLabel).join(' ');
}
