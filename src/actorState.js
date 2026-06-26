export function resetPlayerActionState(player) {
  player.attackTime = 0;
  player.jumpAttackTime = 0;
  player.jumpHoldTime = 0;
  player.jumpStartVy = 0;
  player.jumpStartY = player.y;
  player.dashTime = 0;
  player.attackCooldown = 0;
  player.attackCarrySpeed = 0;
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
