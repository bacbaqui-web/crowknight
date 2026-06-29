import { clamp, lerp } from './utils.js';

const JUMP_HOLD_MAX = 0.22;
const JUMP_HELD_GRAVITY = 0.42;
const JUMP_RELEASE_GRAVITY = 2.2;
const DEFAULT_RUN_ACCELERATION = 0.16;

export function updatePuppetPlayer(player, dt, keys, pressed, world) {
  player.animTime += dt;
  player.stateTime += dt;
  player.hurtTime = Math.max(0, player.hurtTime - dt);
  player.guardBlockTime = Math.max(0, player.guardBlockTime - dt);
  player.guardBreakTime = Math.max(0, player.guardBreakTime - dt);

  const l = keys.has('ArrowLeft');
  const r = keys.has('ArrowRight');
  const jumpHeld = keys.has('Space');
  const guardHeld = keys.has('KeyE');

  updatePuppetGuardInput(player, guardHeld);
  const runAcceleration = clamp(Number(player.runAcceleration ?? DEFAULT_RUN_ACCELERATION), 0.02, 0.4);

  if (player.isRolling) {
    player.vx = player.rollDirection * player.rollSpeed;
  } else if (player.jumpAttackTime > 0) {
    player.vx = lerp(player.vx, 0, 0.04);
  } else if (player.attackTime > 0) {
    player.vx = player.facing * player.attackLungeSpeed;
  } else if (player.isGuarding || player.guardBreakTime > 0) {
    player.vx = lerp(player.vx, 0, 0.32);
  } else if (l) {
    player.vx = lerp(player.vx, -player.speed, runAcceleration);
    player.facing = -1;
  } else if (r) {
    player.vx = lerp(player.vx, player.speed, runAcceleration);
    player.facing = 1;
  } else {
    player.vx = lerp(player.vx, 0, 0.18);
    if (Math.abs(player.vx) < 2) player.vx = 0;
  }

  if (pressed.has('Space') && player.onGround) {
    player.vy = -jumpVelocityForHeight(player.jumpPower, world.gravity);
    player.jumpStartVy = player.vy;
    player.jumpStartY = player.y;
    player.onGround = false;
    player.jumpHoldTime = JUMP_HOLD_MAX;
    player.glideTime = player.glideTimeMax;
    player.airFlapCooldownTime = player.airFlapCooldown;
  } else if (pressed.has('Space') && canPuppetAirFlap(player)) {
    const jumpVelocity = jumpVelocityForHeight(player.jumpPower, world.gravity);
    player.vy = Math.min(player.vy - player.airFlapPower, -player.airFlapPower);
    player.vy = Math.max(player.vy, -jumpVelocity * 0.78);
    player.jumpStartVy = Math.min(player.jumpStartVy || player.vy, player.vy);
    player.jumpStartY = player.y;
    player.jumpHoldTime = JUMP_HOLD_MAX * 0.55;
    player.glideTime = player.glideTimeMax;
    player.airFlapCooldownTime = player.airFlapCooldown;
  }

  if (
    pressed.has('KeyW') &&
    player.onGround &&
    player.dashCooldown <= 0 &&
    !player.isGuarding &&
    player.guardBreakTime <= 0
  ) {
    player.rollDirection = player.facing;
    player.rollDuration = player.getPoseActionDuration('roll', 0.28);
    player.dashTime = player.rollDuration;
    player.dashCooldown = player.dashCooldownMax;
    player.attackSerial += 1;
    player.vx = player.rollDirection * player.rollSpeed;
    player.vy = 0;
  }

  if (pressed.has('KeyQ')) tryPuppetAttack(player);

  if (player.dashTime > 0) {
    player.glideActive = false;
    player.dashTime -= dt;
  } else if (isPuppetGliding(player, jumpHeld)) {
    player.glideTime -= dt;
    player.vy += world.gravity * 0.18 * dt;
    player.vy = Math.min(player.vy, player.glideFallSpeed);
  } else {
    player.vy += world.gravity * jumpGravityScale(player, jumpHeld, dt) * dt;
  }

  player.dashCooldown -= dt;
  player.airFlapCooldownTime -= dt;
  player.attackTime -= dt;
  player.jumpAttackTime -= dt;
  player.attackCooldown -= dt;
  player.comboTimer -= dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  clampJumpToConfiguredHeight(player);
  player.x = clamp(player.x, world.minX ?? 80, world.maxX ?? 880);

  if (player.y >= world.floorY) {
    player.y = world.floorY;
    player.vy = 0;
    player.onGround = true;
    player.jumpHoldTime = 0;
    player.jumpStartVy = 0;
    player.jumpStartY = player.y;
    player.airFlapCooldownTime = 0;
    player.glideTime = player.glideTimeMax;
    player.glideActive = false;
    player.guardHits = 0;
    player.guardLockedUntilRelease = false;
  }

  updatePuppetPlayerState(player);
}

export function updatePuppetNpc(player, dt, target, world, bounds = null) {
  player.animTime += dt;
  player.stateTime += dt;
  player.hurtTime = Math.max(0, player.hurtTime - dt);
  player.guardBlockTime = Math.max(0, player.guardBlockTime - dt);
  player.guardBreakTime = Math.max(0, player.guardBreakTime - dt);
  player.guardActive = false;
  player.aiTimer -= dt;

  const distance = target.x - player.x;
  const absDistance = Math.abs(distance);

  if (absDistance < 240) {
    player.aiDir = Math.sign(distance) || player.aiDir;
  } else if (player.aiTimer <= 0) {
    player.aiDir = Math.random() > 0.5 ? 1 : -1;
    player.aiTimer = 0.8 + Math.random() * 1.6;
  }

  const pace = absDistance < 240 ? 0.78 : 0.38;
  if (player.isRolling) {
    player.vx = player.rollDirection * player.rollSpeed * 0.75;
  } else if (player.isAttacking) {
    player.vx = player.facing * player.attackLungeSpeed;
  } else {
    player.vx = player.aiDir * player.speed * pace;
    player.facing = player.aiDir;
  }

  if (absDistance < 88) tryPuppetAttack(player);

  if (player.onGround && player.dashCooldown <= 0 && absDistance > 130 && absDistance < 260 && Math.random() < 0.012) {
    player.rollDirection = player.facing;
    player.rollDuration = player.getPoseActionDuration('roll', 0.28);
    player.dashTime = player.rollDuration;
    player.dashCooldown = player.dashCooldownMax;
    player.attackSerial += 1;
    player.vx = player.rollDirection * player.rollSpeed * 0.75;
    player.vy = 0;
  }

  if (player.dashTime > 0) player.dashTime -= dt;
  else player.vy += world.gravity * dt;

  player.dashCooldown -= dt;
  player.attackTime -= dt;
  player.jumpAttackTime -= dt;
  player.attackCooldown -= dt;
  player.comboTimer -= dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const minX = bounds?.minX ?? world.minX ?? 80;
  const maxX = bounds?.maxX ?? world.maxX ?? 880;

  if (player.x <= minX) {
    player.x = minX;
    player.aiDir = 1;
  }

  if (player.x >= maxX) {
    player.x = maxX;
    player.aiDir = -1;
  }

  if (player.y >= world.floorY) {
    player.y = world.floorY;
    player.vy = 0;
    player.onGround = true;
  }

  updatePuppetPlayerState(player);
}

export function updatePuppetPlayerState(player) {
  let nextState = 'idle';
  if (player.dead) nextState = 'death';
  else if (player.hurtTime > 0) nextState = 'hurt';
  else if (player.guardBreakTime > 0) nextState = 'guardBreak';
  else if (player.jumpAttackTime > 0) nextState = 'jumpAttack';
  else if (player.dashTime > 0) nextState = 'roll';
  else if (player.attackTime > 0) nextState = 'attack';
  else if (player.isGuarding) nextState = 'guard';
  else if (!player.onGround && player.vy < 0) nextState = 'jump';
  else if (player.glideActive) nextState = 'glide';
  else if (!player.onGround) nextState = 'fall';
  else if (Math.abs(player.vx) > 20) nextState = 'run';

  if (nextState !== player.state) {
    player.state = nextState;
    player.stateTime = 0;
  } else {
    player.state = nextState;
  }
}

export function getPuppetJumpRiseProgress(player) {
  if (player.vy >= 0) return 1;
  const startSpeed = Math.max(1, Math.abs(player.jumpStartVy || jumpVelocityForHeight(player.jumpPower, 1800)));
  return clamp(1 - Math.abs(player.vy) / startSpeed, 0, 1);
}

function jumpGravityScale(player, jumpHeld, dt) {
  if (player.vy >= 0) return 1;
  if (jumpHeld && player.jumpHoldTime > 0) {
    player.jumpHoldTime = Math.max(0, player.jumpHoldTime - dt);
    return JUMP_HELD_GRAVITY;
  }
  player.jumpHoldTime = 0;
  return JUMP_RELEASE_GRAVITY;
}

function clampJumpToConfiguredHeight(player) {
  if (player.vy >= 0 || !Number.isFinite(player.jumpStartY)) return;
  const topY = player.jumpStartY - player.jumpPower;
  if (player.y > topY) return;
  player.y = topY;
  player.vy = Math.max(0, player.vy);
  player.jumpHoldTime = 0;
}

export function canPuppetAirFlap(player) {
  return (
    !player.onGround &&
    !player.isRolling &&
    player.attackTime <= 0 &&
    player.jumpAttackTime <= 0 &&
    player.airFlapCooldownTime <= 0
  );
}

export function isPuppetGliding(player, jumpHeld) {
  player.glideActive = !player.onGround && player.vy > 0 && jumpHeld && player.glideTime > 0 && !player.isRolling;
  return player.glideActive;
}

function jumpVelocityForHeight(height, gravity) {
  return Math.sqrt(Math.max(1, 2 * Math.max(1, gravity) * Math.max(0, Number(height || 0))));
}

export function tryPuppetAttack(player) {
  if (player.attackCooldown > 0 || player.isGuarding || player.guardBreakTime > 0) return false;
  if (!player.onGround && !player.isRolling && player.jumpAttackTime <= 0) {
    player.jumpAttackDuration = player.getPoseActionDuration('jumpAttack', 0.34);
    player.jumpAttackTime = player.jumpAttackDuration;
    player.attackCooldown = player.attackCooldownMax + 0.08;
    player.attackTime = 0;
    player.comboTimer = 0;
    player.comboStep = 0;
    player.dashTime = 0;
    player.attackSerial += 1;
    player.vy = Math.min(player.vy + 120, 260);
    return true;
  }
  const rollCarrySpeed = player.isRolling ? Math.abs(player.vx || player.rollSpeed) : 0;
  const runCarrySpeed = player.onGround ? Math.max(0, Number(player.vx || 0) * player.facing) : 0;

  if (player.comboTimer <= 0) player.comboStep = 0;
  player.comboStep = (player.comboStep % 3) + 1;
  player.attackDuration = player.getPoseActionDuration(
    `attack${player.comboStep}`,
    player.comboStep === 3 ? 0.38 : 0.28
  );
  player.attackTime = player.attackDuration;
  player.attackCooldown = player.comboStep === 3 ? player.attackCooldownMax + 0.16 : player.attackCooldownMax;
  player.comboTimer = player.comboResetTime;
  player.attackCarrySpeed = Math.max(rollCarrySpeed, runCarrySpeed);
  player.dashTime = 0;
  player.attackSerial += 1;
  return true;
}

export function updatePuppetGuardInput(player, guardHeld) {
  if (!guardHeld) {
    player.guardActive = false;
    player.guardHits = 0;
    player.guardLockedUntilRelease = false;
    return;
  }
  if (
    player.guardLockedUntilRelease ||
    player.guardBreakTime > 0 ||
    player.hurtTime > 0 ||
    player.isRolling ||
    player.attackTime > 0 ||
    player.jumpAttackTime > 0 ||
    !player.onGround
  ) {
    player.guardActive = false;
    return;
  }
  player.guardActive = true;
}

export function registerPuppetGuardBlock(player) {
  player.guardHits += 1;
  player.guardBlockTime = 0.16;
  if (player.guardHits >= 3) {
    player.guardActive = false;
    player.guardBreakTime = 0.38;
    player.guardLockedUntilRelease = true;
    player.guardHits = 0;
    return true;
  }
  return false;
}
