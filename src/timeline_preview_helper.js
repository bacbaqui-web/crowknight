import { clearActorEffectPreviews, clearActorActionPreviews, shouldPreviewEffect } from './preview_state.js';
import { renderInactivePreviewTimeline } from './editor_panel_dom_helper.js';
import { previewTimeoutMs } from './timeline_playback_helper.js';
import { actionKeyframeTargetT, hasActionKeyframeTarget } from './action_keyframe_target_helper.js';

export function syncActionTimelinePreview({
  actors,
  actor,
  section,
  playbackButton,
  renderTimeline,
  playing,
  actionKeyframeTarget,
  settings,
  createPreview,
}) {
  const previewTarget = actionPreviewTarget(actionKeyframeTarget);
  syncTimelinePreview({
    actors,
    section,
    playbackButton,
    renderTimeline,
    clearPreviews: clearActorActionPreviews,
    hasPreview: playing || previewTarget.hasTarget,
    assignPreview: () => {
      actor.player.actionPreview = createPreview({
        fixedFrame: playing ? null : previewTarget.fixedFrame,
        playing,
        playback: settings.playback,
        t: playing ? null : previewTarget.t,
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
    clearPreviews: clearActorEffectPreviews,
    hasPreview: shouldPreviewEffect({
      playing,
      activeKeyframeId,
      fixedFrame,
      selectedSlot,
    }),
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
  clearPreviews,
  hasPreview,
  assignPreview,
}) {
  clearPreviews(actors);
  if (!isTimelinePreviewSectionActive(section)) {
    renderInactivePreviewTimeline(playbackButton, renderTimeline);
    return;
  }

  if (!hasPreview) {
    renderInactivePreviewTimeline(playbackButton, renderTimeline);
    return;
  }

  assignPreview();
  renderTimeline();
}

function actionPreviewTarget(target) {
  const hasTarget = hasActionKeyframeTarget(target);
  const hasSlot = target?.selectedSlot !== null && target?.selectedSlot !== undefined;
  const fixedFrame = hasTarget && (target.role === 'start' || target.role === 'end') ? target.id : null;
  return {
    fixedFrame,
    hasTarget: hasTarget || hasSlot,
    t: hasTarget || hasSlot ? actionKeyframeTargetT(target) : null,
  };
}

function isTimelinePreviewSectionActive(section) {
  if (!section) return false;
  if (section.hidden) return false;
  if (section.dataset.workflowSessionActive === 'true') return true;
  if (section.dataset.workflowSessionActive === 'false') return false;
  return section.classList.contains('is-open');
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
