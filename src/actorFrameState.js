export function captureActorMotionStart(actors) {
  actors.forEach((actor) => {
    actor.previousOnGround = actor.player.onGround;
    actor.previousVy = actor.player.vy;
  });
}

export function updatePausedActors(actors, dt, { clearAttackTime = false } = {}) {
  actors.forEach((actor) => {
    actor.player.animTime += dt;
    actor.player.vx = 0;
    actor.player.vy = 0;
    if (clearAttackTime) actor.player.attackTime = Math.min(actor.player.attackTime, 0);
    actor.player.updateState();
  });
}
