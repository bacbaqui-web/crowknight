import {
  actionTriggerModeFromTrigger,
  actionTriggerKeyLabel,
  formatActionTriggerSequence,
  nextActionTriggerMode,
  parseActionTriggerSequence,
  triggerKeyFromInputCode,
  ACTION_TRIGGER_KEY_OPTIONS,
  ACTION_TRIGGER_TYPE_OPTIONS,
} from './action_trigger_data.js';
import { actionTrigger, writeActionTrigger } from './action_authoring_data.js';

let activeTriggerRecording = null;

export function populateTriggerControls(elements, replaceSelectOptions) {
  replaceSelectOptions(elements.actionTriggerType, ACTION_TRIGGER_TYPE_OPTIONS);
  [elements.actionTriggerSingleKey, elements.actionTriggerHoldKey, elements.actionTriggerPressKey].forEach((select) =>
    replaceSelectOptions(select, ACTION_TRIGGER_KEY_OPTIONS)
  );
}

export function bindTriggerControls(elements, callbacks) {
  const controls = triggerControls(elements);
  if (!controls.length) return;

  const commitSelectChange = () => {
    callbacks.beginUndoSnapshot();
    writeTriggerFromControls(elements, callbacks);
    callbacks.commitUndoSnapshot();
  };

  [
    elements.actionTriggerType,
    elements.actionTriggerSingleKey,
    elements.actionTriggerHoldKey,
    elements.actionTriggerPressKey,
  ]
    .filter(Boolean)
    .forEach((select) => select.addEventListener('change', commitSelectChange));

  elements.actionTriggerMaxGapMs?.addEventListener('focus', callbacks.beginUndoSnapshot);
  elements.actionTriggerMaxGapMs?.addEventListener('input', () => writeTriggerFromControls(elements, callbacks));
  elements.actionTriggerMaxGapMs?.addEventListener('change', callbacks.commitUndoSnapshot);
  elements.actionTriggerMaxGapMs?.addEventListener('blur', callbacks.commitUndoSnapshot);

  elements.actionTriggerSequenceKeys?.addEventListener('focus', callbacks.beginUndoSnapshot);
  elements.actionTriggerSequenceKeys?.addEventListener('change', () => {
    writeTriggerFromControls(elements, callbacks);
    callbacks.commitUndoSnapshot();
  });
  elements.actionTriggerSequenceKeys?.addEventListener('blur', callbacks.commitUndoSnapshot);

  elements.actionTriggerRecord?.addEventListener('click', () => startTriggerRecording(elements, callbacks));
  elements.actionTriggerRepeat?.addEventListener('click', () => toggleTriggerRepeat(elements, callbacks));
  elements.actionTriggerRecordComplete?.addEventListener('click', () => completeTriggerRecording());
  elements.actionTriggerRecordCancel?.addEventListener('click', () => cancelTriggerRecording());
}

export function syncTriggerControls(elements, tuning, key) {
  const controls = triggerControls(elements);
  if (!controls.length) return;
  const trigger = actionTrigger(tuning, key);
  const canEdit = Boolean(trigger);
  const displayTrigger = trigger || { type: 'single', keys: ['Q'] };

  elements.actionTriggerType.value = displayTrigger.type;
  elements.actionTriggerSingleKey.value = displayTrigger.keys?.[0] || 'Q';
  elements.actionTriggerSequenceKeys.value = formatActionTriggerSequence(
    displayTrigger.type === 'sequence' ? displayTrigger : { type: 'sequence', keys: ['Q', 'Q'] }
  );
  elements.actionTriggerMaxGapMs.value = displayTrigger.maxGapMs || 350;
  elements.actionTriggerHoldKey.value = displayTrigger.hold || 'Q';
  elements.actionTriggerPressKey.value = displayTrigger.press || 'E';
  if (elements.actionTriggerHint) {
    elements.actionTriggerHint.textContent = canEdit
      ? 'Action 발동 조건입니다.'
      : 'Trigger 없이 자동 상태로 재생됩니다.';
  }

  controls.forEach((control) => {
    control.disabled = !canEdit;
  });
  if (elements.actionTriggerRecord) elements.actionTriggerRecord.disabled = !canEdit;
  syncTriggerRepeatToggle(elements, trigger, canEdit);
  updateTriggerRecordStatus(elements, formatTriggerSummary(trigger));
  const card = elements.actionTriggerType?.closest('.action-trigger-card');
  card?.classList.toggle('is-disabled', !canEdit);
  syncTriggerModeVisibility(elements, displayTrigger.type);
}

export function cancelTriggerRecording() {
  stopTriggerRecording('녹화 취소');
}

function writeTriggerFromControls(elements, callbacks) {
  const tuning = callbacks.getTuning();
  const key = elements.actionSelect.value;
  writeActionTrigger(tuning, key, readTriggerFromControls(elements, actionTrigger(tuning, key)));
  syncTriggerControls(elements, tuning, key);
  callbacks.applySelected();
}

function readTriggerFromControls(elements, current) {
  const type = elements.actionTriggerType.value;
  if (type === 'sequence') {
    const keys = parseActionTriggerSequence(elements.actionTriggerSequenceKeys.value);
    return withTriggerRepeat(elements, {
      type,
      keys: keys.length ? keys : current.keys,
      maxGapMs: elements.actionTriggerMaxGapMs.value,
    });
  }
  if (type === 'holdCombo') {
    return withTriggerRepeat(elements, {
      type,
      hold: elements.actionTriggerHoldKey.value,
      press: elements.actionTriggerPressKey.value,
    });
  }
  return withTriggerRepeat(elements, {
    type: 'single',
    keys: [elements.actionTriggerSingleKey.value],
  });
}

function syncTriggerModeVisibility(elements, type) {
  const card = elements.actionTriggerType?.closest('.action-trigger-card');
  card?.querySelectorAll('[data-trigger-mode]').forEach((node) => {
    node.hidden = node.dataset.triggerMode !== type;
  });
}

function triggerControls(elements) {
  return [
    elements.actionTriggerType,
    elements.actionTriggerSingleKey,
    elements.actionTriggerSequenceKeys,
    elements.actionTriggerMaxGapMs,
    elements.actionTriggerHoldKey,
    elements.actionTriggerPressKey,
  ].filter(Boolean);
}

function toggleTriggerRepeat(elements, callbacks) {
  const trigger = actionTrigger(callbacks.getTuning(), elements.actionSelect.value);
  if (!trigger) return;
  const triggerMode = nextActionTriggerMode(actionTriggerModeFromTrigger(trigger));
  callbacks.beginUndoSnapshot();
  writeActionTrigger(callbacks.getTuning(), elements.actionSelect.value, {
    ...trigger,
    triggerMode,
    ...(triggerMode === 'tap' ? { repeatWhileHeld: false } : { repeatWhileHeld: true }),
  });
  syncTriggerControls(elements, callbacks.getTuning(), elements.actionSelect.value);
  callbacks.applySelected();
  callbacks.commitUndoSnapshot();
}

function startTriggerRecording(elements, callbacks) {
  if (elements.actionTriggerRecord?.disabled) return;
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
  writeActionTrigger(callbacks.getTuning(), elements.actionSelect.value, trigger);
  syncTriggerControls(elements, callbacks.getTuning(), elements.actionSelect.value);
  callbacks.applySelected();
  callbacks.commitUndoSnapshot();
  stopTriggerRecording();
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
      maxGapMs: recording.elements.actionTriggerMaxGapMs?.value || 350,
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
  if (elements.actionTriggerRecord) {
    elements.actionTriggerRecord.hidden = false;
    elements.actionTriggerRecord.disabled = recording;
  }
  if (elements.actionTriggerRecordComplete) elements.actionTriggerRecordComplete.hidden = !recording;
  if (elements.actionTriggerRecordCancel) elements.actionTriggerRecordCancel.hidden = !recording;
  const card = elements.actionTriggerType?.closest('.action-trigger-card');
  card?.classList.toggle('is-recording', recording);
}

function updateTriggerRecordStatus(elements, message) {
  if (elements.actionTriggerRecordStatus) elements.actionTriggerRecordStatus.textContent = message;
}

function syncTriggerRepeatToggle(elements, trigger, canEdit) {
  if (!elements.actionTriggerRepeat) return;
  const triggerMode = actionTriggerModeFromTrigger(trigger);
  const active = triggerMode !== 'tap';
  const title = actionTriggerModeTitle(triggerMode);
  elements.actionTriggerRepeat.disabled = !canEdit;
  elements.actionTriggerRepeat.classList.toggle('is-active', active);
  elements.actionTriggerRepeat.dataset.triggerMode = triggerMode;
  elements.actionTriggerRepeat.setAttribute('aria-pressed', String(active));
  elements.actionTriggerRepeat.setAttribute('aria-label', title);
  elements.actionTriggerRepeat.title = title;
  syncTriggerModeIcon(elements.actionTriggerRepeat, triggerMode);
}

function withTriggerRepeat(elements, trigger) {
  const triggerMode = elements.actionTriggerRepeat?.dataset.triggerMode || 'tap';
  return {
    ...trigger,
    triggerMode,
    ...(triggerMode === 'tap' ? {} : { repeatWhileHeld: true }),
  };
}

function actionTriggerModeTitle(triggerMode) {
  if (triggerMode === 'press') return '누르는 동안만 실행';
  if (triggerMode === 'pressLoop') return '누르는 동안 반복 실행';
  return '한 번 실행';
}

function syncTriggerModeIcon(button, triggerMode) {
  const svg = button.querySelector('svg');
  if (!svg) return;
  svg.innerHTML = '';
  triggerModeIconShapes(triggerMode).forEach(({ tag, attrs }) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
    svg.append(node);
  });
}

function triggerModeIconShapes(triggerMode) {
  const base = [
    { tag: 'path', attrs: { d: 'M4 7c2.4 1.5 4.7 2.7 6.5 4.8 1 1.2 1.2 2.6.4 3.6' } },
    { tag: 'path', attrs: { d: 'M10.9 15.4c1.5 1.1 3.9.8 5.4-.7' } },
    { tag: 'path', attrs: { d: 'M9.7 18.1l4.8-4.8 4.4 5.6-5.7 2.4-3.5-3.2z' } },
  ];
  if (triggerMode === 'pressLoop') {
    return [
      ...base,
      { tag: 'path', attrs: { d: 'M17.4 5.7a3.2 3.2 0 0 1 3.1 3.1' } },
      { tag: 'path', attrs: { d: 'M20.5 8.8l-2-2 2-2' } },
      { tag: 'path', attrs: { d: 'M20.6 12.2a3.2 3.2 0 0 1-3.1 3.1' } },
      { tag: 'path', attrs: { d: 'M17.5 15.3l2 2-2 2' } },
    ];
  }
  if (triggerMode === 'press') {
    return [
      ...base,
      { tag: 'path', attrs: { d: 'M18.5 5.5v6.5' } },
      { tag: 'path', attrs: { d: 'M15.8 9.5l2.7 2.7 2.7-2.7' } },
    ];
  }
  return [...base, { tag: 'path', attrs: { d: 'M18.5 6.5v6' } }];
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
