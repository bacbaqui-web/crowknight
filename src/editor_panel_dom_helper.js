import { defaultEffectImageKey } from './animation_frame_data.js';
import { EFFECT_IMAGE_OPTIONS, ACTION_KEYS, ACTION_PART_KEYS } from './game_config_data.js';
import { getPath } from './common_helper.js';
import { layerLabel, partLabel, actionLabel } from './editor_label_helper.js';
import { displayTuningControlValue } from './control_value_transform_helper.js';
import { partEditKeys } from './part_source_data.js';
import { actionOptions } from './action_authoring_data.js';
import { ACTION_GROUPS } from './action_group_helper.js';
import { SELECTION_PALETTE_TARGETS } from './selection_palette_data.js';
import {
  ATTACK_INTERACTION_OBJECT_KEY,
  COLLISION_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
} from './interaction_object_editor_controller.js';
import { populateMotionSettingRows } from './motion_field_data.js';
import { getTuningPanelWorkflowSections } from './editor_workflow_data.js';
import {
  characterGroupLabel,
  creatableCharacterGroups,
  isPlayerCharacter,
  visibleCharacterGroups,
} from './character_group_data.js';

const PART_PICKER_CLASS_BY_KEY = {
  cape: 'part-neck',
  [COLLISION_INTERACTION_OBJECT_KEY]: 'part-collision-interaction-object',
  [HURT_INTERACTION_OBJECT_KEY]: 'part-hurt-interaction-object',
  [ATTACK_INTERACTION_OBJECT_KEY]: 'part-attack-interaction-object',
  [GUARD_INTERACTION_OBJECT_KEY]: 'part-guard-interaction-object',
};

export function getTuningPanelElements(panel) {
  populateMotionSettingRows(panel.querySelector('#motionSettingRows'));
  const workflowSections = getTuningPanelWorkflowSections(panel);

  return {
    panel,
    backdrop: document.querySelector('#panelBackdrop'),
    openButton: document.querySelector('#settingsToggle'),
    closeButton: document.querySelector('#closeTuning'),
    resetButton: document.querySelector('#resetTuning'),
    firebaseUpload: document.querySelector('#firebaseUpload'),
    firebaseDownload: document.querySelector('#firebaseDownload'),
    actorGroupSelect: document.querySelector('#actorGroupSelect'),
    actorSelect: document.querySelector('#actorSelect'),
    actorName: document.querySelector('#actorName'),
    ...workflowSections,
    backgroundPsdUpload: document.querySelector('#backgroundPsdUpload'),
    backgroundPsdFile: document.querySelector('#backgroundPsdFile'),
    backgroundRefresh: document.querySelector('#backgroundRefresh'),
    backgroundReset: document.querySelector('#backgroundReset'),
    backgroundLayerList: document.querySelector('#backgroundLayerList'),
    worldPhysicsGravity: document.querySelector('#worldPhysicsGravity'),
    worldPhysicsInertia: document.querySelector('#worldPhysicsInertia'),
    worldPhysicsAirControl: document.querySelector('#worldPhysicsAirControl'),
    worldPhysicsCameraShakePower: document.querySelector('#worldPhysicsCameraShakePower'),
    worldPhysicsCameraShakeFrames: document.querySelector('#worldPhysicsCameraShakeFrames'),
    worldPhysicsCameraShakeDecay: document.querySelector('#worldPhysicsCameraShakeDecay'),
    characterPsdUpload: document.querySelector('#characterPsdUpload'),
    characterPsdFile: document.querySelector('#characterPsdFile'),
    characterAdd: document.querySelector('#characterAdd'),
    characterCreatePsdFile: document.querySelector('#characterCreatePsdFile'),
    characterCreateDialog: document.querySelector('#characterCreateDialog'),
    characterCreateEnglishName: document.querySelector('#characterCreateEnglishName'),
    characterCreateKoreanName: document.querySelector('#characterCreateKoreanName'),
    characterCreateGroup: document.querySelector('#characterCreateGroup'),
    characterCreateCancel: document.querySelector('#characterCreateCancel'),
    characterCreateChoosePsd: document.querySelector('#characterCreateChoosePsd'),
    characterDelete: document.querySelector('#characterDelete'),
    characterMove: document.querySelector('#characterMove'),
    characterMoveMenu: document.querySelector('#characterMoveMenu'),
    characterMoveTargets: Array.from(document.querySelectorAll('[data-character-move-group]')),
    characterMenu: document.querySelector('#characterMenu'),
    characterMenuToggle: document.querySelector('#characterMenuToggle'),
    characterPsdRefresh: document.querySelector('#characterPsdRefresh'),
    characterPartReset: document.querySelector('#characterPartReset'),
    partPicker: panel.querySelector('[data-picker="part"]'),
    actionPartPicker: panel.querySelector('[data-picker="action"]'),
    partSelect: document.querySelector('#partSelect'),
    partFields: document.querySelector('#partFields'),
    actionGroupSelect: document.querySelector('#actionGroupSelect'),
    actionSelect: document.querySelector('#actionSelect'),
    actionAdd: document.querySelector('#actionAdd'),
    actionDuplicate: document.querySelector('#actionDuplicate'),
    actionMove: document.querySelector('#actionMove'),
    actionMenu: document.querySelector('#actionMenu'),
    actionMenuToggle: document.querySelector('#actionMenuToggle'),
    actionDelete: document.querySelector('#actionDelete'),
    actionName: document.querySelector('#actionName'),
    actionTriggerHint: document.querySelector('#actionTriggerHint'),
    actionTriggerType: document.querySelector('#actionTriggerType'),
    actionTriggerSingleKey: document.querySelector('#actionTriggerSingleKey'),
    actionTriggerSequenceKeys: document.querySelector('#actionTriggerSequenceKeys'),
    actionTriggerMaxGapMs: document.querySelector('#actionTriggerMaxGapMs'),
    actionTriggerHoldKey: document.querySelector('#actionTriggerHoldKey'),
    actionTriggerPressKey: document.querySelector('#actionTriggerPressKey'),
    actionTriggerRecord: document.querySelector('#actionTriggerRecord'),
    actionTriggerRepeat: document.querySelector('#actionTriggerRepeat'),
    actionTriggerRecordStatus: document.querySelector('#actionTriggerRecordStatus'),
    actionTriggerRecordComplete: document.querySelector('#actionTriggerRecordComplete'),
    actionTriggerRecordCancel: document.querySelector('#actionTriggerRecordCancel'),
    actionPartSelect: document.querySelector('#actionPartSelect'),
    actionPartFields: document.querySelector('#actionPartFields'),
    actionDuration: document.querySelector('#actionDuration'),
    actionTimelineMenu: document.querySelector('#actionTimelineMenu'),
    actionTimelineMenuToggle: document.querySelector('#actionTimelineMenuToggle'),
    actionPlaybackRateRange: document.querySelector('#actionPlaybackRateRange'),
    actionPlaybackRate: document.querySelector('#actionPlaybackRate'),
    actionFrameUp: document.querySelector('#actionFrameUp'),
    actionFrameDown: document.querySelector('#actionFrameDown'),
    actionPlayback: document.querySelector('#actionPlayback'),
    actionPlaybackMode: document.querySelector('#actionPlaybackMode'),
    actionMirror: document.querySelector('#actionMirror'),
    actionCancel: document.querySelector('#actionCancel'),
    actionBlend: document.querySelector('#actionBlend'),
    actionCondition: document.querySelector('#actionCondition'),
    actionCopyFrame: document.querySelector('#actionCopyFrame'),
    actionPasteFrame: document.querySelector('#actionPasteFrame'),
    actionUndoFrame: document.querySelector('#actionUndoFrame'),
    actionTimelineTrack: document.querySelector('#actionTimelineTrack'),
    actionAddKeyframe: document.querySelector('#actionAddKeyframe'),
    actionDeleteKeyframe: document.querySelector('#actionDeleteKeyframe'),
    actionResetAnimation: document.querySelector('#actionResetAnimation'),
    effectGroupSelect: document.querySelector('#effectGroupSelect'),
    effectSelect: document.querySelector('#effectSelect'),
    effectFileName: document.querySelector('#effectFileName'),
    effectImagePreview: document.querySelector('#effectImagePreview'),
    effectAssetMenu: document.querySelector('#effectAssetMenu'),
    effectAssetMenuToggle: document.querySelector('#effectAssetMenuToggle'),
    effectAssetUpload: document.querySelector('#effectAssetUpload'),
    effectAssetFile: document.querySelector('#effectAssetFile'),
    effectAssetRefresh: document.querySelector('#effectAssetRefresh'),
    effectAssetReset: document.querySelector('#effectAssetReset'),
    effectFields: document.querySelector('#effectFields'),
    effectDuration: document.querySelector('#effectDuration'),
    effectTimelineMenu: document.querySelector('#effectTimelineMenu'),
    effectTimelineMenuToggle: document.querySelector('#effectTimelineMenuToggle'),
    effectPlaybackRateRange: document.querySelector('#effectPlaybackRateRange'),
    effectPlaybackRate: document.querySelector('#effectPlaybackRate'),
    effectFrameUp: document.querySelector('#effectFrameUp'),
    effectFrameDown: document.querySelector('#effectFrameDown'),
    effectPlayback: document.querySelector('#effectPlayback'),
    effectPlaybackMode: document.querySelector('#effectPlaybackMode'),
    effectCopyFrame: document.querySelector('#effectCopyFrame'),
    effectPasteFrame: document.querySelector('#effectPasteFrame'),
    effectUndoFrame: document.querySelector('#effectUndoFrame'),
    effectTimelineTrack: document.querySelector('#effectTimelineTrack'),
    effectAddKeyframe: document.querySelector('#effectAddKeyframe'),
    effectDeleteKeyframe: document.querySelector('#effectDeleteKeyframe'),
    effectResetAnimation: document.querySelector('#effectResetAnimation'),
    layerOrder: document.querySelector('#layerOrder'),
    motionRows: Array.from(panel.querySelectorAll('[data-motion-group]')),
  };
}

export function syncPanelToggleState(panel, openButton) {
  const isOpen = panel.classList.contains('is-open');
  openButton.classList.toggle('is-panel-open', isOpen);
  openButton.classList.toggle('is-flipped', isOpen);
  openButton.setAttribute('aria-expanded', String(isOpen));
  openButton.setAttribute('aria-label', isOpen ? '설정 접기' : '설정 열기');
}

export function openTuningPanelShell(panel, backdrop) {
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  backdrop.hidden = false;
}

export function closeTuningPanelShell(panel, backdrop) {
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true;
}

export function replaceSelectOptions(select, options) {
  if (!select) return;
  select.innerHTML = '';
  options.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  });
}

export function syncNumericFields(fields, tuning) {
  fields.forEach(([id, path]) => {
    const group = document.querySelector(`[data-field="${id}"]`);
    if (!group) return;
    const value = displayTuningControlValue(id, getPath(tuning, path));
    group.querySelector('input[type="range"]').value = value;
    group.querySelector('input[type="number"]').value = value;
  });
}

export function renderLayerSelectOptions(select, layers, selectedValue) {
  select.innerHTML = '';
  const visualLayers = [...layers].reverse();
  visualLayers.forEach((layer) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'layer-order-item';
    option.draggable = true;
    option.dataset.layer = layer;
    option.setAttribute('role', 'option');
    option.textContent = layerLabel(layer);
    select.append(option);
  });

  select.value = layers.includes(selectedValue) ? selectedValue : layers.at(-1);
  select.dataset.value = select.value || '';
  select.querySelectorAll('[data-layer]').forEach((option) => {
    const selected = option.dataset.layer === select.value;
    option.classList.toggle('is-selected', selected);
    option.setAttribute('aria-selected', String(selected));
  });
}

export function markPartPicker(picker, selectedKey, selectedKeys = null) {
  picker.querySelectorAll('[data-part]').forEach((button) => {
    const selectionSize =
      typeof selectedKeys?.size === 'function' ? selectedKeys.size() : Number(selectedKeys?.size || 0);
    const selected = selectionSize
      ? selectedKeys.has(button.dataset.part)
      : Boolean(selectedKey) && button.dataset.part === selectedKey;
    button.classList.toggle('is-selected', selected);
  });
}

export function emptyPartMessage(text) {
  return `<div class="part-empty">${text}</div>`;
}

export function renderEffectImagePreview(preview, effectKey, effectAssets, imageKey = null) {
  if (!preview) return;

  preview.innerHTML = '';
  const resolvedImageKey = imageKey || defaultEffectImageKey(effectKey);
  const option = EFFECT_IMAGE_OPTIONS.find((item) => item.key === resolvedImageKey);
  const asset = option?.asset ? effectAssets[option.asset] : effectAssets[resolvedImageKey];
  if (!asset) return;

  const image = document.createElement('img');
  image.src = asset.src;
  image.alt = '';
  preview.append(image);
}

export function renderInactivePreviewTimeline(playbackButton, renderTimeline) {
  playbackButton.classList.toggle('is-active', false);
  renderTimeline();
}

export function renderActionPartHeader(container, partKey, selectedCount, frameLabel = '') {
  const header = document.createElement('div');
  header.className = 'action-part-header';
  if (partKey === 'all') {
    header.textContent = `${actionFrameScopeLabel(frameLabel)} · 전체파츠`;
  } else if (partKey === 'group') {
    header.textContent = frameLabel ? `${frameLabel} · 선택 그룹 ${selectedCount}` : `선택 그룹 ${selectedCount}`;
  } else if (partKey === 'master') {
    header.textContent = frameLabel || '기본';
  } else {
    header.textContent = `${actionFrameScopeLabel(frameLabel)} · ${partLabel(partKey)}`;
  }
  container.append(header);
}

function actionFrameScopeLabel(frameLabel) {
  return frameLabel && frameLabel !== '기본' ? frameLabel : '전체프레임';
}

export function bindPartPickerButtons(picker, onSelect) {
  picker.querySelectorAll('[data-part]').forEach((button) => {
    button.title = button.textContent.trim();
    button.addEventListener('click', (event) => onSelect(button.dataset.part, event.shiftKey));
  });
}

export function populatePartPickerButtons(picker) {
  if (!picker || picker.children.length) return;

  SELECTION_PALETTE_TARGETS.forEach(({ key: partKey, type }) => {
    const button = document.createElement('button');
    button.className = `part-pick ${PART_PICKER_CLASS_BY_KEY[partKey] || partPickerClassName(partKey)}`;
    button.type = 'button';
    button.dataset.part = partKey;
    button.dataset.selectionType = type;
    button.textContent = partLabel(partKey);
    picker.append(button);
  });
}

function partPickerClassName(partKey) {
  return `part-${partKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

export function syncActorSelectLabels(actorSelect, actors) {
  const actorIds = actors.map((actor) => actor.id);
  const optionIds = Array.from(actorSelect.options).map((option) => option.value);
  if (actorIds.length !== optionIds.length || actorIds.some((id, index) => id !== optionIds[index])) {
    replaceSelectOptions(
      actorSelect,
      actors.map((actor) => ({ value: actor.id, label: actorTypeLabel(actor) }))
    );
  }
  Array.from(actorSelect.options).forEach((option) => {
    const actor = actors.find((item) => item.id === option.value);
    option.textContent = `${actor.name}`;
  });
}

export function syncActorGroupOptions(actorGroupSelect, activeGroup) {
  if (!actorGroupSelect) return;

  const groups = visibleCharacterGroups();
  const optionIds = Array.from(actorGroupSelect.options).map((option) => option.value);
  if (groups.length !== optionIds.length || groups.some((group, index) => group.key !== optionIds[index])) {
    replaceSelectOptions(
      actorGroupSelect,
      groups.map((group) => ({ value: group.key, label: group.label }))
    );
  }
  actorGroupSelect.value = groups.some((group) => group.key === activeGroup) ? activeGroup : groups[0]?.key || 'mobs';
}

export function populateTuningPanelSelects(
  { actorGroupSelect, actorSelect, partSelect, actionSelect, actionPartSelect, effectGroupSelect, effectSelect },
  actors,
  rig,
  tuning = null
) {
  syncActorGroupOptions(actorGroupSelect, actors[0]?.group || 'players');
  replaceSelectOptions(
    actorSelect,
    actors.map((actor) => ({ value: actor.id, label: actor.name || actorTypeLabel(actor) }))
  );
  replaceSelectOptions(
    document.querySelector('#characterCreateGroup'),
    creatableCharacterGroups().map((group) => ({ value: group.key, label: characterGroupLabel(group.key) }))
  );
  replaceSelectOptions(
    partSelect,
    partEditKeys(rig).map((key) => ({ value: key, label: partLabel(key) }))
  );
  replaceSelectOptions(
    actionSelect,
    tuning ? actionOptions(tuning) : ACTION_KEYS.map((key) => ({ value: key, label: actionLabel(key) }))
  );
  replaceSelectOptions(
    actionPartSelect,
    ACTION_PART_KEYS.map((key) => ({ value: key, label: partLabel(key) }))
  );
  replaceSelectOptions(
    effectSelect,
    tuning ? actionOptions(tuning) : ACTION_KEYS.map((key) => ({ value: key, label: actionLabel(key) }))
  );
  replaceSelectOptions(
    effectGroupSelect,
    ACTION_GROUPS.map((group) => ({ value: group.key, label: group.label }))
  );
}

function actorTypeLabel(actor) {
  if (actor?.type) return actor.type;
  return isPlayerCharacter(actor) ? 'player' : 'enemy';
}
