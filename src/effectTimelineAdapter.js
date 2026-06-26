import { effectKeyframesFor, ensureEffectOffset, ensureEffectSettings } from './tuningNormalize.js';
import {
  addEffectTimelineKeyframe,
  deleteEffectTimelineKeyframe,
  ensureEffectTimelineKeyframe,
  moveEffectTimelineKeyframe,
  resetEffectTimelineAnimation,
  writeEffectTimelineFrameValue,
} from './timelineKeyframeMutations.js';
import { writeEffectTimelineSetting } from './tuningTimelineSettings.js';
import { createEffectPreview } from './previewState.js';
import { defineTimelineAdapter } from './timelineAdapterContract.js';
import { activeTimelineT } from './timelineState.js';
import {
  copyActiveEffectTimelineFrame,
  pasteEffectTimelineFrameCopy,
  timelinePasteTargetFrameId,
} from './timelineFrameClipboard.js';

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

  function writeFrameValue({ prop, value, activeKeyframeId, fixedFrame }) {
    return writeEffectTimelineFrameValue({
      effect: offset(),
      effectKey: key(),
      prop,
      value,
      activeKeyframeId,
      fixedFrame,
      ensureKeyframe,
    });
  }

  function writeSetting(prop, value) {
    writeEffectTimelineSetting(settingsByKey(), key(), prop, value);
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

  function copyFrame({ isOpen, id, fallbackFrame }) {
    return copyActiveEffectTimelineFrame({
      isOpen,
      effectKey: key(),
      id,
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
