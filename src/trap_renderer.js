export function drawTrap(ctx, trap, project = null) {
  const draw = () => {
    ctx.save();
    ctx.translate(trap.x, trap.y);
    if (trap.phase === 'broken' || trap.phase === 'closed') ctx.globalAlpha *= Math.max(0, 1 - trap.phaseTime / 1.2);
    const open = trap.phase === 'armed' || trap.phase === 'arming';
    if (open) {
      ctx.strokeStyle = trap.phase === 'armed' ? '#db7753' : '#e6c477';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 27, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const asset = trap.assets?.[open ? 'collar' : 'shield'];
    if (asset) {
      if (trap.phase === 'broken') {
        // Separate the two halves of the closed sprite so destruction reads at game scale.
        const w = asset.width / 2;
        ctx.drawImage(asset, 0, 0, w, asset.height, -34, -14, 24, 20);
        ctx.drawImage(asset, w, 0, w, asset.height, 9, -8, 24, 20);
      } else ctx.drawImage(asset, -27, open ? -19 : -30, 54, open ? 27 : 37);
    }
    ctx.restore();
  };
  if (project) project(trap, draw);
  else draw();
}

export function drawTrapRoot(ctx, player) {
  if (!(player.trapRootTime > 0) || player.dead) return;
  ctx.save();
  ctx.strokeStyle = '#f0b75d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 2, 24, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f0b75d';
  ctx.fillRect(player.x - 20, player.y + 15, 40 * Math.min(1, player.trapRootTime), 4);
  ctx.restore();
}
