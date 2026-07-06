export function normalizeActionEditPivot(value = {}, fallback = {}) {
  return {
    x: finiteNumber(value.x, fallback.x ?? 0),
    y: finiteNumber(value.y, fallback.y ?? 0),
  };
}

export function writeActionEditPivot(settings, masterFrames, value) {
  const pivot = normalizeActionEditPivot(value, settings?.editPivot);
  if (settings) settings.editPivot = pivot;
  syncMasterFramePivot(masterFrames, pivot);
  return pivot;
}

export function syncMasterFramePivot(masterFrames, pivotValue = {}) {
  if (!masterFrames) return;
  const pivot = normalizeActionEditPivot(pivotValue);
  masterFrames.anchorX = pivot.x;
  masterFrames.anchorY = pivot.y;
  ['start', 'end'].forEach((key) => {
    if (!masterFrames[key]) return;
    masterFrames[key].anchorX = pivot.x;
    masterFrames[key].anchorY = pivot.y;
  });
  if (Array.isArray(masterFrames.keyframes)) {
    masterFrames.keyframes.forEach((frame) => {
      frame.anchorX = pivot.x;
      frame.anchorY = pivot.y;
    });
  }
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number(fallback) || 0;
}
