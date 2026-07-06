import { ACTION_FPS, ACTION_MAX_FRAMES, ACTION_MIN_FRAMES } from './game_config_data.js';
import { clamp } from './common_helper.js';

export const TIMELINE_PLAYBACK_RATE_MIN = 0.1;
export const TIMELINE_PLAYBACK_RATE_MAX = 4;
export const TIMELINE_PLAYBACK_MODES = ['once', 'loop', 'pingpong'];

const TIMELINE_PLAYBACK_TITLES = {
  once: '한 번 재생',
  loop: '반복 재생',
  pingpong: '왕복 재생',
};

export function timelineFrameCount(settings = {}) {
  return clamp(Math.round(Number(settings.duration || 0.2) * ACTION_FPS), ACTION_MIN_FRAMES, ACTION_MAX_FRAMES);
}

export function timelineDurationFromFrames(value) {
  return clamp(Math.round(Number(value)), ACTION_MIN_FRAMES, ACTION_MAX_FRAMES) / ACTION_FPS;
}

export function timelineFrameDelta(dt) {
  return Math.max(0, Number(dt || 0)) * ACTION_FPS;
}

export function clampTimelinePlaybackRate(value) {
  return clamp(Number(value), TIMELINE_PLAYBACK_RATE_MIN, TIMELINE_PLAYBACK_RATE_MAX);
}

export function normalizeTimelinePlayback(value, fallback = 'once') {
  const next = String(value || '');
  if (TIMELINE_PLAYBACK_MODES.includes(next)) return next;
  return TIMELINE_PLAYBACK_MODES.includes(fallback) ? fallback : 'once';
}

export function nextTimelinePlayback(value) {
  const current = normalizeTimelinePlayback(value, 'once');
  const index = TIMELINE_PLAYBACK_MODES.indexOf(current);
  return TIMELINE_PLAYBACK_MODES[(index + 1) % TIMELINE_PLAYBACK_MODES.length];
}

export function timelinePlaybackTitle(value) {
  return TIMELINE_PLAYBACK_TITLES[normalizeTimelinePlayback(value)] || TIMELINE_PLAYBACK_TITLES.once;
}

export function timelinePlaybackProgress(raw, playback) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  const mode = normalizeTimelinePlayback(playback, 'once');
  if (mode === 'loop') return positiveModulo(value, 1);
  if (mode === 'pingpong') {
    const cycle = positiveModulo(value, 2);
    return cycle <= 1 ? cycle : 2 - cycle;
  }
  return clamp(value, 0, 1);
}

export function previewTimeoutMs(settings = {}) {
  const duration = Number(settings.duration || 0.2);
  const playbackRate = Math.max(TIMELINE_PLAYBACK_RATE_MIN, Number(settings.playbackRate || 1));
  return Math.max(50, (duration / playbackRate) * 1000);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
