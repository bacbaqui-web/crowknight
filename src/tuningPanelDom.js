import { defaultEffectImageKey } from './animationFrames.js';
import { EFFECT_IMAGE_OPTIONS, EFFECT_KEYS, POSE_KEYS, POSE_PART_KEYS } from './gameConfig.js';
import { getPath } from './utils.js';
import { layerLabel, partLabel, poseLabel } from './tuningLabels.js';
import { displayTuningControlValue } from './tuningControlValueTransforms.js';
import { partEditKeys } from './tuningParts.js';
import { SELECTION_PALETTE_TARGETS } from './tuningSelectionPalette.js';
import {
  ATTACK_INTERACTION_OBJECT_KEY,
  COLLISION_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
} from './tuningInteractionObjects.js';
import { populateMotionSettingRows } from './tuningMotionFieldRows.js';
import { getTuningPanelWorkflowSections } from './tuningPanelWorkflow.js';

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
    actorSelect: document.querySelector('#actorSelect'),
    actorName: document.querySelector('#actorName'),
    ...workflowSections,
    backgroundPsdUpload: document.querySelector('#backgroundPsdUpload'),
    backgroundPsdFile: document.querySelector('#backgroundPsdFile'),
    backgroundRefresh: document.querySelector('#backgroundRefresh'),
    backgroundReset: document.querySelector('#backgroundReset'),
    backgroundLayerList: document.querySelector('#backgroundLayerList'),
    progressionMode: document.querySelector('#progressionMode'),
    progressionDurationSec: document.querySelector('#progressionDurationSec'),
    progressionDurationSecNumber: document.querySelector('#progressionDurationSecNumber'),
    progressionRulesFields: document.querySelector('#progressionRulesFields'),
    enemySpawnMode: document.querySelector('#enemySpawnMode'),
    enemyRulesFields: document.querySelector('#enemyRulesFields'),
    rewardRulesFields: document.querySelector('#rewardRulesFields'),
    scoreRulesFields: document.querySelector('#scoreRulesFields'),
    characterPsdUpload: document.querySelector('#characterPsdUpload'),
    characterPsdFile: document.querySelector('#characterPsdFile'),
    characterPsdRefresh: document.querySelector('#characterPsdRefresh'),
    characterPartReset: document.querySelector('#characterPartReset'),
    partPicker: panel.querySelector('[data-picker="part"]'),
    posePartPicker: panel.querySelector('[data-picker="pose"]'),
    partSelect: document.querySelector('#partSelect'),
    partFields: document.querySelector('#partFields'),
    poseSelect: document.querySelector('#poseSelect'),
    posePartSelect: document.querySelector('#posePartSelect'),
    posePartFields: document.querySelector('#posePartFields'),
    poseDuration: document.querySelector('#poseDuration'),
    posePlaybackRateRange: document.querySelector('#posePlaybackRateRange'),
    posePlaybackRate: document.querySelector('#posePlaybackRate'),
    poseFrameUp: document.querySelector('#poseFrameUp'),
    poseFrameDown: document.querySelector('#poseFrameDown'),
    posePlayback: document.querySelector('#posePlayback'),
    posePlaybackMode: document.querySelector('#posePlaybackMode'),
    poseCopyFrame: document.querySelector('#poseCopyFrame'),
    posePasteFrame: document.querySelector('#posePasteFrame'),
    poseUndoFrame: document.querySelector('#poseUndoFrame'),
    poseTimelineTrack: document.querySelector('#poseTimelineTrack'),
    poseAddKeyframe: document.querySelector('#poseAddKeyframe'),
    poseDeleteKeyframe: document.querySelector('#poseDeleteKeyframe'),
    poseResetAnimation: document.querySelector('#poseResetAnimation'),
    effectSelect: document.querySelector('#effectSelect'),
    effectImagePreview: document.querySelector('#effectImagePreview'),
    effectAssetUpload: document.querySelector('#effectAssetUpload'),
    effectAssetFile: document.querySelector('#effectAssetFile'),
    effectAssetRefresh: document.querySelector('#effectAssetRefresh'),
    effectAssetReset: document.querySelector('#effectAssetReset'),
    effectFields: document.querySelector('#effectFields'),
    effectDuration: document.querySelector('#effectDuration'),
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

export function renderEffectImagePreview(preview, effectKey, effectAssets) {
  if (!preview) return;

  preview.innerHTML = '';
  const imageKey = defaultEffectImageKey(effectKey);
  const option = EFFECT_IMAGE_OPTIONS.find((item) => item.key === imageKey);
  const asset = option?.asset ? effectAssets[option.asset] : null;
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

export function renderPosePartHeader(container, partKey, selectedCount, frameLabel = '') {
  const header = document.createElement('div');
  header.className = 'pose-part-header';
  if (partKey === 'group') {
    header.textContent = frameLabel ? `${frameLabel} · 선택 그룹 ${selectedCount}` : `선택 그룹 ${selectedCount}`;
  } else if (partKey === 'master') {
    header.textContent = frameLabel || '기본';
  } else {
    header.textContent = frameLabel ? `${frameLabel} · ${partLabel(partKey)}` : partLabel(partKey);
  }
  container.append(header);
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
  Array.from(actorSelect.options).forEach((option) => {
    const actor = actors.find((item) => item.id === option.value);
    option.textContent = `${actorTypeLabel(actor)} - ${actor.name}`;
  });
}

export function populateTuningPanelSelects(
  { actorSelect, partSelect, poseSelect, posePartSelect, effectSelect },
  actors,
  rig
) {
  replaceSelectOptions(
    actorSelect,
    actors.map((actor) => ({ value: actor.id, label: actorTypeLabel(actor) }))
  );
  replaceSelectOptions(
    partSelect,
    partEditKeys(rig).map((key) => ({ value: key, label: partLabel(key) }))
  );
  replaceSelectOptions(
    poseSelect,
    POSE_KEYS.map((key) => ({ value: key, label: poseLabel(key) }))
  );
  replaceSelectOptions(
    posePartSelect,
    POSE_PART_KEYS.map((key) => ({ value: key, label: partLabel(key) }))
  );
  replaceSelectOptions(
    effectSelect,
    EFFECT_KEYS.map((key) => ({ value: key, label: poseLabel(key) }))
  );
}

function actorTypeLabel(actor) {
  return actor?.id === 'player' ? 'player' : 'enemy';
}
