import { activeProjectiles, projectileAttackRegion } from '../projectile_runtime_engine.js';
import { depthOf } from './camera.js';
import { currentAttackRegions, screenPoint } from './attack_geometry.js';
import { attackFootprint, createAttackHistory } from './attack_history.js';
import { createTrajectoryView } from './trajectory_view.js';

export function createHitboxView({
  ctx,
  world,
  button,
  legend,
  panel = null,
  trajectoryCanvas = null,
  trajectoryStatus = null,
}) {
  let visible = false;
  const history = createAttackHistory();
  const trajectory = trajectoryCanvas ? createTrajectoryView(trajectoryCanvas, trajectoryStatus) : null;
  button.addEventListener('click', () => {
    visible = !visible;
    button.setAttribute('aria-pressed', String(visible));
    button.textContent = `히트박스 표시: ${visible ? '켜짐' : '꺼짐'}`;
    legend.hidden = !visible;
    if (panel) panel.hidden = !visible;
  });
  function drawPolygon(points, view, color, recent = false) {
    ctx.save();
    ctx.setLineDash(recent ? [5, 4] : []);
    ctx.lineWidth = recent ? 1 : 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((point, index) => {
      const p = screenPoint(point, world, view);
      if (index) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
    if (!recent) {
      ctx.globalAlpha = 0.2;
      ctx.fill();
    }
    ctx.globalAlpha = recent ? 0.25 : 1;
    ctx.stroke();
    ctx.restore();
  }
  function arrow(start, end, color, size = 10) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - Math.cos(angle - 0.5) * size, end.y - Math.sin(angle - 0.5) * size);
    ctx.lineTo(end.x - Math.cos(angle + 0.5) * size, end.y - Math.sin(angle + 0.5) * size);
    ctx.closePath();
    ctx.fill();
  }
  function drawDirection(actor, view) {
    const aim = actor.quarterAim || { x: actor.player.facing, z: 0 };
    const start = screenPoint({ x: actor.player.x, depth: depthOf(actor), y: world.floorY }, world, view);
    const end = screenPoint(
      { x: actor.player.x + aim.x * 95, depth: depthOf(actor) + aim.z * 95, y: world.floorY },
      world,
      view
    );
    ctx.save();
    arrow(start, end, '#dcf88b');
    ctx.restore();
  }
  function drawTrail(entry, view) {
    const samples = entry.samples;
    if (!samples.length) return;
    const points = samples.map((s) => screenPoint(s.ground, world, view));
    ctx.save();
    ctx.strokeStyle = '#8de2ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
    if (points.length > 1 && Math.hypot(points.at(-1).x - points.at(-2).x, points.at(-1).y - points.at(-2).y) > 1)
      arrow(points.at(-2), points.at(-1), '#8de2ff', 7);
    for (const [index, p] of [points[0], points.at(-1)].entries()) {
      ctx.fillStyle = index === 0 ? '#ffffff' : '#ffad45';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function draw(actors, playerActor, view) {
    if (!visible) {
      history.update(playerActor, world.floorY);
      return;
    }
    let active = 0,
      heroEntry = null;
    for (const actor of actors) {
      const entry = history.update(actor, world.floorY);
      if (actor === playerActor) heroEntry = entry;
      if (!entry) continue;
      const regions = currentAttackRegions(actor),
        color = actor === playerActor ? '#ffad45' : '#ff607b';
      active += regions.length;
      const recent = actor.player.animTime - entry.samples.at(-1).time < 1;
      if (recent) {
        const stride = Math.max(1, Math.ceil(entry.samples.length / 10));
        entry.samples.forEach((sample, index) => {
          if (index % stride === 0) sample.footprints.forEach((p) => drawPolygon(p, view, color, true));
        });
        if (actor === playerActor) drawTrail(entry, view);
      }
      regions.forEach((region) => drawPolygon(attackFootprint(actor, region, world.floorY), view, color));
    }
    for (const p of activeProjectiles()) {
      if (!p.active) continue;
      const r = projectileAttackRegion(p),
        z = depthOf(p);
      const points = [
        [r.x, z - 35],
        [r.x + r.w, z - 35],
        [r.x + r.w, z + 35],
        [r.x, z + 35],
      ].map(([x, depth]) => ({ x, depth, y: world.floorY }));
      drawPolygon(points, view, '#c5a0ff');
      active++;
    }
    if (!playerActor.player.dead) drawDirection(playerActor, view);
    trajectory?.draw(heroEntry);
    legend.textContent = `주황: 내 공격 · 빨강: 적 · 보라: 투사체 (바닥 범위)\n현재 공격 ${active}개 · 점선: 최근 1초\n하늘색: 궤적 · 옆면도식 번호 순서 · P: 정지/재개`;
  }
  return { draw, reset: history.reset };
}
