import { pickDragValues, pickVisualValues } from './canvasDragState.js';
import { isMasterPart } from './tuningLabels.js';
import { partPositionSources } from './tuningParts.js';

export function masterPartCanvasBase() {
  return { x: 0, y: 0, w: 1, h: 1, rot: 0, opacity: 1, anchorX: 0, anchorY: 0 };
}

export function canvasPartEditState({ part, context, tuning, poseValue }) {
  const base = isMasterPart(part) ? masterPartCanvasBase() : partPositionSources(tuning.rig)[part];
  return {
    context,
    part,
    base,
    target: context === 'pose' ? poseValue : base,
  };
}

export function canvasGroupDragItems(parts, { editStateForPart, editHandles }) {
  return parts
    .map((part) => {
      const editState = editStateForPart(part);
      const handle = editHandles?.[part];
      if (!handle) return null;
      return {
        part,
        target: editState.target,
        base: editState.base,
        handle,
        startAnchor: { ...handle.anchor },
        startValues: pickDragValues(editState),
        startVisual: pickVisualValues(editState),
      };
    })
    .filter(Boolean);
}

export function refreshCanvasDragTargets(drag, { editStateForPart, effectFrameValue }) {
  if (!drag) return;
  if (drag.group) {
    drag.parts.forEach((item) => {
      const editState = editStateForPart(item.part, 'pose');
      item.target = editState.target;
      item.base = editState.base;
    });
    return;
  }
  if (drag.context === 'effect') {
    drag.target = effectFrameValue();
    return;
  }
  const editState = editStateForPart(drag.part, drag.context);
  drag.target = editState.target;
  drag.base = editState.base;
}
