export function createTuningPanelSelectionState() {
  let activePartKey = null;
  let activePartKeyGlobal = null;
  let activeActionPartKey = null;
  let editContext = 'part';
  const selectedActionPartKeys = new Set();

  return {
    getActivePartKey: () => activePartKey,
    setActivePartKey: (value) => {
      activePartKey = value;
    },
    getActivePartKeyGlobal: () => activePartKeyGlobal,
    setActivePartKeyGlobal: (value) => {
      activePartKeyGlobal = value;
    },
    getActiveActionPartKey: () => activeActionPartKey,
    setActiveActionPartKey: (value) => {
      activeActionPartKey = value;
    },
    getEditContext: () => editContext,
    setEditContext: (value) => {
      editContext = value;
    },
    actionParts: {
      clear: () => {
        selectedActionPartKeys.clear();
      },
      toggle: (partKey) => {
        if (selectedActionPartKeys.has(partKey)) {
          selectedActionPartKeys.delete(partKey);
          return;
        }
        selectedActionPartKeys.add(partKey);
      },
      selectOnly: (partKey) => {
        selectedActionPartKeys.clear();
        selectedActionPartKeys.add(partKey);
        return partKey;
      },
      has: (partKey) => selectedActionPartKeys.has(partKey),
      size: () => selectedActionPartKeys.size,
      values: () => [...selectedActionPartKeys],
      forEach: (callback) => {
        selectedActionPartKeys.forEach(callback);
      },
    },
  };
}
