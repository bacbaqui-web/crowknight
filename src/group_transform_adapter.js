import { rotatePointAround, scalePointAround, screenDeltaToLocal } from './canvas_drag_math_helper.js';
import { isGroupScalablePart, setCanvasVisualValue } from './transform_value_helper.js';
import { clamp } from './common_helper.js';

export function createGroupTransformTarget(values = {}, geometry = null) {
  return {
    x: Number(values.x || 0),
    y: Number(values.y || 0),
    rot: Number(values.rot || 0),
    scale: Number(values.scale || 100),
    opacity: Number(values.opacity ?? 1),
    anchorX: Number.isFinite(values.anchorX) ? values.anchorX : geometry?.anchor?.x,
    anchorY: Number.isFinite(values.anchorY) ? values.anchorY : geometry?.anchor?.y,
  };
}

export function applyGroupTransformDrag(drag, dx, dy, groupEditValues) {
  const startValues = drag.startValues || createGroupTransformTarget(groupEditValues, drag.handle);

  if (drag.mode === 'anchor') {
    setGroupTransformTargetValue(groupEditValues, 'anchorX', startValues.anchorX + dx);
    setGroupTransformTargetValue(groupEditValues, 'anchorY', startValues.anchorY + dy);
    return;
  }

  if (drag.mode === 'rotate') {
    const angle = Math.atan2(drag.startY + dy - drag.handle.anchor.y, drag.startX + dx - drag.handle.anchor.x);
    const delta = angle - drag.startAngle;
    const degrees = (delta * 180) / Math.PI;
    setGroupTransformTargetValue(groupEditValues, 'rot', startValues.rot + degrees);
    distributeGroupTransform(drag, (point) => rotatePointAround(point, drag.handle.anchor, delta), degrees, 1);
    return;
  }

  if (drag.mode === 'size') {
    const distance = Math.max(
      1,
      Math.hypot(drag.startX + dx - drag.handle.anchor.x, drag.startY + dy - drag.handle.anchor.y)
    );
    const scale = clamp(distance / drag.startDistance, 0.1, 4);
    setGroupTransformTargetValue(groupEditValues, 'scale', startValues.scale * scale);
    distributeGroupTransform(drag, (point) => scalePointAround(point, drag.handle.anchor, scale), 0, scale);
    return;
  }

  setGroupTransformTargetValue(groupEditValues, 'x', startValues.x + dx);
  setGroupTransformTargetValue(groupEditValues, 'y', startValues.y + dy);
  drag.parts.forEach((item) => {
    applyGroupItemTransform(drag, item, { screenDx: dx, screenDy: dy });
  });
}

export function applyGroupTransformRotation(drag, degrees) {
  const radians = (degrees * Math.PI) / 180;
  distributeGroupTransform(drag, (point) => rotatePointAround(point, drag.handle.anchor, radians), degrees, 1);
}

export function applyGroupTransformScale(drag, scale) {
  distributeGroupTransform(drag, (point) => scalePointAround(point, drag.handle.anchor, scale), 0, scale);
}

function setGroupTransformTargetValue(groupEditValues, prop, value) {
  if (!groupEditValues) return;
  groupEditValues[prop] = value;
}

function distributeGroupTransform(drag, transformPoint, rotationDelta, scale) {
  drag.parts.forEach((item) => {
    const nextAnchor = transformPoint(item.startAnchor);
    applyGroupItemTransform(drag, item, {
      screenDx: nextAnchor.x - item.startAnchor.x,
      screenDy: nextAnchor.y - item.startAnchor.y,
      rotationDelta,
      scaleX: scale,
      scaleY: scale,
    });
  });
}

function applyGroupItemTransform(drag, item, { screenDx, screenDy, rotationDelta = 0, scaleX = 1, scaleY = 1 }) {
  const moveLocalX = screenDeltaToLocal(screenDx, screenDy, item.handle.moveXAxis, item.handle.moveXUnit);
  const moveLocalY = screenDeltaToLocal(screenDx, screenDy, item.handle.moveYAxis, item.handle.moveYUnit);
  const itemDrag = groupItemDrag(drag, item);
  setCanvasVisualValue(itemDrag, 'x', item.startVisual.x + moveLocalX);
  setCanvasVisualValue(itemDrag, 'y', item.startVisual.y + moveLocalY);
  if (rotationDelta) setCanvasVisualValue(itemDrag, 'rot', item.startVisual.rot + rotationDelta);
  if (!isGroupScalablePart(item.part)) return;
  if (scaleX !== 1) setCanvasVisualValue(itemDrag, 'w', item.startVisual.w * scaleX);
  if (scaleY !== 1) setCanvasVisualValue(itemDrag, 'h', item.startVisual.h * scaleY);
}

function groupItemDrag(drag, item) {
  return {
    context: 'action',
    part: item.part,
    target: item.target,
    base: item.base,
    writeActionFrameValue: drag.writeActionFrameValue,
  };
}
