import { deg, lerp, clamp } from './utils.js';

const GLOW_GROUP_PARTS = {
  shoulderL: ['upperArmL', 'lowerArmL'],
  shoulderR: ['upperArmR', 'lowerArmR'],
  hipL: ['upperLegL', 'lowerLegL'],
  hipR: ['upperLegR', 'lowerLegR'],
};
const glowImageCache = new WeakMap();

export const DEFAULT_PLAYER_TUNING = {
  maxHpPips: 5,
  speed: 260,
  jumpPower: 690,
  airFlapPower: 185,
  airFlapCooldown: 0.1,
  jumpHoldMax: 0.16,
  jumpHoldForce: 620,
  glideTimeMax: 1.1,
  glideFallSpeed: 180,
  dashDuration: 0.28,
  rollDistance: 240,
  dashCooldownMax: 0.45,
  attackCooldownMax: 0.18,
  comboResetTime: 0.72,
  invulnerability: { hurt: 0.45, rollEnd: 0.18 },
  transform: { scale: 1, anchorX: 0, anchorY: 0 },
  hitbox: { x: -24, y: -112, w: 48, h: 112 },
  attackBox: { frontX: 26, backX: -96, y: -92, w: 70, h: 50 },
  attackBoxes: {
    attack1: {
      x: 8,
      y: -12,
      w: 96,
      h: 28,
      rot: 0,
      frontX: 26,
      backX: -96,
      stun: 0.22,
      knockbackX: 330,
      knockbackY: 110,
      deathBurst: 1,
    },
    attack2: {
      x: 8,
      y: -13,
      w: 108,
      h: 30,
      rot: 0,
      flipX: true,
      frontX: 18,
      backX: -88,
      stun: 0.22,
      knockbackX: 380,
      knockbackY: 120,
      deathBurst: 1.08,
    },
    attack3: {
      x: 6,
      y: -15,
      w: 124,
      h: 34,
      rot: 0,
      frontX: 22,
      backX: -116,
      stun: 0.28,
      knockbackX: 520,
      knockbackY: 190,
      deathBurst: 1.28,
    },
    jumpAttack: {
      x: 6,
      y: -14,
      w: 104,
      h: 32,
      rot: 0,
      frontX: -36,
      backX: -34,
      stun: 0.26,
      knockbackX: 220,
      knockbackY: 260,
      deathBurst: 1.18,
    },
  },
  effects: { hitShake: 1.6, hitSpark: 1 },
  effectOffsets: {
    idle: {},
    run: {},
    jump: {},
    fall: {},
    glide: {},
    roll: {},
    guard: {},
    guardBreak: {},
    hurt: {},
    death: {},
    jumpAttack: { image: 'slash2' },
    attack1: { image: 'slash1' },
    attack2: { image: 'slash2' },
    attack3: { image: 'slash3' },
  },
  effectSettings: {
    idle: { duration: 0.8, playback: 'loop', playbackRate: 1 },
    run: { duration: 0.58, playback: 'loop', playbackRate: 1 },
    jump: { duration: 0.42, playback: 'once', playbackRate: 1 },
    fall: { duration: 0.55, playback: 'loop', playbackRate: 1 },
    glide: { duration: 0.8, playback: 'loop', playbackRate: 1 },
    roll: { duration: 0.28, playback: 'once', playbackRate: 1 },
    guard: { duration: 0.35, playback: 'loop', playbackRate: 1 },
    guardBreak: { duration: 0.38, playback: 'once', playbackRate: 1 },
    hurt: { duration: 0.24, playback: 'once', playbackRate: 1 },
    death: { duration: 1.1, playback: 'once', playbackRate: 1 },
    jumpAttack: { duration: 0.34, playback: 'once', playbackRate: 1 },
    attack1: { duration: 0.26, playback: 'once', playbackRate: 1 },
    attack2: { duration: 0.28, playback: 'once', playbackRate: 1 },
    attack3: { duration: 0.36, playback: 'once', playbackRate: 1 },
  },
  hitReaction: {
    stun: 0.22,
    knockbackX: 330,
    knockbackY: 110,
    heavyKnockbackX: 520,
    heavyKnockbackY: 190,
  },
  motion: {
    animationIntensity: {
      idle: 1,
      run: 1,
      jump: 1,
      fall: 1,
      glide: 1,
      roll: 1,
      guard: 1,
      guardBreak: 1,
      hurt: 1,
      death: 1,
      jumpAttack: 1,
      attack1: 1,
      attack2: 1,
      attack3: 1,
    },
    walkSpeed: 12,
    walkBob: 5,
    walkBody: 4,
    walkArmSwing: 34,
    walkLegSwing: 38,
    jumpRiseGravity: 0.55,
    jumpRiseEase: 2.2,
    dashLean: 18,
    rollSpin: 360,
    rollTuck: 52,
    rollLift: 18,
  },
  layerOrder: ['leftLeg', 'body', 'head', 'cape', 'leftArm', 'rightLeg', 'rightArm', 'shield'],
  poseOffsets: {
    idle: {},
    run: {},
    jump: {},
    fall: {},
    glide: {},
    roll: {},
    guard: {},
    guardBreak: {},
    hurt: {},
    death: {},
    jumpAttack: {},
    attack1: {},
    attack2: {},
    attack3: {},
  },
  poseSettings: {
    idle: { duration: 0.8, playback: 'loop', playbackRate: 1 },
    run: { duration: 0.58, playback: 'loop', playbackRate: 1 },
    jump: { duration: 0.42, playback: 'once', playbackRate: 1 },
    fall: { duration: 0.55, playback: 'loop', playbackRate: 1 },
    glide: { duration: 0.8, playback: 'loop', playbackRate: 1 },
    roll: { duration: 0.28, playback: 'once', playbackRate: 1 },
    guard: { duration: 0.35, playback: 'loop', playbackRate: 1 },
    guardBreak: { duration: 0.38, playback: 'once', playbackRate: 1 },
    hurt: { duration: 0.24, playback: 'once', playbackRate: 1 },
    death: { duration: 1.1, playback: 'once', playbackRate: 1 },
    jumpAttack: { duration: 0.34, playback: 'once', playbackRate: 1 },
    attack1: { duration: 0.26, playback: 'once', playbackRate: 1 },
    attack2: { duration: 0.28, playback: 'once', playbackRate: 1 },
    attack3: { duration: 0.36, playback: 'once', playbackRate: 1 },
  },
  rig: {
    body: {
      x: -32,
      y: -100,
      ax: 32,
      ay: 84,
      w: 64,
      h: 96,
      baseW: 64,
      baseH: 96,
      ox: 32,
      oy: 84,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    head: {
      x: -32,
      y: -49,
      ax: 32,
      ay: 49,
      w: 64,
      h: 56,
      baseW: 64,
      baseH: 56,
      ox: 32,
      oy: 49,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    cape: {
      x: -32,
      y: -38,
      ax: 32,
      ay: 24,
      w: 64,
      h: 96,
      baseW: 64,
      baseH: 96,
      ox: 32,
      oy: 24,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    shield: {
      x: 28,
      y: -70,
      ax: 24,
      ay: 18,
      w: 48,
      h: 72,
      baseW: 48,
      baseH: 72,
      ox: 24,
      oy: 18,
      rot: 8,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    upperArmL: {
      x: -14,
      y: -8,
      ax: 14,
      ay: 8,
      w: 28,
      h: 56,
      baseW: 28,
      baseH: 56,
      ox: 14,
      oy: 8,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    lowerArmL: {
      x: -13,
      y: -7,
      ax: 13,
      ay: 7,
      w: 26,
      h: 52,
      baseW: 26,
      baseH: 52,
      ox: 13,
      oy: 7,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    upperArmR: {
      x: -14,
      y: -8,
      ax: 14,
      ay: 8,
      w: 28,
      h: 56,
      baseW: 28,
      baseH: 56,
      ox: 14,
      oy: 8,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    lowerArmR: {
      x: -13,
      y: -7,
      ax: 13,
      ay: 7,
      w: 26,
      h: 52,
      baseW: 26,
      baseH: 52,
      ox: 13,
      oy: 7,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    upperLegL: {
      x: -15,
      y: -8,
      ax: 15,
      ay: 8,
      w: 30,
      h: 60,
      baseW: 30,
      baseH: 60,
      ox: 15,
      oy: 8,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    lowerLegL: {
      x: -14,
      y: -7,
      ax: 14,
      ay: 7,
      w: 28,
      h: 58,
      baseW: 28,
      baseH: 58,
      ox: 14,
      oy: 7,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    upperLegR: {
      x: -15,
      y: -8,
      ax: 15,
      ay: 8,
      w: 30,
      h: 60,
      baseW: 30,
      baseH: 60,
      ox: 15,
      oy: 8,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    lowerLegR: {
      x: -14,
      y: -7,
      ax: 14,
      ay: 7,
      w: 28,
      h: 58,
      baseW: 28,
      baseH: 58,
      ox: 14,
      oy: 7,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    weapon: {
      x: 0,
      y: -12,
      ax: 8,
      ay: 12,
      w: 96,
      h: 24,
      baseW: 96,
      baseH: 24,
      ox: 8,
      oy: 12,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      anchorMode: 'local',
    },
    neck: { x: 0, y: -82, rot: 0 },
    shoulderL: {
      x: -30,
      y: -64,
      ax: 0,
      ay: 0,
      w: 1,
      h: 1,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
    },
    shoulderR: {
      x: 30,
      y: -64,
      ax: 0,
      ay: 0,
      w: 1,
      h: 1,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
    },
    hipL: {
      x: -16,
      y: -12,
      ax: 0,
      ay: 0,
      w: 1,
      h: 1,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
    },
    hipR: {
      x: 16,
      y: -12,
      ax: 0,
      ay: 0,
      w: 1,
      h: 1,
      rot: 0,
      opacity: 1,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
    },
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

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
    this.jumpHoldTime = 0;
    this.jumpStartVy = 0;
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
    this.jumpPower = next.jumpPower;
    this.airFlapPower = next.airFlapPower;
    this.airFlapCooldown = next.airFlapCooldown;
    this.jumpHoldMax = next.jumpHoldMax;
    this.jumpHoldForce = next.jumpHoldForce;
    this.glideTimeMax = next.glideTimeMax;
    this.glideFallSpeed = next.glideFallSpeed;
    this.dashDuration = next.dashDuration;
    this.rollDistance = next.rollDistance;
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
    if (this.attackTime <= 0 || this.isRolling) return null;
    if (!this.isAttackStrikeActive()) return null;

    const key = `attack${this.comboStep || 1}`;
    const a = this.attackBoxesConfig?.[key] || this.attackBoxConfig;
    return this.weaponAttackBox(a);
  }

  get isRolling() {
    return this.dashTime > 0;
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
    return this.rollDistance / Math.max(0.01, this.dashDuration);
  }

  get attackLungeSpeed() {
    const carry = this.attackCarrySpeed * Math.max(0, 1 - this.attackProgress * 1.15);
    return carry;
  }

  update(dt, keys, pressed, world) {
    this.animTime += dt;
    this.stateTime += dt;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.guardBlockTime = Math.max(0, this.guardBlockTime - dt);
    this.guardBreakTime = Math.max(0, this.guardBreakTime - dt);

    const l = keys.has('ArrowLeft');
    const r = keys.has('ArrowRight');
    const jumpHeld = keys.has('Space');
    const guardHeld = keys.has('KeyE');

    this.updateGuardInput(guardHeld);

    if (this.isRolling) {
      this.vx = this.rollDirection * this.rollSpeed;
    } else if (this.jumpAttackTime > 0) {
      this.vx = lerp(this.vx, 0, 0.04);
    } else if (this.attackTime > 0) {
      this.vx = this.facing * this.attackLungeSpeed;
    } else if (this.isGuarding || this.guardBreakTime > 0) {
      this.vx = lerp(this.vx, 0, 0.32);
    } else if (l) {
      this.vx = -this.speed;
      this.facing = -1;
    } else if (r) {
      this.vx = this.speed;
      this.facing = 1;
    } else {
      this.vx = lerp(this.vx, 0, 0.18);
      if (Math.abs(this.vx) < 2) this.vx = 0;
    }

    if (pressed.has('Space') && this.onGround) {
      this.vy = -this.jumpPower;
      this.jumpStartVy = this.vy;
      this.onGround = false;
      this.jumpHoldTime = this.jumpHoldMax;
      this.glideTime = this.glideTimeMax;
      this.airFlapCooldownTime = this.airFlapCooldown;
    } else if (pressed.has('Space') && this.canAirFlap()) {
      this.vy = Math.min(this.vy - this.airFlapPower, -this.airFlapPower);
      this.vy = Math.max(this.vy, -this.jumpPower * 0.78);
      this.jumpStartVy = Math.min(this.jumpStartVy || this.vy, this.vy);
      this.jumpHoldTime = 0;
      this.glideTime = this.glideTimeMax;
      this.airFlapCooldownTime = this.airFlapCooldown;
    }

    if (pressed.has('KeyW') && this.dashCooldown <= 0 && !this.isGuarding && this.guardBreakTime <= 0) {
      this.rollDirection = this.facing;
      this.dashTime = this.dashDuration;
      this.dashCooldown = this.dashCooldownMax;
      this.vx = this.rollDirection * this.rollSpeed;
      this.vy = 0;
    }

    if (pressed.has('KeyQ')) this.tryAttack();
    const jumpRiseProgress = this.getJumpRiseProgress();
    if (jumpHeld && this.jumpHoldTime > 0 && this.vy < 0 && !this.isRolling) {
      const holdFade = Math.pow(1 - jumpRiseProgress, 2);
      this.vy -= this.jumpHoldForce * holdFade * dt;
      this.jumpHoldTime -= dt;
    } else {
      this.jumpHoldTime = 0;
    }

    if (!jumpHeld && this.vy < -120 && !this.onGround) {
      this.vy = Math.max(this.vy * 0.55, -this.jumpPower * 0.5);
    }

    if (this.dashTime > 0) {
      this.glideActive = false;
      this.dashTime -= dt;
    } else if (this.isGliding(jumpHeld)) {
      this.glideTime -= dt;
      this.vy += world.gravity * 0.18 * dt;
      this.vy = Math.min(this.vy, this.glideFallSpeed);
    } else {
      const riseGravity = this.vy < 0 ? this.getRiseGravity(jumpRiseProgress) : 1;
      this.vy += world.gravity * riseGravity * dt;
    }

    this.dashCooldown -= dt;
    this.airFlapCooldownTime -= dt;
    this.attackTime -= dt;
    this.jumpAttackTime -= dt;
    this.attackCooldown -= dt;
    this.comboTimer -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, world.minX ?? 80, world.maxX ?? 880);

    if (this.y >= world.floorY) {
      this.y = world.floorY;
      this.vy = 0;
      this.onGround = true;
      this.jumpHoldTime = 0;
      this.jumpStartVy = 0;
      this.airFlapCooldownTime = 0;
      this.glideTime = this.glideTimeMax;
      this.glideActive = false;
      this.guardHits = 0;
      this.guardLockedUntilRelease = false;
    }

    this.updateState();
  }

  getJumpRiseProgress() {
    if (this.vy >= 0) return 1;
    const startSpeed = Math.max(1, Math.abs(this.jumpStartVy || this.jumpPower));
    return clamp(1 - Math.abs(this.vy) / startSpeed, 0, 1);
  }

  canAirFlap() {
    return (
      !this.onGround &&
      !this.isRolling &&
      this.attackTime <= 0 &&
      this.jumpAttackTime <= 0 &&
      this.airFlapCooldownTime <= 0
    );
  }

  getRiseGravity(progress) {
    const easePower = Math.max(0.3, this.motion.jumpRiseEase || 2.2);
    const eased = 1 - Math.pow(1 - progress, easePower);
    return lerp(0.42, Math.max(0.42, this.motion.jumpRiseGravity || 1), eased);
  }

  updateNpc(dt, target, world, bounds = null) {
    this.animTime += dt;
    this.stateTime += dt;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this.guardBlockTime = Math.max(0, this.guardBlockTime - dt);
    this.guardBreakTime = Math.max(0, this.guardBreakTime - dt);
    this.guardActive = false;
    this.aiTimer -= dt;

    const distance = target.x - this.x;
    const absDistance = Math.abs(distance);

    if (absDistance < 240) {
      this.aiDir = Math.sign(distance) || this.aiDir;
    } else if (this.aiTimer <= 0) {
      this.aiDir = Math.random() > 0.5 ? 1 : -1;
      this.aiTimer = 0.8 + Math.random() * 1.6;
    }

    const pace = absDistance < 240 ? 0.78 : 0.38;
    if (this.isRolling) {
      this.vx = this.rollDirection * this.rollSpeed * 0.75;
    } else if (this.isAttacking) {
      this.vx = this.facing * this.attackLungeSpeed;
    } else {
      this.vx = this.aiDir * this.speed * pace;
      this.facing = this.aiDir;
    }

    if (absDistance < 88) this.tryAttack();

    if (this.dashCooldown <= 0 && absDistance > 130 && absDistance < 260 && Math.random() < 0.012) {
      this.rollDirection = this.facing;
      this.dashTime = this.dashDuration;
      this.dashCooldown = this.dashCooldownMax;
      this.vx = this.rollDirection * this.rollSpeed * 0.75;
      this.vy = 0;
    }

    if (this.dashTime > 0) this.dashTime -= dt;
    else this.vy += world.gravity * dt;

    this.dashCooldown -= dt;
    this.attackTime -= dt;
    this.jumpAttackTime -= dt;
    this.attackCooldown -= dt;
    this.comboTimer -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const minX = bounds?.minX ?? world.minX ?? 80;
    const maxX = bounds?.maxX ?? world.maxX ?? 880;

    if (this.x <= minX) {
      this.x = minX;
      this.aiDir = 1;
    }

    if (this.x >= maxX) {
      this.x = maxX;
      this.aiDir = -1;
    }

    if (this.y >= world.floorY) {
      this.y = world.floorY;
      this.vy = 0;
      this.onGround = true;
    }

    this.updateState();
  }

  updateState() {
    let nextState = 'idle';
    if (this.dead) nextState = 'death';
    else if (this.hurtTime > 0) nextState = 'hurt';
    else if (this.guardBreakTime > 0) nextState = 'guardBreak';
    else if (this.jumpAttackTime > 0) nextState = 'jumpAttack';
    else if (this.dashTime > 0) nextState = 'roll';
    else if (this.attackTime > 0) nextState = 'attack';
    else if (this.isGuarding) nextState = 'guard';
    else if (!this.onGround && this.vy < 0) nextState = 'jump';
    else if (this.glideActive) nextState = 'glide';
    else if (!this.onGround) nextState = 'fall';
    else if (Math.abs(this.vx) > 20) nextState = 'run';

    if (nextState !== this.state) {
      this.state = nextState;
      this.stateTime = 0;
    } else {
      this.state = nextState;
    }
  }

  isGliding(jumpHeld) {
    this.glideActive = !this.onGround && this.vy > 0 && jumpHeld && this.glideTime > 0 && !this.isRolling;
    return this.glideActive;
  }

  tryAttack() {
    if (this.attackCooldown > 0 || this.isGuarding || this.guardBreakTime > 0) return false;
    if (!this.onGround && !this.isRolling && this.jumpAttackTime <= 0) {
      this.jumpAttackDuration = this.getPoseActionDuration('jumpAttack', 0.34);
      this.jumpAttackTime = this.jumpAttackDuration;
      this.attackCooldown = this.attackCooldownMax + 0.08;
      this.attackTime = 0;
      this.comboTimer = 0;
      this.comboStep = 0;
      this.dashTime = 0;
      this.attackSerial += 1;
      this.vy = Math.min(this.vy + 120, 260);
      return true;
    }
    const rollCarrySpeed = this.isRolling ? Math.abs(this.vx || this.rollSpeed) : 0;

    if (this.comboTimer <= 0) this.comboStep = 0;
    this.comboStep = (this.comboStep % 3) + 1;
    this.attackDuration = this.getPoseActionDuration(`attack${this.comboStep}`, this.comboStep === 3 ? 0.38 : 0.28);
    this.attackTime = this.attackDuration;
    this.attackCooldown = this.comboStep === 3 ? this.attackCooldownMax + 0.16 : this.attackCooldownMax;
    this.comboTimer = this.comboResetTime;
    this.attackCarrySpeed = rollCarrySpeed;
    this.dashTime = 0;
    this.attackSerial += 1;
    return true;
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
    if (!guardHeld) {
      this.guardActive = false;
      this.guardHits = 0;
      this.guardLockedUntilRelease = false;
      return;
    }
    if (
      this.guardLockedUntilRelease ||
      this.guardBreakTime > 0 ||
      this.hurtTime > 0 ||
      this.isRolling ||
      this.attackTime > 0 ||
      this.jumpAttackTime > 0 ||
      !this.onGround
    ) {
      this.guardActive = false;
      return;
    }
    this.guardActive = true;
  }

  registerGuardBlock() {
    this.guardHits += 1;
    this.guardBlockTime = 0.16;
    if (this.guardHits >= 3) {
      this.guardActive = false;
      this.guardBreakTime = 0.38;
      this.guardLockedUntilRelease = true;
      this.guardHits = 0;
      return true;
    }
    return false;
  }

  get poseKey() {
    if (this.posePreview?.pose) return this.posePreview.pose;
    if (this.state === 'jumpAttack') return 'jumpAttack';
    if (this.state === 'attack') return `attack${this.comboStep || 1}`;
    return this.state;
  }

  getPartOffset(key) {
    const value = this.poseOffsets?.[this.poseKey]?.[key];
    return this.resolvePoseOffset(value);
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
    if (this.state === 'roll')
      return this.scalePoseProgress(1 - Math.max(0, this.dashTime) / Math.max(0.01, this.dashDuration), 'roll');
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

  scalePoseProgress(progress, key) {
    return clamp(Number(progress || 0) * this.getPosePlaybackRate(key), 0, 1);
  }

  getPose() {
    const t = this.animTime;
    const m = this.motion;
    const w = Math.sin(t * m.walkSpeed);
    const w2 = Math.sin(t * m.walkSpeed + Math.PI);
    const idle = Math.sin(t * 3) * 3;
    const previewPose = this.posePreview?.pose;
    const state = previewPose?.startsWith('attack') ? 'attack' : previewPose || this.state;
    let intensityKey = previewPose || state;
    const p = {
      bobY: 0,
      scaleY: 1,
      body: 0,
      head: 0,
      upperArmL: deg(12),
      lowerArmL: deg(6),
      upperArmR: deg(-12),
      lowerArmR: deg(-8),
      upperLegL: deg(4),
      lowerLegL: deg(5),
      upperLegR: deg(-4),
      lowerLegR: deg(5),
      weapon: 0,
      root: 0,
    };

    if (state === 'idle') {
      p.scaleY = 1 + idle * 0.006;
      p.body = deg(Math.sin(t * 2) * 2);
      p.head = deg(Math.sin(t * 2.5) * 2);
      p.upperArmL = deg(8 + Math.sin(t * 2.2) * 4);
      p.upperArmR = deg(-8 - Math.sin(t * 2.2) * 4);
    }

    if (state === 'run') {
      p.bobY = Math.abs(w) * m.walkBob;
      p.body = deg(w * m.walkBody);
      p.head = deg(-w * 2);
      p.upperArmL = deg(w * m.walkArmSwing);
      p.lowerArmL = deg(18 + Math.max(0, w) * 20);
      p.upperArmR = deg(w2 * m.walkArmSwing);
      p.lowerArmR = deg(18 + Math.max(0, w2) * 20);
      p.upperLegL = deg(w2 * m.walkLegSwing);
      p.lowerLegL = deg(16 + Math.max(0, w) * 34);
      p.upperLegR = deg(w * m.walkLegSwing);
      p.lowerLegR = deg(16 + Math.max(0, w2) * 34);
    }

    if (state === 'jump') {
      p.body = deg(-7);
      p.head = deg(5);
      p.upperArmL = deg(-38);
      p.upperArmR = deg(32);
      p.upperLegL = deg(-22);
      p.lowerLegL = deg(42);
      p.upperLegR = deg(18);
      p.lowerLegR = deg(28);
    }

    if (state === 'fall') {
      p.body = deg(5);
      p.head = deg(-4);
      p.upperArmL = deg(-10);
      p.lowerArmL = deg(32);
      p.upperArmR = deg(16);
      p.lowerArmR = deg(30);
    }

    if (state === 'glide') {
      p.body = deg(-3);
      p.head = deg(3);
      p.upperArmL = deg(-82);
      p.lowerArmL = deg(18);
      p.upperArmR = deg(82);
      p.lowerArmR = deg(18);
      p.upperLegL = deg(-10);
      p.lowerLegL = deg(22);
      p.upperLegR = deg(10);
      p.lowerLegR = deg(22);
    }

    if (state === 'roll') {
      const q = 1 - Math.max(0, this.dashTime) / Math.max(0.01, this.dashDuration);
      p.bobY = -Math.sin(q * Math.PI) * (m.rollLift || 0);
      p.root = deg(q * m.rollSpin);
      p.body = deg(m.dashLean);
      p.head = deg(-18);
      p.upperArmL = deg(-m.rollTuck);
      p.lowerArmL = deg(m.rollTuck * 0.7);
      p.upperArmR = deg(m.rollTuck);
      p.lowerArmR = deg(m.rollTuck * 0.5);
      p.upperLegL = deg(m.rollTuck * 0.45);
      p.lowerLegL = deg(m.rollTuck);
      p.upperLegR = deg(-m.rollTuck * 0.45);
      p.lowerLegR = deg(m.rollTuck);
    }

    if (state === 'guard') {
      const block = this.guardBlockTime > 0 ? Math.sin((this.guardBlockTime / 0.16) * Math.PI) : 0;
      p.body = deg(-8 - block * 5);
      p.head = deg(4);
      p.upperArmL = deg(-22);
      p.lowerArmL = deg(28);
      p.upperArmR = deg(-58 - block * 12);
      p.lowerArmR = deg(-34);
      p.upperLegL = deg(-6);
      p.upperLegR = deg(10);
      p.weapon = deg(-12);
    }

    if (state === 'guardBreak') {
      const q = this.getPoseFrameProgress();
      const snap = Math.sin(Math.min(1, q) * Math.PI);
      p.bobY = -snap * 6;
      p.body = deg(18 + snap * 16);
      p.head = deg(-12);
      p.upperArmL = deg(56);
      p.lowerArmL = deg(26);
      p.upperArmR = deg(-84 - snap * 20);
      p.lowerArmR = deg(-44);
      p.upperLegL = deg(18);
      p.lowerLegL = deg(24);
      p.upperLegR = deg(-16);
      p.lowerLegR = deg(30);
      p.weapon = deg(34);
    }

    if (state === 'hurt') {
      const q = this.getPoseFrameProgress();
      const recoil = Math.sin(Math.min(1, q) * Math.PI);
      p.bobY = -recoil * 5;
      p.body = deg(-12 - recoil * 8);
      p.head = deg(10 + recoil * 6);
      p.upperArmL = deg(34 + recoil * 18);
      p.lowerArmL = deg(22);
      p.upperArmR = deg(-34 - recoil * 18);
      p.lowerArmR = deg(-18);
      p.upperLegL = deg(-10);
      p.lowerLegL = deg(24);
      p.upperLegR = deg(14);
      p.lowerLegR = deg(20);
    }

    if (state === 'death') {
      const q = this.getPoseFrameProgress();
      const fall = 1 - Math.pow(1 - q, 3);
      const settle = Math.sin(Math.min(1, q) * Math.PI);
      p.bobY = fall * 46;
      p.root = deg(78 * fall);
      p.scaleY = 1 - fall * 0.2;
      p.body = deg(24 + fall * 18);
      p.head = deg(-22 + settle * 8);
      p.upperArmL = deg(70 - fall * 18);
      p.lowerArmL = deg(40);
      p.upperArmR = deg(-86 + fall * 24);
      p.lowerArmR = deg(-36);
      p.upperLegL = deg(-34 + fall * 18);
      p.lowerLegL = deg(62 - fall * 16);
      p.upperLegR = deg(38 - fall * 12);
      p.lowerLegR = deg(54 - fall * 14);
      p.weapon = deg(-48 + fall * 24);
    }

    return this.applyAnimationIntensity(p, intensityKey);
  }

  applyAnimationIntensity(p, key) {
    const intensityConfig = this.motion.animationIntensity;
    const value = typeof intensityConfig === 'object' ? intensityConfig?.[key] : intensityConfig;
    const intensity = Math.max(0, Number(value ?? 1));
    const base = {
      bobY: 0,
      scaleY: 1,
      body: 0,
      head: 0,
      upperArmL: deg(12),
      lowerArmL: deg(6),
      upperArmR: deg(-12),
      lowerArmR: deg(-8),
      upperLegL: deg(4),
      lowerLegL: deg(5),
      upperLegR: deg(-4),
      lowerLegR: deg(5),
      weapon: 0,
      root: 0,
    };

    Object.keys(base).forEach((key) => {
      p[key] = base[key] + (p[key] - base[key]) * intensity;
    });
    return p;
  }

  draw(ctx) {
    const p = this.getPose();
    const r = this.rig;
    const master = this.getPartOffset('master');

    this.anchorDebugPoints = [];
    this.hitRegions = [];
    this.editHandles = {};
    ctx.save();
    ctx.translate(this.x, this.y + p.bobY);
    ctx.scale(this.facing * this.transform.scale, this.transform.scale * p.scaleY);
    ctx.translate(this.transform.anchorX, this.transform.anchorY);
    ctx.rotate(p.root);
    ctx.translate(master.anchorX || 0, master.anchorY || 0);
    ctx.translate(master.x || 0, master.y || 0);
    ctx.rotate(deg(master.rot || 0));
    ctx.scale(Math.max(0.05, 1 + Number(master.w || 0)), Math.max(0.05, 1 + Number(master.h || 0)));
    this.recordEditHandle(ctx, 'master');
    ctx.translate(-(master.anchorX || 0), -(master.anchorY || 0));
    ctx.globalAlpha *= clamp(master.opacity ?? 1, 0, 1);
    this.layerOrder.forEach((layer) => this.drawLayer(ctx, layer, p, r));
    ctx.restore();

    if (this.anchorDebugPoints.length) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.anchorDebugPoints.forEach((point) => this.drawAnchorDot(ctx, point.x, point.y));
      ctx.restore();
    }
    if (this.debugHitbox) this.drawDebug(ctx);
  }

  drawLayer(ctx, layer, pose, rig) {
    const layers = {
      leftLeg: () => {
        const hip = this.getPartOffset('hipL');
        const x = rig.hipL.x + hip.x;
        const y = rig.hipL.y + hip.y;
        const group = this.groupControl(rig.hipL, hip);
        const anchor = groupAnchor(x, y, group);
        this.recordJointRegion(ctx, 'hipL', anchor.x, anchor.y);
        if (this.anchorDebugPart === 'hipL') this.recordAnchorDebugPoint(ctx, anchor.x, anchor.y);
        this.drawLeg(ctx, x, y, pose.upperLegL + deg((rig.hipL.rot || 0) + (hip.rot || 0)), pose.lowerLegL, 'L', group);
      },
      body: () => this.drawImagePart(ctx, this.assets.body, rig.body, 0, 0, pose.body, 'body'),
      head: () => {
        const neck = this.getPartOffset('neck');
        const x = rig.neck.x + neck.x;
        const y = rig.neck.y + neck.y;
        this.recordJointRegion(ctx, 'neck', x, y);
        if (this.anchorDebugPart === 'neck') this.recordAnchorDebugPoint(ctx, x, y);
        this.drawImagePart(
          ctx,
          this.assets.head,
          rig.head,
          x,
          y,
          pose.head + deg((rig.neck.rot || 0) + (neck.rot || 0)),
          'head'
        );
      },
      cape: () => this.drawImagePart(ctx, this.assets.cape, rig.cape, 0, 0, pose.body * 0.4, 'cape'),
      shield: () => this.drawImagePart(ctx, this.assets.shield, rig.shield, 0, 0, 0, 'shield'),
      leftArm: () => {
        const shoulder = this.getPartOffset('shoulderL');
        const x = rig.shoulderL.x + shoulder.x;
        const y = rig.shoulderL.y + shoulder.y;
        const group = this.groupControl(rig.shoulderL, shoulder);
        const anchor = groupAnchor(x, y, group);
        this.recordJointRegion(ctx, 'shoulderL', anchor.x, anchor.y);
        if (this.anchorDebugPart === 'shoulderL') this.recordAnchorDebugPoint(ctx, anchor.x, anchor.y);
        this.drawArm(
          ctx,
          x,
          y,
          pose.upperArmL + deg((rig.shoulderL.rot || 0) + (shoulder.rot || 0)),
          pose.lowerArmL,
          'L',
          pose.weapon,
          false,
          group
        );
      },
      rightLeg: () => {
        const hip = this.getPartOffset('hipR');
        const x = rig.hipR.x + hip.x;
        const y = rig.hipR.y + hip.y;
        const group = this.groupControl(rig.hipR, hip);
        const anchor = groupAnchor(x, y, group);
        this.recordJointRegion(ctx, 'hipR', anchor.x, anchor.y);
        if (this.anchorDebugPart === 'hipR') this.recordAnchorDebugPoint(ctx, anchor.x, anchor.y);
        this.drawLeg(ctx, x, y, pose.upperLegR + deg((rig.hipR.rot || 0) + (hip.rot || 0)), pose.lowerLegR, 'R', group);
      },
      rightArm: () => {
        const shoulder = this.getPartOffset('shoulderR');
        const x = rig.shoulderR.x + shoulder.x;
        const y = rig.shoulderR.y + shoulder.y;
        const group = this.groupControl(rig.shoulderR, shoulder);
        const anchor = groupAnchor(x, y, group);
        this.recordJointRegion(ctx, 'shoulderR', anchor.x, anchor.y);
        if (this.anchorDebugPart === 'shoulderR') this.recordAnchorDebugPoint(ctx, anchor.x, anchor.y);
        this.drawArm(
          ctx,
          x,
          y,
          pose.upperArmR + deg((rig.shoulderR.rot || 0) + (shoulder.rot || 0)),
          pose.lowerArmR,
          'R',
          pose.weapon,
          !this.isRolling,
          group
        );
      },
    };

    layers[layer]?.();
  }

  groupControl(base = {}, offset = {}) {
    return {
      w: Math.max(0.05, Number(base.w ?? 1) + Number(offset.w || 0)),
      h: Math.max(0.05, Number(base.h ?? 1) + Number(offset.h || 0)),
      opacity: clamp((base.opacity ?? 1) * (offset.opacity ?? 1), 0, 1),
      ax: Number(base.ax || 0),
      ay: Number(base.ay || 0),
      anchorOffsetX: Number(base.anchorOffsetX || 0),
      anchorOffsetY: Number(base.anchorOffsetY || 0),
    };
  }

  drawArm(ctx, x, y, upperRotation, lowerRotation, side, weaponRotation, weapon, group = {}) {
    const r = this.rig;
    const upperImage = side === 'L' ? this.assets.upperArmL : this.assets.upperArmR;
    const lowerImage = side === 'L' ? this.assets.lowerArmL : this.assets.lowerArmR;
    const upperKey = side === 'L' ? 'upperArmL' : 'upperArmR';
    const lowerKey = side === 'L' ? 'lowerArmL' : 'lowerArmR';
    const upperPart = r[upperKey];
    const lowerPart = r[lowerKey];

    ctx.save();
    ctx.globalAlpha *= clamp(group.opacity ?? 1, 0, 1);
    ctx.translate(
      x + Number(group.anchorOffsetX || 0) + Number(group.ax || 0),
      y + Number(group.anchorOffsetY || 0) + Number(group.ay || 0)
    );
    ctx.scale(Math.max(0.05, group.w ?? 1), Math.max(0.05, group.h ?? 1));
    ctx.rotate(upperRotation);
    ctx.translate(-Number(group.ax || 0), -Number(group.ay || 0));
    this.drawImagePart(ctx, upperImage, upperPart, 0, 0, 0, upperKey);
    ctx.translate(0, upperPart.h - 8);
    ctx.rotate(lowerRotation);
    this.drawImagePart(ctx, lowerImage, lowerPart, 0, 0, 0, lowerKey);

    if (weapon) {
      ctx.translate(0, lowerPart.h - 4);
      ctx.rotate(weaponRotation);
      this.drawImagePart(ctx, this.assets.weapon, r.weapon, 0, 0, 0, 'weapon');
    }

    ctx.restore();
  }

  drawLeg(ctx, x, y, upperRotation, lowerRotation, side, group = {}) {
    const r = this.rig;
    const upperImage = side === 'L' ? this.assets.upperLegL : this.assets.upperLegR;
    const lowerImage = side === 'L' ? this.assets.lowerLegL : this.assets.lowerLegR;
    const upperKey = side === 'L' ? 'upperLegL' : 'upperLegR';
    const lowerKey = side === 'L' ? 'lowerLegL' : 'lowerLegR';
    const upperPart = r[upperKey];
    const lowerPart = r[lowerKey];

    ctx.save();
    ctx.globalAlpha *= clamp(group.opacity ?? 1, 0, 1);
    ctx.translate(
      x + Number(group.anchorOffsetX || 0) + Number(group.ax || 0),
      y + Number(group.anchorOffsetY || 0) + Number(group.ay || 0)
    );
    ctx.scale(Math.max(0.05, group.w ?? 1), Math.max(0.05, group.h ?? 1));
    ctx.rotate(upperRotation);
    ctx.translate(-Number(group.ax || 0), -Number(group.ay || 0));
    this.drawImagePart(ctx, upperImage, upperPart, 0, 0, 0, upperKey);
    ctx.translate(0, upperPart.h - 8);
    ctx.rotate(lowerRotation);
    this.drawImagePart(ctx, lowerImage, lowerPart, 0, 0, 0, lowerKey);
    ctx.restore();
  }

  drawImagePart(ctx, image, part, baseX, baseY, rotation, key) {
    const offset = key ? this.getPartOffset(key) : { x: 0, y: 0, w: 0, h: 0, rot: 0 };
    const imageX = baseX + (part.x || 0) + (part.anchorOffsetX || 0) + offset.x;
    const imageY = baseY + (part.y || 0) + (part.anchorOffsetY || 0) + offset.y;
    const referenceW = part.baseW || partWidth(image);
    const referenceH = part.baseH || partHeight(image);
    const width = Math.max(1, (part.w || referenceW) + (offset.w || 0));
    const height = Math.max(1, (part.h || referenceH) + (offset.h || 0));
    const anchorLocalX = part.ax ?? part.ox;
    const anchorLocalY = part.ay ?? part.oy;
    const scaledAnchorX = anchorLocalX * (width / Math.max(1, referenceW));
    const scaledAnchorY = anchorLocalY * (height / Math.max(1, referenceH));
    const anchorX = imageX + anchorLocalX;
    const anchorY = imageY + anchorLocalY;

    ctx.save();
    ctx.translate(anchorX, anchorY);
    const placementMatrix = ctx.getTransform();
    ctx.rotate(rotation + deg((part.rot || 0) + (offset.rot || 0)));
    this.recordImageRegion(ctx, key, -scaledAnchorX, -scaledAnchorY, width, height);
    this.recordEditHandle(ctx, key, placementMatrix);
    ctx.globalAlpha *= clamp((part.opacity ?? 1) * (offset.opacity ?? 1), 0, 1);
    if (this.shouldGlowPart(key)) this.drawImageGlow(ctx, image, -scaledAnchorX, -scaledAnchorY, width, height);
    ctx.drawImage(image, -scaledAnchorX, -scaledAnchorY, width, height);
    ctx.restore();

    if (this.anchorDebugPart === key) this.recordAnchorDebugPoint(ctx, anchorX, anchorY);
  }

  drawImageGlow(ctx, image, x, y, w, h) {
    const silhouette = glowSilhouetteFor(image);
    const offsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-0.7, -0.7],
      [0.7, -0.7],
      [-0.7, 0.7],
      [0.7, 0.7],
    ];

    ctx.save();
    ctx.shadowColor = 'rgba(124, 195, 162, 0.95)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha *= 0.92;
    offsets.forEach(([dx, dy]) => {
      ctx.drawImage(silhouette, x + dx, y + dy, w, h);
    });
    ctx.restore();
  }

  shouldGlowPart(key) {
    if (!key) return false;
    const glowParts =
      Array.isArray(this.glowParts) && this.glowParts.length ? this.glowParts : this.glowPart ? [this.glowPart] : [];
    return glowParts.some((part) => part === key || GLOW_GROUP_PARTS[part]?.includes(key));
  }

  recordImageRegion(ctx, key, x, y, w, h) {
    if (!key) return;

    const matrix = ctx.getTransform();
    const points = [
      transformPoint(matrix, x, y),
      transformPoint(matrix, x + w, y),
      transformPoint(matrix, x + w, y + h),
      transformPoint(matrix, x, y + h),
    ];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    this.hitRegions.push({
      key,
      points,
      bounds: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      },
    });
  }

  recordEditHandle(ctx, key, placementMatrix = null) {
    if (!key) return;

    const matrix = ctx.getTransform();
    const anchor = transformPoint(matrix, 0, 0);
    const placement = placementMatrix || matrix;
    const partX = axisFromMatrix(matrix, anchor, 1, 0);
    const partY = axisFromMatrix(matrix, anchor, 0, 1);
    const moveX = axisFromMatrix(placement, anchor, 1, 0);
    const moveY = axisFromMatrix(placement, anchor, 0, 1);
    this.editHandles[key] = {
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
  }

  recordJointRegion(ctx, key, x, y) {
    const matrix = ctx.getTransform();
    const point = transformPoint(matrix, x, y);
    const size = 18;
    this.hitRegions.push({
      key,
      points: null,
      bounds: {
        x: point.x - size / 2,
        y: point.y - size / 2,
        w: size,
        h: size,
      },
    });
    this.recordJointEditHandle(matrix, key, x, y);
  }

  recordJointEditHandle(matrix, key, x, y) {
    const anchor = transformPoint(matrix, x, y);
    const xInfo = axisFromMatrix(matrix, anchor, x + 1, y);
    const yInfo = axisFromMatrix(matrix, anchor, x, y + 1);
    this.editHandles[key] = {
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

  recordAnchorDebugPoint(ctx, x, y) {
    const matrix = ctx.getTransform();
    this.anchorDebugPoints.push({
      x: matrix.a * x + matrix.c * y + matrix.e,
      y: matrix.b * x + matrix.d * y + matrix.f,
    });
  }

  drawAnchorDot(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(74, 167, 255, .10)';
    ctx.strokeStyle = 'rgba(74, 167, 255, .9)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4aa7ff';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawDebug(ctx) {
    const h = this.hitbox;
    ctx.fillStyle = 'rgba(255,0,0,.18)';
    ctx.strokeStyle = 'red';
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.strokeRect(h.x, h.y, h.w, h.h);

    const a = this.attackBox;
    if (a) {
      ctx.fillStyle = 'rgba(255,255,0,.2)';
      ctx.strokeStyle = 'yellow';
      if (a.points?.length) {
        ctx.beginPath();
        a.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.strokeRect(a.x, a.y, a.w, a.h);
      }
    }
  }
}

function partWidth(image) {
  return image.naturalWidth || image.width;
}

function partHeight(image) {
  return image.naturalHeight || image.height;
}

function glowSilhouetteFor(image) {
  if (glowImageCache.has(image)) return glowImageCache.get(image);

  const width = partWidth(image);
  const height = partHeight(image);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const buffer = canvas.getContext('2d');
  buffer.drawImage(image, 0, 0, width, height);
  buffer.globalCompositeOperation = 'source-in';
  buffer.fillStyle = 'rgba(171, 255, 217, 0.98)';
  buffer.fillRect(0, 0, width, height);
  glowImageCache.set(image, canvas);
  return canvas;
}

function groupAnchor(x, y, group = {}) {
  return {
    x: x + Number(group.anchorOffsetX || 0) + Number(group.ax || 0),
    y: y + Number(group.anchorOffsetY || 0) + Number(group.ay || 0),
  };
}

function transformPoint(matrix, x, y) {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function identityMatrix() {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function translationMatrix(x, y) {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

function rotationMatrix(angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

function scaleMatrix(x, y) {
  return { a: x, b: 0, c: 0, d: y, e: 0, f: 0 };
}

function multiplyMatrix(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function transformMatrixPoint(matrix, x, y) {
  return transformPoint(matrix, x, y);
}

function axisFromMatrix(matrix, anchor, x, y) {
  const point = transformPoint(matrix, x, y);
  const dx = point.x - anchor.x;
  const dy = point.y - anchor.y;
  const unit = Math.hypot(dx, dy) || 1;
  return {
    axis: { x: dx / unit, y: dy / unit },
    unit,
  };
}

function applyPoseAnchor(frame, value = {}) {
  return {
    ...frame,
    anchorX: Number(value.anchorX || 0),
    anchorY: Number(value.anchorY || 0),
  };
}

function pingPongProgress(raw) {
  const cycle = raw - Math.floor(raw / 2) * 2;
  return cycle <= 1 ? cycle : 2 - cycle;
}

function interpolateFrameValues(keyframes = [], t = 0, fallback = {}) {
  const frames = keyframes
    .map((frame) => ({
      x: Number(frame.x || 0),
      y: Number(frame.y || 0),
      w: Number(frame.w || 0),
      h: Number(frame.h || 0),
      rot: Number(frame.rot || 0),
      opacity: Number(frame.opacity ?? 1),
      anchorX: Number(frame.anchorX || 0),
      anchorY: Number(frame.anchorY || 0),
      t: clamp(Number(frame.t), 0, 1),
    }))
    .sort((a, b) => a.t - b.t);

  if (!frames.length) return fallback;
  if (t <= frames[0].t) return { ...fallback, ...frames[0] };
  if (t >= frames.at(-1).t) return { ...fallback, ...frames.at(-1) };

  for (let index = 0; index < frames.length - 1; index += 1) {
    const a = frames[index];
    const b = frames[index + 1];
    if (t < a.t || t > b.t) continue;
    const localT = (t - a.t) / Math.max(0.0001, b.t - a.t);
    return {
      x: lerp(a.x, b.x, localT),
      y: lerp(a.y, b.y, localT),
      w: lerp(a.w, b.w, localT),
      h: lerp(a.h, b.h, localT),
      rot: lerp(a.rot, b.rot, localT),
      opacity: lerp(a.opacity, b.opacity, localT),
      anchorX: lerp(a.anchorX, b.anchorX, localT),
      anchorY: lerp(a.anchorY, b.anchorY, localT),
    };
  }

  return fallback;
}
