export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function attackBoxOverlapsHitbox(attackBox, hitbox) {
  if (!attackBox?.points?.length) return rectsOverlap(attackBox, hitbox);
  if (!rectsOverlap(attackBox, hitbox)) return false;
  const hitboxPoints = [
    { x: hitbox.x, y: hitbox.y },
    { x: hitbox.x + hitbox.w, y: hitbox.y },
    { x: hitbox.x + hitbox.w, y: hitbox.y + hitbox.h },
    { x: hitbox.x, y: hitbox.y + hitbox.h },
  ];
  return convexPolygonsOverlap(attackBox.points, hitboxPoints);
}

function convexPolygonsOverlap(a, b) {
  return ![a, b].some((points) => {
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const axis = { x: -(next.y - current.y), y: next.x - current.x };
      const projectionA = projectPolygon(a, axis);
      const projectionB = projectPolygon(b, axis);
      if (projectionA.max < projectionB.min || projectionB.max < projectionA.min) return true;
    }
    return false;
  });
}

function projectPolygon(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.y * axis.y);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
