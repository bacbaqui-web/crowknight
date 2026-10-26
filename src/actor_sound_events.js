export function actorSoundEvents(actor, previous, play) {
  const p = actor.player,
    clock = p.animTime || 0;
  const state = {
    x: p.x,
    z: actor.quarterDepth || 0,
    ground: p.onGround,
    dead: p.dead,
    time: clock,
    action: p.actionKey,
    roll: p.isRolling,
    balloon: p.balloonState?.phase,
    stunned: p.bossStunned,
    nextStep: previous.nextStep || 0,
    nextRumble: previous.nextRumble || 0,
  };
  if (p.dead) {
    if (previous.dead === false && actor.group !== 'players')
      play(actor.group === 'bosses' ? 'bossDeath' : 'enemyDeath', actor);
    if (state.balloon === 'impact' && previous.balloon !== 'impact') play('bodyFall', actor);
    return state;
  }
  if (actor.id && actor.group === 'bosses' && previous.time == null) play('bossArrival', actor);
  if (previous.ground === true && p.onGround === false && actor.group === 'players') play('jump', actor);
  if (previous.ground === false && p.onGround === true) play('land', actor);
  if (state.roll && !previous.roll) play('roll', actor);
  if (state.balloon === 'falling' && previous.balloon !== 'falling') play('balloonPop', actor);
  if (state.stunned && !previous.stunned && actor.id === 'ram_tank') play('tankCrash', actor);
  if (p.actionKey === 'mageFire' && previous.action !== 'mageFire') play('magicCharge', actor);
  const distance = Math.hypot(p.x - (previous.x ?? p.x), state.z - (previous.z ?? state.z));
  const dt = clock - (previous.time ?? clock);
  const moving = dt > 0 && dt < 0.2 && distance / dt > 15 && distance < 80;
  if (actor.id === 'ram_tank') {
    if (moving && clock >= state.nextRumble) {
      play(p.actionKey === 'tankCharge' ? 'tankCharge' : 'tankRumble', actor);
      state.nextRumble = clock + 0.65;
    }
  } else if (p.onGround && moving && !state.roll && !(p.trapRootTime > 0) && clock >= state.nextStep) {
    play('footstep', actor);
    if (actor.group !== 'players') play('armorStep', actor);
    state.nextStep = clock + Math.max(0.22, Math.min(0.42, 85 / (distance / dt)));
  }
  return state;
}
