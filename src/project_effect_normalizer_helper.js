import {
  defaultEffectImageKey,
  effectFrameValue,
  interpolateEffectFrameValues,
  normalizeEffectFileName,
  syncFrameAliases,
  validEffectImageKey,
} from './animation_frame_data.js';
import { DEFAULT_PLAYER_TUNING } from './player_default_tuning_data.js';
import { normalizeTimelinePlayback } from './timeline_playback_helper.js';
import { clamp } from './common_helper.js';
import { sortActionKeyframes, makeActionKeyframeId } from './project_action_normalizer_helper.js';
import { actionKeysForNormalize } from './project_keys_normalizer_helper.js';

export function normalizeEffectSettings(current = {}, fallback = {}, customActions = [], deletedActionKeys = []) {
  const normalized = {};
  actionKeysForNormalize(customActions, deletedActionKeys).forEach((key) => {
    const source = current?.[key] || {};
    const base = fallback?.[key] || {};
    normalized[key] = {
      duration: clamp(Number(source.duration ?? base.duration ?? 0.4), 0.05, 5),
      fileName: normalizeEffectFileName(source.fileName ?? base.fileName ?? ''),
      playback: normalizeTimelinePlayback(source.playback ?? base.playback, 'once'),
      playbackRate: clamp(Number(source.playbackRate ?? base.playbackRate ?? 1), 0.1, 4),
    };
  });
  return normalized;
}

export function normalizeEffectOffsets(current = {}, customActions = [], deletedActionKeys = []) {
  const normalized = {};
  actionKeysForNormalize(customActions, deletedActionKeys).forEach((key) => {
    normalized[key] = normalizeEffectOffsetForKey(key, current?.[key]);
  });
  return normalized;
}

export function normalizeEffectOffsetForKey(key, source = {}) {
  const fallback = effectFrameValue({}, key);
  const image = validEffectImageKey(source.image) ? source.image : defaultEffectImageKey(key);
  const normalized = {
    image,
    start: effectFrameValue(source.start || fallback, key),
    end: effectFrameValue(source.end || fallback, key),
    keyframes: normalizeEffectKeyframes(source.keyframes, source.start || fallback, source.end || fallback, key),
  };
  syncFrameAliases(normalized);
  return normalized;
}

export function normalizeEffectKeyframes(keyframes, start, end, key) {
  const middle = Array.isArray(keyframes)
    ? keyframes
        .filter((frame) => frame && frame.id !== 'start' && frame.id !== 'end')
        .map((frame) => ({
          id: typeof frame.id === 'string' && frame.id ? frame.id : makeActionKeyframeId(),
          t: clamp(Number(frame.t ?? 0.5), 0.03, 0.97),
          ...effectFrameValue(frame, key),
        }))
    : [];

  const frames = [
    { id: 'start', t: 0, ...effectFrameValue(start, key) },
    ...middle,
    { id: 'end', t: 1, ...effectFrameValue(end, key) },
  ];
  sortActionKeyframes(frames);
  return frames;
}

export function ensureEffectOffset(tuning, key) {
  tuning.effectOffsets ||= normalizeEffectOffsets({}, tuning.customActions || [], tuning.deletedActionKeys || []);
  tuning.effectOffsets[key] = normalizeEffectOffsetForKey(key, tuning.effectOffsets[key]);
}

export function ensureEffectSettings(tuning) {
  tuning.effectSettings = normalizeEffectSettings(
    tuning.effectSettings,
    DEFAULT_PLAYER_TUNING.effectSettings || DEFAULT_PLAYER_TUNING.actionSettings,
    tuning.customActions || [],
    tuning.deletedActionKeys || []
  );
}

export function effectFrameAt(tuning, key, t = 0) {
  ensureEffectOffset(tuning, key);
  const effect = tuning.effectOffsets[key];
  const frame = interpolateEffectFrameValues(effectKeyframesFor(effect, key), clamp(Number(t), 0, 1), key);
  return {
    ...frame,
    image: validEffectImageKey(effect.image) ? effect.image : defaultEffectImageKey(key),
  };
}

export function effectKeyframesFor(effect, key) {
  effect.keyframes = normalizeEffectKeyframes(effect.keyframes, effect.start, effect.end, key);
  syncFrameAliases(effect);
  return effect.keyframes;
}
