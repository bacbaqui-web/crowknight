import {
  INTERACTION_OBJECT_ROLES,
  ATTACK_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  COLLISION_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
} from './interaction_object_editor_controller.js';
import { scaledEditableAnchor } from './editable_object_model_helper.js';
import { deg } from './common_helper.js';
import {
  multiplyMatrix,
  rotationMatrix,
  scaleMatrix,
  transformMatrixPoint,
  translationMatrix,
} from './puppet_player_geometry_helper.js';

export function createInteractionRegion({
  key,
  role,
  matrix,
  x,
  y,
  w,
  h,
  ax = Number(w || 0) / 2,
  ay = Number(h || 0) / 2,
  rot = 0,
  active = true,
  interaction = null,
}) {
  const width = Math.max(1, Number(w || 1));
  const height = Math.max(1, Number(h || 1));
  const regionMatrix = multiplyMatrix(
    multiplyMatrix(matrix, translationMatrix(Number(x || 0), Number(y || 0))),
    rotationMatrix(deg(Number(rot || 0)))
  );
  const points = [
    transformMatrixPoint(regionMatrix, -Number(ax || 0), -Number(ay || 0)),
    transformMatrixPoint(regionMatrix, width - Number(ax || 0), -Number(ay || 0)),
    transformMatrixPoint(regionMatrix, width - Number(ax || 0), height - Number(ay || 0)),
    transformMatrixPoint(regionMatrix, -Number(ax || 0), height - Number(ay || 0)),
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
    reaction: interactionReactionFromValue(interaction),
  };
}

export function interactionReactionFromValue(value = {}) {
  return {
    stun: Math.max(0, Number(value?.stun || 0)),
    knockbackX: Number(value?.knockbackX || 0),
    knockbackY: Number(value?.knockbackY || 0),
    deathBurst: Math.max(0, Number(value?.deathBurst ?? 1)),
    pushPower: Math.max(0, Number(value?.pushPower || 0)),
  };
}

export function createActiveInteractionRegions(player, role) {
  return (player.hitRegions || [])
    .map((region) => createRecordedInteractionRegion(player, region, role))
    .filter(Boolean);
}

export function createRecordedInteractionRegion(player, region, role) {
  const interaction = region?.interaction || player.getPartOffset(region?.key);
  if (Number(interaction?.active || 0) < 0.5 || Number(interaction?.[role] || 0) < 0.5) return null;
  const bounds = region.bounds || {};
  return {
    key: region.key,
    role,
    active: true,
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    points: region.points,
    reaction: interactionReactionFromValue(interaction),
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

export function createAttackInteractionRegion(player, offset = player.getPartOffset(ATTACK_INTERACTION_OBJECT_KEY)) {
  const transform = player.weaponAnchorTransform();
  const attackPart = player.rig?.[ATTACK_INTERACTION_OBJECT_KEY];
  const weapon = player.rig?.weapon;
  if (!transform || !attackPart || !weapon) return null;

  const weaponOffset = player.getPartOffset('weapon');
  const referenceW = Math.max(1, Number(weapon.baseW || weapon.w || 1));
  const referenceH = Math.max(1, Number(weapon.baseH || weapon.h || 1));
  const weaponW = Math.max(1, Number(weapon.w || referenceW) + Number(weaponOffset.w || 0));
  const weaponH = Math.max(1, Number(weapon.h || referenceH) + Number(weaponOffset.h || 0));
  const anchorLocalX = Number(weapon.ax ?? weapon.ox ?? 0) + Number(weaponOffset.ax || 0);
  const anchorLocalY = Number(weapon.ay ?? weapon.oy ?? 0) + Number(weaponOffset.ay || 0);
  const scaledAnchorX = anchorLocalX * (weaponW / referenceW);
  const scaledAnchorY = anchorLocalY * (weaponH / referenceH);
  const x = -scaledAnchorX + Number(attackPart.x || 0) + Number(offset.x || 0);
  const y = -scaledAnchorY + Number(attackPart.y || 0) + Number(offset.y || 0);
  const w = Math.max(1, Number(attackPart.w || attackPart.baseW || 1) + Number(offset.w || 0));
  const h = Math.max(1, Number(attackPart.h || attackPart.baseH || 1) + Number(offset.h || 0));
  const attackAnchor = scaledEditableAnchor({
    ax: Number(attackPart.ax ?? w / 2) + Number(offset.ax || 0),
    ay: Number(attackPart.ay ?? h / 2) + Number(offset.ay || 0),
    w,
    h,
    baseW: attackPart.baseW || w,
    baseH: attackPart.baseH || h,
  });
  const rot = Number(attackPart.rot || 0) + Number(offset.rot || 0);
  return createInteractionRegion({
    key: ATTACK_INTERACTION_OBJECT_KEY,
    role: INTERACTION_OBJECT_ROLES.ATTACK,
    active: true,
    matrix: transform,
    x,
    y,
    w,
    h,
    ax: attackAnchor.ax,
    ay: attackAnchor.ay,
    rot,
    interaction: offset,
  });
}

export function createAttackInteractionRegions(player) {
  const regions = createActiveInteractionRegions(player, INTERACTION_OBJECT_ROLES.ATTACK);
  if (regions.length) return regions;

  const offset = player.getPartOffset(ATTACK_INTERACTION_OBJECT_KEY);
  if (Number(offset.active || 0) < 0.5 || Number(offset.attack || 0) < 0.5) return [];
  const fallback = createAttackInteractionRegion(player, offset);
  return fallback ? [fallback] : [];
}

export function createHurtInteractionRegion(player) {
  return createParentedInteractionRegion(player, HURT_INTERACTION_OBJECT_KEY, INTERACTION_OBJECT_ROLES.HURT);
}

export function createHurtInteractionRegions(player) {
  const regions = createActiveInteractionRegions(player, INTERACTION_OBJECT_ROLES.HURT);
  if (regions.length) return regions;

  const fallback = createHurtInteractionRegion(player);
  return fallback ? [fallback] : [];
}

export function createCollisionInteractionRegions(player) {
  const regions = createActiveInteractionRegions(player, INTERACTION_OBJECT_ROLES.COLLISION);
  if (regions.length) return regions;

  const offset = player.getPartOffset(COLLISION_INTERACTION_OBJECT_KEY);
  if (Number(offset.active || 0) < 0.5 || Number(offset.collision || 0) < 0.5) return [];
  const fallback = createParentedInteractionRegion(
    player,
    COLLISION_INTERACTION_OBJECT_KEY,
    INTERACTION_OBJECT_ROLES.COLLISION
  );
  return fallback ? [fallback] : [];
}

export function createGuardInteractionRegions(player) {
  const regions = createActiveInteractionRegions(player, INTERACTION_OBJECT_ROLES.GUARD);
  if (regions.length) return regions;

  const offset = player.getPartOffset(GUARD_INTERACTION_OBJECT_KEY);
  if (Number(offset.active || 0) < 0.5 || Number(offset.guard || 0) < 0.5) return [];
  const fallback = createParentedInteractionRegion(
    player,
    GUARD_INTERACTION_OBJECT_KEY,
    INTERACTION_OBJECT_ROLES.GUARD
  );
  return fallback ? [fallback] : [];
}

function createParentedInteractionRegion(player, boxKey, role) {
  const boxPart = player.rig?.[boxKey];
  if (!boxPart?.parent) return null;

  const parent = parentImageTransform(player, boxPart.parent);
  if (!parent) return null;

  const offset = player.getPartOffset(boxKey);
  const w = Math.max(1, Number(boxPart.w || boxPart.baseW || 1) + Number(offset.w || 0));
  const h = Math.max(1, Number(boxPart.h || boxPart.baseH || 1) + Number(offset.h || 0));
  const boxAnchor = scaledEditableAnchor({
    ax: Number(boxPart.ax ?? w / 2) + Number(offset.ax || 0),
    ay: Number(boxPart.ay ?? h / 2) + Number(offset.ay || 0),
    w,
    h,
    baseW: boxPart.baseW || w,
    baseH: boxPart.baseH || h,
  });
  return createInteractionRegion({
    key: boxKey,
    role,
    active: true,
    matrix: parent.matrix,
    x: parent.x + Number(boxPart.x || 0) + Number(offset.x || 0),
    y: parent.y + Number(boxPart.y || 0) + Number(offset.y || 0),
    w,
    h,
    ax: boxAnchor.ax,
    ay: boxAnchor.ay,
    rot: Number(boxPart.rot || 0) + Number(offset.rot || 0),
  });
}

function parentImageTransform(player, parentKey) {
  if (parentKey === 'weapon') {
    const weapon = player.rig?.weapon;
    const offset = player.getPartOffset('weapon');
    if (!weapon) return null;
    const referenceW = Math.max(1, Number(weapon.baseW || weapon.w || 1));
    const referenceH = Math.max(1, Number(weapon.baseH || weapon.h || 1));
    const width = Math.max(1, Number(weapon.w || referenceW) + Number(offset.w || 0));
    const height = Math.max(1, Number(weapon.h || referenceH) + Number(offset.h || 0));
    const anchorLocalX = Number(weapon.ax ?? weapon.ox ?? 0) + Number(offset.ax || 0);
    const anchorLocalY = Number(weapon.ay ?? weapon.oy ?? 0) + Number(offset.ay || 0);
    return {
      matrix: player.weaponAnchorTransform(),
      x: -anchorLocalX * (width / referenceW),
      y: -anchorLocalY * (height / referenceH),
    };
  }

  const part = player.rig?.[parentKey];
  if (!part) return null;

  const offset = player.getPartOffset(parentKey);
  const referenceW = Math.max(1, Number(part.baseW || part.w || 1));
  const referenceH = Math.max(1, Number(part.baseH || part.h || 1));
  const width = Math.max(1, Number(part.w || referenceW) + Number(offset.w || 0));
  const height = Math.max(1, Number(part.h || referenceH) + Number(offset.h || 0));
  const anchorLocalX = Number(part.ax ?? part.ox ?? 0) + Number(offset.ax || 0);
  const anchorLocalY = Number(part.ay ?? part.oy ?? 0) + Number(offset.ay || 0);
  const imageX = Number(part.x || 0) + Number(part.anchorOffsetX || 0) + Number(offset.x || 0);
  const imageY = Number(part.y || 0) + Number(part.anchorOffsetY || 0) + Number(offset.y || 0);
  const anchorX = imageX + anchorLocalX;
  const anchorY = imageY + anchorLocalY;
  const matrix = multiplyMatrix(
    multiplyMatrix(rootLayerMatrix(player), translationMatrix(anchorX, anchorY)),
    rotationMatrix(parentPoseRotation(player, parentKey) + deg(Number(part.rot || 0) + Number(offset.rot || 0)))
  );

  return {
    matrix,
    x: -anchorLocalX * (width / referenceW),
    y: -anchorLocalY * (height / referenceH),
  };
}

function rootLayerMatrix(player) {
  const pose = player.getPose();
  const master = player.getPartOffset('master');
  let matrix = translationMatrix(player.x, player.y + pose.bobY);
  matrix = multiplyMatrix(
    matrix,
    scaleMatrix(player.facing * player.transform.scale, player.transform.scale * pose.scaleY)
  );
  matrix = multiplyMatrix(matrix, translationMatrix(player.transform.anchorX, player.transform.anchorY));
  matrix = multiplyMatrix(matrix, rotationMatrix(pose.root));
  matrix = multiplyMatrix(matrix, translationMatrix(master.anchorX || 0, master.anchorY || 0));
  matrix = multiplyMatrix(matrix, translationMatrix(master.x || 0, master.y || 0));
  matrix = multiplyMatrix(matrix, rotationMatrix(deg(master.rot || 0)));
  matrix = multiplyMatrix(
    matrix,
    scaleMatrix(Math.max(0.05, 1 + Number(master.w || 0)), Math.max(0.05, 1 + Number(master.h || 0)))
  );
  matrix = multiplyMatrix(matrix, translationMatrix(-(master.anchorX || 0), -(master.anchorY || 0)));
  return matrix;
}

function parentPoseRotation(player, parentKey) {
  if (parentKey === 'body') return player.getPose().body;
  return 0;
}
