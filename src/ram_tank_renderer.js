import { RAM_TANK, TANK_PART_ORDER, tankPhase, tankChargeDistance } from './ram_tank_runtime.js';
import { projectedSpearPoint } from './spearman_throw_renderer.js';

export function drawTankParts(player, ctx, drawPart) {
  for (const key of TANK_PART_ORDER) {
    const wheel = ['upperLegL', 'upperLegR', 'lowerLegL'].includes(key);
    drawPart(player, ctx, player.assets[key], player.rig[key], 0, 0, wheel ? player.tankWheelAngle || 0 : 0, key);
  }
  if (player.bossStunned) {
    ctx.save();
    ctx.fillStyle = '#ffe580';
    for (let i = 0; i < 3; i++) {
      const a = player.animTime * 5 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 40, -185 + Math.sin(a) * 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const state = player.tankCharge;
  if (!state || player.actionKey !== 'tankCharge') return;
  const phase = tankPhase(player.customActionElapsed || 0);
  if (phase !== 'charge' && phase !== 'brake') return;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const t = ((player.animTime || 0) * 2.5 + i * 0.21) % 1;
    ctx.globalAlpha *= 0.8;
    ctx.fillStyle = `rgba(185,164,124,${(1 - t) * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(-130 - t * 65, -9 - t * 15, 7 + t * 15, 4 + t * 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
export function drawTankWarnings(ctx, actors, project) {
  for (const actor of actors) {
    const p = actor.player,
      state = p.tankCharge;
    if (
      !state ||
      p.dead ||
      actor.respawning ||
      p.actionKey !== 'tankCharge' ||
      tankPhase(p.customActionElapsed || 0) !== 'warning'
    )
      continue;
    const reach = tankChargeDistance(10) + 170 * Number(p.transform?.scale || 1);
    const start = { x: state.x, y: state.y, quarterDepth: state.depth };
    const end = {
      x: start.x + state.aim.x * reach,
      y: state.y,
      quarterDepth: (state.depth || 0) + state.aim.z * reach,
    };
    const a = projectedSpearPoint(ctx, start, project),
      b = projectedSpearPoint(ctx, end, project);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(255,65,45,.22)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = '#ff664e';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.stroke();
    const progress = Math.min(1, (p.customActionElapsed || 0) / RAM_TANK.warning);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress);
    ctx.stroke();
    ctx.restore();
  }
}
