export function drawPuppetAnchorDot(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = 'rgba(74, 167, 255, .10)';
  ctx.strokeStyle = 'rgba(74, 167, 255, .9)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4aa7ff';
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPuppetDebug(ctx, player) {
  const h = player.hitbox;
  ctx.fillStyle = 'rgba(255,0,0,.18)';
  ctx.strokeStyle = 'red';
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.strokeRect(h.x, h.y, h.w, h.h);

  const a = player.attackBox;
  if (!a) return;

  ctx.fillStyle = 'rgba(255,255,0,.2)';
  ctx.strokeStyle = 'yellow';
  if (a.points?.length) {
    ctx.beginPath();
    a.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  ctx.fillRect(a.x, a.y, a.w, a.h);
  ctx.strokeRect(a.x, a.y, a.w, a.h);
}
