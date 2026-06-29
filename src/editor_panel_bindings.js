import { GAME_KEYS } from './game_config.js';
import { handlePanelKeyboardShortcut } from './editor_shortcut_helper.js';

export function bindPoseTimelineControls(elements, actions) {
  bindTimelineControls({
    controls: {
      duration: elements.poseDuration,
      playbackRateRange: elements.posePlaybackRateRange,
      playbackRate: elements.posePlaybackRate,
      frameUp: elements.poseFrameUp,
      frameDown: elements.poseFrameDown,
      playback: elements.posePlayback,
      playbackMode: elements.posePlaybackMode,
      copyFrame: elements.poseCopyFrame,
      pasteFrame: elements.posePasteFrame,
      undoFrame: elements.poseUndoFrame,
      addKeyframe: elements.poseAddKeyframe,
      deleteKeyframe: elements.poseDeleteKeyframe,
      resetAnimation: elements.poseResetAnimation,
    },
    actions: {
      updateSetting: actions.updatePoseSetting,
      updatePlaybackRate: actions.updatePosePlaybackRate,
      stepDuration: actions.stepPoseDuration,
      togglePlayback: actions.togglePosePlayback,
      togglePlaybackMode: actions.togglePosePlaybackMode,
      copyFrame: actions.copyActivePoseFrame,
      pasteFrame: actions.pasteActivePoseFrame,
      undo: actions.undoTuningChange,
      addKeyframe: actions.addPoseKeyframe,
      deleteKeyframe: actions.deletePoseKeyframe,
      resetAnimation: actions.resetCurrentPoseAnimation,
    },
    bindNumberDrag: actions.bindNumberDrag,
    commitUndoSnapshot: actions.commitUndoSnapshot,
  });
}

export function bindEffectTimelineControls(elements, actions) {
  bindTimelineControls({
    controls: {
      duration: elements.effectDuration,
      playbackRateRange: elements.effectPlaybackRateRange,
      playbackRate: elements.effectPlaybackRate,
      frameUp: elements.effectFrameUp,
      frameDown: elements.effectFrameDown,
      playback: elements.effectPlayback,
      playbackMode: elements.effectPlaybackMode,
      copyFrame: elements.effectCopyFrame,
      pasteFrame: elements.effectPasteFrame,
      undoFrame: elements.effectUndoFrame,
      addKeyframe: elements.effectAddKeyframe,
      deleteKeyframe: elements.effectDeleteKeyframe,
      resetAnimation: elements.effectResetAnimation,
    },
    actions: {
      updateSetting: actions.updateEffectSetting,
      updatePlaybackRate: actions.updateEffectPlaybackRate,
      stepDuration: actions.stepEffectDuration,
      togglePlayback: actions.toggleEffectPlayback,
      togglePlaybackMode: actions.toggleEffectPlaybackMode,
      copyFrame: actions.copyActiveEffectFrame,
      pasteFrame: actions.pasteActiveEffectFrame,
      undo: actions.undoTuningChange,
      addKeyframe: actions.addEffectKeyframe,
      deleteKeyframe: actions.deleteEffectKeyframe,
      resetAnimation: actions.resetCurrentEffectAnimation,
    },
    bindNumberDrag: actions.bindNumberDrag,
    commitUndoSnapshot: actions.commitUndoSnapshot,
  });
}

function bindTimelineControls({ controls, actions, bindNumberDrag, commitUndoSnapshot }) {
  controls.duration.addEventListener('input', () => actions.updateSetting('duration', Number(controls.duration.value)));
  bindNumberDrag(controls.duration, controls.duration, (value) => {
    controls.duration.value = value;
    actions.updateSetting('duration', Number(value));
  });
  controls.duration.addEventListener('change', commitUndoSnapshot);
  controls.duration.addEventListener('blur', commitUndoSnapshot);

  controls.playbackRateRange.addEventListener('input', () =>
    actions.updatePlaybackRate(controls.playbackRateRange.value, controls.playbackRate)
  );
  controls.playbackRate.addEventListener('input', () =>
    actions.updatePlaybackRate(controls.playbackRate.value, controls.playbackRateRange)
  );
  bindNumberDrag(controls.playbackRate, controls.playbackRateRange, (value) => {
    controls.playbackRate.value = value;
    actions.updatePlaybackRate(value, controls.playbackRateRange);
  });
  controls.playbackRateRange.addEventListener('change', commitUndoSnapshot);
  controls.playbackRate.addEventListener('change', commitUndoSnapshot);
  controls.playbackRate.addEventListener('blur', commitUndoSnapshot);

  controls.frameUp.addEventListener('click', (event) => actions.stepDuration(event.shiftKey ? 10 : 1, event.shiftKey));
  controls.frameDown.addEventListener('click', (event) =>
    actions.stepDuration(event.shiftKey ? -10 : -1, event.shiftKey)
  );
  controls.playback.addEventListener('click', actions.togglePlayback);
  controls.playbackMode.addEventListener('click', actions.togglePlaybackMode);
  controls.copyFrame.addEventListener('click', actions.copyFrame);
  controls.pasteFrame.addEventListener('click', actions.pasteFrame);
  controls.undoFrame.addEventListener('click', actions.undo);
  controls.addKeyframe.addEventListener('click', actions.addKeyframe);
  controls.deleteKeyframe.addEventListener('click', actions.deleteKeyframe);
  controls.resetAnimation.addEventListener('click', actions.resetAnimation);
}

export function bindPanelKeyboardShortcuts(panel, actions) {
  const { undoTuningChange, copyCurrentFrame, pasteCurrentFrame, hasFrameSelection } = actions;

  panel.addEventListener('keydown', (e) => {
    if (
      handlePanelKeyboardShortcut(e, {
        undo: undoTuningChange,
        copyFrame: copyCurrentFrame,
        pasteFrame: pasteCurrentFrame,
        canUseFrameShortcut: hasFrameSelection,
      })
    ) {
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
  if (!section) return;
  section.addEventListener('sectiontoggle', (event) => {
    if (event.detail.isOpen) onOpen();
    else onClose();
  });
}

export function bindLayerOrderControls(layerOrder, reorderLayer) {
  if (!layerOrder) return;
  let draggedLayer = null;

  layerOrder.addEventListener('click', (event) => {
    const item = event.target.closest('[data-layer]');
    if (!item) return;
    layerOrder.value = item.dataset.layer;
    layerOrder.dataset.value = item.dataset.layer;
    layerOrder.querySelectorAll('[data-layer]').forEach((option) => {
      const selected = option === item;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-selected', String(selected));
    });
  });

  layerOrder.addEventListener('dragstart', (event) => {
    const item = event.target.closest('[data-layer]');
    if (!item) return;
    draggedLayer = item.dataset.layer;
    item.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedLayer);
  });

  layerOrder.addEventListener('dragover', (event) => {
    if (!draggedLayer) return;
    const item = event.target.closest('[data-layer]');
    if (!item || item.dataset.layer === draggedLayer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const placement = layerDropPlacement(event, item);
    layerOrder.querySelectorAll('[data-layer]').forEach((option) => {
      option.classList.toggle('is-drop-before', option === item && placement === 'before');
      option.classList.toggle('is-drop-after', option === item && placement === 'after');
    });
  });

  layerOrder.addEventListener('drop', (event) => {
    const item = event.target.closest('[data-layer]');
    if (!item || !draggedLayer) return;
    event.preventDefault();
    reorderLayer(draggedLayer, item.dataset.layer, layerDropPlacement(event, item));
    draggedLayer = null;
    clearLayerDragState(layerOrder);
  });

  layerOrder.addEventListener('dragend', () => {
    draggedLayer = null;
    clearLayerDragState(layerOrder);
  });
}

function clearLayerDragState(layerOrder) {
  layerOrder.querySelectorAll('[data-layer]').forEach((item) => {
    item.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
  });
}

function layerDropPlacement(event, item) {
  const rect = item.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
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
