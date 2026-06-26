import { effectKeyframesFor, ensureEffectOffset, ensureEffectSettings } from './tuningNormalize.js';

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

  return {
    ensureOffset,
    ensureSettings,
    key,
    keyframes,
    offset,
    settings,
    settingsByKey,
  };
}
