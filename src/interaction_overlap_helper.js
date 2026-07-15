import { regionPoints, sweptInteractionRegion } from './interaction_swept_region_helper.js';

export function overlappingCollisionHurtRegion(collisionRegion, hurtRegions) {
  return (hurtRegions || []).find(
    (hurtRegion) =>
      hurtRegion?.reaction?.hurtByCollision === true && interactionRegionsOverlap(collisionRegion, hurtRegion)
  );
}

export function overlappingAttackRegion(attacker, attackRegions, hurtRegions) {
  return attackRegions.find((attackRegion) =>
    (hurtRegions || []).some(
      (hurtRegion) =>
        hurtRegion?.reaction?.hurtByAttack !== false && attackRegionOverlaps(attacker, attackRegion, hurtRegion)
    )
  );
}

export function overlappingGuardBlockAttackRegion(attacker, attackRegions, guardRegions) {
  return attackRegions.find((attackRegion) =>
    (guardRegions || []).some(
      (guardRegion) =>
        (guardRegion?.reaction?.guard === true || guardRegion?.reaction?.block === true) &&
        attackRegionOverlaps(attacker, attackRegion, guardRegion)
    )
  );
}

export function attackRegionOverlaps(attacker, attackRegion, targetRegion) {
  if (interactionRegionsOverlap(attackRegion, targetRegion)) return true;
  if (attackRegion?.reaction?.hitMode !== 'trace') return false;
  const previous = previousAttackRegion(attacker, attackRegion);
  if (!previous) return false;
  return interactionRegionsOverlap(sweptInteractionRegion(previous, attackRegion), targetRegion);
}

export function previousAttackRegion(attacker, attackRegion) {
  const currentActionKey = attacker?.player?.actionKey;
  return (attacker?.previousAttackRegions || []).find(
    (region) => region?.key === attackRegion?.key && region?.actionKey === currentActionKey
  );
}

export function interactionRegionsOverlap(activeRegion, targetRegion) {
  if (!activeRegion?.points?.length) return rectsOverlap(activeRegion, targetRegion);
  if (!rectsOverlap(activeRegion, targetRegion)) return false;
  return convexPolygonsOverlap(activeRegion.points, regionPoints(targetRegion));
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function convexPolygonsOverlap(a, b) {
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

export function projectPolygon(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.y * axis.y);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
