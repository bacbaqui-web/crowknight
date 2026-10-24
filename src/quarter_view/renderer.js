import { directionalAttackRegions } from './directional_attack.js';
import { createNativeWeaponTrail } from './native_weapon_trail.js';
import { alignEffectRegions, effectImageBounds } from './effect_geometry.js';
import { createRuntimeEffectReader } from '../runtime_effect_reader.js';
import { drawQuarterAttackEffect, drawActorEffectLayers } from './attack_effects.js';
import { drawEffectGuides } from './effect_guides.js';
import { effectFrameGeometry } from './effect_geometry.js';
import { createHitboxView } from './hitbox_view.js';
import { createGroundRenderer } from './ground_renderer.js';
import { groundPoint, depthOf } from './camera.js';
import { drawActor } from '../actor_canvas_renderer.js';
import { drawFormulaAfterimages } from '../afterimage_runtime_helper.js';
import { drawRollGhosts } from '../roll_ghost_engine.js';
import { drawProjectiles } from '../projectile_runtime_engine.js';
import { formulaScreenZoom } from '../zoom_formula_runtime_helper.js';

export function createQuarterRenderer({ ctx, world }) {
  let view;
  const nativeTrail = createNativeWeaponTrail(ctx, world);
  const readEffectFrame = createRuntimeEffectReader();
  const hitboxes = createHitboxView({
    ctx,
    world,
    button: document.querySelector('#quarterHitboxes'),
    legend: document.querySelector('#quarterHitboxLegend'),
    panel: document.querySelector('#quarterTrajectoryPanel'),
    trajectoryCanvas: document.querySelector('#quarterTrajectory'),
    trajectoryStatus: document.querySelector('#quarterTrajectoryStatus'),
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
  const drawGround = createGroundRenderer(ctx, world);
  let loadedEffects;
  function draw({ actors, playerActor, particleEffects, experience, healthDrops, effectAssets, screenZoom }) {
    if (loadedEffects !== effectAssets) {
      loadedEffects = effectAssets;
      Object.values(effectAssets || {}).forEach(effectImageBounds);
    }
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
    drawGround(playerActor, view);
    particleEffects.drawDust();
    [...actors]
      .filter((actor) => !actor.respawning)
      .sort((a, b) => depthOf(a) - depthOf(b))
      .forEach((actor) => {
        // Picking handles are only consumed by the editor, never by quarter-view combat.
        const captureEditRegions = actor.player.captureEditRegions;
        actor.player.captureEditRegions = false;
        try {
          drawFormulaAfterimages(ctx, actor, projectEntity);
          drawRollGhosts(ctx, actor, projectEntity);
          // Afterimages render different poses; cache only the normal, stable draw below.
          actor.player.renderPartOffsets = new Map();
          try {
            if (actor === playerActor && actor.quarterEffectGuides && !actor.quarterDirectionalTest)
              drawEffectGuides(ctx, actor, effectFrameGeometry(actor, readEffectFrame, loadedEffects), world, view);
            drawActorEffectLayers(
              actor,
              () => {
                const restore = projectEntity(actor);
                try {
                  drawActor(ctx, world, actor, {
                    selectedActor: null,
                    activeEditPartKey: () => null,
                    activeEditPartKeys: () => [],
                  });
                } finally {
                  restore();
                }
              },
              () =>
                actor.quarterDirectionalTest
                  ? nativeTrail.draw(actor, view)
                  : drawQuarterAttackEffect(ctx, actor, effectAssets, world, view, readEffectFrame)
            );
          } finally {
            actor.player.renderPartOffsets = null;
          }
        } finally {
          actor.player.captureEditRegions = captureEditRegions;
        }
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
  return {
    draw,
    projectEntity,
    prepareAttackRegions(actor, raw) {
      if (actor.quarterDirectionalTest) {
        nativeTrail.capture(actor, raw);
        return directionalAttackRegions(actor, raw);
      }
      return alignEffectRegions(actor, raw, readEffectFrame, loadedEffects);
    },
    getEffectAssets: () => loadedEffects,
    resetDebugHistory: hitboxes.reset,
    getRenderStats: () => drawGround.stats,
    resetEffectCache() {
      readEffectFrame.reset();
      nativeTrail.reset();
    },
  };
}
