import { activeProjectiles, projectileAttackRegion } from '../projectile_runtime_engine.js';
import { depthOf } from './camera.js';
import { attackFaces, currentAttackRegions, prismFaces, screenPoint } from './attack_geometry.js';
import { regionPoints } from '../interaction_swept_region_helper.js';

export function createHitboxView({ ctx, world, button, legend }) {
  let visible = false;
  const history = new Map();
  button.addEventListener('click', () => {
    visible = !visible;
    button.setAttribute('aria-pressed', String(visible));
    button.textContent = `히트박스 표시: ${visible ? '켜짐' : '꺼짐'}`;
    legend.hidden = !visible;
  });
  function drawFaces(faces, view, color, recent = false) {
    ctx.save();
    ctx.setLineDash(recent ? [5, 4] : []);
    ctx.lineWidth = recent ? 1 : 1.8;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    for (const face of faces) {
      ctx.beginPath();
      face.forEach((point, index) => {
        const p = screenPoint(point, world, view);
        if (index) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      });
      ctx.closePath();
      if (!recent) {
        ctx.globalAlpha = 0.055;
        ctx.fill();
      }
      ctx.globalAlpha = recent ? 0.35 : 0.85;
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawDirection(actor, view) {
    const aim = actor.quarterAim || { x: actor.player.facing, z: 0 };
    const start = screenPoint({ x: actor.player.x, depth: depthOf(actor), y: world.floorY }, world, view);
    const end = screenPoint(
      { x: actor.player.x + aim.x * 95, depth: depthOf(actor) + aim.z * 95, y: world.floorY },
      world,
      view
    );
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.save();
    ctx.strokeStyle = '#dcf88b';
    ctx.fillStyle = '#dcf88b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - Math.cos(angle - 0.5) * 11, end.y - Math.sin(angle - 0.5) * 11);
    ctx.lineTo(end.x - Math.cos(angle + 0.5) * 11, end.y - Math.sin(angle + 0.5) * 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function draw(actors, playerActor, view) {
    if (!visible) return;
    let active = 0;
    for (const actor of actors) {
      if (actor.respawning || actor.player.dead) {
        history.delete(actor);
        continue;
      }
      const regions = currentAttackRegions(actor),
        color = actor === playerActor ? '#ffad45' : '#ff607b';
      const faces = regions.map((region) => attackFaces(actor, region));
      active += regions.length;
      if (faces.length) {
        faces.forEach((box) => drawFaces(box, view, color));
        history.set(actor, { faces, time: actor.player.animTime });
      } else {
        const recent = history.get(actor);
        if (recent && actor.player.animTime - recent.time < 0.3)
          recent.faces.forEach((box) => drawFaces(box, view, color, true));
        else history.delete(actor);
      }
    }
    for (const projectile of activeProjectiles()) {
      if (!projectile.active) continue;
      const points = regionPoints(projectileAttackRegion(projectile));
      const face = (offset) => points.map((point) => ({ ...point, depth: depthOf(projectile) + offset }));
      drawFaces(prismFaces(face(-35), face(35)), view, '#c5a0ff');
      active++;
    }
    if (!playerActor.player.dead) drawDirection(playerActor, view);
    legend.textContent = `주황: 내 공격 · 빨강: 적 공격 · 보라: 투사체\n실선: 현재 공격 ${active}개 · 점선: 최근 0.3초\n연두 화살표: 공격 방향 · P: 정지/재개`;
  }
  return { draw, reset: () => history.clear() };
}
