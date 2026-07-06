import { syncEffectTimelinePlaybackSettings, syncEffectTimelineToolbar } from './timeline_panel_sync_helper.js';
import { ACTION_MAX_FRAMES, ACTION_MIN_FRAMES } from './game_config_data.js';

export function renderEffectTimelineSettingsView(elements, state) {
  syncEffectTimelinePlaybackSettings(
    {
      duration: elements.effectDuration,
      playbackRateRange: elements.effectPlaybackRateRange,
      playbackRate: elements.effectPlaybackRate,
      playback: elements.effectPlayback,
      playbackMode: elements.effectPlaybackMode,
    },
    {
      frameCount: state.frameCount,
      settings: state.settings,
      playing: state.playing,
    }
  );
  syncEffectTimelineToolbarView(elements, state);
}

export function syncEffectTimelineToolbarView(elements, state) {
  syncEffectTimelineToolbar(
    {
      section: elements.effectSection,
      copyButton: elements.effectCopyFrame,
      pasteButton: elements.effectPasteFrame,
      undoButton: elements.effectUndoFrame,
      frameDownButton: elements.effectFrameDown,
      frameUpButton: elements.effectFrameUp,
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
