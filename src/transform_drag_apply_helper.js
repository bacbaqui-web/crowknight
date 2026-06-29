import { rotatePointAround, scalePointAround, screenDeltaToLocal } from './canvasDragMath.js';
import { resizeEditableTransformFromHandle } from './editable_object_model_helper.js';
import {
  anchorScaleForPart,
  canvasSizeDelta,
  canvasSizePercentBase,
  isGroupScalablePart,
  setCanvasVisualValue,
  setPartAnchorValue,
} from './transform_value_helper.js';
import { isMasterPart } from './editor_label_helper.js';
import { clamp } from './utils.js';

export function applyTuningCanvasDrag(drag, dx, dy, { groupEditValues }) {
  if (drag.group) {
    applyCanvasGroupDrag(drag, dx, dy, groupEditValues);
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

export function applyCanvasGroupDrag(drag, dx, dy, groupEditValues) {
  if (drag.mode === 'anchor') {
    groupEditValues.anchorX = drag.handle.anchor.x + dx;
    groupEditValues.anchorY = drag.handle.anchor.y + dy;
    return;
  }

  if (drag.mode === 'rotate') {
    const angle = Math.atan2(drag.startY + dy - drag.handle.anchor.y, drag.startX + dx - drag.handle.anchor.x);
    const delta = angle - drag.startAngle;
    const degrees = (delta * 180) / Math.PI;
    groupEditValues.rot = degrees;
    applyCanvasGroupTransform(drag, (point) => rotatePointAround(point, drag.handle.anchor, delta), degrees, 1);
    return;
  }

  if (drag.mode === 'size') {
    const distance = Math.max(
      1,
      Math.hypot(drag.startX + dx - drag.handle.anchor.x, drag.startY + dy - drag.handle.anchor.y)
    );
    const scale = clamp(distance / drag.startDistance, 0.1, 4);
    groupEditValues.scale = scale * 100;
    applyCanvasGroupTransform(drag, (point) => scalePointAround(point, drag.handle.anchor, scale), 0, scale);
    return;
  }

  if (drag.mode === 'width') {
    const scaleX = clamp(1 - dx / 90, 0.1, 4);
    applyCanvasGroupAxisScale(drag, scaleX, 1);
    return;
  }

  if (drag.mode === 'height') {
    const scaleY = clamp(1 - dy / 90, 0.1, 4);
    applyCanvasGroupAxisScale(drag, 1, scaleY);
    return;
  }

  groupEditValues.x = dx;
  groupEditValues.y = dy;
  drag.parts.forEach((item) => {
    applyCanvasGroupItemTransform(drag, item, { screenDx: dx, screenDy: dy });
  });
}

export function applyCanvasGroupRotation(drag, degrees) {
  const radians = (degrees * Math.PI) / 180;
  applyCanvasGroupTransform(drag, (point) => rotatePointAround(point, drag.handle.anchor, radians), degrees, 1);
}

export function applyCanvasGroupScale(drag, scale) {
  applyCanvasGroupTransform(drag, (point) => scalePointAround(point, drag.handle.anchor, scale), 0, scale);
}

function applyCanvasGroupTransform(drag, transformPoint, rotationDelta, scale) {
  drag.parts.forEach((item) => {
    const nextAnchor = transformPoint(item.startAnchor);
    applyCanvasGroupItemTransform(drag, item, {
      screenDx: nextAnchor.x - item.startAnchor.x,
      screenDy: nextAnchor.y - item.startAnchor.y,
      rotationDelta,
      scaleX: scale,
      scaleY: scale,
    });
  });
}

function applyCanvasGroupAxisScale(drag, scaleX, scaleY) {
  drag.parts.forEach((item) => {
    const nextAnchor = {
      x: drag.handle.anchor.x + (item.startAnchor.x - drag.handle.anchor.x) * scaleX,
      y: drag.handle.anchor.y + (item.startAnchor.y - drag.handle.anchor.y) * scaleY,
    };
    const screenDx = nextAnchor.x - item.startAnchor.x;
    const screenDy = nextAnchor.y - item.startAnchor.y;
    applyCanvasGroupItemTransform(drag, item, { screenDx, screenDy, scaleX, scaleY });
  });
}

function applyCanvasGroupItemTransform(drag, item, { screenDx, screenDy, rotationDelta = 0, scaleX = 1, scaleY = 1 }) {
  const moveLocalX = screenDeltaToLocal(screenDx, screenDy, item.handle.moveXAxis, item.handle.moveXUnit);
  const moveLocalY = screenDeltaToLocal(screenDx, screenDy, item.handle.moveYAxis, item.handle.moveYUnit);
  const itemDrag = canvasGroupItemDrag(drag, item);
  setCanvasVisualValue(itemDrag, 'x', item.startVisual.x + moveLocalX);
  setCanvasVisualValue(itemDrag, 'y', item.startVisual.y + moveLocalY);
  if (rotationDelta) setCanvasVisualValue(itemDrag, 'rot', item.startVisual.rot + rotationDelta);
  if (!isGroupScalablePart(item.part)) return;
  if (scaleX !== 1) setCanvasVisualValue(itemDrag, 'w', item.startVisual.w * scaleX);
  if (scaleY !== 1) setCanvasVisualValue(itemDrag, 'h', item.startVisual.h * scaleY);
}

function canvasGroupItemDrag(drag, item) {
  return {
    context: 'pose',
    part: item.part,
    target: item.target,
    base: item.base,
    writePoseFrameValue: drag.writePoseFrameValue,
  };
}
