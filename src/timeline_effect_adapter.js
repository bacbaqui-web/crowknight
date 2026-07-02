import { effectKeyframesFor, ensureEffectOffset, ensureEffectSettings } from './project_data_normalizer.js';
import {
  addEffectTimelineKeyframe,
  deleteEffectTimelineKeyframe,
  ensureEffectTimelineKeyframe,
  moveEffectTimelineKeyframe,
  resetEffectTimelineAnimation,
  writeEffectTimelineFrameValue,
} from './timeline_keyframe_helper.js';
import { preserveTimelineKeyframeSlots, writeEffectTimelineSetting } from './timeline_settings_helper.js';
import { createEffectPreview } from './preview_state.js';
import { defineTimelineAdapter } from './timeline_adapter_contract.js';
import { activeTimelineT } from './timeline_state.js';
import { currentEffectTimelineFrame } from './timeline_frame_reader.js';
import {
  copyActiveEffectTimelineFrame,
  pasteEffectTimelineFrameCopy,
  timelinePasteTargetFrameId,
} from './timeline_clipboard_helper.js';

export function createEffectTimelineAdapter({ getActor, effectSelect }) {
  const key = () => effectSelect.value;
  const tuning = () => getActor().tuning;

  function ensureSettings() {
    ensureEffectSettings(tuning());
  }

  function settingsByKey() {
    return tuning().effectSettings;
  }

  function settings() {
    return tuning().effectSettings[key()];
  }

  function ensureOffset() {
    ensureEffectOffset(tuning(), key());
  }

  function offset() {
    return tuning().effectOffsets[key()];
  }

  function keyframes() {
    ensureOffset();
    return effectKeyframesFor(offset(), key());
  }

  function selectedKeyframe(id) {
    ensureOffset();
    return offset()?.keyframes?.find((frame) => frame.id === id);
  }

  function activeT({ selection, frameCount }) {
    return activeTimelineT({
      activeKeyframeId: selection.activeKeyframeId,
      selectedSlot: selection.selectedSlot,
      fixedFrame: selection.fixedFrame,
      keyframes: keyframes(),
      selectedKeyframe: selectedKeyframe(selection.activeKeyframeId),
      frameCount,
    });
  }

  function currentFrameValue({ selection, activeT, setFixedFrame }) {
    return currentEffectTimelineFrame({
      tuning: tuning(),
      effectKey: key(),
      activeKeyframeId: selection.activeKeyframeId,
      fixedFrame: selection.fixedFrame,
      selectedSlot: selection.selectedSlot,
      activeT,
      ensureKeyframe,
      setFixedFrame,
    });
  }

  function addKeyframe(t) {
    return addEffectTimelineKeyframe(tuning(), key(), t);
  }

  function deleteKeyframe(id) {
    return deleteEffectTimelineKeyframe(tuning(), key(), id);
  }

  function moveKeyframe(id, t) {
    return moveEffectTimelineKeyframe(tuning(), key(), id, t);
  }

  function resetAnimation() {
    resetEffectTimelineAnimation(tuning(), key());
  }

  function ensureKeyframe(effectOrId, maybeId) {
    const id = maybeId ?? effectOrId;
    const effect = maybeId === undefined ? offset() : effectOrId;
    return ensureEffectTimelineKeyframe(effect, key(), id, keyframes());
  }

  function writeFrameValue({ prop, value, selection }) {
    return writeEffectTimelineFrameValue({
      effect: offset(),
      effectKey: key(),
      prop,
      value,
      activeKeyframeId: selection.activeKeyframeId,
      fixedFrame: selection.fixedFrame,
      ensureKeyframe,
    });
  }

  function writeSetting(prop, value) {
    writeEffectTimelineSetting(settingsByKey(), key(), prop, value);
  }

  function preserveKeyframeSlots(oldFrameCount, nextFrameCount) {
    ensureEffectOffset(tuning(), key());
    preserveTimelineKeyframeSlots(effectKeyframesFor(offset(), key()), oldFrameCount, nextFrameCount);
  }

  function createPreview({ playing = false, t = null } = {}) {
    return createEffectPreview({
      key: key(),
      playing,
      t,
      now: performance.now(),
    });
  }

  function setDragPreview(t) {
    getActor().player.effectPreview = createPreview({ playing: false, t });
  }

  function copyFrame({ isOpen, selection, fallbackFrame }) {
    return copyActiveEffectTimelineFrame({
      isOpen,
      effectKey: key(),
      id: selection.activeKeyframeId || selection.fixedFrame,
      keyframes: keyframes(),
      fallbackFrame,
    });
  }

  function pasteFrameCopy({ copiedFrame, id }) {
    return pasteEffectTimelineFrameCopy({
      copiedEffectFrame: copiedFrame,
      effect: offset(),
      effectKey: key(),
      id,
      ensureKeyframe,
    });
  }

  function pasteTargetFrameId({ selection, slotToValue }) {
    return timelinePasteTargetFrameId({
      selection,
      keyframes: keyframes(),
      slotToValue,
      addKeyframe,
      defaultFrameId: 'start',
    });
  }

  return defineTimelineAdapter(
    'effect',
    {
      activeT,
      addKeyframe,
      copyFrame,
      createPreview,
      currentFrameValue,
      deleteKeyframe,
      ensureKeyframe,
      ensureSettings,
      key,
      keyframes,
      moveKeyframe,
      resetAnimation,
      setDragPreview,
      settings,
      settingsByKey,
      pasteFrameCopy,
      pasteTargetFrameId,
      preserveKeyframeSlots,
      writeFrameValue,
      writeSetting,
    },
    {
      ensureOffset,
      offset,
      selectedKeyframe,
    }
  );
}
