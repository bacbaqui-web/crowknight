import { screenDeltaToLocal } from './canvasDragMath.js';
import { resizeEditableTransformFromHandle } from './editable_object_model_helper.js';
import {
  anchorScaleForPart,
  canvasSizeDelta,
  canvasSizePercentBase,
  setCanvasVisualValue,
  setPartAnchorValue,
} from './transform_value_helper.js';
import { isMasterPart } from './editor_label_helper.js';
import { applyGroupTransformDrag } from './group_transform_adapter.js';

export function applyTuningCanvasDrag(drag, dx, dy, { groupEditValues }) {
  if (drag.group) {
    applyGroupTransformDrag(drag, dx, dy, groupEditValues);
    return;
  }

  applyCanvasPartDrag(drag, dx, dy);
}

export function applyCanvasPartDrag(drag, dx, dy) {
  const moveLocalX = screenDeltaToLocal(dx, dy, drag.handle.moveXAxis, drag.handle.moveXUnit);
  const moveLocalY = screenDeltaToLocal(dx, dy, drag.handle.moveYAxis, drag.handle.moveYUnit);
  const handleLocalX = screenDeltaToLocal(dx, dy, drag.handle.xAxis, drag.handle.xUnit);
  const handleLocalY = screenDeltaToLocal(dx, dy, drag.handle.yAxis, drag.handle.yUnit);

  if (drag.mode === 'anchor') {
    if (isMasterPart(drag.part)) {
      drag.target.anchorX = drag.startValues.anchorX + moveLocalX;
      drag.target.anchorY = drag.startValues.anchorY + moveLocalY;
      return;
    }
    const scaleX = anchorScaleForPart(drag.target, 'ax', drag.part);
    const scaleY = anchorScaleForPart(drag.target, 'ay', drag.part);
    const nextAx = drag.startValues.ax + moveLocalX / scaleX;
    const nextAy = drag.startValues.ay + moveLocalY / scaleY;
    if (drag.context === 'pose' && typeof drag.writePoseFrameValue === 'function') {
      drag.writePoseFrameValue(drag.part, 'ax', nextAx);
      drag.writePoseFrameValue(drag.part, 'ay', nextAy);
      return;
    }
    if (typeof drag.writeValue === 'function') {
      setCanvasVisualValue(drag, 'ax', nextAx);
      setCanvasVisualValue(drag, 'ay', nextAy);
      return;
    }
    setPartAnchorValue(drag.target, 'ax', nextAx, drag.part);
    setPartAnchorValue(drag.target, 'ay', nextAy, drag.part);
    return;
  }

  if (drag.mode === 'rotate') {
    const currentX = drag.startX + dx;
    const currentY = drag.startY + dy;
    const angle = Math.atan2(currentY - drag.handle.anchor.y, currentX - drag.handle.anchor.x);
    setCanvasVisualValue(drag, 'rot', drag.startVisual.rot + ((angle - drag.startAngle) * 180) / Math.PI);
    return;
  }

  if (isCanvasPartResizeMode(drag.mode)) {
    applyCanvasPartResize(drag, drag.mode, handleLocalX, handleLocalY);
    return;
  }

  setCanvasVisualValue(drag, 'x', drag.startVisual.x + moveLocalX);
  setCanvasVisualValue(drag, 'y', drag.startVisual.y + moveLocalY);
}

function isCanvasPartResizeMode(mode) {
  return mode === 'width' || mode === 'height' || mode === 'size';
}

function applyCanvasPartResize(drag, mode, handleLocalX, handleLocalY) {
  const resized = resizeEditableTransformFromHandle({
    transform: drag.startVisual,
    mode,
    widthDelta: canvasResizeWidthDelta(drag, mode, handleLocalX),
    heightDelta: canvasResizeHeightDelta(drag, mode, handleLocalY),
    baseW: canvasSizePercentBase(drag, 'w'),
    baseH: canvasSizePercentBase(drag, 'h'),
  });

  if (mode === 'width' || mode === 'size') setCanvasVisualValue(drag, 'w', resized.w);
  if (mode === 'height' || mode === 'size') setCanvasVisualValue(drag, 'h', resized.h);
}

function canvasResizeWidthDelta(drag, mode, handleLocalX) {
  if (mode === 'height') return 0;
  return canvasSizeDelta(drag, 'w', mode === 'width' ? -handleLocalX : handleLocalX);
}

function canvasResizeHeightDelta(drag, mode, handleLocalY) {
  if (mode === 'width') return 0;
  return canvasSizeDelta(drag, 'h', mode === 'height' ? -handleLocalY : handleLocalY);
}
