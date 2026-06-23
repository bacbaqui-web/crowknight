import { rotatePointAround, scalePointAround, screenDeltaToLocal } from './canvasDragMath.js';
import {
  anchorScaleForPart,
  canvasSizeDelta,
  canvasSizePercentBase,
  isGroupScalablePart,
  setCanvasVisualValue,
  setPartAnchorValue,
} from './canvasVisualValues.js';
import { defaultEffectSize } from './animationFrames.js';
import { clampEffectFrameSize } from './effectVisualValues.js';
import { isMasterPart } from './tuningLabels.js';
import { clamp } from './utils.js';

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
    setPartAnchorValue(drag.target, 'ax', drag.startValues.ax + moveLocalX / scaleX, drag.part);
    setPartAnchorValue(drag.target, 'ay', drag.startValues.ay + moveLocalY / scaleY, drag.part);
    return;
  }

  if (drag.mode === 'rotate') {
    const currentX = drag.startX + dx;
    const currentY = drag.startY + dy;
    const angle = Math.atan2(currentY - drag.handle.anchor.y, currentX - drag.handle.anchor.x);
    setCanvasVisualValue(drag, 'rot', drag.startVisual.rot + ((angle - drag.startAngle) * 180) / Math.PI);
    return;
  }

  if (drag.mode === 'width') {
    setCanvasVisualValue(drag, 'w', drag.startVisual.w + canvasSizeDelta(drag, 'w', -handleLocalX));
    return;
  }

  if (drag.mode === 'height') {
    setCanvasVisualValue(drag, 'h', drag.startVisual.h + canvasSizeDelta(drag, 'h', -handleLocalY));
    return;
  }

  if (drag.mode === 'size') {
    const baseW = canvasSizePercentBase(drag, 'w');
    const baseH = canvasSizePercentBase(drag, 'h');
    const deltaW = canvasSizeDelta(drag, 'w', handleLocalX);
    const deltaH = canvasSizeDelta(drag, 'h', handleLocalY);
    const sharedPercentDelta = (deltaW / baseW + deltaH / baseH) / 2;
    setCanvasVisualValue(drag, 'w', drag.startVisual.w + baseW * sharedPercentDelta);
    setCanvasVisualValue(drag, 'h', drag.startVisual.h + baseH * sharedPercentDelta);
    return;
  }

  setCanvasVisualValue(drag, 'x', drag.startVisual.x + moveLocalX);
  setCanvasVisualValue(drag, 'y', drag.startVisual.y + moveLocalY);
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
    const moveLocalX = screenDeltaToLocal(dx, dy, item.handle.moveXAxis, item.handle.moveXUnit);
    const moveLocalY = screenDeltaToLocal(dx, dy, item.handle.moveYAxis, item.handle.moveYUnit);
    setCanvasVisualValue(
      {
        context: 'pose',
        part: item.part,
        target: item.target,
        base: item.base,
      },
      'x',
      item.startVisual.x + moveLocalX
    );
    setCanvasVisualValue(
      {
        context: 'pose',
        part: item.part,
        target: item.target,
        base: item.base,
      },
      'y',
      item.startVisual.y + moveLocalY
    );
  });
}

export function applyCanvasGroupRotation(drag, degrees) {
  const radians = (degrees * Math.PI) / 180;
  applyCanvasGroupTransform(drag, (point) => rotatePointAround(point, drag.handle.anchor, radians), degrees, 1);
}

export function applyCanvasGroupScale(drag, scale) {
  applyCanvasGroupTransform(drag, (point) => scalePointAround(point, drag.handle.anchor, scale), 0, scale);
}

export function applyEffectCanvasDrag(drag, dx, dy, effectKey, writeEffectFrameValue) {
  const localX = screenDeltaToLocal(dx, dy, drag.handle.xAxis, drag.handle.xUnit);
  const localY = screenDeltaToLocal(dx, dy, drag.handle.yAxis, drag.handle.yUnit);
  const moveX = screenDeltaToLocal(dx, dy, drag.handle.moveXAxis, drag.handle.moveXUnit);
  const moveY = screenDeltaToLocal(dx, dy, drag.handle.moveYAxis, drag.handle.moveYUnit);

  if (drag.mode === 'anchor') {
    writeEffectFrameValue('anchorX', drag.startValues.anchorX + localX);
    writeEffectFrameValue('anchorY', drag.startValues.anchorY + localY);
    return;
  }

  if (drag.mode === 'rotate') {
    const currentX = drag.startX + dx;
    const currentY = drag.startY + dy;
    const angle = Math.atan2(currentY - drag.handle.anchor.y, currentX - drag.handle.anchor.x);
    writeEffectFrameValue('rot', drag.startValues.rot + ((angle - drag.startAngle) * 180) / Math.PI);
    return;
  }

  if (drag.mode === 'width') {
    writeEffectFrameValue('w', clampEffectFrameSize(effectKey, 'w', drag.startValues.w - localX));
    return;
  }

  if (drag.mode === 'height') {
    writeEffectFrameValue('h', clampEffectFrameSize(effectKey, 'h', drag.startValues.h - localY));
    return;
  }

  if (drag.mode === 'size') {
    const baseW = defaultEffectSize(effectKey).w;
    const baseH = defaultEffectSize(effectKey).h;
    const deltaW = localX / Math.max(1, baseW);
    const deltaH = localY / Math.max(1, baseH);
    const scaleDelta = (deltaW + deltaH) / 2;
    writeEffectFrameValue('w', clampEffectFrameSize(effectKey, 'w', drag.startValues.w + baseW * scaleDelta));
    writeEffectFrameValue('h', clampEffectFrameSize(effectKey, 'h', drag.startValues.h + baseH * scaleDelta));
    return;
  }

  writeEffectFrameValue('x', drag.startValues.x + moveX);
  writeEffectFrameValue('y', drag.startValues.y + moveY);
}

function applyCanvasGroupTransform(drag, transformPoint, rotationDelta, scale) {
  drag.parts.forEach((item) => {
    const nextAnchor = transformPoint(item.startAnchor);
    const screenDx = nextAnchor.x - item.startAnchor.x;
    const screenDy = nextAnchor.y - item.startAnchor.y;
    const moveLocalX = screenDeltaToLocal(screenDx, screenDy, item.handle.moveXAxis, item.handle.moveXUnit);
    const moveLocalY = screenDeltaToLocal(screenDx, screenDy, item.handle.moveYAxis, item.handle.moveYUnit);
    const itemDrag = {
      context: 'pose',
      part: item.part,
      target: item.target,
      base: item.base,
    };
    setCanvasVisualValue(itemDrag, 'x', item.startVisual.x + moveLocalX);
    setCanvasVisualValue(itemDrag, 'y', item.startVisual.y + moveLocalY);
    if (rotationDelta) setCanvasVisualValue(itemDrag, 'rot', item.startVisual.rot + rotationDelta);
    if (scale !== 1 && isGroupScalablePart(item.part)) {
      setCanvasVisualValue(itemDrag, 'w', item.startVisual.w * scale);
      setCanvasVisualValue(itemDrag, 'h', item.startVisual.h * scale);
    }
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
    const moveLocalX = screenDeltaToLocal(screenDx, screenDy, item.handle.moveXAxis, item.handle.moveXUnit);
    const moveLocalY = screenDeltaToLocal(screenDx, screenDy, item.handle.moveYAxis, item.handle.moveYUnit);
    const itemDrag = {
      context: 'pose',
      part: item.part,
      target: item.target,
      base: item.base,
    };
    setCanvasVisualValue(itemDrag, 'x', item.startVisual.x + moveLocalX);
    setCanvasVisualValue(itemDrag, 'y', item.startVisual.y + moveLocalY);
    if (isGroupScalablePart(item.part)) {
      if (scaleX !== 1) setCanvasVisualValue(itemDrag, 'w', item.startVisual.w * scaleX);
      if (scaleY !== 1) setCanvasVisualValue(itemDrag, 'h', item.startVisual.h * scaleY);
    }
  });
}
