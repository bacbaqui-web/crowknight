import { createEffectTimelineAdapter } from './timeline_effect_adapter.js';
import { effectPropertyGroups } from './property_field_data.js';
import { renderEffectImagePreview } from './editor_panel_dom_helper.js';
import { isEmptyEditableSlot } from './timeline_dom_helper.js';
import { finishTimelineMutationAction } from './timeline_action_helper.js';
import { createTimelineFrameCommands } from './timeline_command_helper.js';
import { createTimelineKeyframeDragHandler } from './timeline_drag_helper.js';
import { createTimelineSelectionCommands } from './timeline_selection_helper.js';
import { createTimelineSelectionState } from './timeline_state.js';
import { createTimelineClipboardState } from './timeline_clipboard_helper.js';
import { clearActorEffectPreviews } from './preview_state.js';
import { effectFrameValueFromInput, readEffectFrameDisplayValue } from './property_value_helper.js';
import { renderScrubGroups } from './editor_scrub_helper.js';
import { createTimelinePreviewControls, syncEffectTimelinePreview } from './timeline_preview_helper.js';
import { renderEffectTimelineSettingsView } from './timeline_effect_panel_view.js';
import { createTimelineController, createTimelineControllerCommonApi } from './timeline_controller.js';
import { renderEditorDataCard } from './editor_card_panel_view.js';
import {
  interactionFrameValueFromInput,
  readInteractionDisplayValue,
  renderInteractionEditor,
} from './interaction_editor_engine.js';
import {
  renderAppliedModifierEditor,
  renderModifierLibraryEditor,
  replaceAppliedModifierEditor,
} from './modifier_editor_engine.js';
import {
  ensureTimelineModifierTarget,
  writeTimelineModifierEnabled,
  writeTimelineModifierSetting,
} from './timeline_modifier_data.js';
import { EDIT_CONTEXT_EFFECT, EDIT_TARGET_EFFECT } from './edit_target_helper.js';

export function createEffectTimelineController({
  actors,
  effectAssets,
  elements,
  undoState,
  scrubCallbacks,
  getSelectedActor,
  getEditTarget,
  setEditContext,
  beginUndoSnapshot,
  commitUndoSnapshot,
  applySelected,
}) {
  const {
    effectSection,
    effectSelect,
    effectImagePreview,
    effectFields,
    effectDuration,
    effectPlayback,
    effectTimelineTrack,
    effectAddKeyframe,
    effectDeleteKeyframe,
  } = elements;

  const effectSelection = createTimelineSelectionState();
  const clipboardState = createTimelineClipboardState();
  let previewControls = null;
  let timelineKeyframeDragHandler = null;
  const effectTimeline = createEffectTimelineAdapter({ getActor: actor, effectSelect });

  const {
    activeT: timelineActiveT,
    addKeyframe: addTimelineKeyframe,
    applySelection: applyTimelineSelectionCore,
    copyFrame: copyTimelineFrame,
    currentFrameValue: timelineCurrentFrameValue,
    deleteKeyframe: deleteTimelineKeyframe,
    frameCount: getFrameCount,
    frameSelectionState,
    hasFrameSelection: hasTimelineFrameSelection,
    isSectionOpen,
    keyframes: keyframesForTimeline,
    lastSlot: getLastSlot,
    minFrameCount,
    toSlot,
    slotToValue,
    slotToLeft,
    playbackControls,
    pasteFrame: pasteTimelineFrame,
    renderTimeline,
    resetAnimation: resetTimelineAnimation,
    resetSelectionState,
    selectKeyframe: selectTimelineKeyframe,
    selectKeyframeForDrag: selectTimelineKeyframeForDrag,
    selectSlot: selectTimelineSlot,
    setFixedFrame,
    defineController,
    updateSetting,
    writeFrameValue: timelineWriteFrameValue,
  } = createTimelineController({
    name: 'effect',
    core: {
      timeline: effectTimeline,
      selection: effectSelection,
      section: effectSection,
      durationInput: effectDuration,
      track: effectTimelineTrack,
      addButton: effectAddKeyframe,
      deleteButton: effectDeleteKeyframe,
      beginUndo: beginUndoSnapshot,
      commitUndo: commitUndoSnapshot,
      applySelected,
      isPlaying: () => previewControls?.isPlaying() || false,
      stopPreview,
      syncPreview,
      playPreview,
      renderSettings,
      selectSlot: (slot) => timelineSelectionCommands.selectSlot(slot),
      bindDrag: bindKeyframeDragHandler,
    },
  });

  function actor() {
    return getSelectedActor();
  }

  function renderFields() {
    ensureActiveFrame();
    renderTimeline();
    effectTimeline.ensureOffset();
    const editTarget = effectEditTarget();
    renderEffectImagePreview(effectImagePreview, effectTimeline.key(), effectAssets);
    clearEffectSupplementCards();
    effectFields.innerHTML = '';
    renderEditorDataCard(
      effectFields,
      { title: 'Property', className: 'property-editor-card', collapsible: false },
      (body) => {
        renderScrubGroups(body, effectPropertyGroups(), readDisplayValue, updateOffset, scrubCallbacks);
      }
    );
    renderAppliedModifierEditor(effectSupplementContainer(), {
      modifiers: effectModifiers(),
      onSettingChange: updateEffectModifierSetting,
      scrubCallbacks,
      targetKey: effectTimeline.key(),
      totalFrames: getFrameCount(),
    });

    renderInteractionEditor(effectSupplementContainer(), {
      frameValue: currentFrameValue(),
      targetKey: editTarget.targetKey,
      scrubCallbacks,
      onWrite: (prop, value, { rerender = true } = {}) => updateInteractionValue(prop, value, rerender),
    });

    renderModifierLibraryEditor(effectSupplementContainer(), {
      modifiers: effectModifiers(),
      onToggle: updateEffectModifierEnabled,
      onSettingChange: updateEffectModifierSetting,
      scrubCallbacks,
      targetKey: effectTimeline.key(),
    });
  }

  function effectSupplementContainer() {
    return effectFields.parentElement || effectFields;
  }

  function clearEffectSupplementCards() {
    const container = effectFields.parentElement;
    if (!container) return;
    Array.from(container.children).forEach((child) => {
      if (
        child.classList.contains('interaction-editor-card') ||
        child.classList.contains('modifier-applied-card') ||
        child.classList.contains('modifier-library-card')
      ) {
        child.remove();
      }
    });
  }

  function readDisplayValue(prop) {
    const editTarget = effectEditTarget();
    if (!isEffectEditTarget(editTarget)) return readEffectFrameDisplayValue(effectTimeline.key(), null, prop);
    const frame = currentFrameValue();
    return readEffectFrameDisplayValue(effectTimeline.key(), frame, prop);
  }

  function updateOffset(prop, value) {
    beginUndoSnapshot();
    stopPreview();
    effectTimeline.ensureOffset();
    const editTarget = effectEditTarget();
    if (!isEffectEditTarget(editTarget)) return readDisplayValue(prop);
    const frame = currentFrameValue();
    if (!frame) return readDisplayValue(prop);

    writeFrameValue(prop, effectFrameValueFromInput(effectTimeline.key(), prop, value));
    syncPreview();
    applySelected();
    return readDisplayValue(prop);
  }

  function updateInteractionValue(prop, value, rerender = true) {
    beginUndoSnapshot();
    stopPreview();
    effectTimeline.ensureOffset();
    const editTarget = effectEditTarget();
    if (!isEffectEditTarget(editTarget)) return readInteractionDisplayValue(null, prop);
    if (!currentFrameValue()) return readInteractionDisplayValue(null, prop);

    writeFrameValue(prop, interactionFrameValueFromInput(prop, value));
    syncPreview();
    applySelected();
    if (rerender) renderFields();
    return readInteractionDisplayValue(currentFrameValue(), prop);
  }

  function effectModifiers(key = effectTimeline.key()) {
    return ensureTimelineModifierTarget(actor().tuning, 'effect', key);
  }

  function updateEffectModifierEnabled(type, enabled, targetKey = effectTimeline.key()) {
    beginUndoSnapshot();
    writeTimelineModifierEnabled(actor().tuning, 'effect', targetKey, type, enabled);
    applySelected();
    if (targetKey === effectTimeline.key()) {
      replaceAppliedModifierEditor(effectSupplementContainer(), {
        modifiers: effectModifiers(targetKey),
        onSettingChange: updateEffectModifierSetting,
        scrubCallbacks,
        targetKey,
        totalFrames: getFrameCount(),
      });
    }
  }

  function updateEffectModifierSetting(type, prop, value, targetKey = effectTimeline.key()) {
    beginUndoSnapshot();
    const modifier = writeTimelineModifierSetting(actor().tuning, 'effect', targetKey, type, prop, value);
    applySelected();
    return modifier.settings?.[prop];
  }

  function currentFrameValue() {
    return timelineCurrentFrameValue({
      activeT: getActiveT(),
      setFixedFrame,
    });
  }

  function effectEditTarget() {
    return (
      getEditTarget?.(EDIT_CONTEXT_EFFECT) || {
        context: EDIT_CONTEXT_EFFECT,
        targetType: EDIT_TARGET_EFFECT,
        targetKey: EDIT_TARGET_EFFECT,
        writeTargetKey: EDIT_TARGET_EFFECT,
      }
    );
  }

  function isEffectEditTarget(editTarget) {
    return editTarget?.context === EDIT_CONTEXT_EFFECT && editTarget.writeTargetKey === EDIT_TARGET_EFFECT;
  }

  function writeFrameValue(prop, value) {
    if (!effectSelection.activeKeyframeId && !effectSelection.fixedFrame && effectSelection.selectedSlot !== null) {
      effectSelection.activeKeyframeId = createKeyframeAtSelectedSlot();
    }
    timelineWriteFrameValue({
      prop,
      value,
    });
  }

  function createKeyframeAtSelectedSlot() {
    const keyframes = keyframesForTimeline();
    const slot = isEmptyEditableSlot(effectSelection.selectedSlot, keyframes, getLastSlot(), toSlot)
      ? effectSelection.selectedSlot
      : null;
    if (slot === null) return null;
    const t = slotToValue(slot);
    const id = effectTimeline.addKeyframe(t);
    effectSelection.activeKeyframeId = id;
    effectSelection.fixedFrame = null;
    effectSelection.selectedSlot = slot;
    return id;
  }

  function renderSettings() {
    effectTimeline.ensureSettings();
    effectTimeline.ensureOffset();
    const settings = effectTimeline.settings();
    renderEffectTimelineSettingsView(elements, {
      settings,
      frameCount: getFrameCount(),
      playing: previewControls.isPlaying(),
      hasSelection: isSectionOpen(),
      hasCopiedFrame: clipboardState.has(),
      undoCount: undoState.undoCount,
      minFrameCount: minFrameCount(),
    });
  }

  const hasFrameSelection = () => hasTimelineFrameSelection({ requireOpenSection: true });

  previewControls = createTimelinePreviewControls({
    ensureSettings: effectTimeline.ensureSettings,
    resetSelection: resetSelectionState,
    syncPreview,
    settings: effectTimeline.settings,
    shouldAutoStop: (settings) => settings.playback === 'once',
  });

  const timelineFrameCommands = createTimelineFrameCommands({
    addTimelineKeyframe,
    deleteTimelineKeyframe,
    resetTimelineAnimation,
    copyTimelineFrame,
    pasteTimelineFrame,
    resetSelectionState,
    clipboardState,
    stopPreview,
    finishAdd: finishTimelineMutation,
    finishDelete: finishTimelineMutation,
    finishReset: finishTimelineMutation,
    finishPaste: finishTimelineMutation,
    createFrameCopy: () =>
      effectTimeline.copyFrame({
        isOpen: isSectionOpen(),
        selection: effectSelection,
        fallbackFrame: currentFrameValue(),
      }),
    pasteTargetFrameId: () =>
      effectTimeline.pasteTargetFrameId({
        selection: effectSelection,
        slotToValue,
      }),
    pasteFrameCopy: (id) =>
      effectTimeline.pasteFrameCopy({
        copiedFrame: clipboardState.get(),
        id,
      }),
    afterCopy: renderSettings,
  });

  const timelineSelectionCommands = createTimelineSelectionCommands({
    selectTimelineKeyframe,
    selectTimelineSlot,
    setContext: () => setEditContext('effect'),
    applySelection: applyTimelineSelection,
  });

  timelineKeyframeDragHandler = createTimelineKeyframeDragHandler({
    selectionCommands: timelineSelectionCommands,
    selectKeyframeForDrag: selectTimelineKeyframeForDrag,
    beginUndo: beginUndoSnapshot,
    commitUndo: commitUndoSnapshot,
    track: effectTimelineTrack,
    frameCount: getFrameCount,
    lastSlot: getLastSlot,
    keyframes: keyframesForTimeline,
    toSlot,
    slotToValue,
    moveKeyframe: (dragId, nextT) => effectTimeline.moveKeyframe(dragId, nextT),
    applySelected,
    setDragPreview: effectTimeline.setDragPreview,
    slotToLeft,
    stopPreview,
    getActiveT,
    afterFinish: renderFields,
  });

  function playPreview() {
    previewControls.playPreview();
  }

  function stopPreview() {
    previewControls.stopPreview();
  }

  function finishTimelineMutation() {
    finishTimelineMutationAction({
      renderFields,
      syncPreview,
      applySelected,
      commitUndo: commitUndoSnapshot,
    });
  }

  function ensureActiveFrame() {
    effectTimeline.ensureOffset();
    if (!hasTimelineFrameSelection()) setFixedFrame('start');
  }

  function clearSelection() {
    stopPreview();
    resetSelectionState();
    clearActorEffectPreviews(actors);
    renderFields();
  }

  function clearCopiedFrame() {
    clipboardState.clear();
  }

  function applyTimelineSelection(nextSelection) {
    applyTimelineSelectionCore({
      nextSelection,
      renderFields,
    });
  }

  function bindKeyframeDragHandler(button, id) {
    timelineKeyframeDragHandler?.(button, id);
  }

  function getActiveT() {
    return timelineActiveT();
  }

  function syncPreview() {
    const selectionState = frameSelectionState();
    syncEffectTimelinePreview({
      actors,
      actor: actor(),
      section: effectSection,
      playbackButton: effectPlayback,
      renderTimeline,
      playing: previewControls.isPlaying(),
      activeKeyframeId: selectionState.activeKeyframeId,
      fixedFrame: selectionState.fixedFrame,
      selectedSlot: selectionState.selectedSlot,
      createPreview: effectTimeline.createPreview,
      getActiveT,
    });
  }

  return defineController({
    common: createTimelineControllerCommonApi({
      playbackControls,
      timelineFrameCommands,
      hasFrameSelection,
      resetSelectionState,
      stopPreview,
      syncPreview,
      updateSetting,
    }),
    extensions: {
      clearCopiedFrame,
      clearSelection,
      currentFrameValue,
      ensureActiveFrame,
      renderFields,
      writeFrameValue,
    },
  });
}
