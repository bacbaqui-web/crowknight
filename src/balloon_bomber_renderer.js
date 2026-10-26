// The intact grunt uses the ordinary editable puppet. Only its defeat needs a special composition.
export function drawBalloonDefeat(player, ctx, drawLayer) {
  const s = player.balloonState;
  if (!s || s.phase === 'hover') return false;
  const pose = player.getPose(),
    rig = player.rig,
    scale = player.transform.scale || 1;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(player.facing * scale, scale);
  if (s.phase === 'impact') ctx.globalAlpha *= Math.max(0, 1 - (s.impactTime || 0) / 1.1);
  ctx.translate(0, -55);
  ctx.rotate(Math.PI * Math.min(1, s.fallTime / 0.55));
  ctx.translate(0, 55);
  for (const layer of player.layerOrder)
    if (!['cape', 'backpack', 'weapon'].includes(layer)) drawLayer(player, ctx, layer, pose, rig);
  ctx.restore();
  ctx.save();
  ctx.translate(s.popX, s.popY - 205);
  ctx.scale(scale, scale);
  const t = s.fallTime + (s.impactTime || 0);
  ctx.globalAlpha = Math.max(0, 1 - t / 1.5);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * (25 + t * 65), t * t * 75);
    ctx.rotate(side * t * 2);
    if (player.assets.shield) ctx.drawImage(player.assets.shield, -30, -32, 60, 64);
    ctx.restore();
  }
  ctx.restore();
  if (s.phase === 'impact') {
    ctx.save();
    ctx.fillStyle = '#b6a58a';
    ctx.globalAlpha = Math.max(0, 0.7 - (s.impactTime || 0));
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(
        player.x + (i - 3) * (12 + s.impactTime * 18),
        player.floorY - 8 - Math.sin(i) * 7,
        12 + s.impactTime * 14,
        8,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }
  return true;
}
