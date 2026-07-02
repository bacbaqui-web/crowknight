import { POSE_KEYS } from './game_config.js';
import { poseLabel } from './editor_label_helper.js';
import {
  defaultActionTrigger,
  defaultActionTriggerForKey,
  normalizeActionTrigger,
  normalizeOptionalActionTrigger,
} from './action_trigger_data.js';
import { clone } from './utils.js';

const ACTION_FILE_VERSION = 1;

export function ensurePoseActionAuthoringData(tuning) {
  tuning.customActions = normalizeCustomActions(tuning.customActions);
  tuning.deletedPoseActions = normalizeDeletedPoseActions(tuning.deletedPoseActions);
  tuning.actionNames = normalizeActionNames(tuning.actionNames);
  tuning.actionTriggers = normalizeActionTriggers(tuning.actionTriggers, tuning.customActions);
  tuning.poseSettings ||= {};
  tuning.poseOffsets ||= {};
  tuning.modifiers ||= {};
  tuning.modifiers.pose ||= {};
  return tuning;
}

export function poseActionKeys(tuning) {
  ensurePoseActionAuthoringData(tuning);
  const deleted = new Set(tuning.deletedPoseActions);
  return uniqueActionKeys([
    ...POSE_KEYS.filter((key) => !deleted.has(key)),
    ...tuning.customActions.map((action) => action.key),
  ]);
}

export function poseActionOptions(tuning) {
  return poseActionDescriptors(tuning).map((action) => ({
    value: action.key,
    label: action.name,
  }));
}

export function poseActionDescriptors(tuning) {
  ensurePoseActionAuthoringData(tuning);
  return poseActionKeys(tuning).map((key) => ({
    key,
    name: poseActionName(tuning, key),
    trigger: poseActionTrigger(tuning, key),
    runtimeMode: isCustomPoseAction(tuning, key) ? 'trigger' : 'legacy',
    timeline: {
      settings: clone(tuning.poseSettings?.[key] || defaultPoseActionSettings()),
      offsets: clone(tuning.poseOffsets?.[key] || {}),
    },
    modifiers: clone(tuning.modifiers?.pose?.[key] || []),
    deletable: canDeletePoseAction(tuning, key),
  }));
}

export function poseActionName(tuning, key) {
  ensurePoseActionAuthoringData(tuning);
  return tuning.actionNames[key] || tuning.customActions.find((action) => action.key === key)?.name || poseLabel(key);
}

export function renamePoseAction(tuning, key, name) {
  ensurePoseActionAuthoringData(tuning);
  const nextName = (name || '').trim() || poseLabel(key);
  tuning.actionNames[key] = nextName;
  const customAction = tuning.customActions.find((action) => action.key === key);
  if (customAction) customAction.name = nextName;
  return nextName;
}

export function createPoseAction(tuning) {
  ensurePoseActionAuthoringData(tuning);
  const index = tuning.customActions.length + 1;
  const key = uniquePoseActionKey(tuning, `customAction${index}`);
  const name = `새 액션 ${index}`;
  tuning.customActions.push({ key, name, trigger: defaultActionTrigger() });
  tuning.actionNames[key] = name;
  tuning.poseSettings[key] = defaultPoseActionSettings();
  tuning.poseOffsets[key] = {};
  tuning.modifiers.pose[key] = [];
  return key;
}

export function isCustomPoseAction(tuning, key) {
  ensurePoseActionAuthoringData(tuning);
  return tuning.customActions.some((action) => action.key === key);
}

export function canDeletePoseAction(tuning, key) {
  ensurePoseActionAuthoringData(tuning);
  return key !== 'idle' && (POSE_KEYS.includes(key) || isCustomPoseAction(tuning, key));
}

export function poseActionTrigger(tuning, key) {
  ensurePoseActionAuthoringData(tuning);
  const action = tuning.customActions.find((item) => item.key === key);
  return (
    normalizeOptionalActionTrigger(tuning.actionTriggers?.[key]) ||
    normalizeOptionalActionTrigger(action?.trigger) ||
    normalizeOptionalActionTrigger(defaultActionTriggerForKey(key))
  );
}

export function writePoseActionTrigger(tuning, key, trigger) {
  ensurePoseActionAuthoringData(tuning);
  const normalized = normalizeOptionalActionTrigger(trigger);
  tuning.actionTriggers ||= {};
  if (normalized) tuning.actionTriggers[key] = normalized;
  else delete tuning.actionTriggers[key];
  const action = tuning.customActions.find((item) => item.key === key);
  if (action) action.trigger = normalized || defaultActionTrigger();
  return normalized;
}

export function deletePoseAction(tuning, key) {
  ensurePoseActionAuthoringData(tuning);
  if (!canDeletePoseAction(tuning, key)) return null;

  if (isCustomPoseAction(tuning, key)) {
    tuning.customActions = tuning.customActions.filter((action) => action.key !== key);
  } else if (POSE_KEYS.includes(key)) {
    tuning.deletedPoseActions = normalizeDeletedPoseActions([...tuning.deletedPoseActions, key]);
  }
  delete tuning.actionNames[key];
  delete tuning.actionTriggers?.[key];
  delete tuning.poseSettings?.[key];
  delete tuning.poseOffsets?.[key];
  delete tuning.modifiers?.pose?.[key];
  return poseActionKeys(tuning)[0] || POSE_KEYS[0];
}

export function poseActionExportData(tuning, key) {
  ensurePoseActionAuthoringData(tuning);
  return {
    schema: 'crow-knight.action',
    version: ACTION_FILE_VERSION,
    key,
    name: poseActionName(tuning, key),
    timeline: {
      settings: clone(tuning.poseSettings?.[key] || defaultPoseActionSettings()),
      offsets: clone(tuning.poseOffsets?.[key] || {}),
    },
    trigger: clone(poseActionTrigger(tuning, key)),
    modifiers: clone(tuning.modifiers?.pose?.[key] || []),
  };
}

export function downloadPoseAction(tuning, key) {
  const data = poseActionExportData(tuning, key);
  const blob = new globalThis.Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = globalThis.URL.createObjectURL(blob);
  anchor.download = `${safeActionFileName(data.name || key)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.URL.revokeObjectURL(anchor.href);
}

export async function importPoseActionFile(tuning, file) {
  const text = await file.text();
  const data = JSON.parse(text);
  return importPoseActionData(tuning, data);
}

export function importPoseActionData(tuning, data) {
  ensurePoseActionAuthoringData(tuning);
  const source = data?.timeline ? data : { timeline: { settings: data?.settings, offsets: data?.offsets }, ...data };
  const name = String(source?.name || '불러온 액션');
  const baseKey = safePoseActionKey(source?.key || name || 'importedAction');
  const key = uniquePoseActionKey(tuning, baseKey);

  tuning.customActions.push({ key, name, trigger: normalizeActionTrigger(source.trigger) });
  tuning.actionTriggers[key] = normalizeActionTrigger(source.trigger);
  tuning.actionNames[key] = name;
  tuning.poseSettings[key] = {
    ...defaultPoseActionSettings(),
    ...(source.timeline?.settings || {}),
  };
  tuning.poseOffsets[key] = clone(source.timeline?.offsets || {});
  tuning.modifiers.pose[key] = clone(source.modifiers || []);
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
      .map(([key, trigger]) => [safePoseActionKey(key), normalizeOptionalActionTrigger(trigger)])
      .filter(([key, trigger]) => key && trigger)
  );
}

export function normalizeCustomActions(actions = []) {
  if (!Array.isArray(actions)) return [];
  const seen = new Set(POSE_KEYS);
  return actions
    .map((action, index) => ({
      key: safePoseActionKey(action?.key || `customAction${index + 1}`),
      name: String(action?.name || `새 액션 ${index + 1}`),
      trigger: normalizeActionTrigger(action?.trigger),
    }))
    .filter((action) => {
      if (!action.key || seen.has(action.key)) return false;
      seen.add(action.key);
      return true;
    });
}

export function normalizeDeletedPoseActions(actions = []) {
  if (!Array.isArray(actions)) return [];
  return [...new Set(actions.map(safePoseActionKey).filter((key) => key && key !== 'idle' && POSE_KEYS.includes(key)))];
}

export function normalizeActionNames(names = {}) {
  return Object.fromEntries(
    Object.entries(names || {})
      .map(([key, name]) => [safePoseActionKey(key), String(name || '').trim()])
      .filter(([key, name]) => key && name)
  );
}

export function defaultPoseActionSettings() {
  return {
    duration: 0.6,
    playback: 'loop',
    playbackRate: 1,
  };
}

function uniquePoseActionKey(tuning, preferredKey) {
  const base = safePoseActionKey(preferredKey) || 'customAction';
  const used = new Set([...POSE_KEYS, ...tuning.customActions.map((action) => action.key)]);
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

function safePoseActionKey(value) {
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
