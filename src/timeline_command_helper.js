export function createTimelineFrameCommands({
  addTimelineKeyframe,
  deleteTimelineKeyframe,
  resetTimelineAnimation,
  copyTimelineFrame,
  pasteTimelineFrame,
  resetSelectionState,
  clipboardState,
  stopPreview,
  finishAdd,
  finishDelete,
  finishReset,
  finishPaste,
  createFrameCopy,
  pasteTargetFrameId,
  pasteFrameCopy,
  afterCopy,
}) {
  return {
    addKeyframe() {
      addTimelineKeyframe({
        stopPreview,
        finish: finishAdd,
      });
    },
    deleteKeyframe() {
      deleteTimelineKeyframe({
        resetSelection: resetSelectionState,
        stopPreview,
        finish: finishDelete,
      });
    },
    resetAnimation() {
      resetTimelineAnimation({
        resetSelection: resetSelectionState,
        clearCopiedFrame: clipboardState.clear,
        stopPreview,
        finish: finishReset,
      });
    },
    copyFrame() {
      copyTimelineFrame({
        copyFrame: createFrameCopy,
        setCopiedFrame: clipboardState.set,
        afterCopy,
      });
    },
    pasteFrame() {
      pasteTimelineFrame({
        copiedFrame: clipboardState.get(),
        pasteTargetFrameId,
        pasteFrameCopy,
        finish: finishPaste,
      });
    },
  };
}
