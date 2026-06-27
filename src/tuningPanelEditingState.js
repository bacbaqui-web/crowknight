export function createTuningPanelEditingState() {
  let editFocusContext = null;
  let editFocusPartKey = null;

  return {
    getEditFocusContext: () => editFocusContext,
    setEditFocusContext: (value) => {
      editFocusContext = value;
    },
    getEditFocusPartKey: () => editFocusPartKey,
    setEditFocusPartKey: (value) => {
      editFocusPartKey = value;
    },
  };
}
