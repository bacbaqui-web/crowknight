import {
  clearActorEffectPreviews,
  clearActorPosePreviews,
  createEffectPreview,
  createPosePreview,
  shouldPreviewEffect,
  shouldPreviewPose,
} from './previewState.js';
import { schedulePreviewStop, stopPreviewTimer } from './previewPlayback.js';
import { renderInactivePreviewTimeline } from './tuningPanelDom.js';

export function syncPoseTimelinePreview({
  actors,
  actor,
  section,
  playbackButton,
  renderTimeline,
  playing,
  activeKeyframeId,
  fixedFrame,
  selectedSlot,
  poseKey,
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
    clearPreviews: clearActorPosePreviews,
    shouldPreview: shouldPreviewPose,
    assignPreview: () => {
      actor.player.posePreview = createPreview
        ? createPreview({
            fixedFrame: activeKeyframeId ? null : fixedFrame,
            playing,
            loop: settings.playback !== 'once',
            t: activeKeyframeId || selectedSlot !== null ? getActiveT() : null,
          })
        : createPosePreview({
            pose: poseKey,
            fixedFrame: activeKeyframeId ? null : fixedFrame,
            playing,
            loop: settings.playback !== 'once',
            t: activeKeyframeId || selectedSlot !== null ? getActiveT() : null,
            now: performance.now(),
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
  effectKey,
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
      actor.player.effectPreview = createPreview
        ? createPreview({ playing, t: playing ? null : getActiveT() })
        : createEffectPreview({
            key: effectKey,
            playing,
            t: playing ? null : getActiveT(),
            now: performance.now(),
          });
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
