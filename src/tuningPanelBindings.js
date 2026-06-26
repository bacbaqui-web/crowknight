import { GAME_KEYS } from './gameConfig.js';

export function isTextInput(target) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
}

export function bindPoseTimelineControls(elements, actions) {
  const {
    poseDuration,
    posePlaybackRateRange,
    posePlaybackRate,
    poseFrameUp,
    poseFrameDown,
    posePlayback,
    posePlaybackMode,
    poseCopyFrame,
    posePasteFrame,
    poseUndoFrame,
    poseAddKeyframe,
    poseDeleteKeyframe,
    poseResetAnimation,
  } = elements;
  const {
    updatePoseSetting,
    bindNumberDrag,
    commitUndoSnapshot,
    updatePosePlaybackRate,
    stepPoseDuration,
    togglePosePlayback,
    togglePosePlaybackMode,
    copyActivePoseFrame,
    pasteActivePoseFrame,
    undoTuningChange,
    addPoseKeyframe,
    deletePoseKeyframe,
    resetCurrentPoseAnimation,
  } = actions;

  poseDuration.addEventListener('input', () => updatePoseSetting('duration', Number(poseDuration.value)));
  bindNumberDrag(poseDuration, poseDuration, (value) => {
    poseDuration.value = value;
    updatePoseSetting('duration', Number(value));
  });
  poseDuration.addEventListener('change', commitUndoSnapshot);
  poseDuration.addEventListener('blur', commitUndoSnapshot);
  posePlaybackRateRange.addEventListener('input', () =>
    updatePosePlaybackRate(posePlaybackRateRange.value, posePlaybackRate)
  );
  posePlaybackRate.addEventListener('input', () =>
    updatePosePlaybackRate(posePlaybackRate.value, posePlaybackRateRange)
  );
  bindNumberDrag(posePlaybackRate, posePlaybackRateRange, (value) => {
    posePlaybackRate.value = value;
    updatePosePlaybackRate(value, posePlaybackRateRange);
  });
  posePlaybackRateRange.addEventListener('change', commitUndoSnapshot);
  posePlaybackRate.addEventListener('change', commitUndoSnapshot);
  posePlaybackRate.addEventListener('blur', commitUndoSnapshot);
  poseFrameUp.addEventListener('click', (event) => stepPoseDuration(event.shiftKey ? 10 : 1, event.shiftKey));
  poseFrameDown.addEventListener('click', (event) => stepPoseDuration(event.shiftKey ? -10 : -1, event.shiftKey));
  posePlayback.addEventListener('click', togglePosePlayback);
  posePlaybackMode.addEventListener('click', togglePosePlaybackMode);
  poseCopyFrame.addEventListener('click', copyActivePoseFrame);
  posePasteFrame.addEventListener('click', pasteActivePoseFrame);
  poseUndoFrame.addEventListener('click', undoTuningChange);
  poseAddKeyframe.addEventListener('click', addPoseKeyframe);
  poseDeleteKeyframe.addEventListener('click', deletePoseKeyframe);
  poseResetAnimation.addEventListener('click', resetCurrentPoseAnimation);
}

export function bindEffectTimelineControls(elements, actions) {
  const {
    effectDuration,
    effectPlaybackRateRange,
    effectPlaybackRate,
    effectFrameUp,
    effectFrameDown,
    effectPlayback,
    effectPlaybackMode,
    effectCopyFrame,
    effectPasteFrame,
    effectUndoFrame,
    effectAddKeyframe,
    effectDeleteKeyframe,
    effectResetAnimation,
  } = elements;
  const {
    updateEffectSetting,
    bindNumberDrag,
    commitUndoSnapshot,
    updateEffectPlaybackRate,
    stepEffectDuration,
    toggleEffectPlayback,
    toggleEffectPlaybackMode,
    copyActiveEffectFrame,
    pasteActiveEffectFrame,
    undoTuningChange,
    addEffectKeyframe,
    deleteEffectKeyframe,
    resetCurrentEffectAnimation,
  } = actions;

  effectDuration.addEventListener('input', () => updateEffectSetting('duration', Number(effectDuration.value)));
  bindNumberDrag(effectDuration, effectDuration, (value) => {
    effectDuration.value = value;
    updateEffectSetting('duration', Number(value));
  });
  effectDuration.addEventListener('change', commitUndoSnapshot);
  effectDuration.addEventListener('blur', commitUndoSnapshot);
  effectPlaybackRateRange.addEventListener('input', () =>
    updateEffectPlaybackRate(effectPlaybackRateRange.value, effectPlaybackRate)
  );
  effectPlaybackRate.addEventListener('input', () =>
    updateEffectPlaybackRate(effectPlaybackRate.value, effectPlaybackRateRange)
  );
  bindNumberDrag(effectPlaybackRate, effectPlaybackRateRange, (value) => {
    effectPlaybackRate.value = value;
    updateEffectPlaybackRate(value, effectPlaybackRateRange);
  });
  effectPlaybackRateRange.addEventListener('change', commitUndoSnapshot);
  effectPlaybackRate.addEventListener('change', commitUndoSnapshot);
  effectPlaybackRate.addEventListener('blur', commitUndoSnapshot);
  effectFrameUp.addEventListener('click', (event) => stepEffectDuration(event.shiftKey ? 10 : 1, event.shiftKey));
  effectFrameDown.addEventListener('click', (event) => stepEffectDuration(event.shiftKey ? -10 : -1, event.shiftKey));
  effectPlayback.addEventListener('click', toggleEffectPlayback);
  effectPlaybackMode.addEventListener('click', toggleEffectPlaybackMode);
  effectCopyFrame.addEventListener('click', copyActiveEffectFrame);
  effectPasteFrame.addEventListener('click', pasteActiveEffectFrame);
  effectUndoFrame.addEventListener('click', undoTuningChange);
  effectAddKeyframe.addEventListener('click', addEffectKeyframe);
  effectDeleteKeyframe.addEventListener('click', deleteEffectKeyframe);
  effectResetAnimation.addEventListener('click', resetCurrentEffectAnimation);
}

export function bindPanelKeyboardShortcuts(panel, actions) {
  const { undoTuningChange, copyCurrentFrame, pasteCurrentFrame, hasFrameSelection } = actions;

  panel.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
      e.preventDefault();
      e.stopPropagation();
      undoTuningChange();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyC' && !isTextInput(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      copyCurrentFrame();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyC' && hasFrameSelection()) {
      e.preventDefault();
      e.stopPropagation();
      copyCurrentFrame();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyV' && !isTextInput(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      pasteCurrentFrame();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.code === 'KeyV' && hasFrameSelection()) {
      e.preventDefault();
      e.stopPropagation();
      pasteCurrentFrame();
      return;
    }
    if (GAME_KEYS.has(e.code) && !hasFrameSelection()) return;
    if (GAME_KEYS.has(e.code)) return;
    e.stopPropagation();
  });
}

export function bindPanelShellControls(elements, actions) {
  const { panel, openButton, closeButton, backdrop } = elements;
  const { openPanel, closePanel } = actions;

  openButton.addEventListener('click', () => {
    if (panel.classList.contains('is-open')) closePanel();
    else openPanel();
    openButton.blur();
  });
  closeButton.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
}

export function bindSectionToggle(section, onOpen, onClose) {
  section.addEventListener('sectiontoggle', (event) => {
    if (event.detail.isOpen) onOpen();
    else onClose();
  });
}

export function bindLayerOrderControls(layerUp, layerDown, moveLayer) {
  layerUp.addEventListener('click', () => moveLayer(1));
  layerDown.addEventListener('click', () => moveLayer(-1));
}

export function bindCanvasDragControls(canvas, handlers) {
  const { onPointerDown, onPointerMove, onPointerUp } = handlers;
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
}

export function bindSelectionControls(elements, handlers) {
  const { actorSelect, actorName, partSelect, poseSelect, effectSelect, posePartSelect } = elements;
  const { onActorChange, onActorNameInput, onPartChange, onPoseChange, onEffectChange, onPosePartChange } = handlers;

  actorSelect.addEventListener('change', onActorChange);
  actorName.addEventListener('input', onActorNameInput);
  partSelect.addEventListener('change', onPartChange);
  poseSelect.addEventListener('change', onPoseChange);
  effectSelect.addEventListener('change', onEffectChange);
  posePartSelect.addEventListener('change', onPosePartChange);
}
