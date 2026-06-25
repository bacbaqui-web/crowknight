import { axisFromMatrix, transformPoint } from './puppetPlayerGeometry.js';

export function recordPuppetImageRegion(player, ctx, key, x, y, w, h) {
  if (!key) return;

  const matrix = ctx.getTransform();
  const points = [
    transformPoint(matrix, x, y),
    transformPoint(matrix, x + w, y),
    transformPoint(matrix, x + w, y + h),
    transformPoint(matrix, x, y + h),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  player.hitRegions.push({
    key,
    points,
    bounds: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    },
  });
}

export function recordPuppetEditHandle(player, ctx, key, placementMatrix = null) {
  if (!key) return;

  const matrix = ctx.getTransform();
  const anchor = transformPoint(matrix, 0, 0);
  const placement = placementMatrix || matrix;
  const partX = axisFromMatrix(matrix, anchor, 1, 0);
  const partY = axisFromMatrix(matrix, anchor, 0, 1);
  const moveX = axisFromMatrix(placement, anchor, 1, 0);
  const moveY = axisFromMatrix(placement, anchor, 0, 1);
  player.editHandles[key] = {
    key,
    anchor,
    xAxis: partX.axis,
    yAxis: partY.axis,
    xUnit: partX.unit,
    yUnit: partY.unit,
    moveXAxis: moveX.axis,
    moveYAxis: moveY.axis,
    moveXUnit: moveX.unit,
    moveYUnit: moveY.unit,
  };
}

export function recordPuppetJointRegion(player, ctx, key, x, y) {
  const matrix = ctx.getTransform();
  const point = transformPoint(matrix, x, y);
  const size = 18;
  player.hitRegions.push({
    key,
    points: null,
    bounds: {
      x: point.x - size / 2,
      y: point.y - size / 2,
      w: size,
      h: size,
    },
  });
  recordPuppetJointEditHandle(player, matrix, key, x, y);
}

export function recordPuppetAnchorDebugPoint(player, ctx, x, y) {
  const matrix = ctx.getTransform();
  player.anchorDebugPoints.push({
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  });
}

function recordPuppetJointEditHandle(player, matrix, key, x, y) {
  const anchor = transformPoint(matrix, x, y);
  const xInfo = axisFromMatrix(matrix, anchor, x + 1, y);
  const yInfo = axisFromMatrix(matrix, anchor, x, y + 1);
  player.editHandles[key] = {
    key,
    anchor,
    xAxis: xInfo.axis,
    yAxis: yInfo.axis,
    xUnit: xInfo.unit,
    yUnit: yInfo.unit,
    moveXAxis: xInfo.axis,
    moveYAxis: yInfo.axis,
    moveXUnit: xInfo.unit,
    moveYUnit: yInfo.unit,
  };
}
