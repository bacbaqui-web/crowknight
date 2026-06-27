import { markActiveKeyframeButton } from './timelineDragControls.js';
import { hasTimelineSelection } from './timelineState.js';
import {
  applyTimelineSelectionAction,
  refreshTimelineFrameSelectionAction,
  resetTimelineSelectionAction,
  selectTimelineKeyframeAction,
  selectTimelineKeyframeForDragAction,
  selectTimelineSlotAction,
  setFixedTimelineFrameSelectionAction,
} from './timelineControllerActions.js';

export function createTimelineSelectionControls({
  selection,
  section,
  accessors,
  keyframes,
  track,
  deleteButton,
  stopPreview,
  syncPreview,
}) {
  const isSectionOpen = () => Boolean(section?.classList.contains('is-open'));
  const resetSelectionState = () => resetTimelineSelectionAction(selection);
  const setFixedFrame = (frame) =>
    setFixedTimelineFrameSelectionAction({
      targetSelection: selection,
      frame,
      lastSlot: accessors.lastSlot(),
    });
  const refreshFrameSelection = ({ renderFields }) =>
    refreshTimelineFrameSelectionAction({
      stopPreview,
      renderFields,
      syncPreview,
    });
  const applySelection = ({ nextSelection, beforeRefresh = null, renderFields }) =>
    applyTimelineSelectionAction({
      targetSelection: selection,
      nextSelection,
      beforeRefresh,
      refresh: () => refreshFrameSelection({ renderFields }),
    });
  const hasFrameSelection = ({ includeSelectedSlot = true, requireOpenSection = false } = {}) =>
    (!requireOpenSection || isSectionOpen()) && hasTimelineSelection(selection, { includeSelectedSlot });
  const frameSelectionState = () => ({
    activeKeyframeId: selection.activeKeyframeId,
    fixedFrame: selection.fixedFrame,
    selectedSlot: selection.selectedSlot,
  });
  const frameLabel = () => {
    if (selection.fixedFrame === 'start') return '첫프레임';
    if (selection.fixedFrame === 'end') return '끝프레임';
    if (selection.activeKeyframeId) return '키프레임';
    return '기본';
  };
  const selectKeyframe = ({ id, setContext, applySelection }) =>
    selectTimelineKeyframeAction({
      id,
      selection,
      keyframes: keyframes(),
      toSlot: accessors.toSlot,
      lastSlot: accessors.lastSlot(),
      setContext,
      applySelection,
    });
  const selectSlot = ({ slot, setContext, applySelection }) =>
    selectTimelineSlotAction({
      slot,
      selection,
      keyframes: keyframes(),
      toSlot: accessors.toSlot,
      lastSlot: accessors.lastSlot(),
      setContext,
      applySelection,
    });
  const selectKeyframeForDrag = ({ id, stopPreview, getActiveT, setDragPreview }) =>
    selectTimelineKeyframeForDragAction({
      selection,
      id,
      keyframes: keyframes(),
      toSlot: accessors.toSlot,
      stopPreview,
      getActiveT,
      setDragPreview,
      setDeleteDisabled: (disabled) => {
        deleteButton.disabled = disabled;
      },
      markActive: (keyframeId) => markActiveKeyframeButton(track, keyframeId),
    });

  return {
    applySelection,
    frameLabel,
    frameSelectionState,
    hasFrameSelection,
    isSectionOpen,
    resetSelectionState,
    selectKeyframe,
    selectKeyframeForDrag,
    selectSlot,
    setFixedFrame,
  };
}
