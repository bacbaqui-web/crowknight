const smooth = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export function arrivalPose(time) {
  const flare = smooth((time - 1.55) / 0.6);
  const fold = smooth((time - 2.15) / 0.32);
  const settle = time < 2.15 ? 0 : Math.sin(Math.PI * Math.min(1, (time - 2.15) / 0.35));
  return { spread: 1 - fold, lean: 0.75 * (1 - flare), squash: 1 - settle * 0.12, flare };
}

// Two articulated feather fans, using the puppet's dark outline and muted teal palette.
// No image allocation, filters or offscreen compositing in the frame loop.
function wing(ctx, pose, near) {
  const spread = pose.spread;
  if (spread <= 0) return;
  ctx.save();
  ctx.translate(-10, -58);
  ctx.rotate(near ? -0.32 + pose.flare * 0.3 : 0.3 - pose.flare * 0.25);
  ctx.scale(0.18 + spread * 0.82, (near ? 1 : -0.82) * (0.25 + spread * 0.75));
  ctx.globalAlpha *= Math.min(1, spread * 5);
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111e20';
  for (let i = 8; i >= 0; i--) {
    const rootX = -6 - i * 6;
    const tipX = -100 + i * 9;
    const tipY = 17 + Math.sin((i / 10) * Math.PI) * 47;
    ctx.fillStyle = i % 2 ? (near ? '#344b49' : '#263c3d') : near ? '#405953' : '#304746';
    ctx.beginPath();
    ctx.moveTo(rootX, -i * 2.2);
    ctx.bezierCurveTo(rootX - 31, -6, tipX - 13, tipY - 16, tipX, tipY);
    ctx.quadraticCurveTo(tipX + 14, tipY - 1, rootX + 13, -i * 2.2 + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = near ? '#405650' : '#293f3e';
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.quadraticCurveTo(-24, -35, -63, -20);
  ctx.quadraticCurveTo(-68, -7, -44, 9);
  ctx.quadraticCurveTo(-20, 18, 4, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawArrival(ctx, world, actor, time) {
  const p = actor.player;
  const pose = arrivalPose(time);
  ctx.save();
  ctx.fillStyle = '#17222255';
  ctx.beginPath();
  ctx.ellipse(p.x, world.floorY + 3, 25 + pose.spread * 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(p.x, p.y);
  ctx.scale(1, pose.squash);
  wing(ctx, pose, false);
  ctx.save();
  ctx.translate(0, -50);
  ctx.rotate(pose.lean);
  ctx.translate(-p.x, -p.y + 50);
  p.draw(ctx);
  ctx.restore();
  wing(ctx, pose, true);
  ctx.restore();
}
