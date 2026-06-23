export function updateRollGhosts(actors, dt) {
  actors.forEach((actor) => {
    actor.rollGhosts = actor.rollGhosts
      .map((ghost) => ({ ...ghost, life: ghost.life - dt }))
      .filter((ghost) => ghost.life > 0);

    if (!actor.player.isRolling) {
      actor.rollGhostTimer = 0;
      return;
    }

    actor.rollGhostTimer -= dt;
    if (actor.rollGhostTimer > 0) return;

    actor.rollGhostTimer = 0.035;
    actor.rollGhosts.unshift({
      x: actor.player.x,
      y: actor.player.y,
      facing: actor.player.facing,
      dashTime: actor.player.dashTime,
      life: 0.18,
      maxLife: 0.18,
    });

    actor.rollGhosts.length = Math.min(actor.rollGhosts.length, 5);
  });
}

export function drawRollGhosts(ctx, actor) {
  if (!actor.rollGhosts.length) return;

  const player = actor.player;
  const snapshot = {
    x: player.x,
    y: player.y,
    facing: player.facing,
    dashTime: player.dashTime,
    state: player.state,
    anchorDebugPart: player.anchorDebugPart,
  };

  player.anchorDebugPart = null;
  actor.rollGhosts
    .slice()
    .reverse()
    .forEach((ghost, index) => {
      const alpha = Math.max(0, ghost.life / ghost.maxLife) * (0.16 + index * 0.025);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.filter = 'brightness(1.55) saturate(0.35)';
      player.x = ghost.x;
      player.y = ghost.y;
      player.facing = ghost.facing;
      player.dashTime = ghost.dashTime;
      player.state = 'roll';
      player.draw(ctx);
      ctx.restore();
    });

  player.x = snapshot.x;
  player.y = snapshot.y;
  player.facing = snapshot.facing;
  player.dashTime = snapshot.dashTime;
  player.state = snapshot.state;
  player.anchorDebugPart = snapshot.anchorDebugPart;
}
