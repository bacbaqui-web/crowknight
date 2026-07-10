import {
  INTERACTION_OBJECT_ROLES,
  ATTACK_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  COLLISION_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
} from './interaction_object_editor_controller.js';
import { scaledEditableAnchor } from './editable_object_model_helper.js';
import { deg } from './common_helper.js';
import { timelineFrameCount } from './timeline_playback_helper.js';
import {
  multiplyMatrix,
  rotationMatrix,
  scaleMatrix,
  transformMatrixPoint,
  translationMatrix,
} from './puppet_player_geometry_helper.js';
import { isRuntimeDebugEnabled, recordRuntimeDebugEvent } from './runtime_debug_state.js';
import { normalizeInteractionSelectValue } from './interaction_field_data.js';
import { formulaFrameBoundary } from './formula_runtime_engine.js';

export function debugInteractionRuntimeLog(type, payload = {}) {
  if (!isRuntimeDebugEnabled()) return;
  recordRuntimeDebugEvent(type, payload);
  globalThis.console?.debug?.('[interaction-runtime]', type, payload);
}

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
    damage: 1,
    hitMode: normalizeInteractionSelectValue('hitMode', value?.hitMode),
    knockbackMode: normalizeInteractionSelectValue('knockbackMode', value?.knockbackMode),
    stun: Math.max(0, Number(value?.stun || 0)),
    knockbackX: Number(value?.knockbackX || 0),
    knockbackY: Number(value?.knockbackY || 0),
    knockback: Math.max(0, Number(value?.knockback || 0)),
    knockbackExtraVx: Number(value?.knockbackExtraVx || 0),
    knockbackExtraVy: Number(value?.knockbackExtraVy || 0),
    deathBurst: Math.max(0, Number(value?.deathBurst ?? 1)),
    pushPower: Math.max(0, Number(value?.pushPower || 0)),
    resistance: Math.max(0, Number(value?.resistance ?? 1)),
    noOverlap: Number(value?.noOverlap ?? 1) >= 0.5,
    hurtByAttack: Number(value?.hurtByAttack ?? 1) >= 0.5,
    hurtByCollision: Number(value?.hurtByCollision || 0) >= 0.5,
    invincibleTime: Math.max(0, Number(value?.invincibleTime || 0)),
    guard: Number(value?.guard ?? value?.block ?? 1) >= 0.5,
    block: Number(value?.guard ?? value?.block ?? 1) >= 0.5,
    parry: Number(value?.parry || 0) >= 0.5,
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
  const attackPart = player.rig?.[ATTACK_INTERACTION_OBJECT_KEY];
  if (!attackPart) return null;

  const interaction = activeInteractionValue(attackPart, offset, INTERACTION_OBJECT_ROLES.ATTACK);
  const placement = attackInteractionPlacement(player, attackPart, offset, interaction);
  if (!placement) return null;

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
    matrix: placement.matrix,
    x: placement.x,
    y: placement.y,
    w,
    h,
    ax: attackAnchor.ax,
    ay: attackAnchor.ay,
    rot,
    interaction,
  });
}

function attackInteractionPlacement(player, attackPart, offset, interaction) {
  if (!attackInteractionFollowsWeapon(interaction)) {
    return {
      matrix: rootLayerMatrix(player),
      x: Number(attackPart.x || 0) + Number(offset.x || 0),
      y: Number(attackPart.y || 0) + Number(offset.y || 0),
    };
  }

  const transform = player.weaponAnchorTransform();
  const weapon = player.rig?.weapon;
  if (!transform || !weapon) return null;

  const weaponOffset = player.getPartOffset('weapon');
  const referenceW = Math.max(1, Number(weapon.baseW || weapon.w || 1));
  const referenceH = Math.max(1, Number(weapon.baseH || weapon.h || 1));
  const weaponW = Math.max(1, Number(weapon.w || referenceW) + Number(weaponOffset.w || 0));
  const weaponH = Math.max(1, Number(weapon.h || referenceH) + Number(weaponOffset.h || 0));
  const anchorLocalX = Number(weapon.ax ?? weapon.ox ?? 0) + Number(weaponOffset.ax || 0);
  const anchorLocalY = Number(weapon.ay ?? weapon.oy ?? 0) + Number(weaponOffset.ay || 0);
  return {
    matrix: transform,
    x: -anchorLocalX * (weaponW / referenceW) + Number(attackPart.x || 0) + Number(offset.x || 0),
    y: -anchorLocalY * (weaponH / referenceH) + Number(attackPart.y || 0) + Number(offset.y || 0),
  };
}

function attackInteractionFollowsWeapon(value = {}) {
  return Number(value?.followWeapon ?? 1) >= 0.5;
}

export function createAttackInteractionRegions(player) {
  const regions = [];
  const offset = player.getPartOffset(ATTACK_INTERACTION_OBJECT_KEY);
  const flags = interactionFlagSnapshot(offset);
  if (flags.active && flags.attack) {
    const fallback = createAttackInteractionRegion(player, offset);
    if (fallback) regions.push(fallback);
    logAttackRegionDecision({
      player,
      source: 'runtime',
      key: ATTACK_INTERACTION_OBJECT_KEY,
      flags,
      created: Boolean(fallback),
      reason: fallback ? null : 'active=true attack=true but attack geometry is missing',
    });
  } else {
    logAttackRegionDecision({
      player,
      source: 'runtime',
      key: ATTACK_INTERACTION_OBJECT_KEY,
      flags,
      created: false,
    });
  }

  const guardAttack = createGuardAttackInteractionRegion(player);
  if (guardAttack) regions.push(guardAttack);
  return regions;
}

function createGuardAttackInteractionRegion(player) {
  const guardOffset = player.getPartOffset(GUARD_INTERACTION_OBJECT_KEY);
  const guardFlags = interactionFlagSnapshot(guardOffset);
  if (!guardFlags.active || !guardFlags.attack) return null;

  const attackPart = player.rig?.[ATTACK_INTERACTION_OBJECT_KEY] || {};
  const attackOffset = player.getPartOffset(ATTACK_INTERACTION_OBJECT_KEY);
  const attackFlags = interactionFlagSnapshot(attackOffset);
  const actionAttackSettings =
    player.actionSettings?.[player.actionKey]?.interactions?.[ATTACK_INTERACTION_OBJECT_KEY] || {};
  if (!attackFrameWindowActive(player, actionAttackSettings)) return null;
  const attackSettings =
    attackFlags.active && attackFlags.attack ? attackOffset : { ...attackOffset, ...actionAttackSettings };
  const attackInteraction = {
    ...attackPart,
    ...attackSettings,
    active: 1,
    attack: 1,
  };

  const fallback = createParentedInteractionRegion(
    player,
    GUARD_INTERACTION_OBJECT_KEY,
    INTERACTION_OBJECT_ROLES.ATTACK,
    guardOffset,
    attackInteraction
  );
  logAttackRegionDecision({
    player,
    source: 'runtime',
    key: GUARD_INTERACTION_OBJECT_KEY,
    flags: guardFlags,
    created: Boolean(fallback),
    reason: fallback ? null : 'active=true attack=true but guard geometry is missing',
  });
  return fallback;
}

function attackFrameWindowActive(player, settings = {}) {
  if (settings.startFrame === undefined && settings.endFrame === undefined) return true;
  const frameCount = Math.max(1, timelineFrameCount(player.actionSettings?.[player.actionKey] || {}));
  const progress = Math.max(0, Math.min(1, Number(player.getActionFrameProgress?.() || 0)));
  const frame = Math.max(1, Math.min(frameCount, Math.floor(progress * frameCount) + 1));
  const start = formulaFrameBoundary(settings.startFrame, frameCount, 1);
  const end = formulaFrameBoundary(settings.endFrame, frameCount, frameCount);
  return frame >= Math.min(start, end) && frame <= Math.max(start, end);
}

export function createHurtInteractionRegion(player) {
  return createParentedInteractionRegion(player, HURT_INTERACTION_OBJECT_KEY, INTERACTION_OBJECT_ROLES.HURT);
}

export function createHurtInteractionRegions(player) {
  if (!shouldCreateInteractionRegion(player, HURT_INTERACTION_OBJECT_KEY, INTERACTION_OBJECT_ROLES.HURT)) {
    if (isRuntimeDebugEnabled()) {
      debugInteractionRuntimeLog('hurt-region', {
        source: 'runtime',
        actionKey: player.actionKey,
        count: 0,
        hurtByAttack: false,
        hurtByCollision: false,
      });
    }
    return [];
  }
  const fallback = createHurtInteractionRegion(player);
  if (isRuntimeDebugEnabled()) {
    debugInteractionRuntimeLog('hurt-region', {
      source: 'runtime',
      actionKey: player.actionKey,
      count: fallback ? 1 : 0,
      hurtByAttack: fallback?.reaction?.hurtByAttack === true,
      hurtByCollision: fallback?.reaction?.hurtByCollision === true,
    });
  }
  return fallback ? [fallback] : [];
}

export function createCollisionInteractionRegions(player) {
  if (!shouldCreateInteractionRegion(player, COLLISION_INTERACTION_OBJECT_KEY, INTERACTION_OBJECT_ROLES.COLLISION)) {
    return [];
  }
  const fallback = createParentedInteractionRegion(
    player,
    COLLISION_INTERACTION_OBJECT_KEY,
    INTERACTION_OBJECT_ROLES.COLLISION
  );
  return fallback ? [fallback] : [];
}

export function createGuardInteractionRegions(player) {
  const offset = player.getPartOffset(GUARD_INTERACTION_OBJECT_KEY);
  if (Number(offset.active || 0) < 0.5 || Number(offset.guard || 0) < 0.5) return [];
  const fallback = createParentedInteractionRegion(
    player,
    GUARD_INTERACTION_OBJECT_KEY,
    INTERACTION_OBJECT_ROLES.GUARD
  );
  return fallback ? [fallback] : [];
}

function createParentedInteractionRegion(player, boxKey, role, offsetOverride = null, interactionOverride = null) {
  const boxPart = player.rig?.[boxKey];
  if (!boxPart?.parent) return null;

  const parent = parentImageTransform(player, boxPart.parent);
  if (!parent) return null;

  const offset = offsetOverride || player.getPartOffset(boxKey);
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
    interaction: interactionOverride || activeInteractionValue(boxPart, offset, role),
  });
}

function activeInteractionValue(boxPart, offset, role) {
  if (Number(offset?.active || 0) >= 0.5 && Number(offset?.[role] || 0) >= 0.5) {
    return { ...boxPart, ...offset };
  }
  return boxPart;
}

function shouldCreateInteractionRegion(player, boxKey, role) {
  const actionSetting = player.actionSettings?.[player.actionKey]?.interactions?.[boxKey];
  if (!actionSetting) return true;
  const offset = player.getPartOffset(boxKey);
  return Number(offset?.active || 0) >= 0.5 && Number(offset?.[role] || 0) >= 0.5;
}

function interactionFlagSnapshot(value = {}) {
  return {
    active: Number(value?.active || 0) >= 0.5,
    attack: Number(value?.attack || 0) >= 0.5,
    hurt: Number(value?.hurt || 0) >= 0.5,
    collision: Number(value?.collision || 0) >= 0.5,
    guard: Number(value?.guard || 0) >= 0.5,
  };
}

function logAttackRegionDecision({ player, source, key, flags, created, reason = null }) {
  if (!isRuntimeDebugEnabled()) return;
  const frame = currentActionDebugFrame(player);
  const offset = player.getPartOffset?.(key) || {};
  debugInteractionRuntimeLog(created ? 'attack-region-created' : 'attack-region-skipped', {
    actionKey: player.actionKey,
    frame: frame.frame,
    frameCount: frame.frameCount,
    progress: frame.progress,
    source,
    key,
    active: flags.active,
    attack: flags.attack,
    rawActive: Number(offset.active || 0),
    rawAttack: Number(offset.attack || 0),
    hurt: flags.hurt,
    collision: flags.collision,
    guard: flags.guard,
    reason: reason || attackRegionDecisionReason(flags, created),
  });
}

function currentActionDebugFrame(player) {
  const actionKey = player.actionKey;
  const settings = player.actionSettings?.[actionKey] || {};
  const frameCount = timelineFrameCount(settings);
  const progress = Number(player.getActionFrameProgress?.() || 0);
  const frame = Math.min(frameCount, Math.max(1, Math.round(progress * Math.max(0, frameCount - 1)) + 1));
  return { frame, frameCount, progress: Number(progress.toFixed(4)) };
}

function attackRegionDecisionReason(flags, created) {
  if (created) return 'active=true and attack=true';
  if (!flags.active && !flags.attack) return 'active=false and attack=false';
  if (!flags.active) return 'active=false';
  if (!flags.attack) return 'attack=false';
  return 'attack region was not created';
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
  if (parentKey === 'shield') {
    const shield = player.rig?.shield;
    const offset = player.getPartOffset('shield');
    const matrix = player.shieldAnchorTransform?.();
    if (!shield || !matrix) return null;
    const referenceW = Math.max(1, Number(shield.baseW || shield.w || 1));
    const referenceH = Math.max(1, Number(shield.baseH || shield.h || 1));
    const width = Math.max(1, Number(shield.w || referenceW) + Number(offset.w || 0));
    const height = Math.max(1, Number(shield.h || referenceH) + Number(offset.h || 0));
    const anchorLocalX = Number(shield.ax ?? shield.ox ?? 0) + Number(offset.ax || 0);
    const anchorLocalY = Number(shield.ay ?? shield.oy ?? 0) + Number(offset.ay || 0);
    return {
      matrix,
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
