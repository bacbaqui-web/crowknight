export function resetPlayerActionState(player) {
  player.attackTime = 0;
  player.jumpAttackTime = 0;
  player.jumpHoldTime = 0;
  player.jumpStartVy = 0;
  player.jumpStartY = player.y;
  player.dashTime = 0;
  player.attackCooldown = 0;
  player.attackCarrySpeed = 0;
  player.customActionKey = null;
  player.customActionFacing = null;
  player.customActionTriggerMode = 'tap';
  player.customActionPressCodes = null;
  player.customActionTime = 0;
  player.customActionDuration = 0;
  player.customActionElapsed = 0;
  player.customActionMoveProgress = 0;
  player.customActionBlend = null;
  player.velocityControl = null;
  player.vxInertia = null;
  player.vyInertia = null;
  player.hurtTime = 0;
  player.guardActive = false;
  player.guardHits = 0;
  player.guardBlockTime = 0;
  player.guardBreakTime = 0;
  player.guardLockedUntilRelease = false;
}

export function updatePostRollInvulnerability(actor) {
  const isRolling = actor.player.isRolling;
  if (actor.wasRolling && !isRolling) {
    actor.invulnTime = Math.max(actor.invulnTime, actor.tuning.invulnerability.rollEnd);
  }
  actor.wasRolling = isRolling;
}
