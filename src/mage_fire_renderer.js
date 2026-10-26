import { drawFlameSprite } from './flame_effect_renderer.js';
import { resolveEffectAsset } from './asset_loader_helper.js';
import { MAGE_FIRE, mageFireLanding } from './mage_fire_runtime.js';
import { QUARTER_PROJECTION } from './quarter_view/camera.js';

export function drawMageWarnings(ctx, actors, project = null) {
  for (const actor of actors) {
    const state = actor.mageFireRuntime;
    if (!state || actor.player.dead || actor.respawning || actor.player.actionKey !== 'mageFire') continue;
    for (let i = state.emitted; i < MAGE_FIRE.count; i++) {
      const landing = mageFireLanding(state, i);
      const position = { x: landing.x, y: state.floorY, quarterDepth: landing.depth };
      const draw = () => {
        ctx.save();
        ctx.strokeStyle = '#ec6049';
        ctx.globalAlpha *= 0.35 + 0.25 * Math.sin(state.elapsed * 9) ** 2;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(
          landing.x,
          state.floorY,
          MAGE_FIRE.radius,
          project ? MAGE_FIRE.radius * QUARTER_PROJECTION.slope : 6,
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      };
      if (project) project(position, draw);
      else draw();
    }
  }
}

export function drawMageFire(ctx, fire, effectAssets, project = null) {
  const image = resolveEffectAsset(effectAssets, fire.imageKey, fire.ownerId) || fire.owner.player.assets.flame;
  const draw = () => {
    ctx.save();
    ctx.translate(fire.x, fire.y);
    if (fire.phase === 'flight') {
      const dx = fire.targetX - fire.startX;
      const dy =
        fire.targetY -
        fire.startY +
        (project ? ((fire.targetDepth || 0) - (fire.startDepth || 0)) * QUARTER_PROJECTION.slope : 0);
      ctx.rotate(Math.atan2(dy, dx || 0.001) + Math.PI / 2);
      drawFlameSprite(ctx, image, -14, -30, 28, 38, fire.age, fire.seed);
    } else {
      const fade = Math.min(1, (MAGE_FIRE.lifetime - fire.phaseTime) / MAGE_FIRE.fade);
      const grow = Math.min(1, 0.5 + fire.phaseTime * 6);
      ctx.globalAlpha *= Math.max(0, fade);
      ctx.fillStyle = '#e95519';
      ctx.beginPath();
      ctx.ellipse(0, 0, fire.radius, project ? fire.radius * QUARTER_PROJECTION.slope : 6, 0, 0, Math.PI * 2);
      ctx.fill();
      const height = MAGE_FIRE.height * grow;
      drawFlameSprite(ctx, image, -fire.radius, -height, fire.radius * 2, height, fire.age, fire.seed);
    }
    ctx.restore();
  };
  if (project) project(fire, draw);
  else draw();
}
