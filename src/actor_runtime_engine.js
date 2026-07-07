import { clamp, clone, deg, lerp } from './common_helper.js';
import {
  INTERACTION_NUMERIC_PROPS,
  INTERACTION_TOGGLE_PROPS,
  interactionDefaultValue,
} from './interaction_field_data.js';
import { DEFAULT_PLAYER_TUNING } from './player_default_tuning_data.js';
import {
  createAttackInteractionRegions,
  createCollisionInteractionRegions,
  createGuardInteractionRegions,
  createHurtInteractionRegions,
} from './interaction_region_engine.js';
import {
  drawPuppetArm,
  drawPuppetImageGlow,
  drawPuppetImagePart,
  drawPuppetLayer,
  drawPuppetLeg,
  drawPuppetPlayer,
  puppetGroupControl,
} from './actor_renderer.js';
import {
  canPuppetAirFlap,
  getPuppetJumpRiseProgress,
  isPuppetGliding,
  registerPuppetGuardBlock,
  tryPuppetAttack,
  updatePuppetGuardInput,
  updatePuppetNpc,
  updatePuppetPlayer,
  updatePuppetPlayerState,
} from './actor_action_helper.js';
import {
  applyActionAnchor,
  identityMatrix,
  interpolateFrameValues,
  multiplyMatrix,
  rotationMatrix,
  scaleMatrix,
  translationMatrix,
} from './puppet_player_geometry_helper.js';
import { createPuppetPose } from './actor_pose_helper.js';
import { actionDescriptors } from './action_authoring_data.js';
import { timelinePlaybackProgress } from './timeline_playback_helper.js';
import { actionTimelineMirrorSign, mirrorActionFrameValue } from './action_mirror_helper.js';
import { ACTION_FPS, ACTION_PART_KEYS } from './game_config_data.js';
import { normalizeActionBlendFrames } from './action_blend_helper.js';
import { actionFormula } from './formula_runtime_engine.js';
import { normalizeActionCondition } from './action_condition_helper.js';
import { normalizeActionGroup } from './action_group_helper.js';
import { interactionObjectRole, isInteractionObjectPartKey } from './interaction_object_editor_controller.js';

const ACTION_BLEND_VISUAL_KEYS = ['x', 'y', 'ax', 'ay', 'w', 'h', 'rot', 'opacity', 'anchorX', 'anchorY'];

function blendActionOffset(from = {}, to = {}, current = {}, t = 1) {
  const next = { ...current };
  ACTION_BLEND_VISUAL_KEYS.forEach((key) => {
    const start = Number(from?.[key] ?? next[key] ?? 0);
    const end = Number(to?.[key] ?? next[key] ?? 0);
    next[key] = lerp(start, end, t);
  });
  return next;
}

function canRunFallbackCondition(player, key) {
  const condition = normalizeActionCondition(player.actionSettings?.[key]?.condition);
  if (condition === 'ground') return player.onGround === true;
  if (condition === 'air') return player.onGround === false;
  return true;
}

function interactionValueEnabled(value = {}, role) {
  return Number(value?.active || 0) >= 0.5 && Number(value?.[role] || 0) >= 0.5;
}

export class PuppetPlayer {
  constructor(x, y, assets) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.vxInertia = null;
    this.vyInertia = null;
    this.assets = assets;
    this.facing = 1;
    this.state = 'idle';
    this.animTime = 0;
    this.stateTime = 0;
    this.onGround = true;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.rollDirection = 1;
    this.rollDuration = 0.28;
    this.jumpHoldTime = 0;
    this.jumpStartVy = 0;
    this.jumpStartY = y;
    this.airFlapCooldownTime = 0;
    this.glideTime = 0;
    this.glideActive = false;
    this.attackTime = 0;
    this.jumpAttackTime = 0;
    this.jumpAttackDuration = 0.34;
    this.attackCooldown = 0;
    this.attackDuration = 0.18;
    this.comboStep = 0;
    this.comboTimer = 0;
    this.attackSerial = 0;
    this.attackCarrySpeed = 0;
    this.customActionKey = null;
    this.customActionFacing = null;
    this.customActionViewFacing = null;
    this.customActionTriggerMode = 'tap';
    this.customActionPressCodes = null;
    this.customActionTime = 0;
    this.customActionDuration = 0;
    this.customActionElapsed = 0;
    this.customActionMoveProgress = 0;
    this.customActionBlend = null;
    this.fallbackActionKey = 'idle';
    this.hurtTime = 0;
    this.guardActive = false;
    this.guardHits = 0;
    this.guardBlockTime = 0;
    this.guardBreakTime = 0;
    this.guardLockedUntilRelease = false;
    this.dead = false;
    this.debugInteractionObjects = false;
    this.velocityControl = null;
    this.aiTimer = 0;
    this.aiDir = Math.random() > 0.5 ? 1 : -1;
    this.applyTuning(DEFAULT_PLAYER_TUNING);
  }

  applyTuning(tuning) {
    const next = clone(tuning);
    this.transform = next.transform;
    this.effects = next.effects;
    this.layerOrder = next.layerOrder;
    this.actions = actionDescriptors(next);
    this.customActions = next.customActions || [];
    this.modifiers = next.modifiers;
    this.actionOffsets = next.actionOffsets;
    this.actionSettings = next.actionSettings;
    this.rig = next.rig;
    if (this.customActionKey && !this.customActions.some((action) => action.key === this.customActionKey)) {
      this.customActionKey = null;
      this.customActionFacing = null;
      this.customActionViewFacing = null;
      this.customActionTriggerMode = 'tap';
      this.customActionPressCodes = null;
      this.customActionTime = 0;
      this.customActionDuration = 0;
      this.customActionElapsed = 0;
      this.customActionMoveProgress = 0;
      this.customActionBlend = null;
      this.velocityControl = null;
    }
  }

  get hurtInteractionRegion() {
    return this.hurtInteractionRegions[0] || { x: this.x, y: this.y, w: 1, h: 1 };
  }

  get hurtInteractionRegions() {
    return createHurtInteractionRegions(this);
  }

  get collisionInteractionRegions() {
    return createCollisionInteractionRegions(this);
  }

  get guardInteractionRegions() {
    return createGuardInteractionRegions(this);
  }

  get attackInteractionRegion() {
    return this.attackInteractionRegions[0] || null;
  }

  get attackInteractionRegions() {
    return this.activeAttackInteractionRegions();
  }

  get isRolling() {
    return false;
  }

  get canRollUseWeapon() {
    return false;
  }

  get isAttacking() {
    return this.isCustomActionActive;
  }

  get isCustomActionActive() {
    return Boolean(this.customActionKey && this.customActionTime > 0);
  }

  activeAttackInteractionRegions() {
    return createAttackInteractionRegions(this);
  }

  weaponAnchorTransform() {
    const pose = this.getPose();
    const rig = this.rig;
    const master = this.getPartOffset('master');
    const shoulder = this.getPartOffset('shoulderR');
    const upperPart = rig.upperArmR;
    const lowerPart = rig.lowerArmR;
    const weapon = rig.weapon;
    const weaponOffset = this.getPartOffset('weapon');
    const weaponX = (weapon.x || 0) + (weapon.anchorOffsetX || 0) + weaponOffset.x;
    const weaponY = (weapon.y || 0) + (weapon.anchorOffsetY || 0) + weaponOffset.y;
    const anchorLocalX = weapon.ax ?? weapon.ox ?? 0;
    const anchorLocalY = weapon.ay ?? weapon.oy ?? 0;
    const shoulderGroup = this.groupControl(rig.shoulderR, shoulder);
    let matrix = identityMatrix();

    matrix = multiplyMatrix(matrix, translationMatrix(this.x, this.y + pose.bobY));
    matrix = multiplyMatrix(
      matrix,
      scaleMatrix(this.facing * this.transform.scale, this.transform.scale * pose.scaleY)
    );
    matrix = multiplyMatrix(matrix, translationMatrix(this.transform.anchorX, this.transform.anchorY));
    matrix = multiplyMatrix(matrix, rotationMatrix(pose.root));
    matrix = multiplyMatrix(matrix, translationMatrix(master.anchorX || 0, master.anchorY || 0));
    matrix = multiplyMatrix(matrix, translationMatrix(master.x || 0, master.y || 0));
    matrix = multiplyMatrix(matrix, rotationMatrix(deg(master.rot || 0)));
    matrix = multiplyMatrix(
      matrix,
      scaleMatrix(Math.max(0.05, 1 + Number(master.w || 0)), Math.max(0.05, 1 + Number(master.h || 0)))
    );
    matrix = multiplyMatrix(matrix, translationMatrix(-(master.anchorX || 0), -(master.anchorY || 0)));
    matrix = multiplyMatrix(
      matrix,
      translationMatrix(
        rig.shoulderR.x + shoulder.x + Number(shoulderGroup.anchorOffsetX || 0) + Number(shoulderGroup.ax || 0),
        rig.shoulderR.y + shoulder.y + Number(shoulderGroup.anchorOffsetY || 0) + Number(shoulderGroup.ay || 0)
      )
    );
    matrix = multiplyMatrix(
      matrix,
      scaleMatrix(Math.max(0.05, shoulderGroup.w ?? 1), Math.max(0.05, shoulderGroup.h ?? 1))
    );
    matrix = multiplyMatrix(
      matrix,
      rotationMatrix(pose.upperArmR + deg((rig.shoulderR.rot || 0) + (shoulder.rot || 0)))
    );
    matrix = multiplyMatrix(matrix, translationMatrix(-Number(shoulderGroup.ax || 0), -Number(shoulderGroup.ay || 0)));
    matrix = multiplyMatrix(matrix, translationMatrix(0, upperPart.h - 8));
    matrix = multiplyMatrix(matrix, rotationMatrix(pose.lowerArmR));
    matrix = multiplyMatrix(matrix, translationMatrix(0, lowerPart.h - 4));
    matrix = multiplyMatrix(matrix, rotationMatrix(pose.weapon));
    matrix = multiplyMatrix(matrix, translationMatrix(weaponX + anchorLocalX, weaponY + anchorLocalY));
    matrix = multiplyMatrix(matrix, rotationMatrix(deg((weapon.rot || 0) + (weaponOffset.rot || 0))));
    return matrix;
  }

  get isGuarding() {
    return false;
  }

  isAttackStrikeActive() {
    return false;
  }

  isJumpAttackStrikeActive() {
    return false;
  }

  get rollSpeed() {
    return 0;
  }

  get attackLungeSpeed() {
    return 0;
  }

  update(dt, keys, pressed, world) {
    updatePuppetPlayer(this, dt, keys, pressed, world);
  }

  getJumpRiseProgress() {
    return getPuppetJumpRiseProgress(this);
  }

  canAirFlap() {
    return canPuppetAirFlap(this);
  }

  updateNpc(dt, target, world, bounds = null) {
    updatePuppetNpc(this, dt, target, world, bounds);
  }

  updateState() {
    updatePuppetPlayerState(this);
  }

  isGliding(jumpHeld) {
    return isPuppetGliding(this, jumpHeld);
  }

  tryAttack() {
    return tryPuppetAttack(this);
  }

  get attackProgress() {
    return 1;
  }

  get jumpAttackProgress() {
    return 1;
  }

  updateGuardInput(guardHeld) {
    updatePuppetGuardInput(this, guardHeld);
  }

  registerGuardBlock() {
    return registerPuppetGuardBlock(this);
  }

  get actionKey() {
    if (this.actionPreview?.action) return this.actionPreview.action;
    if (this.isCustomActionActive) return this.customActionKey;
    return this.fallbackActionKey || this.resolveFallbackActionKey() || 'idle';
  }

  getPartOffset(key) {
    const value = this.actionOffsets?.[this.actionKey]?.[key];
    const resolved = this.resolveInteractionActionLevelOffset(key, this.resolveActionOffset(value));
    return this.resolveActionBlendOffset(key, resolved);
  }

  get actionMirrorSettings() {
    return this.actionSettings?.[this.actionKey] || {};
  }

  resolveActionOffset(value) {
    return this.resolveActionOffsetAt(value, this.getActionFrameProgress(), this.actionMirrorSettings, this.facing);
  }

  resolveInteractionActionLevelOffset(key, timelineOffset) {
    if (!isInteractionObjectPartKey(key)) return timelineOffset;
    const role = interactionObjectRole(key);
    const actionValue = this.actionSettings?.[this.actionKey]?.interactions?.[key];
    if (!role || !actionValue) return timelineOffset;
    if (interactionValueEnabled(timelineOffset, role)) return timelineOffset;
    if (!interactionValueEnabled(actionValue, role)) return timelineOffset;
    return { ...timelineOffset, ...actionValue };
  }

  resolveActionOffsetForAction(actionKey, partKey, progress = 0, facing = this.facing) {
    return this.resolveActionOffsetAt(
      this.actionOffsets?.[actionKey]?.[partKey],
      progress,
      this.actionSettings?.[actionKey] || {},
      facing
    );
  }

  resolveActionOffsetAt(value, progress, settings = {}, facing = this.facing) {
    const empty = {
      x: 0,
      y: 0,
      ax: 0,
      ay: 0,
      w: 0,
      h: 0,
      rot: 0,
      opacity: 1,
      anchorX: 0,
      anchorY: 0,
      active: 0,
      attack: 0,
      hurt: 0,
      collision: 0,
      guard: 0,
      ...emptyInteractionValues(),
    };
    if (!value) return empty;
    const mirror = (frame) => mirrorActionFrameValue(frame, actionTimelineMirrorSign(settings, facing));
    if (Array.isArray(value.keyframes) && value.keyframes.length) {
      return mirror(applyActionAnchor(interpolateFrameValues(value.keyframes, progress, empty), value));
    }
    if (!value.start && !value.end) return mirror({ ...empty, ...value });

    const start = { ...empty, ...(value.start || {}) };
    const end = { ...empty, ...(value.end || start) };
    const t = progress;
    return mirror({
      x: lerp(start.x, end.x, t),
      y: lerp(start.y, end.y, t),
      ax: lerp(start.ax, end.ax, t),
      ay: lerp(start.ay, end.ay, t),
      w: lerp(start.w, end.w, t),
      h: lerp(start.h, end.h, t),
      rot: lerp(start.rot, end.rot, t),
      opacity: lerp(start.opacity, end.opacity, t),
      anchorX: Number(value.anchorX || 0),
      anchorY: Number(value.anchorY || 0),
      active: Number(start.active || 0) >= 0.5 ? 1 : 0,
      attack: Number(start.attack || 0) >= 0.5 ? 1 : 0,
      hurt: Number(start.hurt || 0) >= 0.5 ? 1 : 0,
      collision: Number(start.collision || 0) >= 0.5 ? 1 : 0,
      guard: Number(start.guard || 0) >= 0.5 ? 1 : 0,
      ...interpolateInteractionValues(start, end, t),
    });
  }

  beginCustomActionBlend(nextActionKey, nextFacing = this.facing) {
    const settings = this.actionSettings?.[nextActionKey] || {};
    const blendRule = actionFormula(settings, 'blend');
    const hasBlendRule = Boolean(blendRule);
    const legacyFrames = normalizeActionBlendFrames(settings.blendFrames);
    const frames = hasBlendRule
      ? blendRule?.enabled && Number(blendRule.startFrame || 1) <= 1
        ? normalizeActionBlendFrames(blendRule.frames)
        : 0
      : legacyFrames;
    if (frames <= 0) {
      this.customActionBlend = null;
      return;
    }
    const facing = nextFacing === -1 || nextFacing === 1 ? nextFacing : this.facing;
    const from = {};
    const to = {};
    ACTION_PART_KEYS.forEach((partKey) => {
      from[partKey] = this.getPartOffset(partKey);
      to[partKey] = this.resolveActionOffsetForAction(nextActionKey, partKey, 0, facing);
    });
    this.customActionBlend = {
      frames,
      elapsedFrames: 0,
      from,
      to,
    };
  }

  advanceCustomActionBlendFrame(dt = 0) {
    if (!this.customActionBlend) return false;
    const elapsedDeltaFrames = Math.max(0, Number(dt || 0)) * ACTION_FPS;
    this.customActionBlend.elapsedFrames = Math.max(
      0,
      Number(this.customActionBlend.elapsedFrames || 0) + elapsedDeltaFrames
    );
    if (this.customActionBlend.elapsedFrames >= this.customActionBlend.frames) this.customActionBlend = null;
    return Boolean(this.customActionBlend);
  }

  resolveActionBlendOffset(partKey, current) {
    const blend = this.customActionBlend;
    if (!blend) return current;
    const frames = Math.max(1, Number(blend.frames || 1));
    const t = clamp(Number(blend.elapsedFrames || 0) / frames, 0, 1);
    return blendActionOffset(blend.from?.[partKey], blend.to?.[partKey] || current, current, t);
  }

  getActionFrameProgress() {
    if (Number.isFinite(this.actionPreview?.t)) return clamp(this.actionPreview.t, 0, 1);
    if (this.actionPreview?.playing) {
      const settings = this.actionSettings?.[this.actionPreview.action] || {};
      const duration = Math.max(0.05, Number(settings.duration || 0.6));
      const startedAt = Number(this.actionPreview.startedAt || performance.now());
      const elapsed = (performance.now() - startedAt) / 1000;
      const raw = (elapsed / duration) * this.getActionPlaybackRate(this.actionPreview.action);
      return timelinePlaybackProgress(raw, this.actionPreview.playback);
    }

    if (this.actionPreview?.frame) return this.actionPreview.frame === 'end' ? 1 : 0;
    if (this.isCustomActionActive) {
      const settings = this.actionSettings?.[this.customActionKey] || {};
      const duration = Math.max(
        0.01,
        Number(this.customActionDuration || this.getActionDuration(this.customActionKey, 0.6))
      );
      const raw = Math.max(0, Number(this.customActionElapsed || 0)) / duration;
      const playback = this.customActionTriggerMode === 'pressLoop' ? settings.playback : 'once';
      return timelinePlaybackProgress(raw, playback);
    }
    return this.getTimelineProgress(this.actionKey, false);
  }

  getTimelineProgress(key, forceLoop = false) {
    const settings = this.actionSettings?.[key] || {};
    const duration = Math.max(0.05, Number(settings.duration || 0.6));
    const raw = (this.stateTime / duration) * this.getActionPlaybackRate(key);
    return timelinePlaybackProgress(raw, forceLoop ? 'loop' : settings.playback);
  }

  getActionPlaybackRate(key) {
    return Math.max(0.1, Number(this.actionSettings?.[key]?.playbackRate || 1));
  }

  getActionDuration(key, fallback) {
    const settings = this.actionSettings?.[key] || {};
    const duration = Math.max(0.05, Number(settings.duration || fallback));
    return duration / this.getActionPlaybackRate(key);
  }

  resolveFallbackActionKey() {
    const candidates = (this.actions || []).filter((action) => normalizeActionGroup(action.group) === 'base');
    const matched = candidates.find((action) => canRunFallbackCondition(this, action.key));
    return matched?.key || (this.actionSettings?.idle || this.actionOffsets?.idle ? 'idle' : null);
  }

  getPose() {
    return createPuppetPose(this);
  }

  draw(ctx) {
    drawPuppetPlayer(this, ctx);
  }

  drawLayer(ctx, layer, pose, rig) {
    drawPuppetLayer(this, ctx, layer, pose, rig);
  }

  groupControl(base = {}, offset = {}) {
    return puppetGroupControl(base, offset);
  }

  drawArm(ctx, x, y, upperRotation, lowerRotation, side, weaponRotation, weapon, group = {}) {
    drawPuppetArm(this, ctx, x, y, upperRotation, lowerRotation, side, weaponRotation, weapon, group);
  }

  drawLeg(ctx, x, y, upperRotation, lowerRotation, side, group = {}) {
    drawPuppetLeg(this, ctx, x, y, upperRotation, lowerRotation, side, group);
  }

  drawImagePart(ctx, image, part, baseX, baseY, rotation, key) {
    drawPuppetImagePart(this, ctx, image, part, baseX, baseY, rotation, key);
  }

  drawImageGlow(ctx, image, x, y, w, h) {
    drawPuppetImageGlow(ctx, image, x, y, w, h);
  }
}

function emptyInteractionValues() {
  const values = {};
  INTERACTION_TOGGLE_PROPS.forEach((prop) => {
    values[prop] = Number(interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  });
  INTERACTION_NUMERIC_PROPS.forEach((prop) => {
    values[prop] = Number(interactionDefaultValue(prop));
  });
  return values;
}

function interpolateInteractionValues(start = {}, end = {}, t = 0) {
  const values = {};
  INTERACTION_TOGGLE_PROPS.forEach((prop) => {
    values[prop] = Number(start[prop] ?? interactionDefaultValue(prop)) >= 0.5 ? 1 : 0;
  });
  INTERACTION_NUMERIC_PROPS.forEach((prop) => {
    values[prop] = lerp(
      Number(start[prop] ?? interactionDefaultValue(prop)),
      Number(end[prop] ?? interactionDefaultValue(prop)),
      t
    );
  });
  return values;
}
