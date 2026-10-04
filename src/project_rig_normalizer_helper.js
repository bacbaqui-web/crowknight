import { normalizeCharacterHud } from './character_hud_layout_helper.js';
import { controlGroupPartKeys, imagePartKeys } from './part_source_data.js';
import {
  COLLISION_INTERACTION_OBJECT_KEY,
  HURT_INTERACTION_OBJECT_KEY,
  GUARD_INTERACTION_OBJECT_KEY,
  ATTACK_INTERACTION_OBJECT_KEY,
  INTERACTION_OBJECT_PART_TYPE,
  interactionObjectParentPartKey,
} from './interaction_object_model_data.js';
import { clamp } from './common_helper.js';
import { mergeInto } from './project_object_merge_helper.js';
import { normalizeInteractionFields } from './project_interaction_normalizer_helper.js';

export function normalizeRigInteractionObjectParts(tuning, base, saved = null) {
  const rig = tuning.rig;
  [
    COLLISION_INTERACTION_OBJECT_KEY,
    HURT_INTERACTION_OBJECT_KEY,
    ATTACK_INTERACTION_OBJECT_KEY,
    GUARD_INTERACTION_OBJECT_KEY,
  ].forEach((key) => {
    const savedRigPart = saved?.rig?.[key];
    const current = savedRigPart ? rig[key] : null;
    rig[key] = normalizeRigInteractionObjectPart({
      current,
      fallback: base.rig?.[key],
      parent: rig[interactionObjectParentPartKey(key)],
    });
  });
}

export function normalizeRigInteractionObjectPart({ current, fallback = {}, parent = {} }) {
  const source = current || fallback;
  const width = Math.max(1, Number(source.w ?? fallback.w ?? parent.w ?? 1));
  const height = Math.max(1, Number(source.h ?? fallback.h ?? parent.h ?? 1));
  const baseW = Math.max(1, Number(source.baseW ?? fallback.baseW ?? parent.w ?? source.w ?? 1));
  const baseH = Math.max(1, Number(source.baseH ?? fallback.baseH ?? parent.h ?? source.h ?? 1));
  const fallbackAx = Number(fallback.ax ?? width / 2);
  const fallbackAy = Number(fallback.ay ?? height / 2);
  const ax = Number(source.ax ?? fallbackAx);
  const ay = Number(source.ay ?? fallbackAy);
  return {
    type: INTERACTION_OBJECT_PART_TYPE,
    parent: source.parent || fallback.parent || null,
    x: Number(source.x ?? fallback.x ?? 0),
    y: Number(source.y ?? fallback.y ?? 0),
    ax,
    ay,
    w: width,
    h: height,
    baseW,
    baseH,
    rot: Number(source.rot ?? fallback.rot ?? 0),
    opacity: clamp(Number(source.opacity ?? fallback.opacity ?? 1), 0, 1),
    ...normalizeInteractionFields(source, fallback),
  };
}

export function normalizeSetupHudAnchors(tuning, base, legacyHudAnchors = tuning.hudAnchors) {
  tuning.hud = normalizeCharacterHud(tuning.hud, base.hud, legacyHudAnchors);
  delete tuning.hudAnchors;
}

export function normalizeMovementScalars(tuning) {
  tuning.speed = 0;
  tuning.runAcceleration = 0;
  tuning.jumpPower = 0;
  tuning.airFlapPower = 0;
  tuning.airFlapCooldown = 0;
  tuning.glideTimeMax = 0;
  tuning.glideFallSpeed = 0;
  tuning.dashCooldownMax = 0;
  tuning.attackCooldownMax = 0;
  tuning.comboResetTime = 0;
  tuning.invulnerability = { hurt: 0, rollEnd: 0 };
}

export function normalizeMotionSettings(motion, fallback) {
  void fallback;
  delete motion.animationIntensity;
  delete motion.walkBob;
  delete motion.rollIntensity;
  delete motion.rollWeapon;
  delete motion.rollGhostCount;
  delete motion.rollGhostInterval;
  delete motion.rollGhostLife;
  delete motion.rollGhostOpacity;
}

export function migrateSplitRigParts(rig, sourceRig = {}) {
  const pairs = [
    ['upperArm', 'upperArmL', 'upperArmR'],
    ['lowerArm', 'lowerArmL', 'lowerArmR'],
    ['upperLeg', 'upperLegL', 'upperLegR'],
    ['lowerLeg', 'lowerLegL', 'lowerLegR'],
  ];

  pairs.forEach(([legacy, left, right]) => {
    if (!sourceRig?.[legacy]) return;
    if (!sourceRig[left]) mergeInto(rig[left], sourceRig[legacy]);
    if (!sourceRig[right]) mergeInto(rig[right], sourceRig[legacy]);
  });
}

export function normalizeControlGroups(rig) {
  controlGroupPartKeys().forEach((key) => {
    const part = rig[key];
    if (!part) return;
    part.w = Number(part.w ?? 1);
    part.h = Number(part.h ?? 1);
    part.ax = Number(part.ax || 0);
    part.ay = Number(part.ay || 0);
    part.anchorOffsetX = Number(part.anchorOffsetX || 0);
    part.anchorOffsetY = Number(part.anchorOffsetY || 0);
    part.opacity = Number(part.opacity ?? 1);
    part.rot = Number(part.rot || 0);
  });
}

export function normalizeRigImageAnchors(rig, sourceRig = null) {
  imagePartKeys().forEach((key) => {
    const part = rig[key];
    if (!part) return;
    const sourcePart = sourceRig?.[key];
    part.baseW ||= Number(part.w || 1);
    part.baseH ||= Number(part.h || 1);
    part.opacity ??= 1;
    part.anchorOffsetX = Number(part.anchorOffsetX || 0);
    part.anchorOffsetY = Number(part.anchorOffsetY || 0);
    const needsMigration = part.anchorMode !== 'local' || (sourcePart && sourcePart.anchorMode !== 'local');
    if (needsMigration) {
      const oldAnchorX = Number(part.ax ?? part.x ?? 0);
      const oldAnchorY = Number(part.ay ?? part.y ?? 0);
      const oldImageX = Number(part.x || 0);
      const oldImageY = Number(part.y || 0);
      part.x = oldAnchorX + oldImageX - Number(part.ox || 0);
      part.y = oldAnchorY + oldImageY - Number(part.oy || 0);
      part.ax = Number(part.ox || 0);
      part.ay = Number(part.oy || 0);
      part.baseW ||= Number(part.w || 1);
      part.baseH ||= Number(part.h || 1);
      part.anchorMode = 'local';
    }
  });
}

export function normalizeRigRotations(rig, baseRig) {
  Object.keys(baseRig).forEach((key) => {
    if (!rig[key]) return;
    if ('rot' in baseRig[key] && !('rot' in rig[key])) rig[key].rot = 0;
  });
}

export function normalizeLayerOrder(current, fallback) {
  const valid = new Set(fallback);
  const kept = (current || []).filter((layer) => valid.has(layer));
  const missing = fallback.filter((layer) => !kept.includes(layer));
  return [...kept, ...missing];
}
