import { selectedOrFirstEmptySlot } from './tuningTimelineDom.js';
import {
  movedTimelineKeyframeTarget,
  selectedTimelineFrameSelection,
  selectedTimelineSlotSelection,
} from './timelineState.js';

export function addTimelineKeyframeAction({
  selection,
  keyframes,
  lastSlot,
  toSlot,
  slotToValue,
  addKeyframe,
  beginUndo,
  stopPreview,
  finish,
}) {
  const slot = selectedOrFirstEmptySlot(selection.selectedSlot, keyframes, lastSlot, toSlot);
  if (!slot) return false;

  beginUndo();
  const id = addKeyframe(slotToValue(slot));
  selection.activeKeyframeId = id;
  selection.fixedFrame = null;
  selection.selectedSlot = slot;
  stopPreview();
  finish();
  return true;
}

export function deleteTimelineKeyframeAction({
  selection,
  deleteKeyframe,
  beginUndo,
  resetSelection,
  stopPreview,
  finish,
}) {
  if (!selection.activeKeyframeId) return false;

  beginUndo();
  deleteKeyframe(selection.activeKeyframeId);
  resetSelection();
  stopPreview();
  finish();
  return true;
}

export function resetTimelineAnimationAction({
  beginUndo,
  resetAnimation,
  resetSelection,
  clearCopiedFrame,
  stopPreview,
  finish,
}) {
  beginUndo();
  resetAnimation();
  resetSelection();
  clearCopiedFrame();
  stopPreview();
  finish();
  return true;
}

export function copyTimelineFrameAction({ copyFrame, setCopiedFrame, afterCopy }) {
  const copy = copyFrame();
  if (!copy) return false;

  setCopiedFrame(copy);
  afterCopy();
  return true;
}

export function finishTimelineMutationAction({
  beforeRender = null,
  renderFields,
  syncPreview,
  applySelected,
  commitUndo,
  afterCommit = null,
}) {
  beforeRender?.();
  renderFields();
  syncPreview();
  applySelected();
  commitUndo();
  afterCommit?.();
}

export function pasteTimelineFrameAction({
  copiedFrame,
  isOpen,
  beginUndo,
  commitUndo,
  pasteTargetFrameId,
  pasteFrameCopy,
  finish,
}) {
  if (!copiedFrame || !isOpen) return false;

  beginUndo();
  const id = pasteTargetFrameId();
  if (!id) {
    commitUndo();
    return false;
  }

  pasteFrameCopy(id);
  finish();
  return true;
}

export function selectTimelineKeyframeAction({
  id,
  selection,
  keyframes,
  toSlot,
  lastSlot,
  setContext,
  applySelection,
}) {
  setContext();
  const nextSelection = selectedTimelineFrameSelection({
    id,
    activeKeyframeId: selection.activeKeyframeId,
    fixedFrame: selection.fixedFrame,
    keyframes,
    toSlot,
    lastSlot,
  });
  applySelection(nextSelection);
  return nextSelection;
}

export function selectTimelineSlotAction({ slot, selection, keyframes, toSlot, lastSlot, setContext, applySelection }) {
  setContext();
  const nextSelection = selectedTimelineSlotSelection({
    slot,
    selectedSlot: selection.selectedSlot,
    activeKeyframeId: selection.activeKeyframeId,
    fixedFrame: selection.fixedFrame,
    keyframes,
    toSlot,
    lastSlot,
  });
  applySelection(nextSelection);
  return nextSelection;
}

export function selectTimelineKeyframeForDragAction({
  selection,
  id,
  keyframes,
  toSlot,
  stopPreview,
  getActiveT,
  setDragPreview,
  setDeleteDisabled,
  markActive,
}) {
  selection.activeKeyframeId = id;
  selection.fixedFrame = null;
  selection.selectedSlot = toSlot(keyframes.find((frame) => frame.id === id)?.t ?? 0);
  stopPreview();
  setDragPreview(getActiveT());
  setDeleteDisabled(false);
  markActive(id);
}

export function moveTimelineKeyframeAction({ id, t, keyframes, toSlot, slotToValue, moveKeyframe, afterMove }) {
  const next = movedTimelineKeyframeTarget({
    id,
    t,
    keyframes,
    toSlot,
    slotToValue,
  });
  if (!next) return false;
  if (!moveKeyframe(next.t)) return false;
  afterMove(next);
  return true;
}
