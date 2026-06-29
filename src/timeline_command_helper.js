export function createTimelineFrameCommands({
  addTimelineKeyframe,
  deleteTimelineKeyframe,
  resetTimelineAnimation,
  copyTimelineFrame,
  pasteTimelineFrame,
  resetSelectionState,
  clearCopiedFrame,
  stopPreview,
  finishAdd,
  finishDelete,
  finishReset,
  finishPaste,
  getCopiedFrame,
  setCopiedFrame,
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
        clearCopiedFrame,
        stopPreview,
        finish: finishReset,
      });
    },
    copyFrame() {
      copyTimelineFrame({
        copyFrame: createFrameCopy,
        setCopiedFrame,
        afterCopy,
      });
    },
    pasteFrame() {
      pasteTimelineFrame({
        copiedFrame: getCopiedFrame(),
        pasteTargetFrameId,
        pasteFrameCopy,
        finish: finishPaste,
      });
    },
  };
}
