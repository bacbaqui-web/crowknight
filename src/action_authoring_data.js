import { ACTION_KEYS } from './game_config_data.js';
import { actionLabel } from './editor_label_helper.js';
import { defaultActionGroup, normalizeActionGroup, normalizeActionGroupInput } from './action_group_helper.js';
import { defaultActionCondition, normalizeActionCondition } from './action_condition_helper.js';
import { normalizeActionEditPivot } from './action_timeline_edit_helper.js';
import {
  defaultActionTrigger,
  defaultActionTriggerForKey,
  normalizeActionTrigger,
  normalizeOptionalActionTrigger,
} from './action_trigger_data.js';
import { clone } from './common_helper.js';

const ACTION_FILE_VERSION = 1;
const IDLE_ACTION_KEY = 'idle';
const PREVIOUS_FORCED_HIDDEN_ACTION_KEYS = [
  'run',
  'jump',
  'fall',
  'glide',
  'roll',
  'guard',
  'guardBreak',
  'hurt',
  'death',
  'jumpAttack',
  'attack1',
  'attack2',
  'attack3',
];
const GENERATED_MOVEMENT_ACTION_KEYS = new Set(['moveRight', 'moveLeft']);

export function ensureActionAuthoringData(tuning) {
  tuning.customActions = normalizeCustomActions(tuning.customActions);
  tuning.deletedActionKeys = normalizeDeletedActionKeys(tuning.deletedActionKeys || []);
  if (PREVIOUS_FORCED_HIDDEN_ACTION_KEYS.every((key) => tuning.deletedActionKeys.includes(key))) {
    tuning.deletedActionKeys = tuning.deletedActionKeys.filter(
      (key) => !PREVIOUS_FORCED_HIDDEN_ACTION_KEYS.includes(key)
    );
  }
  tuning.actionNames = normalizeActionNames(tuning.actionNames);
  tuning.actionTriggers = normalizeActionTriggers(tuning.actionTriggers, tuning.customActions);
  tuning.actionSettings ||= {};
  tuning.actionOffsets ||= {};
  tuning.modifiers ||= {};
  tuning.modifiers.action ||= {};
  return tuning;
}

export function actionKeys(tuning) {
  ensureActionAuthoringData(tuning);
  const deleted = new Set(tuning.deletedActionKeys);
  return uniqueActionKeys([
    ...ACTION_KEYS.filter((key) => !deleted.has(key)),
    ...tuning.customActions.map((action) => action.key),
  ]);
}

export function actionOptions(tuning) {
  return actionDescriptors(tuning).map((action) => ({
    value: action.key,
    label: action.name,
    group: action.group,
  }));
}

export function actionOptionsForGroup(tuning, group) {
  const targetGroup = normalizeActionGroup(group);
  return actionDescriptors(tuning)
    .filter((action) => action.group === targetGroup)
    .map((action) => ({
      value: action.key,
      label: action.name,
      group: action.group,
    }));
}

export function actionDescriptors(tuning) {
  ensureActionAuthoringData(tuning);
  return actionKeys(tuning).map((key) => ({
    key,
    name: actionName(tuning, key),
    group: actionGroup(tuning, key),
    trigger: actionTrigger(tuning, key),
    runtimeMode: isCustomAction(tuning, key) ? 'trigger' : 'legacy',
    timeline: {
      settings: clone(
        tuning.actionSettings?.[key] || defaultActionSettings(defaultActionGroup(key), defaultActionCondition(key))
      ),
      offsets: clone(tuning.actionOffsets?.[key] || {}),
    },
    modifiers: clone(tuning.modifiers?.action?.[key] || []),
    deletable: canDeleteAction(tuning, key),
  }));
}

export function actionGroup(tuning, key) {
  ensureActionAuthoringData(tuning);
  const settings = tuning.actionSettings?.[key] || {};
  return normalizeActionGroup(settings.group, defaultActionGroup(key));
}

export function actionName(tuning, key) {
  ensureActionAuthoringData(tuning);
  return tuning.actionNames[key] || tuning.customActions.find((action) => action.key === key)?.name || actionLabel(key);
}

export function renameAction(tuning, key, name) {
  ensureActionAuthoringData(tuning);
  const nextName = (name || '').trim() || actionLabel(key);
  tuning.actionNames[key] = nextName;
  const customAction = tuning.customActions.find((action) => action.key === key);
  if (customAction) customAction.name = nextName;
  return nextName;
}

export function createAction(tuning, group = 'movement') {
  ensureActionAuthoringData(tuning);
  const index = tuning.customActions.length + 1;
  const key = uniqueActionKey(tuning, `customAction${index}`);
  const name = `새 액션 ${index}`;
  const actionGroupKey = normalizeActionGroup(group);
  tuning.customActions.push({ key, name, trigger: defaultActionTrigger() });
  tuning.actionNames[key] = name;
  tuning.actionSettings[key] = defaultActionSettings(actionGroupKey);
  tuning.actionOffsets[key] = {};
  tuning.modifiers.action[key] = [];
  return key;
}

export function moveActionToGroup(tuning, key, group) {
  ensureActionAuthoringData(tuning);
  const nextGroup = normalizeActionGroupInput(group, actionGroup(tuning, key));
  tuning.actionSettings[key] = {
    ...defaultActionSettings(defaultActionGroup(key), defaultActionCondition(key)),
    ...(tuning.actionSettings[key] || {}),
    group: nextGroup,
  };
  return nextGroup;
}

export function isCustomAction(tuning, key) {
  ensureActionAuthoringData(tuning);
  return tuning.customActions.some((action) => action.key === key);
}

export function canDeleteAction(tuning, key) {
  ensureActionAuthoringData(tuning);
  return key !== 'idle' && (ACTION_KEYS.includes(key) || isCustomAction(tuning, key));
}

export function actionTrigger(tuning, key) {
  ensureActionAuthoringData(tuning);
  const action = tuning.customActions.find((item) => item.key === key);
  return (
    normalizeOptionalActionTrigger(tuning.actionTriggers?.[key]) ||
    normalizeOptionalActionTrigger(action?.trigger) ||
    normalizeOptionalActionTrigger(defaultActionTriggerForKey(key))
  );
}

export function writeActionTrigger(tuning, key, trigger) {
  ensureActionAuthoringData(tuning);
  const normalized = normalizeOptionalActionTrigger(trigger);
  tuning.actionTriggers ||= {};
  if (normalized) tuning.actionTriggers[key] = normalized;
  else delete tuning.actionTriggers[key];
  const action = tuning.customActions.find((item) => item.key === key);
  if (action) action.trigger = normalized || defaultActionTrigger();
  return normalized;
}

export function deleteAction(tuning, key) {
  ensureActionAuthoringData(tuning);
  if (!canDeleteAction(tuning, key)) return null;

  if (isCustomAction(tuning, key)) {
    tuning.customActions = tuning.customActions.filter((action) => action.key !== key);
  } else if (ACTION_KEYS.includes(key)) {
    tuning.deletedActionKeys = normalizeDeletedActionKeys([...tuning.deletedActionKeys, key]);
  }
  delete tuning.actionNames[key];
  delete tuning.actionTriggers?.[key];
  delete tuning.actionSettings?.[key];
  delete tuning.actionOffsets?.[key];
  delete tuning.modifiers?.action?.[key];
  return actionKeys(tuning)[0] || ACTION_KEYS[0];
}

export function actionExportData(tuning, key) {
  ensureActionAuthoringData(tuning);
  return {
    schema: 'crow-knight.action',
    version: ACTION_FILE_VERSION,
    key,
    name: actionName(tuning, key),
    timeline: {
      settings: clone(tuning.actionSettings?.[key] || defaultActionSettings()),
      offsets: clone(tuning.actionOffsets?.[key] || {}),
    },
    trigger: clone(actionTrigger(tuning, key)),
    modifiers: clone(tuning.modifiers?.action?.[key] || []),
  };
}

export function downloadAction(tuning, key) {
  const data = actionExportData(tuning, key);
  const blob = new globalThis.Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = globalThis.URL.createObjectURL(blob);
  anchor.download = `${safeActionFileName(data.name || key)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.URL.revokeObjectURL(anchor.href);
}

export async function importActionFile(tuning, file) {
  const text = await file.text();
  const data = JSON.parse(text);
  return importActionData(tuning, data);
}

export function importActionData(tuning, data) {
  ensureActionAuthoringData(tuning);
  const source = data?.timeline ? data : { timeline: { settings: data?.settings, offsets: data?.offsets }, ...data };
  const name = String(source?.name || '불러온 액션');
  const baseKey = safeActionKey(source?.key || name || 'importedAction');
  const key = uniqueActionKey(tuning, baseKey);

  tuning.customActions.push({ key, name, trigger: normalizeActionTrigger(source.trigger) });
  tuning.actionTriggers[key] = normalizeActionTrigger(source.trigger);
  tuning.actionNames[key] = name;
  tuning.actionSettings[key] = {
    ...defaultActionSettings(),
    ...(source.timeline?.settings || {}),
    group: normalizeActionGroup(source.timeline?.settings?.group, 'movement'),
  };
  tuning.actionOffsets[key] = clone(source.timeline?.offsets || {});
  tuning.modifiers.action[key] = clone(source.modifiers || []);
  return key;
}

export function normalizeActionTriggers(triggers = {}, customActions = []) {
  const customTriggerEntries = Object.fromEntries(
    normalizeCustomActions(customActions)
      .map((action) => [action.key, normalizeOptionalActionTrigger(action.trigger)])
      .filter(([, trigger]) => trigger)
  );
  const merged = { ...customTriggerEntries, ...(triggers || {}) };
  return Object.fromEntries(
    Object.entries(merged)
      .map(([key, trigger]) => [safeActionKey(key), normalizeOptionalActionTrigger(trigger)])
      .filter(([key, trigger]) => key && trigger)
  );
}

export function normalizeCustomActions(actions = []) {
  if (!Array.isArray(actions)) return [];
  const seen = new Set(ACTION_KEYS);
  return actions
    .map((action, index) => ({
      key: safeActionKey(action?.key || `customAction${index + 1}`),
      name: String(action?.name || `새 액션 ${index + 1}`),
      trigger: normalizeActionTrigger(action?.trigger),
    }))
    .filter((action) => {
      if (GENERATED_MOVEMENT_ACTION_KEYS.has(action.key)) return false;
      if (!action.key || seen.has(action.key)) return false;
      seen.add(action.key);
      return true;
    });
}

export function normalizeDeletedActionKeys(actions = []) {
  if (!Array.isArray(actions)) return [];
  const deletableDefaultKeys = new Set(ACTION_KEYS);
  const normalized = [
    ...new Set(
      actions.map(safeActionKey).filter((key) => key && key !== IDLE_ACTION_KEY && deletableDefaultKeys.has(key))
    ),
  ];
  if (PREVIOUS_FORCED_HIDDEN_ACTION_KEYS.every((key) => normalized.includes(key))) {
    return normalized.filter((key) => !PREVIOUS_FORCED_HIDDEN_ACTION_KEYS.includes(key));
  }
  return normalized;
}

export function normalizeActionNames(names = {}) {
  return Object.fromEntries(
    Object.entries(names || {})
      .map(([key, name]) => [safeActionKey(key), String(name || '').trim()])
      .filter(([key, name]) => key && name)
  );
}

export function defaultActionSettings(group = 'movement', condition = 'any') {
  return {
    duration: 0.6,
    playback: 'loop',
    playbackRate: 1,
    mirror: true,
    interruptible: true,
    interruptPriority: 0,
    blendFrames: 0,
    condition: normalizeActionCondition(condition),
    group: normalizeActionGroup(group),
    editPivot: normalizeActionEditPivot(),
  };
}

function uniqueActionKey(tuning, preferredKey) {
  const base = safeActionKey(preferredKey) || 'customAction';
  const used = new Set([...ACTION_KEYS, ...tuning.customActions.map((action) => action.key)]);
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

function uniqueActionKeys(keys) {
  const seen = new Set();
  return keys.filter((key) => {
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeActionKey(value) {
  const key = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return key || 'customAction';
}

function safeActionFileName(value) {
  return String(value || 'action')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_');
}
