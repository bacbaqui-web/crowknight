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

  return {
    addKeyframe,
    deleteKeyframe,
    ensureOffset,
    ensureKeyframe,
    ensureSettings,
    key,
    keyframes,
    moveKeyframe,
    offset,
    resetAnimation,
    selectedKeyframe,
    settings,
    settingsByKey,
    writeFrameValue,
    writeSetting,
  };
}
