import { syncPoseTimelinePlaybackSettings, syncPoseTimelineToolbar } from './tuningTimelinePanelSync.js';
import { POSE_MAX_FRAMES, POSE_MIN_FRAMES } from './gameConfig.js';

export function renderPoseTimelineSettingsView(elements, state) {
  syncPoseTimelinePlaybackSettings(
    {
      duration: elements.poseDuration,
      playbackRateRange: elements.posePlaybackRateRange,
      playbackRate: elements.posePlaybackRate,
      playback: elements.posePlayback,
      playbackMode: elements.posePlaybackMode,
    },
    {
      frameCount: state.frameCount,
      settings: state.settings,
      playing: state.playing,
    }
  );
  return syncPoseTimelineToolbarView(elements, state);
}

export function syncPoseTimelineToolbarView(elements, state) {
  return syncPoseTimelineToolbar(
    {
      copyButton: elements.poseCopyFrame,
      pasteButton: elements.posePasteFrame,
      undoButton: elements.poseUndoFrame,
      frameDownButton: elements.poseFrameDown,
      frameUpButton: elements.poseFrameUp,
    },
    {
      hasSelection: state.hasSelection,
      hasCopiedFrame: state.hasCopiedFrame,
      undoCount: state.undoCount,
      frameCount: state.frameCount,
      minFrames: POSE_MIN_FRAMES,
      maxFrames: POSE_MAX_FRAMES,
    }
  );
}
