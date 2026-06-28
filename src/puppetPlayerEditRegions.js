import { axisFromMatrix, transformPoint } from './puppetPlayerGeometry.js';

export function recordPuppetImageRegion(player, ctx, key, x, y, w, h) {
  if (!key) return null;

  const matrix = ctx.getTransform();
  const points = [
    transformPoint(matrix, x, y),
    transformPoint(matrix, x + w, y),
    transformPoint(matrix, x + w, y + h),
    transformPoint(matrix, x, y + h),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const region = {
    key,
    points,
    bounds: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    },
  };
  player.hitRegions.push(region);
  return region;
}

export function recordPuppetEditHandle(player, ctx, key, placementMatrix = null) {
  if (!key) return null;

  const matrix = ctx.getTransform();
  const anchor = transformPoint(matrix, 0, 0);
  const placement = placementMatrix || matrix;
  const partX = axisFromMatrix(matrix, anchor, 1, 0);
  const partY = axisFromMatrix(matrix, anchor, 0, 1);
  const moveX = axisFromMatrix(placement, anchor, 1, 0);
  const moveY = axisFromMatrix(placement, anchor, 0, 1);
  const handle = {
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
  player.editHandles[key] = handle;
  return handle;
}

export function recordPuppetRectPart(player, ctx, key, x, y, w, h, { rot = 0, type = 'part', source = null } = {}) {
  if (!key) return null;

  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  const placementMatrix = ctx.getTransform();
  ctx.rotate((Number(rot || 0) * Math.PI) / 180);
  const region = recordPuppetImageRegion(player, ctx, key, -w / 2, -h / 2, w, h);
  const handle = recordPuppetEditHandle(player, ctx, key, placementMatrix);
  if (handle && region) {
    handle.target = {
      type,
      key,
      source,
      center: { ...handle.anchor },
      x: region.bounds.x,
      y: region.bounds.y,
      w: region.bounds.w,
      h: region.bounds.h,
      points: region.points,
      bounds: region.bounds,
    };
  }
  ctx.restore();

  return handle;
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
