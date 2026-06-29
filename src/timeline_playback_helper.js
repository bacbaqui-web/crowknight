import { POSE_FPS, POSE_MAX_FRAMES, POSE_MIN_FRAMES } from './game_config.js';
import { clamp } from './utils.js';

export const TIMELINE_PLAYBACK_RATE_MIN = 0.1;
export const TIMELINE_PLAYBACK_RATE_MAX = 4;

export function timelineFrameCount(settings = {}) {
  return clamp(Math.round(Number(settings.duration || 0.2) * POSE_FPS), POSE_MIN_FRAMES, POSE_MAX_FRAMES);
}

export function timelineDurationFromFrames(value) {
  return clamp(Math.round(Number(value)), POSE_MIN_FRAMES, POSE_MAX_FRAMES) / POSE_FPS;
}

export function clampTimelinePlaybackRate(value) {
  return clamp(Number(value), TIMELINE_PLAYBACK_RATE_MIN, TIMELINE_PLAYBACK_RATE_MAX);
}

export function previewTimeoutMs(settings = {}) {
  const duration = Number(settings.duration || 0.2);
  const playbackRate = Math.max(TIMELINE_PLAYBACK_RATE_MIN, Number(settings.playbackRate || 1));
  return Math.max(50, (duration / playbackRate) * 1000);
}
