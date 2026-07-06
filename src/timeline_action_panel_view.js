import { syncActionTimelinePlaybackSettings, syncActionTimelineToolbar } from './timeline_panel_sync_helper.js';
import { ACTION_MAX_FRAMES, ACTION_MIN_FRAMES } from './game_config_data.js';

export function renderActionTimelineSettingsView(elements, state) {
  syncActionTimelinePlaybackSettings(
    {
      duration: elements.actionDuration,
      playbackRateRange: elements.actionPlaybackRateRange,
      playbackRate: elements.actionPlaybackRate,
      playback: elements.actionPlayback,
      playbackMode: elements.actionPlaybackMode,
      mirror: elements.actionMirror,
      cancel: elements.actionCancel,
      blend: elements.actionBlend,
      condition: elements.actionCondition,
    },
    {
      frameCount: state.frameCount,
      settings: state.settings,
      playing: state.playing,
    }
  );
  return syncActionTimelineToolbarView(elements, state);
}

export function syncActionTimelineToolbarView(elements, state) {
  return syncActionTimelineToolbar(
    {
      copyButton: elements.actionCopyFrame,
      pasteButton: elements.actionPasteFrame,
      undoButton: elements.actionUndoFrame,
      frameDownButton: elements.actionFrameDown,
      frameUpButton: elements.actionFrameUp,
    },
    {
      hasSelection: state.hasSelection,
      hasCopiedFrame: state.hasCopiedFrame,
      undoCount: state.undoCount,
      frameCount: state.frameCount,
      minFrames: state.minFrameCount ?? ACTION_MIN_FRAMES,
      maxFrames: ACTION_MAX_FRAMES,
    }
  );
}
