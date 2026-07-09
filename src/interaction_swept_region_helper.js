export function regionPoints(region) {
  if (region?.points?.length) return region.points;
  return [
    { x: region.x, y: region.y },
    { x: region.x + region.w, y: region.y },
    { x: region.x + region.w, y: region.y + region.h },
    { x: region.x, y: region.y + region.h },
  ];
}

export function sweptInteractionRegion(previous, current) {
  const points = convexHull([...regionPoints(previous), ...regionPoints(current)]);
  const bounds = boundsFromRegionPoints(points);
  return {
    ...current,
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    points,
  };
}

export function cloneInteractionRegionSnapshot(region, actionKey) {
  return {
    key: region.key,
    actionKey,
    x: region.x,
    y: region.y,
    w: region.w,
    h: region.h,
    points: region.points?.map((point) => ({ x: point.x, y: point.y })) || null,
    reaction: { ...region.reaction },
  };
}

function boundsFromRegionPoints(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

function convexHull(points = []) {
  const sorted = [...points]
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 3) return sorted;
  const lower = [];
  sorted.forEach((point) => {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  });
  const upper = [];
  sorted
    .slice()
    .reverse()
    .forEach((point) => {
      while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
      upper.push(point);
    });
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function cross(origin, a, b) {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}
