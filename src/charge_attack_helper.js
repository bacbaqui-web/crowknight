export function updateChargeAttack(player, dt, keys, pressed, requestAction) {
  const original = { keys, pressed };
  if (!player.runSkills?.chargeAttack) return original;
  const filteredKeys = new Set(keys),
    filteredPressed = new Set(pressed);
  filteredKeys.delete('KeyQ');
  filteredPressed.delete('KeyQ');
  const filtered = { keys: filteredKeys, pressed: filteredPressed };
  if (!keys.has('KeyQ')) player.runChargeBlocked = false;
  const interrupted = [...pressed].some((code) => code !== 'KeyQ');
  if (player.dead || player.hurtTime > 0 || !player.onGround || interrupted) {
    if (player.runCharge && keys.has('KeyQ')) player.runChargeBlocked = true;
    cancelChargeAttack(player);
    if (interrupted && keys.has('KeyQ')) player.runChargeBlocked = true;
    return player.runChargeBlocked ? filtered : original;
  }
  if (player.runChargeBlocked) return filtered;
  if (pressed.has('KeyQ')) player.runCharge = { elapsed: 0, animating: false };
  const charge = player.runCharge;
  if (!charge) return original;
  if (keys.has('KeyQ')) {
    charge.elapsed = Math.min(1.2, charge.elapsed + dt);
    if (charge.elapsed >= 0.35 && (!charge.animating || player.customActionTime <= 0))
      charge.animating = requestAction(player, player.runSkillActions.chargePose, player.facing, 'tap');
    // Wait for release or the hold threshold before deciding which attack to emit.
    return filtered;
  }
  const charged = charge.animating;
  cancelChargeAttack(player);
  if (charged) {
    player.runChargedPower = 1 + Math.min(1, charge.elapsed / 1.2) * 2;
    player.runChargedAttack = requestAction(player, player.runSkillActions.chargeAttack, player.facing, 'tap');
  }
  if (!charged) filteredPressed.add('KeyQ');
  return filtered;
}

export function chargeAttackScale(player) {
  return player.runSkills && player.runChargedAttack && player.customActionKey === player.runSkillActions?.chargeAttack
    ? 1 + Math.max(0, player.runSkills.chargeAttack - 1) * 0.2
    : 1;
}

export function cancelChargeAttack(player) {
  if (player.customActionKey === player.runSkillActions?.chargePose) {
    player.customActionKey = null;
    player.customActionTime = 0;
    player.customActionBlend = null;
  }
  player.runCharge = null;
}
