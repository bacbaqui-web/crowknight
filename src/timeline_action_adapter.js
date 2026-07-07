import { ensureActionOffset, ensureActionSettings, actionKeyframesFor } from './project_data_normalizer_helper.js';
import { partPositionSources } from './part_source_data.js';
import {
  addActionTimelineKeyframe,
  applyActionTimelineAllFrameValueDelta,
  applyActionTimelineAllFrameValueTransform,
  applyActionTimelineFrameValueDelta,
  deleteActionTimelineKeyframe,
  ensureActionTimelineKeyframe,
  moveActionTimelineKeyframe,
  resetActionTimelineAnimation,
  writeActionTimelineFrameValue,
} from './timeline_keyframe_helper.js';
import { preserveTimelineKeyframeSlots, writeActionTimelineSetting } from './timeline_settings_helper.js';
import { ACTION_PART_KEYS } from './game_config_data.js';
import { isMasterPart } from './editor_label_helper.js';
import { createActionPreview } from './preview_state.js';
import { defineTimelineAdapter } from './timeline_adapter_contract_helper.js';
import { timelineFrameCountFor } from './timeline_state.js';
import { currentActionTimelineFrame } from './timeline_frame_reader.js';
import {
  actionTimelinePasteTargetFrameId,
  copyActiveActionTimelineFrame,
  pasteActionTimelineFrameCopy,
} from './timeline_clipboard_helper.js';
import {
  actionKeyframeTargetT,
  legacySelectionFromActionKeyframeId,
  resolveActionKeyframeTarget,
} from './action_keyframe_target_helper.js';

export function createActionTimelineAdapter({ getActor, actionSelect }) {
  const key = () => actionSelect.value;
  const tuning = () => getActor().tuning;

  function ensureSettings() {
    ensureActionSettings(tuning());
  }

  function settingsByKey() {
    return tuning().actionSettings;
  }

  function settings() {
    return tuning().actionSettings[key()];
  }

  function ensureOffset(part) {
    if (tuning().actionOffsets?.[key()]?.[part]) return;
    ensureActionOffset(tuning(), key(), part);
  }

  function offset(part) {
    return tuning().actionOffsets[key()]?.[part];
  }

  function source(part) {
    return partPositionSources(tuning().rig)[part] || {};
  }

  function keyframes() {
    ensureOffset(ACTION_PART_KEYS[0]);
    return actionKeyframesFor(offset(ACTION_PART_KEYS[0]));
  }

  function selectedKeyframe(part, id) {
    return offset(part)?.keyframes?.find((frame) => frame.id === id);
  }

  function activeT({ selection, frameCount, activeActionPartKey = null }) {
    return actionKeyframeTargetT(actionKeyframeTarget(selection, frameCount, activeActionPartKey)) ?? 0;
  }

  function currentFrameValue({ part, selection }) {
    const target = actionKeyframeTarget(selection);
    return currentActionTimelineFrame({
      tuning: tuning(),
      actionKey: key(),
      part,
      actionKeyframeTarget: target,
      isMasterPart: isMasterPart(part),
      ensureKeyframe,
    });
  }

  function addKeyframe(t) {
    return addActionTimelineKeyframe(tuning(), key(), t);
  }

  function deleteKeyframe(id) {
    deleteActionTimelineKeyframe(tuning(), key(), id);
  }

  function moveKeyframe(id, t) {
    return moveActionTimelineKeyframe(tuning(), key(), id, t);
  }

  function applyFrameValueDelta(part, prop, delta) {
    ensureActionOffset(tuning(), key(), part);
    return applyActionTimelineFrameValueDelta(tuning(), key(), part, prop, delta);
  }

  function applyAllFrameValueDelta(prop, delta, parts) {
    return applyActionTimelineAllFrameValueDelta(tuning(), key(), prop, delta, parts);
  }

  function applyAllFrameValueTransform(prop, transformValue, parts) {
    return applyActionTimelineAllFrameValueTransform(tuning(), key(), prop, transformValue, parts);
  }

  function resetAnimation() {
    resetActionTimelineAnimation(tuning(), key());
  }

  function ensureKeyframe(frames, id) {
    return ensureActionTimelineKeyframe(frames, id, keyframes());
  }

  function writeFrameValue({ part, prop, value, selection }) {
    const target = actionKeyframeTarget(selection);
    return writeActionTimelineFrameValue({
      frames: offset(part),
      prop,
      value,
      actionKeyframeTarget: target,
      allowRootAnchorWrite: isMasterPart(part),
      ensureKeyframe,
    });
  }

  function writeSetting(prop, value) {
    writeActionTimelineSetting(settingsByKey(), key(), prop, value);
  }

  function preserveKeyframeSlots(oldFrameCount, nextFrameCount) {
    ACTION_PART_KEYS.forEach((part) => {
      ensureActionOffset(tuning(), key(), part);
      preserveTimelineKeyframeSlots(actionKeyframesFor(offset(part)), oldFrameCount, nextFrameCount);
    });
  }

  function createPreview({ fixedFrame = null, playing = false, playback = null, t = null } = {}) {
    return createActionPreview({
      action: key(),
      fixedFrame,
      playing,
      playback,
      t,
      now: performance.now(),
    });
  }

  function setDragPreview(t) {
    getActor().player.actionPreview = createPreview({ playing: false, t });
  }

  function resetPreviewClock() {
    const actor = getActor();
    actor.player.stateTime = 0;
    actor.player.animTime = 0;
  }

  function copyFrame({ isOpen, selection, selectedActionParts, activeActionPartKey }) {
    const target = actionKeyframeTarget(selection);
    return copyActiveActionTimelineFrame({
      isOpen,
      actionKeyframeTarget: target,
      keyframes: keyframes(),
      tuning: tuning(),
      actionKey: key(),
      selectedActionParts,
      activeActionPartKey,
    });
  }

  function pasteFrameCopy({ copiedFrame, id, selectedActionParts, activeActionPartKey }) {
    return pasteActionTimelineFrameCopy({
      copiedActionFrame: copiedFrame,
      id,
      tuning: tuning(),
      actionKey: key(),
      selectedActionParts,
      activeActionPartKey,
      ensureKeyframe,
    });
  }

  function pasteTargetFrameId({ selection }) {
    const target = actionKeyframeTarget(selection);
    const id = actionTimelinePasteTargetFrameId({
      actionKeyframeTarget: target,
      addKeyframe,
    });
    if (id) {
      Object.assign(
        selection,
        legacySelectionFromActionKeyframeId({
          id,
          selectedSlot: target.selectedSlot,
          keyframes: keyframes(),
          frameCount: timelineFrameCountFor(settingsByKey(), key()),
        })
      );
    }
    return id;
  }

  function actionKeyframeTarget(selection, frameCount = timelineFrameCountFor(settingsByKey(), key()), part = null) {
    return resolveActionKeyframeTarget({
      selection,
      keyframes: actionKeyframesForPart(part),
      frameCount,
    });
  }

  function actionKeyframesForPart(part) {
    if (!part) return keyframes();
    ensureOffset(part);
    return actionKeyframesFor(offset(part));
  }

  return defineTimelineAdapter(
    'action',
    {
      activeT,
      addKeyframe,
      applyAllFrameValueDelta,
      applyAllFrameValueTransform,
      applyFrameValueDelta,
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
      resetPreviewClock,
      selectedKeyframe,
      source,
      tuning,
    }
  );
}
