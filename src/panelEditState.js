export function createDefaultGroupEditValues() {
  return { x: 0, y: 0, rot: 0, scale: 100, opacity: 1, anchorX: null, anchorY: null };
}

export function resetGroupTransformValues(values) {
  values.x = 0;
  values.y = 0;
  values.rot = 0;
  values.scale = 100;
}
