import {
  clearActorEffectPreviews,
  clearActorActionPreviews,
  shouldPreviewEffect,
  shouldPreviewAction,
} from './preview_state.js';
import { renderInactivePreviewTimeline } from './editor_panel_dom_helper.js';
import { previewTimeoutMs } from './timeline_playback_helper.js';

export function syncActionTimelinePreview({
  actors,
  actor,
  section,
  playbackButton,
  renderTimeline,
  playing,
  activeKeyframeId,
  fixedFrame,
  selectedSlot,
  settings,
  createPreview,
  getActiveT,
}) {
  syncTimelinePreview({
    actors,
    section,
    playbackButton,
    renderTimeline,
    playing,
    activeKeyframeId,
    fixedFrame,
    selectedSlot,
    clearPreviews: clearActorActionPreviews,
    shouldPreview: shouldPreviewAction,
    assignPreview: () => {
      actor.player.actionPreview = createPreview({
        fixedFrame: activeKeyframeId ? null : fixedFrame,
        playing,
        playback: settings.playback,
        t: activeKeyframeId || selectedSlot !== null ? getActiveT() : null,
      });
    },
  });
}

export function syncEffectTimelinePreview({
  actors,
  actor,
  section,
  playbackButton,
  renderTimeline,
  playing,
  activeKeyframeId,
  fixedFrame,
  selectedSlot,
  createPreview,
  getActiveT,
}) {
  syncTimelinePreview({
    actors,
    section,
    playbackButton,
    renderTimeline,
    playing,
    activeKeyframeId,
    fixedFrame,
    selectedSlot,
    clearPreviews: clearActorEffectPreviews,
    shouldPreview: shouldPreviewEffect,
    assignPreview: () => {
      actor.player.effectPreview = createPreview({ playing, t: playing ? null : getActiveT() });
    },
  });
}

function syncTimelinePreview({
  actors,
  section,
  playbackButton,
  renderTimeline,
  playing,
  activeKeyframeId,
  fixedFrame,
  selectedSlot,
  clearPreviews,
  shouldPreview,
  assignPreview,
}) {
  clearPreviews(actors);
  if (!section.classList.contains('is-open')) {
    renderInactivePreviewTimeline(playbackButton, renderTimeline);
    return;
  }

  const hasPreview = shouldPreview({
    playing,
    activeKeyframeId,
    fixedFrame,
    selectedSlot,
  });
  if (!hasPreview) {
    renderInactivePreviewTimeline(playbackButton, renderTimeline);
    return;
  }

  assignPreview();
  renderTimeline();
}

export function restartTimelinePreviewTimer({ timer, settings, shouldAutoStop, onStop }) {
  stopPreviewTimer(timer);
  return shouldAutoStop ? schedulePreviewStop(settings, onStop) : null;
}

export function clearTimelinePreviewTimer(timer) {
  return stopPreviewTimer(timer);
}

export function createTimelinePreviewControls({
  ensureSettings,
  resetSelection,
  beforeSync = null,
  syncPreview,
  settings,
  shouldAutoStop,
}) {
  let playing = false;
  let timer = null;

  return {
    isPlaying: () => playing,
    playPreview() {
      startTimelinePreview({
        timer,
        setTimer: (nextTimer) => {
          timer = nextTimer;
        },
        setPlaying: (nextPlaying) => {
          playing = nextPlaying;
        },
        ensureSettings,
        resetSelection,
        beforeSync,
        syncPreview,
        settings,
        shouldAutoStop,
      });
    },
    stopPreview() {
      stopTimelinePreview({
        timer,
        setTimer: (nextTimer) => {
          timer = nextTimer;
        },
        setPlaying: (nextPlaying) => {
          playing = nextPlaying;
        },
      });
    },
  };
}

export function startTimelinePreview({
  timer,
  setTimer,
  setPlaying,
  ensureSettings,
  resetSelection,
  beforeSync = null,
  syncPreview,
  settings,
  shouldAutoStop,
}) {
  ensureSettings();
  setPlaying(true);
  resetSelection();
  beforeSync?.();
  syncPreview();

  const currentSettings = settings();
  setTimer(
    restartTimelinePreviewTimer({
      timer,
      settings: currentSettings,
      shouldAutoStop: shouldAutoStop(currentSettings),
      onStop: () => {
        setPlaying(false);
        setTimer(null);
        syncPreview();
      },
    })
  );
}

export function stopTimelinePreview({ timer, setTimer, setPlaying }) {
  setTimer(clearTimelinePreviewTimer(timer));
  setPlaying(false);
}

function schedulePreviewStop(settings, onStop) {
  return setTimeout(onStop, previewTimeoutMs(settings));
}

function stopPreviewTimer(timer) {
  clearTimeout(timer);
  return null;
}
