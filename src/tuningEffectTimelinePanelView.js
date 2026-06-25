import { syncEffectTimelinePlaybackSettings, syncEffectTimelineToolbar } from './tuningTimelinePanelSync.js';
import { POSE_MAX_FRAMES, POSE_MIN_FRAMES } from './gameConfig.js';

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
      minFrames: POSE_MIN_FRAMES,
      maxFrames: POSE_MAX_FRAMES,
    }
  );
}
