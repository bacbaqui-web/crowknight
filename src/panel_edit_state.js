export function createDefaultGroupEditValues() {
  return { x: 0, y: 0, rot: 0, scale: 100, opacity: 1, anchorX: null, anchorY: null };
}

export function resetGroupTransformValues(values) {
  values.x = 0;
  values.y = 0;
  values.rot = 0;
  values.scale = 100;
}

export function activeEditPartKeyForContext(context, editFocusPartKey) {
  if (context === 'effect') return 'effect';
  if (!context) return null;
  return editFocusPartKey;
}

export function activeEditPartKeysForContext({ context, editFocusContext, selectedPoseParts, editFocusPartKey }) {
  if (!context) return [];
  if (editFocusContext === 'pose' && selectedPoseParts.size() > 1) {
    return selectedPoseParts.values();
  }
  return editFocusPartKey ? [editFocusPartKey] : [];
}

export function posePartFocusAfterMultiSelect(selectedPoseParts, partKey, masterPartKey) {
  const activePosePartKey = selectedPoseParts.size()
    ? selectedPoseParts.has(partKey)
      ? partKey
      : selectedPoseParts.values().at(-1) || null
    : null;

  return {
    activePosePartKey,
    editFocusPartKey: selectedPoseParts.size() > 1 ? activePosePartKey : activePosePartKey || masterPartKey,
  };
}
