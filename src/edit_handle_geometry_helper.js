import { ANCHOR_HANDLE_RADIUS, MOVE_HANDLE_RADIUS, handleLineStart } from './edit_handle_drawing_helper.js';
import { isMasterPart } from './editor_label_helper.js';
import { INTERACTION_OBJECT_TARGET_TYPE } from './interaction_object_editor.js';
import { controlGroupPartKeys, imagePartKeys } from './part_source_registry.js';
import { clamp } from './utils.js';

export const EFFECT_TARGET_TYPE = 'effect';
export const EFFECT_EDIT_HANDLE_KEY = 'effect';

export function createPartEditHandleGeometry({ editFocusPartKey, editHandleInfo, poseFrameSelectionActive }) {
  if (!editFocusPartKey || !editHandleInfo) return null;

  const info = editHandleInfo;
  const isImagePart = imagePartKeys().includes(editFocusPartKey);
  const isInteractionObjectPart = info.target?.type === INTERACTION_OBJECT_TARGET_TYPE;
  const isEffect = info.target?.type === EFFECT_TARGET_TYPE;
  const isMaster = isMasterPart(editFocusPartKey);
  const isScalablePart =
    isMaster || isImagePart || isInteractionObjectPart || isEffect || controlGroupPartKeys().includes(editFocusPartKey);
  const anchor = info.anchor;
  const xAxis = info.xAxis;
  const yAxis = info.yAxis;
  const moveXAxis = info.moveXAxis || xAxis;
  const moveYAxis = info.moveYAxis || yAxis;
  const up = { x: -yAxis.x, y: -yAxis.y };
  const left = { x: -xAxis.x, y: -xAxis.y };
  const sizeDir = normalizeScreenVector(xAxis.x + yAxis.x, xAxis.y + yAxis.y);
  const rotateDir = normalizeScreenVector(xAxis.x - yAxis.x, xAxis.y - yAxis.y);
  const opacityDir = normalizeScreenVector(-xAxis.x + yAxis.x, -xAxis.y + yAxis.y);

  const handles = {};
  if (!isMaster || poseFrameSelectionActive) {
    handles.move = { mode: 'move', point: anchor, radius: MOVE_HANDLE_RADIUS };
    handles.rotate = { mode: 'rotate', point: addScreenVector(anchor, rotateDir, 78), radius: 17 };
  }

  if (isScalablePart && (!isMaster || poseFrameSelectionActive)) {
    const boundaryHandles = targetBoundaryHandles(anchor, info.target);
    handles.width = { mode: 'width', point: boundaryHandles?.width || addScreenVector(anchor, left, 70), radius: 18 };
    handles.height = { mode: 'height', point: boundaryHandles?.height || addScreenVector(anchor, up, 70), radius: 18 };
    handles.size = { mode: 'size', point: boundaryHandles?.size || addScreenVector(anchor, sizeDir, 78), radius: 18 };
    if (boundaryHandles?.rotate) handles.rotate = { mode: 'rotate', point: boundaryHandles.rotate, radius: 17 };
    handles.opacity = { mode: 'opacity', point: addScreenVector(anchor, opacityDir, 78), radius: 17 };
  }

  if (
    (isMaster && !poseFrameSelectionActive) ||
    (!isMaster &&
      (isImagePart || isInteractionObjectPart || isEffect || controlGroupPartKeys().includes(editFocusPartKey)))
  ) {
    handles.anchor = { mode: 'anchor', point: anchor, radius: ANCHOR_HANDLE_RADIUS };
  }

  return {
    anchor,
    xAxis,
    yAxis,
    xUnit: info.xUnit || 1,
    yUnit: info.yUnit || 1,
    moveXAxis,
    moveYAxis,
    moveXUnit: info.moveXUnit || info.xUnit || 1,
    moveYUnit: info.moveYUnit || info.yUnit || 1,
    isEffect,
    isImagePart,
    isInteractionObjectPart,
    isMaster,
    isScalablePart,
    handles,
  };
}

function targetBoundaryHandles(anchor, target) {
  if (!target?.points || target.points.length < 4) return null;

  const [topLeft, topRight, bottomRight, bottomLeft] = target.points;
  const topMid = midpoint(topLeft, topRight);
  const leftMid = midpoint(topLeft, bottomLeft);
  const topRightOut = vectorFromPoints(bottomRight, topRight);
  const rotateOffset = normalizeScreenVector(topRightOut.x, topRightOut.y);

  return {
    width: leftMid,
    height: topMid,
    size: bottomRight,
    rotate: addScreenVector(topRight, rotateOffset, 34),
  };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function vectorFromPoints(from, to) {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  };
}

export function createEffectEditHandleInfo(ctx, frame, key, placementMatrix = null, drawRect = null) {
  const matrix = ctx.getTransform();
  const anchor = transformCanvasPoint(matrix, 0, 0);
  const placement = placementMatrix || matrix;
  const xInfo = axisFromCanvasMatrix(matrix, anchor, 1, 0);
  const yInfo = axisFromCanvasMatrix(matrix, anchor, 0, 1);
  const moveXInfo = axisFromCanvasMatrix(placement, anchor, 1, 0);
  const moveYInfo = axisFromCanvasMatrix(placement, anchor, 0, 1);
  const target = drawRect ? createEditHandleTarget(matrix, key, frame, drawRect) : null;
  return {
    key,
    frame,
    anchor,
    xAxis: xInfo.axis,
    yAxis: yInfo.axis,
    xUnit: xInfo.unit,
    yUnit: yInfo.unit,
    moveXAxis: moveXInfo.axis,
    moveYAxis: moveYInfo.axis,
    moveXUnit: moveXInfo.unit,
    moveYUnit: moveYInfo.unit,
    target,
  };
}

function createEditHandleTarget(matrix, key, source, rect) {
  const points = [
    transformCanvasPoint(matrix, rect.x, rect.y),
    transformCanvasPoint(matrix, rect.x + rect.w, rect.y),
    transformCanvasPoint(matrix, rect.x + rect.w, rect.y + rect.h),
    transformCanvasPoint(matrix, rect.x, rect.y + rect.h),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    type: EFFECT_TARGET_TYPE,
    key,
    source,
    points,
    bounds: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    },
  };
}

export function createGroupEditHandleGeometry({
  editFocusContext,
  selectedPoseParts,
  poseFrameSelectionActive,
  editHandles,
  hitRegions,
  groupEditValues,
}) {
  if (editFocusContext !== 'pose' || selectedPoseParts.size() < 2 || !poseFrameSelectionActive) return null;

  const parts = selectedPoseParts.values();
  const infos = parts.map((part) => editHandles?.[part]).filter(Boolean);
  if (infos.length < 2) return null;

  const defaultAnchor = groupBoundsCenter(parts, infos, hitRegions);
  const anchor = {
    x: Number.isFinite(groupEditValues.anchorX) ? groupEditValues.anchorX : defaultAnchor.x,
    y: Number.isFinite(groupEditValues.anchorY) ? groupEditValues.anchorY : defaultAnchor.y,
  };
  const xAxis = { x: 1, y: 0 };
  const yAxis = { x: 0, y: 1 };
  const sizeDir = normalizeScreenVector(1, 1);
  const rotateDir = normalizeScreenVector(1, -1);
  const opacityDir = normalizeScreenVector(-1, 1);

  return {
    isGroup: true,
    parts: infos.map((info) => info.key),
    anchor,
    xAxis,
    yAxis,
    xUnit: 1,
    yUnit: 1,
    moveXAxis: xAxis,
    moveYAxis: yAxis,
    moveXUnit: 1,
    moveYUnit: 1,
    isImagePart: false,
    isMaster: false,
    isScalablePart: false,
    handles: {
      anchor: { mode: 'anchor', point: anchor, radius: ANCHOR_HANDLE_RADIUS },
      move: { mode: 'move', point: anchor, radius: MOVE_HANDLE_RADIUS },
      rotate: { mode: 'rotate', point: addScreenVector(anchor, rotateDir, 82), radius: 17 },
      size: { mode: 'size', point: addScreenVector(anchor, sizeDir, 82), radius: 18 },
      opacity: { mode: 'opacity', point: addScreenVector(anchor, opacityDir, 82), radius: 17 },
    },
  };
}

function groupBoundsCenter(parts, fallbackInfos, hitRegions) {
  const bounds = parts.map((part) => hitRegions?.find((region) => region.key === part)?.bounds).filter(Boolean);
  if (!bounds.length) {
    return {
      x: fallbackInfos.reduce((sum, info) => sum + info.anchor.x, 0) / fallbackInfos.length,
      y: fallbackInfos.reduce((sum, info) => sum + info.anchor.y, 0) / fallbackInfos.length,
    };
  }

  const left = Math.min(...bounds.map((bound) => bound.x));
  const top = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.w));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.h));
  return {
    x: (left + right) / 2,
    y: (top + bottom) / 2,
  };
}

export function findEditHandleAt(point, geometry) {
  if (!geometry) return null;

  const anchorHandle = geometry.handles.anchor;
  if (
    anchorHandle &&
    Math.hypot(point.x - anchorHandle.point.x, point.y - anchorHandle.point.y) <= anchorHandle.radius
  ) {
    return { mode: anchorHandle.mode, geometry };
  }

  const moveHandle = geometry.handles.move;
  if (moveHandle && Math.hypot(point.x - moveHandle.point.x, point.y - moveHandle.point.y) <= moveHandle.radius) {
    return { mode: moveHandle.mode, geometry };
  }

  const priority = ['rotate', 'opacity', 'size', 'width', 'height'];
  for (const key of priority) {
    const handle = geometry.handles[key];
    if (!handle) continue;
    const distance = Math.hypot(point.x - handle.point.x, point.y - handle.point.y);
    if (distance <= handle.radius) return { mode: handle.mode, geometry };
    if (distanceToSegment(point, handleLineStart(geometry.anchor, handle.point), handle.point) <= 10) {
      return { mode: handle.mode, geometry };
    }
  }

  return null;
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
  const x = a.x + dx * t;
  const y = a.y + dy * t;
  return Math.hypot(point.x - x, point.y - y);
}

function addScreenVector(point, vector, distance) {
  return {
    x: point.x + vector.x * distance,
    y: point.y + vector.y * distance,
  };
}

function normalizeScreenVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function transformCanvasPoint(matrix, x, y) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function axisFromCanvasMatrix(matrix, anchor, x, y) {
  const point = transformCanvasPoint(matrix, x, y);
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const unit = Math.hypot(dx, dy) || 1;
  return {
    axis: { x: dx / unit, y: dy / unit },
    unit,
  };
}
