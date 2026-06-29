export function createTuningPanelSelectionState() {
  let activePartKey = null;
  let activePartKeyGlobal = null;
  let activePosePartKey = null;
  let editContext = 'part';
  const selectedPosePartKeys = new Set();

  return {
    getActivePartKey: () => activePartKey,
    setActivePartKey: (value) => {
      activePartKey = value;
    },
    getActivePartKeyGlobal: () => activePartKeyGlobal,
    setActivePartKeyGlobal: (value) => {
      activePartKeyGlobal = value;
    },
    getActivePosePartKey: () => activePosePartKey,
    setActivePosePartKey: (value) => {
      activePosePartKey = value;
    },
    getEditContext: () => editContext,
    setEditContext: (value) => {
      editContext = value;
    },
    poseParts: {
      clear: () => {
        selectedPosePartKeys.clear();
      },
      toggle: (partKey) => {
        if (selectedPosePartKeys.has(partKey)) {
          selectedPosePartKeys.delete(partKey);
          return;
        }
        selectedPosePartKeys.add(partKey);
      },
      selectOnly: (partKey) => {
        selectedPosePartKeys.clear();
        selectedPosePartKeys.add(partKey);
        return partKey;
      },
      has: (partKey) => selectedPosePartKeys.has(partKey),
      size: () => selectedPosePartKeys.size,
      values: () => [...selectedPosePartKeys],
      forEach: (callback) => {
        selectedPosePartKeys.forEach(callback);
      },
    },
  };
}
