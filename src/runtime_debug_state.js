import { timelineFrameCount } from './timeline_playback_helper.js';
import { actionTriggerKeyLabel, normalizeActionTrigger } from './action_trigger_data.js';
import { ATTACK_INTERACTION_OBJECT_KEY } from './interaction_object_editor_controller.js';

const DEBUG_STORAGE_KEY = 'crowKnight.debugInteractionRuntime';
const MAX_DEBUG_EVENTS = 10;

const runtimeDebugState = {
  enabled: readInitialDebugEnabled(),
  frameSerial: 0,
  action: emptyActionSnapshot(),
  flow: emptyFlowSnapshot(),
  regions: emptyRegionSnapshot(),
  previousSignals: emptyRegionSnapshot(),
  last: emptyLastSnapshot(),
  events: [],
};

export function isRuntimeDebugEnabled() {
  return (
    runtimeDebugState.enabled === true || globalThis.CROW_KNIGHT_INTERACTION_DEBUG === true || storedDebugEnabled()
  );
}

export function setRuntimeDebugEnabled(enabled) {
  runtimeDebugState.enabled = enabled === true;
  globalThis.CROW_KNIGHT_INTERACTION_DEBUG = runtimeDebugState.enabled;
  try {
    globalThis.localStorage?.setItem(DEBUG_STORAGE_KEY, runtimeDebugState.enabled ? '1' : '0');
  } catch {
    // Debug state must never affect Runtime.
  }
}

export function toggleRuntimeDebugEnabled() {
  setRuntimeDebugEnabled(!isRuntimeDebugEnabled());
  return isRuntimeDebugEnabled();
}

export function getRuntimeDebugState() {
  return runtimeDebugState;
}

export function beginRuntimeDebugFrame() {
  if (!isRuntimeDebugEnabled()) return;
  runtimeDebugState.frameSerial += 1;
  runtimeDebugState.regions = emptyRegionSnapshot();
}

export function captureRuntimeDebugActorSnapshot(player) {
  if (!isRuntimeDebugEnabled()) return;
  runtimeDebugState.action = actionSnapshotFromPlayer(player);
}

export function recordRuntimeDebugEvent(type, payload = {}) {
  if (!isRuntimeDebugEnabled()) return;
  const event = {
    type,
    payload,
    count: 1,
    frameSerial: runtimeDebugState.frameSerial,
    atMs: Math.round(globalThis.performance?.now?.() || Date.now()),
  };
  applyRuntimeDebugEvent(event);
  if (!shouldStoreRuntimeDebugEvent(event)) return;
  pushRuntimeDebugEvent(event);
}

function pushRuntimeDebugEvent(event) {
  const signature = runtimeDebugEventSignature(event);
  const latest = runtimeDebugState.events[0];
  if (latest && runtimeDebugEventSignature(latest) === signature) {
    latest.count = Number(latest.count || 1) + 1;
    latest.frameSerial = event.frameSerial;
    latest.atMs = event.atMs;
    return;
  }
  runtimeDebugState.events.unshift(event);
  runtimeDebugState.events = runtimeDebugState.events.slice(0, MAX_DEBUG_EVENTS);
}

function readInitialDebugEnabled() {
  return storedDebugEnabled();
}

function storedDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function actionSnapshotFromPlayer(player) {
  if (!player) return emptyActionSnapshot();
  const actionKey = player.actionKey || 'none';
  const settings = player.actionSettings?.[actionKey] || {};
  const frameCount = timelineFrameCount(settings);
  const progress = Number(player.getActionFrameProgress?.() || 0);
  const frame = Math.min(frameCount, Math.max(1, Math.round(progress * Math.max(0, frameCount - 1)) + 1));
  const action = (player.actions || []).find((item) => item?.key === actionKey);
  const attackFrameValue = attackFrameValueSnapshot(player, actionKey);
  updateCurrentFrameFlow(attackFrameValue);
  return {
    key: actionKey,
    name: action?.label || action?.name || actionKey,
    trigger: actionTriggerLabel(action?.trigger),
    ...attackFrameSnapshot(player, actionKey, frameCount),
    attackFrameValue,
    frame,
    frameCount,
    triggerMode: player.customActionTriggerMode || 'tap',
    facing: Number(player.facing || 1) < 0 ? 'left' : 'right',
  };
}

function attackFrameSnapshot(player, actionKey, frameCount) {
  const value = player.actionOffsets?.[actionKey]?.[ATTACK_INTERACTION_OBJECT_KEY];
  const actionValue = player.actionSettings?.[actionKey]?.interactions?.[ATTACK_INTERACTION_OBJECT_KEY];
  const frames = attackActiveFrames(value, frameCount);
  if (!frames.length && interactionAttackEnabled(actionValue)) {
    const count = Math.max(1, Number(frameCount || 1));
    const actionFrames = Array.from({ length: count }, (_, index) => index + 1);
    return {
      attackFrames: frameRangesLabel(actionFrames),
      activeAttackFrameCount: actionFrames.length,
      hasAttackFrames: true,
    };
  }
  const activeAttackFrameCount = frames.length;
  return {
    attackFrames: activeAttackFrameCount ? frameRangesLabel(frames) : '-',
    activeAttackFrameCount,
    hasAttackFrames: activeAttackFrameCount > 0,
  };
}

function attackFrameValueSnapshot(player, actionKey) {
  const source = player.actionOffsets?.[actionKey]?.[ATTACK_INTERACTION_OBJECT_KEY];
  const actionSource = player.actionSettings?.[actionKey]?.interactions?.[ATTACK_INTERACTION_OBJECT_KEY];
  const value = player.getPartOffset?.(ATTACK_INTERACTION_OBJECT_KEY) || {};
  return {
    key: ATTACK_INTERACTION_OBJECT_KEY,
    hasSource: Boolean(source || actionSource),
    sourceType: attackFrameValueSourceType(source, actionSource),
    active: Number(value.active || 0),
    attack: Number(value.attack || 0),
    damage: Number(value.damage || 0),
    knockback: Number(value.knockback || 0),
  };
}

function attackFrameValueSourceType(source, actionSource = null) {
  if (interactionAttackEnabled(actionSource)) return 'action-level';
  if (!source) return '없음';
  if (Array.isArray(source.keyframes)) return `keyframes ${source.keyframes.length}`;
  if (source.start || source.end) return 'start/end';
  return 'static';
}

function interactionAttackEnabled(value = {}) {
  return Number(value?.active || 0) >= 0.5 && Number(value?.attack || 0) >= 0.5;
}

function updateCurrentFrameFlow(attackFrameValue) {
  const flow = runtimeDebugState.flow;
  flow.frame = attackFrameValue.hasSource;
  flow.attackOn = attackFrameValue.active >= 0.5 && attackFrameValue.attack >= 0.5;
  flow.reasons.frame = flow.frame ? '' : 'frame value 없음';
  if (flow.attackOn) {
    flow.reasons.attackOn = '';
  } else {
    flow.reasons.attackOn = `active=${attackFrameValue.active} / attack=${attackFrameValue.attack}`;
  }
}

function attackActiveFrames(value = {}, frameCount = 1) {
  const count = Math.max(1, Number(frameCount || 1));
  if (Array.isArray(value.keyframes) && value.keyframes.length) {
    return value.keyframes
      .filter((frame) => Number(frame?.active || 0) >= 0.5 && Number(frame?.attack || 0) >= 0.5)
      .map((frame) => timelineTToFrame(frame.t, count));
  }
  if (Number(value.active || 0) >= 0.5 && Number(value.attack || 0) >= 0.5) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }
  return [];
}

function timelineTToFrame(t, frameCount) {
  return Math.min(frameCount, Math.max(1, Math.round(Number(t || 0) * Math.max(0, frameCount - 1)) + 1));
}

function frameRangesLabel(frames) {
  const sorted = [...new Set(frames)].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = current;
    prev = current;
  }
  return ranges.join(', ');
}

function actionTriggerLabel(trigger) {
  if (!trigger) return '없음';
  const normalized = normalizeActionTrigger(trigger);
  if (normalized.type === 'sequence') return normalized.keys.map(actionTriggerKeyLabel).join(' > ');
  if (normalized.type === 'holdCombo') {
    return `${actionTriggerKeyLabel(normalized.hold)} + ${actionTriggerKeyLabel(normalized.press)}`;
  }
  return (normalized.keys || []).map(actionTriggerKeyLabel).join(' ') || '없음';
}

function applyRuntimeDebugEvent(event) {
  const { type, payload } = event;
  if (type === 'trigger-input') {
    runtimeDebugState.flow.input = true;
    runtimeDebugState.flow.reasons.input = '';
  } else if (type === 'trigger-match') {
    runtimeDebugState.flow.trigger = true;
    runtimeDebugState.flow.reasons.trigger = '';
  } else if (type === 'trigger-failed') {
    runtimeDebugState.flow.trigger = false;
    runtimeDebugState.flow.reasons.trigger = payload.reason || '입력 조건 불일치';
  } else if (type === 'action-start') {
    runtimeDebugState.flow.action = payload.started === true;
    runtimeDebugState.flow.reasons.action = payload.started === true ? '' : 'Action 시작 실패';
  } else if (type === 'action-start-failed') {
    runtimeDebugState.flow.action = false;
    runtimeDebugState.flow.reasons.action = payload.reason || 'Action 시작 실패';
  } else if (type === 'attack-region-created') {
    runtimeDebugState.regions.attackCreated = true;
    runtimeDebugState.flow.region = true;
    runtimeDebugState.flow.reasons.region = '';
    runtimeDebugState.last.skipReason = '';
  } else if (type === 'attack-region-skipped') {
    runtimeDebugState.regions.attackCreated = false;
    runtimeDebugState.flow.region = false;
    runtimeDebugState.flow.reasons.region = payload.reason || 'Region 생성 실패';
    runtimeDebugState.last.skipReason = payload.reason || '';
  } else if (type === 'hurt-region') {
    runtimeDebugState.regions.hurtCreated = Number(payload.count || 0) > 0;
  } else if (type === 'attack-hurt-overlap') {
    runtimeDebugState.regions.attackHurtOverlap = true;
    runtimeDebugState.last.damage = payload.damage ?? '';
    runtimeDebugState.last.knockback = payload.knockback ?? '';
  } else if (type === 'attack-hurt-no-overlap') {
    runtimeDebugState.regions.attackHurtOverlap = false;
    runtimeDebugState.flow.damage = false;
    runtimeDebugState.flow.reasons.damage = payload.reason || 'overlap 없음';
    runtimeDebugState.last.skipReason = payload.reason || 'attack/hurt overlap 없음';
  } else if (type === 'collision-hurt-overlap') {
    runtimeDebugState.regions.collisionHurtOverlap = true;
    runtimeDebugState.last.damage = payload.damage ?? '';
  } else if (type === 'guard-block') {
    runtimeDebugState.regions.guardBlock = true;
  } else if (type === 'damage-applied') {
    runtimeDebugState.flow.damage = true;
    runtimeDebugState.flow.reasons.damage = '';
    runtimeDebugState.last.damage = payload.damage ?? runtimeDebugState.last.damage;
  }
}

function shouldStoreRuntimeDebugEvent(event) {
  const { type, payload } = event;
  if (type === 'attack-region-created') return updateSignal('attackCreated', true);
  if (type === 'attack-region-skipped') return updateSignal('attackCreated', false) || Boolean(payload.reason);
  if (type === 'hurt-region') return updateSignal('hurtCreated', Number(payload.count || 0) > 0);
  if (type === 'attack-hurt-overlap') return updateSignal('attackHurtOverlap', true) || hasDamagePayload(payload);
  if (type === 'attack-hurt-no-overlap') return updateSignal('attackHurtOverlap', false);
  if (type === 'collision-hurt-overlap') return updateSignal('collisionHurtOverlap', true) || hasDamagePayload(payload);
  if (type === 'collision-overlap') return updateSignal('collisionOverlap', true);
  if (type === 'guard-block') return updateSignal('guardBlock', true);
  return true;
}

function updateSignal(key, value) {
  const previous = runtimeDebugState.previousSignals[key];
  runtimeDebugState.previousSignals[key] = value;
  return previous !== value;
}

function hasDamagePayload(payload = {}) {
  return Number(payload.damage || 0) > 0;
}

function runtimeDebugEventSignature(event) {
  const payload = event.payload || {};
  return [
    event.type,
    payload.actionKey,
    payload.currentActionKey,
    payload.attacker,
    payload.target,
    payload.source,
    payload.reason,
    payload.damage,
    payload.knockback,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join('|');
}

function emptyActionSnapshot() {
  return {
    key: 'none',
    name: 'none',
    trigger: '없음',
    attackFrames: '-',
    activeAttackFrameCount: 0,
    hasAttackFrames: false,
    attackFrameValue: {
      key: ATTACK_INTERACTION_OBJECT_KEY,
      hasSource: false,
      sourceType: '없음',
      active: 0,
      attack: 0,
      damage: 0,
      knockback: 0,
    },
    frame: 1,
    frameCount: 1,
    triggerMode: 'tap',
    facing: 'right',
  };
}

function emptyFlowSnapshot() {
  return {
    input: false,
    trigger: false,
    action: false,
    frame: false,
    attackOn: false,
    region: false,
    damage: false,
    reasons: {
      input: '입력 없음',
      trigger: '입력 조건 불일치',
      action: 'Action 시작 전',
      frame: 'frame value 없음',
      attackOn: 'active=0 / attack=0',
      region: 'Region 생성 전',
      damage: 'overlap 없음',
    },
  };
}

function emptyRegionSnapshot() {
  return {
    attackCreated: false,
    hurtCreated: false,
    attackHurtOverlap: false,
    collisionHurtOverlap: false,
    collisionOverlap: false,
    guardBlock: false,
  };
}

function emptyLastSnapshot() {
  return {
    damage: '',
    knockback: '',
    skipReason: '',
  };
}
