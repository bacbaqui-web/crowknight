import { drawFireBurst } from './fire_burst_renderer.js';
import { drawFlameSprite } from './flame_effect_renderer.js';
import { QUARTER_PROJECTION } from './quarter_view/camera.js';
export function drawBossHazard(ctx, h, project = null) {
  const at = (p, draw) => (project ? project(p, draw) : draw()),
    kind = h.bossHazard;
  const fire = kind === 'rain' || kind === 'fireball',
    t = Math.min(1, h.age / h.fuse);
  if (h.phase !== 'blast' && ['giant', 'rain', 'mine', 'missile'].includes(kind))
    at({ ...h, x: h.targetX, y: h.targetY, quarterDepth: h.targetDepth }, () => {
      ctx.save();
      ctx.translate(h.targetX, h.targetY);
      const slope = project ? QUARTER_PROJECTION.slope : 0.25;
      ctx.fillStyle = fire ? 'rgba(255,35,15,.2)' : 'rgba(180,60,20,.12)';
      ctx.strokeStyle = fire ? '#ff3425' : '#e9ab65';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, h.radius, h.radius * slope, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (kind === 'giant') {
        ctx.globalAlpha *= t;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, h.radius * (1 - t)), Math.max(1, h.radius * slope * (1 - t)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  at(h, () => {
    ctx.save();
    ctx.translate(h.x, h.y);
    if(fire) {ctx.shadowColor='#ff3c13';ctx.shadowBlur=22;}
    if (h.phase === 'blast' && kind !== 'punch') {
      drawFireBurst(ctx,h.radius,h.phaseTime,project ? QUARTER_PROJECTION.slope : .5);
    } else if (kind === 'punch') {
      ctx.fillStyle = '#b8ab7a';
      ctx.strokeStyle = '#242720';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -30, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (kind === 'missile') {
      ctx.rotate(t < 0.35 ? 0 : Math.PI);
      ctx.fillStyle='#d5d9ce';ctx.strokeStyle='#403d31';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(9,-12);ctx.lineTo(9,12);ctx.lineTo(-9,12);ctx.lineTo(-9,-12);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#c85434';ctx.fillRect(-8,-10,16,7);
      ctx.fillStyle='#ffba4f';ctx.beginPath();ctx.moveTo(-6,12);ctx.lineTo(0,32+Math.sin(h.age*65)*8);ctx.lineTo(6,12);ctx.fill();
    } else if (fire) {
      drawFlameSprite(ctx, h.owner.player.assets.flame, -25, -50, 50, 65, h.age, h.id || 0);
    } else {
      const size = kind === 'giant' ? 100 : kind === 'barrel' ? 65 : 34;
      ctx.translate(0, -size / 2);
      ctx.rotate(kind === 'giant' ? t * 3 : h.age * 6);
      if (h.asset) ctx.drawImage(h.asset, -size / 2, -size / 2, size, size);
      else {
        ctx.fillStyle = '#3c3932';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (h.reflected) {
        ctx.strokeStyle = '#85eaff';
        ctx.lineWidth = 3;
        ctx.strokeRect(-size / 2, -size / 2, size, size);
      }
    }
    ctx.restore();
  });
}
