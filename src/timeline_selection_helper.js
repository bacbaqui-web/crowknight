export function createTimelineSelectionCommands({
  selectTimelineKeyframe,
  selectTimelineSlot,
  setContext,
  applySelection,
  keyframeOptions = () => ({}),
  slotOptions = () => ({}),
}) {
  return {
    selectKeyframe(id) {
      selectTimelineKeyframe({
        id,
        setContext,
        applySelection: (nextSelection) => applySelection(nextSelection, keyframeOptions(nextSelection)),
      });
    },
    selectSlot(slot) {
      selectTimelineSlot({
        slot,
        setContext,
        applySelection: (nextSelection) => applySelection(nextSelection, slotOptions(nextSelection)),
      });
    },
  };
}
