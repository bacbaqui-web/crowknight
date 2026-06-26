export function createTuningPanelTimelineFrameActions({ getOpenEditContext, getPoseTimeline, getEffectTimeline }) {
  function activeTimelineController() {
    return getOpenEditContext() === 'effect' ? getEffectTimeline() : getPoseTimeline();
  }

  return {
    copyCurrentFrame() {
      activeTimelineController().copyFrame();
    },
    pasteCurrentFrame() {
      activeTimelineController().pasteFrame();
    },
    hasCurrentFrameSelection() {
      return Boolean(activeTimelineController().hasFrameSelection?.());
    },
  };
}
