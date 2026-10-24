import { drawQuarterAttackEffect } from './attack_effects.js';
import { createHitboxView } from './hitbox_view.js';
import { groundPoint, depthOf } from './camera.js';
import { drawActor } from '../actor_canvas_renderer.js';
import { drawFormulaAfterimages } from '../afterimage_runtime_helper.js';
import { drawRollGhosts } from '../roll_ghost_engine.js';
import { drawProjectiles } from '../projectile_runtime_engine.js';
import { formulaScreenZoom } from '../zoom_formula_runtime_helper.js';

export function createQuarterRenderer({ ctx, world }) {
  let view;
  const hitboxes = createHitboxView({
    ctx,
    world,
    button: document.querySelector('#quarterHitboxes'),
    legend: document.querySelector('#quarterHitboxLegend'),
  });
  function projectEntity(entity) {
    const x = entity.player?.x ?? entity.x ?? entity.targetX ?? view.x;
    const point = groundPoint(x, depthOf(entity), view);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(point.scale, point.scale);
    ctx.translate(-x, -world.floorY);
    return () => ctx.restore();
  }
  function drawGround(hero) {
    ctx.fillStyle = '#17251f';
    ctx.fillRect(0, 0, world.viewW, world.viewH);
    const tile = 100,
      center = Math.floor(hero.player.x / tile) * tile;
    for (let row = -24; row < 25; row++)
      for (let col = -22; col < 23; col++) {
        // Staggered diamond tiles make the ground tilt visible at the lower camera angle.
        const x = center + col * tile + ((row % 2) * tile) / 2,
          z = row * 80;
        const corners = [
          [x - tile / 2, z],
          [x, z - 80],
          [x + tile / 2, z],
          [x, z + 80],
        ];
        ctx.beginPath();
        corners.forEach(([px, pz], index) => {
          const p = groundPoint(px, pz, view);
          if (index) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = (col + row) % 2 ? '#293d31' : '#2d4135';
        ctx.fill();
        ctx.strokeStyle = '#71826a25';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    for (const z of [-480, 480]) {
      const a = groundPoint(center - 1900, z, view),
        b = groundPoint(center + 1900, z, view);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#b5c38880';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const shade = ctx.createLinearGradient(0, 0, 0, world.viewH);
    shade.addColorStop(0, '#0d1918ee');
    shade.addColorStop(0.48, '#17251f00');
    shade.addColorStop(1, '#07100b44');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, world.viewW, world.viewH);
  }
  function draw({ actors, playerActor, particleEffects, experience, healthDrops, effectAssets, screenZoom }) {
    const shake = particleEffects.getScreenShakeOffset();
    view = {
      width: world.viewW,
      height: world.viewH,
      x: playerActor.player.x + 110,
      depth: depthOf(playerActor) * 0.35,
      zoom: formulaScreenZoom(actors, screenZoom),
    };
    ctx.save();
    ctx.translate(shake.x, shake.y);
    drawGround(playerActor);
    particleEffects.drawDust();
    [...actors]
      .filter((actor) => !actor.respawning)
      .sort((a, b) => depthOf(a) - depthOf(b))
      .forEach((actor) => {
        drawFormulaAfterimages(ctx, actor, projectEntity);
        drawRollGhosts(ctx, actor, projectEntity);
        projectEntity(actor);
        drawActor(ctx, world, actor, {
          selectedActor: null,
          activeEditPartKey: () => null,
          activeEditPartKeys: () => [],
        });
        ctx.restore();
        drawQuarterAttackEffect(ctx, actor, effectAssets, world, view);
      });
    const project = (entity, drawEntity) => {
      const restore = projectEntity(entity);
      drawEntity();
      restore();
    };
    healthDrops.draw(ctx, project);
    experience.draw(ctx, project);
    drawProjectiles(ctx, effectAssets, project);
    particleEffects.drawHitSparks();
    particleEffects.drawDeathParticles();
    hitboxes.draw(actors, playerActor, view);
    ctx.restore();
  }
  return { draw, projectEntity, resetDebugHistory: hitboxes.reset };
}
