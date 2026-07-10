import { defaultEffectSize } from './animation_frame_data.js';
import { actorHudLayout } from './character_hud_layout_helper.js';
import { createEditableTransform, editableTransformDrawRect } from './editable_object_model_helper.js';
import { recordPuppetImageRegion } from './puppet_player_edit_region_helper.js';
import { isSettingsPanelOpen } from './settings_panel_state.js';
import { isMasterPart } from './editor_label_helper.js';
import { effectFrameAt } from './project_data_normalizer_helper.js';
import { controlGroupPartKeys, imagePartKeys } from './part_source_data.js';
import { clamp } from './common_helper.js';
import { timelinePlaybackProgress } from './timeline_playback_helper.js';
import { resolveEffectAsset } from './asset_loader_helper.js';

export function drawActor(ctx, world, actor, { selectedActor, activeEditPartKey, activeEditPartKeys }) {
  if (actor.respawning) return;
  drawActorShadow(ctx, world, actor);
  const flicker = actor.invulnTime > 0 && Math.floor(actor.invulnTime * 24) % 2 === 0;
  if (flicker) {
    ctx.save();
    ctx.globalAlpha = 0.46;
  }
  if (actor.hurtCooldown > 0) {
    ctx.save();
    ctx.filter = 'brightness(1.18) saturate(0.55)';
  }

  const previousGlowPart = actor.player.glowPart;
  const previousGlowParts = actor.player.glowParts;
  const selectedGlowPart = actor === selectedActor ? activeEditPartKey() : null;
  const selectedGlowParts = actor === selectedActor ? activeEditPartKeys() : [];
  actor.player.glowPart = selectedGlowPart;
  actor.player.glowParts = selectedGlowParts;
  actor.player.draw(ctx);
  actor.player.glowPart = previousGlowPart;
  actor.player.glowParts = previousGlowParts;

  drawSelectedPartGlow(ctx, actor, selectedActor, selectedGlowParts);
  if (actor.hurtCooldown > 0) drawHitFlash(ctx, actor);
  if (actor.hurtCooldown > 0) ctx.restore();
  if (flicker) ctx.restore();
  if (actor.player.dead) return;

  const width = Math.max(72, actor.maxHpPips * 9);
  const hud = actorHudLayout(actor, { useCustomOffset: actor === selectedActor && isSettingsPanelOpen() });

  drawHealthMeter(ctx, actor, hud.hpBar.x, hud.hpBar.y, width);
  ctx.fillStyle = actor.hurtCooldown > 0 ? '#fff' : actor.tint;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(actor.name, hud.name.x, hud.name.y);
  ctx.textAlign = 'left';
}

export function drawAttackTrail(ctx, actor, effectAssets) {
  if (actor.respawning) return;
  const player = actor.player;
  const active = activePlayerEffectAction(player);
  if (!active) return;

  const { key: effectKey } = active;
  const progress = active.usesEffectPlayback
    ? runtimeEffectPlaybackProgress(player, effectKey, actor.tuning.effectSettings?.[effectKey])
    : active.progress;
  const config = effectFrameAt(actor.tuning, effectKey, progress);
  if (!config || config.image === 'none' || Number(config.opacity ?? 1) <= 0) return;
  const asset = resolveEffectAsset(effectAssets, config.image, actor.id);
  if (!asset) return;

  const cx = player.x;
  const cy = player.y - 70;
  const width = Math.max(1, Number(config.w || defaultEffectSize(effectKey).w));
  const height = Math.max(1, Number(config.h || defaultEffectSize(effectKey).h));
  const flip = player.facing === 1 ? 1 : -1;
  const transform = createEditableTransform({
    x: Number(config.x || 0),
    y: Number(config.y || 0),
    w: width,
    h: height,
    ax: config.ax,
    ay: config.ay,
    rot: config.rot,
  });
  const drawRect = editableTransformDrawRect(transform);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(flip, 1);
  ctx.translate(transform.x, transform.y);
  ctx.rotate((transform.rot * Math.PI) / 180);
  recordEffectRegion(player, ctx, effectKey, config, drawRect);
  ctx.globalAlpha = clamp(Number(config.opacity ?? 1), 0, 1);
  ctx.drawImage(asset, drawRect.x, drawRect.y, drawRect.w, drawRect.h);
  ctx.restore();
}

function activePlayerEffectAction(player) {
  if (player.jumpAttackTime > 0) {
    return {
      key: 'jumpAttack',
      progress: clamp(player.jumpAttackProgress, 0, 1),
    };
  }

  if (player.attackTime > 0) {
    return {
      key: `attack${player.comboStep || 1}`,
      progress: clamp(player.attackProgress, 0, 1),
    };
  }

  const actionKey = player?.actionKey;
  if (actionKey) {
    return {
      key: actionKey,
      progress: clamp(Number(player.getActionFrameProgress?.() || 0), 0, 1),
      usesEffectPlayback: !player?.actionPreview?.action,
    };
  }

  return null;
}

function runtimeEffectPlaybackProgress(player, effectKey, settings = {}) {
  const duration = Math.max(0.05, Number(settings.duration || 0.3));
  const playbackRate = Math.max(0.1, Number(settings.playbackRate || 1));
  const elapsed = runtimeEffectElapsedSeconds(player, effectKey);
  return timelinePlaybackProgress((elapsed / duration) * playbackRate, settings.playback);
}

function runtimeEffectElapsedSeconds(player, effectKey) {
  if (player?.isCustomActionActive && player?.customActionKey === effectKey)
    return Math.max(0, Number(player.customActionElapsed || 0));
  return Math.max(0, Number(player?.stateTime || 0));
}

function recordEffectRegion(player, ctx, effectKey, config, drawRect) {
  if (Number(config.active || 0) < 0.5) return;
  const region = recordPuppetImageRegion(
    player,
    ctx,
    `effect:${effectKey}`,
    drawRect.x,
    drawRect.y,
    drawRect.w,
    drawRect.h
  );
  if (region) region.interaction = config;
}

function drawSelectedPartGlow(ctx, actor, selectedActor, activePartKeys) {
  if (actor !== selectedActor) return;
  const partKeys = activePartKeys.filter(
    (partKey) =>
      partKey &&
      !isMasterPart(partKey) &&
      !imagePartKeys().includes(partKey) &&
      !controlGroupPartKeys().includes(partKey)
  );
  if (!partKeys.length) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(124, 195, 162, 0.98)';
  ctx.shadowColor = 'rgba(124, 195, 162, 0.95)';
  ctx.shadowBlur = 12;

  partKeys.forEach((partKey) => {
    const region = actor.player.hitRegions?.find((item) => item.key === partKey);
    if (!region) return;

    if (region.points?.length) {
      ctx.beginPath();
      region.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();
    } else if (region.bounds) {
      const b = region.bounds;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  });

  ctx.restore();
}

function drawHitFlash(ctx, actor) {
  const pulse = 0.42 + Math.sin(actor.hurtCooldown * 80) * 0.12;

  ctx.save();
  ctx.globalAlpha *= pulse;
  ctx.filter =
    'brightness(0) saturate(1) invert(18%) sepia(97%) saturate(7480%) hue-rotate(357deg) brightness(118%) contrast(118%)';
  actor.player.draw(ctx);
  ctx.restore();
}

function drawActorShadow(ctx, world, actor) {
  const scale = actor.player.transform?.scale || 1;
  const master = actor.player.getPartOffset?.('master') || {};
  const anchorLift = Math.max(0, Number(master.y || 0) - Number(master.anchorY || 0));
  const airHeight = Math.max(0, world.floorY - actor.player.y + anchorLift);
  const heightScale = clamp(1 - airHeight / 280, 0.22, 1);
  const width = 54 * scale * heightScale;
  const height = 11 * scale * (0.62 + heightScale * 0.38);
  const alpha = 0.16 + heightScale * 0.18;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(actor.player.x, world.floorY + 3, width, height, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHealthMeter(ctx, actor, x, y, width) {
  if (actor.maxHpPips > 0) {
    const gap = actor.maxHpPips > 10 ? 2 : 4;
    const pipWidth = (width - gap * (actor.maxHpPips - 1)) / actor.maxHpPips;
    for (let index = 0; index < actor.maxHpPips; index += 1) {
      const px = x - width / 2 + index * (pipWidth + gap);
      ctx.fillStyle = 'rgba(0,0,0,.44)';
      ctx.fillRect(px, y, pipWidth, 7);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.strokeRect(px, y, pipWidth, 7);
      if (index < actor.hpPips) {
        ctx.fillStyle = actor.tint;
        ctx.fillRect(px + 1, y + 1, pipWidth - 2, 5);
      }
    }
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,.44)';
  ctx.fillRect(x - width / 2, y, width, 6);
  ctx.fillStyle = actor.tint;
  ctx.fillRect(x - width / 2, y, width * (actor.hp / 100), 6);
}
