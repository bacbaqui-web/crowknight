import { clamp, clone, deg, lerp } from './utils.js';
import { DEFAULT_PLAYER_TUNING } from './playerDefaultTuning.js';
import {
  drawPuppetArm,
  drawPuppetImageGlow,
  drawPuppetImagePart,
  drawPuppetLayer,
  drawPuppetLeg,
  drawPuppetPlayer,
  puppetGroupControl,
} from './puppetPlayerRenderer.js';
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
} from './puppetPlayerActions.js';
import {
  applyPoseAnchor,
  identityMatrix,
  interpolateFrameValues,
  multiplyMatrix,
  pingPongProgress,
  rotationMatrix,
  scaleMatrix,
  transformMatrixPoint,
  translationMatrix,
} from './puppetPlayerGeometry.js';
import { createPuppetPose } from './puppetPlayerPose.js';
import { runPartOffset } from './runSpeedMotion.js';

export class PuppetPlayer {
  constructor(x, y, assets) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
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
    this.hurtTime = 0;
    this.guardActive = false;
    this.guardHits = 0;
    this.guardBlockTime = 0;
    this.guardBreakTime = 0;
    this.guardLockedUntilRelease = false;
    this.dead = false;
    this.debugHitbox = false;
    this.aiTimer = 0;
    this.aiDir = Math.random() > 0.5 ? 1 : -1;
    this.applyTuning(DEFAULT_PLAYER_TUNING);
  }

  applyTuning(tuning) {
    const next = clone(tuning);
    this.speed = next.speed;
    this.runAcceleration = clamp(Number(next.runAcceleration ?? DEFAULT_PLAYER_TUNING.runAcceleration), 0.02, 0.4);
    this.jumpPower = clamp(Number(next.jumpPower ?? DEFAULT_PLAYER_TUNING.jumpPower), 40, 720);
    this.airFlapPower = next.airFlapPower;
    this.airFlapCooldown = next.airFlapCooldown;
    this.glideTimeMax = next.glideTimeMax;
    this.glideFallSpeed = next.glideFallSpeed;
    this.dashCooldownMax = next.dashCooldownMax;
    this.attackCooldownMax = next.attackCooldownMax;
    this.comboResetTime = next.comboResetTime;
    this.invulnerability = next.invulnerability;
    this.transform = next.transform;
    this.hitboxConfig = next.hitbox;
    this.attackBoxConfig = next.attackBox;
    this.attackBoxesConfig = next.attackBoxes;
    this.effects = next.effects;
    this.hitReaction = next.hitReaction;
    this.motion = next.motion;
    this.layerOrder = next.layerOrder;
    this.poseOffsets = next.poseOffsets;
    this.poseSettings = next.poseSettings;
    this.rig = next.rig;
  }

  get hitbox() {
    const h = this.hitboxConfig;
    return { x: this.x + h.x, y: this.y + h.y, w: h.w, h: h.h };
  }

  get attackBox() {
    if (this.jumpAttackTime > 0 && this.isJumpAttackStrikeActive()) {
      const a = this.attackBoxesConfig?.jumpAttack || this.attackBoxConfig;
      return this.weaponAttackBox(a);
    }
    if (this.isRolling && this.canRollUseWeapon) {
      return this.weaponAttackBox(
        this.attackBoxesConfig?.roll || this.attackBoxesConfig?.attack1 || this.attackBoxConfig
      );
    }
    if (this.attackTime <= 0 || this.isRolling) return null;
    if (!this.isAttackStrikeActive()) return null;

    const key = `attack${this.comboStep || 1}`;
    const a = this.attackBoxesConfig?.[key] || this.attackBoxConfig;
    return this.weaponAttackBox(a);
  }

  get isRolling() {
    return this.dashTime > 0;
  }

  get canRollUseWeapon() {
    return Number(this.motion?.rollWeapon || 0) >= 0.5;
  }

  get isAttacking() {
    return this.attackTime > 0 || this.jumpAttackTime > 0;
  }

  weaponAttackBox(config = {}) {
    const transform = this.weaponAnchorTransform();
    if (!transform) return null;

    const x = Number(config.x ?? 0);
    const y = Number(config.y ?? -12);
    const w = Math.max(1, Number(config.w ?? 96));
    const h = Math.max(1, Number(config.h ?? 28));
    const rot = deg(Number(config.rot || 0));
    const localX = config.flipX ? -x - w : x;
    const local = [
      { x: localX, y },
      { x: localX + w, y },
      { x: localX + w, y: y + h },
      { x: localX, y: y + h },
    ];
    const matrix = multiplyMatrix(transform, rotationMatrix(rot));
    const points = local.map((point) => transformMatrixPoint(matrix, point.x, point.y));
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
      points,
    };
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
    return this.guardActive && this.guardBreakTime <= 0;
  }

  isAttackStrikeActive() {
    if (this.attackTime <= 0) return false;

    const progress = this.attackProgress;
    const step = this.comboStep || 1;
    const start = step === 3 ? 0.24 : 0.2;
    const end = step === 3 ? 0.48 : 0.4;
    return progress >= start && progress <= end;
  }

  isJumpAttackStrikeActive() {
    if (this.jumpAttackTime <= 0) return false;
    const progress = this.jumpAttackProgress;
    return progress >= 0.18 && progress <= 0.62;
  }

  get rollSpeed() {
    return this.speed * Math.max(0, Number(this.motion?.rollIntensity ?? 1));
  }

  get attackLungeSpeed() {
    const carry = this.attackCarrySpeed * Math.max(0, 1 - this.attackProgress * 0.65);
    return carry;
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
    if (this.attackTime <= 0) return 1;
    return 1 - Math.max(0, this.attackTime) / Math.max(0.01, this.attackDuration);
  }

  get jumpAttackProgress() {
    if (this.jumpAttackTime <= 0) return 1;
    return 1 - Math.max(0, this.jumpAttackTime) / Math.max(0.01, this.jumpAttackDuration);
  }

  updateGuardInput(guardHeld) {
    updatePuppetGuardInput(this, guardHeld);
  }

  registerGuardBlock() {
    return registerPuppetGuardBlock(this);
  }

  get poseKey() {
    if (this.posePreview?.pose) return this.posePreview.pose;
    if (this.state === 'jumpAttack') return 'jumpAttack';
    if (this.state === 'attack') return `attack${this.comboStep || 1}`;
    return this.state;
  }

  getPartOffset(key) {
    const value = this.poseOffsets?.[this.poseKey]?.[key];
    return mergePartOffsets(this.resolvePoseOffset(value), runPartOffset(this, key));
  }

  resolvePoseOffset(value) {
    const empty = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      rot: 0,
      opacity: 1,
      anchorX: 0,
      anchorY: 0,
    };
    if (!value) return empty;
    if (Array.isArray(value.keyframes) && value.keyframes.length) {
      return applyPoseAnchor(interpolateFrameValues(value.keyframes, this.getPoseFrameProgress(), empty), value);
    }
    if (!value.start && !value.end) return { ...empty, ...value };

    const start = { ...empty, ...(value.start || {}) };
    const end = { ...empty, ...(value.end || start) };
    const t = this.getPoseFrameProgress();
    return {
      x: lerp(start.x, end.x, t),
      y: lerp(start.y, end.y, t),
      w: lerp(start.w, end.w, t),
      h: lerp(start.h, end.h, t),
      rot: lerp(start.rot, end.rot, t),
      opacity: lerp(start.opacity, end.opacity, t),
      anchorX: Number(value.anchorX || 0),
      anchorY: Number(value.anchorY || 0),
    };
  }

  getPoseFrameProgress() {
    if (Number.isFinite(this.posePreview?.t)) return clamp(this.posePreview.t, 0, 1);
    if (this.posePreview?.playing) {
      const settings = this.poseSettings?.[this.posePreview.pose] || {};
      const duration = Math.max(0.05, Number(settings.duration || 0.6));
      const startedAt = Number(this.posePreview.startedAt || performance.now());
      const elapsed = (performance.now() - startedAt) / 1000;
      const raw = (elapsed / duration) * this.getPosePlaybackRate(this.posePreview.pose);
      return this.posePreview.loop ? pingPongProgress(raw) : clamp(raw, 0, 1);
    }

    if (this.posePreview?.frame) return this.posePreview.frame === 'end' ? 1 : 0;
    if (this.state === 'attack') return clamp(this.attackProgress, 0, 1);
    if (this.state === 'jumpAttack') return clamp(this.jumpAttackProgress, 0, 1);
    if (this.state === 'roll') return clamp(1 - Math.max(0, this.dashTime) / Math.max(0.01, this.rollDuration), 0, 1);
    if (this.state === 'jump') return Math.max(this.getJumpRiseProgress(), this.getTimelineProgress('jump', false));
    if (this.state === 'hurt') return this.getTimelineProgress('hurt', false);
    if (this.state === 'death') return this.getTimelineProgress('death', false);
    if (this.state === 'guard' || this.state === 'guardBreak') return this.getTimelineProgress(this.state, false);
    if (this.state === 'run' || this.state === 'idle' || this.state === 'fall' || this.state === 'glide') {
      return this.getTimelineProgress(this.state, false);
    }
    return 0;
  }

  getTimelineProgress(key, forceLoop = false) {
    const settings = this.poseSettings?.[key] || {};
    const duration = Math.max(0.05, Number(settings.duration || 0.6));
    const raw = (this.stateTime / duration) * this.getPosePlaybackRate(key);
    if (forceLoop || settings.playback !== 'once') return pingPongProgress(raw);
    return clamp(raw, 0, 1);
  }

  getPosePlaybackRate(key) {
    return Math.max(0.1, Number(this.poseSettings?.[key]?.playbackRate || 1));
  }

  getPoseActionDuration(key, fallback) {
    const settings = this.poseSettings?.[key] || {};
    const duration = Math.max(0.05, Number(settings.duration || fallback));
    return duration / this.getPosePlaybackRate(key);
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

function mergePartOffsets(base, additive) {
  if (!additive) return base;
  return {
    ...base,
    x: base.x + Number(additive.x || 0),
    y: base.y + Number(additive.y || 0),
    rot: base.rot + Number(additive.rot || 0),
  };
}
