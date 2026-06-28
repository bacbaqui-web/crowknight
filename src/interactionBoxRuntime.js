import { INTERACTION_BOX_ROLES, ATTACK_INTERACTION_BOX_KEY } from './tuningInteractionBoxes.js';
import { deg } from './utils.js';
import { multiplyMatrix, rotationMatrix, transformMatrixPoint, translationMatrix } from './puppetPlayerGeometry.js';

export function createInteractionRegion({ key, role, matrix, x, y, w, h, rot = 0, active = true }) {
  const width = Math.max(1, Number(w || 1));
  const height = Math.max(1, Number(h || 1));
  const regionMatrix = multiplyMatrix(
    multiplyMatrix(matrix, translationMatrix(Number(x || 0) + width / 2, Number(y || 0) + height / 2)),
    rotationMatrix(deg(Number(rot || 0)))
  );
  const points = [
    transformMatrixPoint(regionMatrix, -width / 2, -height / 2),
    transformMatrixPoint(regionMatrix, width / 2, -height / 2),
    transformMatrixPoint(regionMatrix, width / 2, height / 2),
    transformMatrixPoint(regionMatrix, -width / 2, height / 2),
  ];
  const bounds = boundsFromPoints(points);

  return {
    key,
    role,
    active,
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    points,
  };
}

function boundsFromPoints(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

export function createAttackInteractionRegion(player, offset = player.getPartOffset(ATTACK_INTERACTION_BOX_KEY)) {
  const transform = player.weaponAnchorTransform();
  const attackPart = player.rig?.[ATTACK_INTERACTION_BOX_KEY];
  const weapon = player.rig?.weapon;
  if (!transform || !attackPart || !weapon) return null;

  const weaponOffset = player.getPartOffset('weapon');
  const referenceW = Math.max(1, Number(weapon.baseW || weapon.w || 1));
  const referenceH = Math.max(1, Number(weapon.baseH || weapon.h || 1));
  const weaponW = Math.max(1, Number(weapon.w || referenceW) + Number(weaponOffset.w || 0));
  const weaponH = Math.max(1, Number(weapon.h || referenceH) + Number(weaponOffset.h || 0));
  const anchorLocalX = Number(weapon.ax ?? weapon.ox ?? 0);
  const anchorLocalY = Number(weapon.ay ?? weapon.oy ?? 0);
  const scaledAnchorX = anchorLocalX * (weaponW / referenceW);
  const scaledAnchorY = anchorLocalY * (weaponH / referenceH);
  const x = -scaledAnchorX + Number(attackPart.x || 0) + Number(offset.x || 0);
  const y = -scaledAnchorY + Number(attackPart.y || 0) + Number(offset.y || 0);
  const w = Math.max(1, Number(attackPart.w || attackPart.baseW || 1) + Number(offset.w || 0));
  const h = Math.max(1, Number(attackPart.h || attackPart.baseH || 1) + Number(offset.h || 0));
  const rot = Number(attackPart.rot || 0) + Number(offset.rot || 0);
  return createInteractionRegion({
    key: ATTACK_INTERACTION_BOX_KEY,
    role: INTERACTION_BOX_ROLES.ATTACK,
    active: true,
    matrix: transform,
    x,
    y,
    w,
    h,
    rot,
  });
}
