import { effectHandleFrame, drawEffectHandles } from './effect_editor_handles.js';
import { PuppetPlayer } from '../actor_runtime_engine.js';
import { drawActor } from '../actor_canvas_renderer.js';
import { effectFrameGeometry, alignEffectRegions } from './effect_geometry.js';
import { drawQuarterAttackEffect } from './attack_effects.js';
import { EFFECT_DIRECTIONS } from './effect_directions.js';
import { drawEffectGuides } from './effect_guides.js';
import { createRuntimeEffectReader } from '../runtime_effect_reader.js';
import { groundPoint } from './camera.js';
import { groundAttackRegions, attackRegionPoint, screenPoint, effectPoint } from './attack_geometry.js';

export function createEffectEditorPreview(canvas) {
  const ctx = canvas.getContext('2d'),
    world = { floorY: 430 };
  const read = createRuntimeEffectReader();
  let source, action, actor, frame, frozenView;
  let dragging = false;
  function prepare(next, key) {
    if (source === next && action === key) return;
    source = next;
    action = key;
    if (!next || !key) {
      actor = null;
      return;
    }
    const player = new PuppetPlayer(0, 430, next.player.assets);
    player.applyTuning(next.tuning);
    player.captureEditRegions = false;
    player.facing = next.player.facing || 1;
    actor = {
      ...next,
      player,
      quarterDepth: 0,
      quarterFloorY: 430,
      invulnTime: 0,
      hurtCooldown: 0,
      hitCancelFlashTime: 0,
      respawning: false,
    };
    for (let frame = 0; frame <= 100; frame++) {
      player.actionPreview = { action: key, t: frame / 100 };
      if (player.attackInteractionRegions.length && effectFrameGeometry(actor, read)) break;
    }
  }
  function draw(next, key, directionKey, all = false, effectAssets) {
    prepare(next, key);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0e1b17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    frame = null;
    if (!actor) {
      ctx.fillStyle = '#c8dccd';
      ctx.font = '20px sans-serif';
      ctx.fillText(next ? '조절할 근접 공격이 없습니다.' : 'PLAY 후 조절할 공격을 선택하세요.', 40, 180);
      return;
    }
    actor.player.facing = next.player.facing || 1;
    actor.quarterEffectLayouts = next.quarterEffectLayouts;
    actor.quarterAttackPlanes = next.quarterAttackPlanes;
    const view = { width: canvas.width, height: canvas.height, x: 0, depth: 0, zoom: 0.9 };
    const selected = EFFECT_DIRECTIONS.find((d) => d.key === directionKey) || EFFECT_DIRECTIONS[0];
    actor.quarterAim = selected;
    const geometry = effectFrameGeometry(actor, read, effectAssets);
    if (geometry) {
      let horizontal = 80,
        above = 160,
        below = 40;
      for (const aim of all ? EFFECT_DIRECTIONS : [selected])
        for (const point of geometry.points) {
          const worldPoint = effectPoint(
            { ...actor, quarterAim: aim },
            point,
            geometry.center,
            undefined,
            geometry.radius
          );
          const screen = screenPoint(worldPoint, world, { ...view, zoom: 1 });
          horizontal = Math.max(horizontal, Math.abs(screen.x - canvas.width / 2));
          above = Math.max(above, canvas.height * 0.58 - screen.y);
          below = Math.max(below, screen.y - canvas.height * 0.58);
        }
      const handleFrame = effectHandleFrame(actor, geometry, world, { ...view, zoom: 1 });
      horizontal = Math.max(horizontal, Math.abs(handleFrame.pivot.x - canvas.width / 2) + 100);
      above = Math.max(above, canvas.height * 0.58 - handleFrame.pivot.y + 100);
      below = Math.max(below, handleFrame.pivot.y - canvas.height * 0.58 + 100);
      view.zoom = Math.min(
        0.9,
        (canvas.width / 2 - 20) / horizontal,
        (canvas.height * 0.58 - 20) / above,
        (canvas.height * 0.42 - 20) / below
      );
    }
    if (dragging && frozenView) Object.assign(view, frozenView);
    else frozenView = { ...view };
    drawEffectGuides(ctx, actor, geometry, world, view, selected.key);
    const directions = all ? EFFECT_DIRECTIONS : [selected];
    const paintEffects = (back) => {
      if (!effectAssets) return;
      for (const direction of directions)
        if (direction.z < 0 === back) {
          actor.quarterAim = direction;
          ctx.save();
          if (direction.key !== selected.key) ctx.filter = 'opacity(35%)';
          drawQuarterAttackEffect(ctx, actor, effectAssets, world, view, read);
          ctx.restore();
        }
    };
    actor.quarterAim = selected;
    paintEffects(true);
    const base = groundPoint(0, 0, view);
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.scale(base.scale, base.scale);
    ctx.translate(0, -430);
    drawActor(ctx, world, actor, { selectedActor: null, activeEditPartKey: () => null, activeEditPartKeys: () => [] });
    ctx.restore();
    paintEffects(false);
    actor.quarterAim = selected;
    const raw = alignEffectRegions(actor, actor.player.attackInteractionRegions, read, effectAssets);
    for (const region of groundAttackRegions(actor, raw)) {
      ctx.beginPath();
      region.points.forEach((p, index) => {
        const q = screenPoint(attackRegionPoint(actor, p, region, 430), world, view);
        if (index) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.strokeStyle = '#ffbb65';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    frame = effectHandleFrame(actor, geometry, world, view);
    drawEffectHandles(ctx, frame);
  }
  return {
    draw,
    getFrame: () => frame,
    setDragging(value) {
      dragging = value;
    },
  };
}
