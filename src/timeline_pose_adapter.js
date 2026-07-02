import { ensurePoseOffset, ensurePoseSettings, poseKeyframesFor } from './project_data_normalizer.js';
import { partPositionSources } from './part_source_registry.js';
import {
  addPoseTimelineKeyframe,
  applyPoseTimelineAllFrameValueDelta,
  applyPoseTimelineAllFrameValueTransform,
  applyPoseTimelineFrameValueDelta,
  deletePoseTimelineKeyframe,
  ensurePoseTimelineKeyframe,
  movePoseTimelineKeyframe,
  resetPoseTimelineAnimation,
  writePoseTimelineFrameValue,
} from './timeline_keyframe_helper.js';
import { preserveTimelineKeyframeSlots, writePoseTimelineSetting } from './timeline_settings_helper.js';
import { POSE_PART_KEYS } from './game_config.js';
import { isMasterPart } from './editor_label_helper.js';
import { createPosePreview } from './preview_state.js';
import { defineTimelineAdapter } from './timeline_adapter_contract.js';
import { activeTimelineT } from './timeline_state.js';
import { currentPoseTimelineFrame } from './timeline_frame_reader.js';
import {
  copyActivePoseTimelineFrame,
  pastePoseTimelineFrameCopy,
  timelinePasteTargetFrameId,
} from './timeline_clipboard_helper.js';

export function createPoseTimelineAdapter({ getActor, poseSelect }) {
  const key = () => poseSelect.value;
  const tuning = () => getActor().tuning;

  function ensureSettings() {
    ensurePoseSettings(tuning());
  }

  function settingsByKey() {
    return tuning().poseSettings;
  }

  function settings() {
    return tuning().poseSettings[key()];
  }

  function ensureOffset(part) {
    ensurePoseOffset(tuning(), key(), part);
  }

  function offset(part) {
    return tuning().poseOffsets[key()]?.[part];
  }

  function source(part) {
    return partPositionSources(tuning().rig)[part] || {};
  }

  function keyframes() {
    ensureOffset(POSE_PART_KEYS[0]);
    return poseKeyframesFor(offset(POSE_PART_KEYS[0]));
  }

  function selectedKeyframe(part, id) {
    return offset(part)?.keyframes?.find((frame) => frame.id === id);
  }

  function activeT({ selection, frameCount, activePosePartKey = null }) {
    const part = activePosePartKey || POSE_PART_KEYS[0];
    return activeTimelineT({
      activeKeyframeId: selection.activeKeyframeId,
      selectedSlot: selection.selectedSlot,
      fixedFrame: selection.fixedFrame,
      keyframes: keyframes(),
      selectedKeyframe: selection.activeKeyframeId ? selectedKeyframe(part, selection.activeKeyframeId) : null,
      frameCount,
    });
  }

  function currentFrameValue({ part, selection }) {
    return currentPoseTimelineFrame({
      tuning: tuning(),
      poseKey: key(),
      part,
      activeKeyframeId: selection.activeKeyframeId,
      fixedFrame: selection.fixedFrame,
      isMasterPart: isMasterPart(part),
      ensureKeyframe,
    });
  }

  function addKeyframe(t) {
    return addPoseTimelineKeyframe(tuning(), key(), t);
  }

  function deleteKeyframe(id) {
    deletePoseTimelineKeyframe(tuning(), key(), id);
  }

  function moveKeyframe(id, t) {
    return movePoseTimelineKeyframe(tuning(), key(), id, t);
  }

  function applyFrameValueDelta(part, prop, delta) {
    ensurePoseOffset(tuning(), key(), part);
    return applyPoseTimelineFrameValueDelta(tuning(), key(), part, prop, delta);
  }

  function applyAllFrameValueDelta(prop, delta, parts) {
    return applyPoseTimelineAllFrameValueDelta(tuning(), key(), prop, delta, parts);
  }

  function applyAllFrameValueTransform(prop, transformValue, parts) {
    return applyPoseTimelineAllFrameValueTransform(tuning(), key(), prop, transformValue, parts);
  }

  function resetAnimation() {
    resetPoseTimelineAnimation(tuning(), key());
  }

  function ensureKeyframe(frames, id) {
    return ensurePoseTimelineKeyframe(frames, id, keyframes());
  }

  function writeFrameValue({ part, prop, value, selection }) {
    return writePoseTimelineFrameValue({
      frames: offset(part),
      prop,
      value,
      activeKeyframeId: selection.activeKeyframeId,
      fixedFrame: selection.fixedFrame,
      allowRootAnchorWrite: isMasterPart(part),
      ensureKeyframe,
    });
  }

  function writeSetting(prop, value) {
    writePoseTimelineSetting(settingsByKey(), key(), prop, value);
  }

  function preserveKeyframeSlots(oldFrameCount, nextFrameCount) {
    POSE_PART_KEYS.forEach((part) => {
      ensurePoseOffset(tuning(), key(), part);
      preserveTimelineKeyframeSlots(poseKeyframesFor(offset(part)), oldFrameCount, nextFrameCount);
    });
  }

  function createPreview({ fixedFrame = null, playing = false, loop = false, t = null } = {}) {
    return createPosePreview({
      pose: key(),
      fixedFrame,
      playing,
      loop,
      t,
      now: performance.now(),
    });
  }

  function setDragPreview(t) {
    getActor().player.posePreview = createPreview({ playing: false, t });
  }

  function resetPreviewClock() {
    const actor = getActor();
    actor.player.stateTime = 0;
    actor.player.animTime = 0;
  }

  function copyFrame({ isOpen, selection, selectedPoseParts, activePosePartKey }) {
    return copyActivePoseTimelineFrame({
      isOpen,
      activeKeyframeId: selection.activeKeyframeId,
      fixedFrame: selection.fixedFrame,
      keyframes: keyframes(),
      tuning: tuning(),
      poseKey: key(),
      selectedPoseParts,
      activePosePartKey,
    });
  }

  function pasteFrameCopy({ copiedFrame, id, selectedPoseParts, activePosePartKey }) {
    return pastePoseTimelineFrameCopy({
      copiedPoseFrame: copiedFrame,
      id,
      tuning: tuning(),
      poseKey: key(),
      selectedPoseParts,
      activePosePartKey,
      ensureKeyframe,
    });
  }

  function pasteTargetFrameId({ selection, slotToValue }) {
    return timelinePasteTargetFrameId({
      selection,
      keyframes: keyframes(),
      slotToValue,
      addKeyframe,
    });
  }

  return defineTimelineAdapter(
    'pose',
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
