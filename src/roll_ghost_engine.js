export function updateRollGhosts(actors, dt) {
  actors.forEach((actor) => {
    const settings = rollGhostSettings(actor);
    actor.rollGhosts = actor.rollGhosts
      .map((ghost) => ({ ...ghost, life: ghost.life - dt }))
      .filter((ghost) => ghost.life > 0);

    if (!actor.player.isRolling || settings.count <= 0 || settings.opacity <= 0) {
      actor.rollGhostTimer = 0;
      return;
    }

    actor.rollGhostTimer -= dt;
    if (actor.rollGhostTimer > 0) return;

    actor.rollGhostTimer = settings.interval;
    actor.rollGhosts.unshift({
      x: actor.player.x,
      y: actor.player.y,
      facing: actor.player.facing,
      dashTime: actor.player.dashTime,
      rollDuration: actor.player.rollDuration,
      life: settings.life,
      maxLife: settings.life,
    });

    actor.rollGhosts.length = Math.min(actor.rollGhosts.length, settings.count);
  });
}

export function drawRollGhosts(ctx, actor) {
  if (!actor.rollGhosts.length) return;

  const player = actor.player;
  const ghostSettings = rollGhostSettings(actor);
  const snapshot = {
    x: player.x,
    y: player.y,
    facing: player.facing,
    dashTime: player.dashTime,
    rollDuration: player.rollDuration,
    state: player.state,
    anchorDebugPart: player.anchorDebugPart,
  };

  player.anchorDebugPart = null;
  actor.rollGhosts
    .slice()
    .reverse()
    .forEach((ghost, index) => {
      const alpha = Math.max(0, ghost.life / ghost.maxLife) * (0.16 + index * 0.025) * ghostSettings.opacity;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.filter = 'brightness(1.55) saturate(0.35)';
      player.x = ghost.x;
      player.y = ghost.y;
      player.facing = ghost.facing;
      player.dashTime = ghost.dashTime;
      player.rollDuration = ghost.rollDuration;
      player.state = 'roll';
      player.draw(ctx);
      ctx.restore();
    });

  player.x = snapshot.x;
  player.y = snapshot.y;
  player.facing = snapshot.facing;
  player.dashTime = snapshot.dashTime;
  player.rollDuration = snapshot.rollDuration;
  player.state = snapshot.state;
  player.anchorDebugPart = snapshot.anchorDebugPart;
}

function rollGhostSettings(actor) {
  const motion = actor.tuning?.motion || {};
  return {
    count: Math.max(0, Math.round(Number(motion.rollGhostCount ?? 5))),
    interval: Math.max(0.01, Number(motion.rollGhostInterval ?? 0.035)),
    life: Math.max(0.04, Number(motion.rollGhostLife ?? 0.18)),
    opacity: Math.max(0, Number(motion.rollGhostOpacity ?? 1)),
  };
}
