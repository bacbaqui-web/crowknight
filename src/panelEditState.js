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

export function activeEditPartKeysForContext({ context, editFocusContext, selectedPosePartKeys, editFocusPartKey }) {
  if (!context) return [];
  if (editFocusContext === 'pose' && selectedPosePartKeys.size > 1) {
    return [...selectedPosePartKeys];
  }
  return editFocusPartKey ? [editFocusPartKey] : [];
}

export function togglePosePartSelection(selectedPosePartKeys, partKey) {
  if (selectedPosePartKeys.has(partKey)) {
    selectedPosePartKeys.delete(partKey);
    return;
  }
  selectedPosePartKeys.add(partKey);
}

export function selectOnlyPosePart(selectedPosePartKeys, partKey) {
  selectedPosePartKeys.clear();
  selectedPosePartKeys.add(partKey);
  return partKey;
}

export function posePartFocusAfterMultiSelect(selectedPosePartKeys, partKey, masterPartKey) {
  const activePosePartKey = selectedPosePartKeys.size
    ? selectedPosePartKeys.has(partKey)
      ? partKey
      : [...selectedPosePartKeys].at(-1) || null
    : null;

  return {
    activePosePartKey,
    editFocusPartKey: selectedPosePartKeys.size > 1 ? activePosePartKey : activePosePartKey || masterPartKey,
  };
}
