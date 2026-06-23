import { defaultEffectImageKey } from './animationFrames.js';
import { EFFECT_IMAGE_OPTIONS, EFFECT_KEYS, POSE_KEYS, POSE_PART_KEYS } from './gameConfig.js';
import { getPath } from './utils.js';
import { layerLabel, partLabel, poseLabel } from './tuningLabels.js';
import { partPositionSources } from './tuningParts.js';

export function getTuningPanelElements(panel) {
  return {
    backdrop: document.querySelector('#panelBackdrop'),
    openButton: document.querySelector('#settingsToggle'),
    closeButton: document.querySelector('#closeTuning'),
    resetButton: document.querySelector('#resetTuning'),
    actorSelect: document.querySelector('#actorSelect'),
    actorName: document.querySelector('#actorName'),
    partSection: panel.querySelector('[data-section="part"]'),
    poseSection: panel.querySelector('[data-section="pose"]'),
    effectSection: panel.querySelector('[data-section="effect"]'),
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
    layerUp: document.querySelector('#layerUp'),
    layerDown: document.querySelector('#layerDown'),
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

export function syncPoseToolbarButtonStates(
  { copyButton, pasteButton, undoButton, frameDownButton, frameUpButton },
  { hasSelection, hasCopiedFrame, undoCount, frameCount, minFrames, maxFrames }
) {
  copyButton.disabled = !hasSelection;
  pasteButton.disabled = !hasCopiedFrame;
  undoButton.disabled = undoCount <= 0;
  frameDownButton.disabled = frameCount <= minFrames;
  frameUpButton.disabled = frameCount >= maxFrames;
}

export function syncEffectToolbarButtonStates(
  { section, copyButton, pasteButton, undoButton, frameDownButton, frameUpButton },
  { hasSelection, hasCopiedFrame, undoCount, frameCount, minFrames, maxFrames }
) {
  if (!section) return;
  copyButton.disabled = !hasSelection;
  pasteButton.disabled = !hasCopiedFrame;
  undoButton.disabled = undoCount <= 0;
  frameDownButton.disabled = frameCount <= minFrames;
  frameUpButton.disabled = frameCount >= maxFrames;
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
    const value = getPath(tuning, path);
    group.querySelector('input[type="range"]').value = value;
    group.querySelector('input[type="number"]').value = value;
  });
}

export function renderLayerSelectOptions(select, layers, selectedValue) {
  replaceSelectOptions(
    select,
    layers.map((layer) => ({ value: layer, label: layerLabel(layer) }))
  );

  select.value = layers.includes(selectedValue) ? selectedValue : layers.at(-1);
}

export function markPartPicker(picker, selectedKey, selectedKeys = null) {
  picker.querySelectorAll('[data-part]').forEach((button) => {
    const selected = selectedKeys?.size
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

export function bindPartPickerButtons(picker, onSelect) {
  picker.querySelectorAll('[data-part]').forEach((button) => {
    button.title = button.textContent.trim();
    button.addEventListener('click', (event) => onSelect(button.dataset.part, event.shiftKey));
  });
}

export function populateTuningPanelSelects(
  { actorSelect, partSelect, poseSelect, posePartSelect, effectSelect },
  actors,
  rig
) {
  replaceSelectOptions(
    actorSelect,
    actors.map((actor) => ({ value: actor.id, label: actor.label }))
  );
  replaceSelectOptions(
    partSelect,
    Object.keys(partPositionSources(rig)).map((key) => ({ value: key, label: partLabel(key) }))
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
