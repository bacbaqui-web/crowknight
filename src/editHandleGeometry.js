import {
  addScreenVector,
  axisFromCanvasMatrix,
  distanceToSegment,
  normalizeScreenVector,
  transformCanvasPoint,
} from './screenGeometry.js';
import { ANCHOR_HANDLE_RADIUS, MOVE_HANDLE_RADIUS, handleLineStart } from './editHandleDrawing.js';
import { isMasterPart } from './tuningLabels.js';
import { controlGroupPartKeys, imagePartKeys } from './tuningParts.js';

export function createPartEditHandleGeometry({ editFocusPartKey, editHandleInfo, poseFrameSelectionActive }) {
  if (!editFocusPartKey || !editHandleInfo) return null;

  const info = editHandleInfo;
  const isImagePart = imagePartKeys().includes(editFocusPartKey);
  const isMaster = isMasterPart(editFocusPartKey);
  const isScalablePart = isMaster || isImagePart || controlGroupPartKeys().includes(editFocusPartKey);
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
    handles.width = { mode: 'width', point: addScreenVector(anchor, left, 70), radius: 18 };
    handles.height = { mode: 'height', point: addScreenVector(anchor, up, 70), radius: 18 };
    handles.size = { mode: 'size', point: addScreenVector(anchor, sizeDir, 78), radius: 18 };
    handles.opacity = { mode: 'opacity', point: addScreenVector(anchor, opacityDir, 78), radius: 17 };
  }

  if (
    (isMaster && !poseFrameSelectionActive) ||
    (!isMaster && (isImagePart || controlGroupPartKeys().includes(editFocusPartKey)))
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
    isImagePart,
    isMaster,
    isScalablePart,
    handles,
  };
}

export function createEffectEditHandleGeometry(info) {
  if (!info) return null;

  const anchor = info.anchor;
  const xAxis = info.xAxis;
  const yAxis = info.yAxis;
  const up = { x: -yAxis.x, y: -yAxis.y };
  const left = { x: -xAxis.x, y: -xAxis.y };
  const sizeDir = normalizeScreenVector(xAxis.x + yAxis.x, xAxis.y + yAxis.y);
  const rotateDir = normalizeScreenVector(xAxis.x - yAxis.x, xAxis.y - yAxis.y);
  const opacityDir = normalizeScreenVector(-xAxis.x + yAxis.x, -xAxis.y + yAxis.y);

  return {
    isEffect: true,
    key: info.key,
    anchor,
    xAxis,
    yAxis,
    xUnit: info.xUnit || 1,
    yUnit: info.yUnit || 1,
    moveXAxis: info.moveXAxis,
    moveYAxis: info.moveYAxis,
    moveXUnit: info.moveXUnit || 1,
    moveYUnit: info.moveYUnit || 1,
    isImagePart: true,
    isMaster: false,
    isScalablePart: true,
    handles: {
      anchor: { mode: 'anchor', point: anchor, radius: ANCHOR_HANDLE_RADIUS },
      move: { mode: 'move', point: anchor, radius: MOVE_HANDLE_RADIUS },
      width: { mode: 'width', point: addScreenVector(anchor, left, 70), radius: 18 },
      height: { mode: 'height', point: addScreenVector(anchor, up, 70), radius: 18 },
      rotate: { mode: 'rotate', point: addScreenVector(anchor, rotateDir, 78), radius: 17 },
      size: { mode: 'size', point: addScreenVector(anchor, sizeDir, 78), radius: 18 },
      opacity: { mode: 'opacity', point: addScreenVector(anchor, opacityDir, 78), radius: 17 },
    },
  };
}

export function createEffectEditHandleInfo(ctx, frame, key, placementMatrix = null) {
  const matrix = ctx.getTransform();
  const anchor = transformCanvasPoint(matrix, 0, 0);
  const placement = placementMatrix || matrix;
  const xInfo = axisFromCanvasMatrix(matrix, anchor, 1, 0);
  const yInfo = axisFromCanvasMatrix(matrix, anchor, 0, 1);
  const moveXInfo = axisFromCanvasMatrix(placement, anchor, 1, 0);
  const moveYInfo = axisFromCanvasMatrix(placement, anchor, 0, 1);
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
  const widthDir = normalizeScreenVector(-1, 0);
  const heightDir = normalizeScreenVector(0, -1);
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
      width: { mode: 'width', point: addScreenVector(anchor, widthDir, 74), radius: 18 },
      height: { mode: 'height', point: addScreenVector(anchor, heightDir, 74), radius: 18 },
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
