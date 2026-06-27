import { copyTimelineFrameAction, pasteTimelineFrameAction } from './timelineControllerActions.js';

export function createTimelineClipboardControls({ isOpen, beginUndo, commitUndo }) {
  const copyFrame = ({ copyFrame, setCopiedFrame, afterCopy }) =>
    copyTimelineFrameAction({
      copyFrame,
      setCopiedFrame,
      afterCopy,
    });

  const pasteFrame = ({ copiedFrame, pasteTargetFrameId, pasteFrameCopy, finish }) =>
    pasteTimelineFrameAction({
      copiedFrame,
      isOpen: isOpen(),
      beginUndo,
      commitUndo,
      pasteTargetFrameId,
      pasteFrameCopy,
      finish,
    });

  return {
    copyFrame,
    pasteFrame,
  };
}
