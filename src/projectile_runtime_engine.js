import { ACTION_FPS } from './game_config_data.js';
import { ATTACK_INTERACTION_OBJECT_KEY } from './interaction_object_editor_controller.js';
import { interactionReactionFromValue } from './interaction_region_engine.js';
import { actionFormula, actionFormulaFrameFromProgress } from './formula_runtime_engine.js';
import { timelineFrameCount } from './timeline_playback_helper.js';
import { resolveEffectAsset } from './asset_loader_helper.js';

let projectilePool = [];
let nextProjectileId = 1;

export function resetProjectileRuntime() {
  projectilePool = [];
  nextProjectileId = 1;
}

export function activeProjectiles() {
  return projectilePool;
}

export function updateProjectileRuntime({ actors = [], playerActor = null, world = null, dt = 0 } = {}) {
  actors.forEach((actor) => spawnActorProjectileIfNeeded(actor, playerActor));
  projectilePool.forEach((projectile) => advanceProjectile(projectile, dt));
  projectilePool = projectilePool.filter(
    (projectile) => projectile.active && !projectileOutOfBounds(projectile, world)
  );
}

export function removeProjectile(projectile) {
  if (projectile) projectile.active = false;
}

export function drawProjectiles(ctx, effectAssets) {
  projectilePool.forEach((projectile) => drawProjectileLandingMarker(ctx, projectile));
  projectilePool.forEach((projectile) => drawProjectile(ctx, projectile, effectAssets));
}

function spawnActorProjectileIfNeeded(actor, playerActor) {
  if (!actor?.player || actor.player.dead || actor.respawning || actor === playerActor) return;
  const player = actor.player;
  const actionKey = player.actionKey;
  const settings = player.actionSettings?.[actionKey] || {};
  const formula = actionFormula(settings, 'projectile');
  if (!formula?.enabled) {
    resetActorProjectileRuntime(actor, actionKey, 0);
    return;
  }

  const elapsed = Number(player.customActionElapsed ?? player.stateTime ?? 0);
  const runtime = ensureActorProjectileRuntime(actor, actionKey, elapsed);
  if (elapsed < runtime.elapsed) {
    runtime.spawned.clear();
  }
  runtime.elapsed = elapsed;

  const frameCount = timelineFrameCount(settings);
  const currentFrame = actionFormulaFrameFromProgress(player.getActionFrameProgress?.() || 0, frameCount);
  const spawnFrame = clampFrame(formula.spawnFrame, frameCount);
  const spawnKey = `${actionKey}:${spawnFrame}`;
  if (currentFrame < spawnFrame || runtime.spawned.has(spawnKey)) return;

  runtime.spawned.add(spawnKey);
  spawnProjectile(actor, playerActor, formula, settings);
}

function ensureActorProjectileRuntime(actor, actionKey, elapsed) {
  if (actor.projectileRuntime?.actionKey === actionKey) return actor.projectileRuntime;
  actor.projectileRuntime = {
    actionKey,
    elapsed,
    spawned: new Set(),
  };
  return actor.projectileRuntime;
}

function resetActorProjectileRuntime(actor, actionKey, elapsed) {
  if (actor?.projectileRuntime?.actionKey === actionKey) return;
  if (actor) actor.projectileRuntime = { actionKey, elapsed, spawned: new Set() };
}

function spawnProjectile(actor, playerActor, formula, settings) {
  const facing = Number(actor.player.facing || 1) < 0 ? -1 : 1;
  const startX = Number(actor.player.x || 0) + Number(formula.offsetX || 0) * facing;
  const startY = Number(actor.player.y || 0) + Number(formula.offsetY || 0);
  const targetX = Number(playerActor?.player?.x ?? startX);
  const targetY = Number(playerActor?.player?.y ?? startY);
  const projectile = {
    id: nextProjectileId,
    key: `${actor.runtimeInstanceId || actor.id}:projectile:${nextProjectileId}`,
    active: true,
    owner: actor,
    ownerId: actor.id,
    actionKey: actor.player.actionKey,
    imageKey: formula.imageKey,
    startX,
    startY,
    targetX,
    targetY,
    x: startX,
    y: startY,
    previousX: startX,
    previousY: startY,
    angle: 0,
    elapsedFrames: 0,
    flightFrames: Math.max(1, Number(formula.flightFrames || 1)),
    arcHeight: Math.max(0, Number(formula.arcHeight || 0)),
    hitboxWidth: Math.max(1, Number(formula.hitboxWidth || 1)),
    hitboxHeight: Math.max(1, Number(formula.hitboxHeight || 1)),
    hitTargets: new Set(),
    reaction: projectileReaction(actor, settings),
  };
  nextProjectileId += 1;
  syncProjectilePosition(projectile);
  projectilePool.push(projectile);
}

function projectileReaction(actor, settings) {
  const actionAttackSettings = settings?.interactions?.[ATTACK_INTERACTION_OBJECT_KEY] || {};
  const frameAttackSettings = actor.player.getPartOffset?.(ATTACK_INTERACTION_OBJECT_KEY) || {};
  return interactionReactionFromValue({
    ...frameAttackSettings,
    ...actionAttackSettings,
    active: 1,
    attack: 1,
  });
}

function advanceProjectile(projectile, dt) {
  projectile.previousX = projectile.x;
  projectile.previousY = projectile.y;
  projectile.elapsedFrames += Math.max(0, Number(dt || 0)) * ACTION_FPS;
  syncProjectilePosition(projectile);
  if (projectile.elapsedFrames >= projectile.flightFrames) projectile.active = false;
}

function syncProjectilePosition(projectile) {
  const t = Math.max(0, Math.min(1, projectile.elapsedFrames / Math.max(1, projectile.flightFrames)));
  projectile.x = lerp(projectile.startX, projectile.targetX, t);
  projectile.y = lerp(projectile.startY, projectile.targetY, t) - Number(projectile.arcHeight || 0) * 4 * t * (1 - t);
  const dx = projectile.targetX - projectile.startX;
  const dy = projectile.targetY - projectile.startY - Number(projectile.arcHeight || 0) * 4 * (1 - 2 * t);
  projectile.angle = Math.atan2(dy, dx || 0.0001);
}

export function projectileAttackRegion(projectile) {
  const w = Math.max(1, Number(projectile?.hitboxWidth || 1));
  const h = Math.max(1, Number(projectile?.hitboxHeight || 1));
  return {
    key: projectile.key,
    role: 'attack',
    active: true,
    x: Number(projectile.x || 0) - w / 2,
    y: Number(projectile.y || 0) - h / 2,
    w,
    h,
    reaction: projectile.reaction,
  };
}

function drawProjectile(ctx, projectile, effectAssets) {
  const asset = resolveEffectAsset(effectAssets, projectile.imageKey, projectile.ownerId);
  const w = Math.max(1, Number(projectile.hitboxWidth || 1));
  const h = Math.max(1, Number(projectile.hitboxHeight || 1));
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(projectile.angle);
  if (asset) {
    ctx.drawImage(asset, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = 'rgba(245, 247, 251, 0.9)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

function drawProjectileLandingMarker(ctx, projectile) {
  const progress = Math.max(0, Math.min(1, projectile.elapsedFrames / Math.max(1, projectile.flightFrames)));
  const pulse = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
  const alpha = 0.32 + pulse * 0.42;
  const radius = 3 + pulse * 2;
  const x = Number(projectile.targetX || 0);
  const y = Number(projectile.targetY || 0);

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = 'rgba(245, 247, 251, 0.95)';
  ctx.fillStyle = 'rgba(245, 247, 251, 0.95)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - radius * 2.2, y);
  ctx.lineTo(x + radius * 2.2, y);
  ctx.moveTo(x, y - radius * 2.2);
  ctx.lineTo(x, y + radius * 2.2);
  ctx.stroke();
  ctx.restore();
}

function projectileOutOfBounds(projectile, world) {
  const margin = 1200;
  const minX = Number.isFinite(Number(world?.minX)) ? Number(world.minX) - margin : -margin;
  const maxX = Number.isFinite(Number(world?.maxX)) ? Number(world.maxX) + margin : Number(projectile.x || 0) + margin;
  const minY = -margin;
  const maxY = Number(world?.floorY ?? 540) + margin;
  return projectile.x < minX || projectile.x > maxX || projectile.y < minY || projectile.y > maxY;
}

function clampFrame(value, frameCount) {
  const number = Math.round(Number(value || 1));
  if (!Number.isFinite(number)) return 1;
  return Math.min(Math.max(1, frameCount), Math.max(1, number));
}

function lerp(a, b, t) {
  return Number(a || 0) + (Number(b || 0) - Number(a || 0)) * t;
}
