import { collectTraps, advanceTrap } from './trapper_runtime.js';
import { drawTrap } from './trap_renderer.js';
import { advanceBossHazard } from './boss_hazard_runtime.js';
import { drawBossHazard } from './boss_hazard_renderer.js';
import { collectBalloonBombs } from './balloon_bomber_runtime.js';
import { drawTankWarnings } from './ram_tank_renderer.js';
import { collectMageFire, advanceMageFire, mageFireAttackRegion } from './mage_fire_runtime.js';
import { drawMageFire, drawMageWarnings } from './mage_fire_renderer.js';
import { configurePowderBomb, advancePowderBomb, powderBlastRegion, drawPowderBomb } from './powder_bomb_runtime.js';
import { attackPlane } from './attack_plane_helper.js';
import { ACTION_FPS } from './game_config_data.js';
import { ATTACK_INTERACTION_OBJECT_KEY } from './interaction_object_model_data.js';
import { interactionReactionFromValue } from './interaction_region_engine.js';
import { actionFormula, actionFormulaFrameFromProgress } from './formula_runtime_engine.js';
import { timelineFrameCount } from './timeline_playback_helper.js';
import { resolveEffectAsset } from './asset_loader_helper.js';
import { takeSpearmanProjectile } from './spearman_throw_runtime.js';
import { drawLinearSpear, drawSpearWarnings } from './spearman_throw_renderer.js';

let projectilePool = [];
let nextProjectileId = 1;
let warningActors = [];
let mageActors = [];
let tankActors = [];

export function resetProjectileRuntime() {
  projectilePool = [];
  nextProjectileId = 1;
  warningActors = [];
  mageActors = [];
  tankActors = [];
}

export function activeProjectiles() {
  return projectilePool;
}

export function updateProjectileRuntime({ actors = [], playerActor = null, world = null, dt = 0 } = {}) {
  tankActors = actors.filter((actor) => actor.id === 'ram_tank');
  mageActors = actors.filter((actor) => actor.id === 'fire_mage');
  warningActors = actors.filter((actor) => actor.spearmanThrow?.aim);
  for (const actor of actors) {
    for (const trap of collectTraps(actor, world, projectilePool)) {
      trap.id = nextProjectileId++;
      trap.key = `trap:${trap.id}`;
      projectilePool.push(trap);
    }
    for (const hazard of actor.bossPattern?.queue?.splice(0) || []) {
      hazard.id = nextProjectileId++;
      hazard.key = `boss:${hazard.id}`;
      projectilePool.push(hazard);
    }
    for (const bomb of collectBalloonBombs(actor, world)) {
      bomb.id = nextProjectileId++;
      bomb.key = `${actor.runtimeInstanceId || actor.id}:bomb:${bomb.id}`;
      projectilePool.push(bomb);
    }
    for (const fire of collectMageFire(actor, playerActor, world, dt)) {
      fire.id = nextProjectileId++;
      fire.key = `${actor.runtimeInstanceId || actor.id}:fire:${fire.id}`;
      projectilePool.push(fire);
    }
    const spear = takeSpearmanProjectile(actor);
    if (spear) {
      spear.id = nextProjectileId++;
      spear.key = `${actor.runtimeInstanceId || actor.id}:spear:${spear.id}`;
      projectilePool.push(spear);
    }
  }
  actors.forEach((actor) => spawnActorProjectileIfNeeded(actor, playerActor, world));
  projectilePool.forEach((projectile) => {
    advanceProjectile(projectile, dt, playerActor);
    if (!projectile.ratTrap && projectile.bossHazard !== 'mine' && world?.quarterView?.blocksProjectile?.(projectile))
      projectile.active = false;
  });
  projectilePool = projectilePool.filter(
    (projectile) => projectile.active && !projectileOutOfBounds(projectile, world)
  );
}

export function removeProjectile(projectile) {
  if (projectile?.mageFire) return;
  if (projectile?.powderBomb) projectile.damageSpent = true;
  else if (projectile) projectile.active = false;
}

export function drawProjectiles(ctx, effectAssets, project = null) {
  drawTankWarnings(ctx, tankActors, project);
  drawSpearWarnings(ctx, warningActors, project);
  drawMageWarnings(ctx, mageActors, project);
  projectilePool.forEach((projectile) =>
    project
      ? project({ ...projectile, x: projectile.targetX, quarterDepth: projectile.targetDepth }, () =>
          drawProjectileLandingMarker(ctx, projectile)
        )
      : drawProjectileLandingMarker(ctx, projectile)
  );
  projectilePool.forEach((projectile) =>
    projectile.ratTrap
      ? drawTrap(ctx, projectile, project)
      : projectile.bossHazard
        ? drawBossHazard(ctx, projectile, project)
        : projectile.mageFire
          ? drawMageFire(ctx, projectile, effectAssets, project)
          : projectile.powderBomb
            ? drawPowderBomb(ctx, projectile, project)
            : projectile.linearSpear
              ? drawLinearSpear(ctx, projectile, project)
              : project
                ? project(projectile, () => drawProjectile(ctx, projectile, effectAssets))
                : drawProjectile(ctx, projectile, effectAssets)
  );
}

function spawnActorProjectileIfNeeded(actor, playerActor, world) {
  if (!actor?.player || actor.player.dead || actor.respawning || actor === playerActor) return;
  const player = actor.player;
  const actionKey = player.actionKey;
  if (actor.id === 'powder_chief' && actor.bossPattern) return;
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
  spawnProjectile(actor, playerActor, formula, settings, world);
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

function spawnProjectile(actor, playerActor, formula, settings, world) {
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
    ...(actor.quarterDepth != null
      ? {
          quarterPlane: attackPlane(actor, actor.player.actionKey, true),
          quarterAim: projectileGroundDirection(startX, targetX, actor.quarterDepth, playerActor?.quarterDepth || 0),
          quarterDepth: actor.quarterDepth,
          startDepth: actor.quarterDepth,
          targetDepth: playerActor?.quarterDepth || 0,
        }
      : {}),
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
  configurePowderBomb(projectile, actor, world);
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

function advanceProjectile(projectile, dt, target) {
  projectile.previousX = projectile.x;
  projectile.previousY = projectile.y;
  projectile.previousDepth = projectile.quarterDepth;
  if (advanceTrap(projectile, dt)) return;
  if (advanceBossHazard(projectile, dt, target)) return;
  if (projectile.mageFire) {
    advanceMageFire(projectile, dt);
    return;
  }
  if (advancePowderBomb(projectile, dt)) return;
  projectile.elapsedFrames += Math.max(0, Number(dt || 0)) * ACTION_FPS;
  syncProjectilePosition(projectile);
  if (projectile.elapsedFrames >= projectile.flightFrames) projectile.active = false;
}

function syncProjectilePosition(projectile) {
  const t = Math.max(0, Math.min(1, projectile.elapsedFrames / Math.max(1, projectile.flightFrames)));
  if (projectile.startDepth != null) projectile.quarterDepth = lerp(projectile.startDepth, projectile.targetDepth, t);
  projectile.x = lerp(projectile.startX, projectile.targetX, t);
  projectile.y = lerp(projectile.startY, projectile.targetY, t) - Number(projectile.arcHeight || 0) * 4 * t * (1 - t);
  const dx = projectile.targetX - projectile.startX;
  const dy = projectile.targetY - projectile.startY - Number(projectile.arcHeight || 0) * 4 * (1 - 2 * t);
  projectile.angle = Math.atan2(dy, dx || 0.0001);
}

export function projectileAttackRegion(projectile) {
  if (projectile.mageFire) return mageFireAttackRegion(projectile);
  if (projectile.powderBomb) return powderBlastRegion(projectile);
  const w = Math.max(1, Number(projectile?.hitboxWidth || 1));
  const h = Math.max(1, Number(projectile?.hitboxHeight || 1));
  const angle = Number(projectile.angle || 0),
    c = Math.cos(angle),
    s = Math.sin(angle);
  const points = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x, y]) => ({
    x: Number(projectile.x || 0) + x * c - y * s,
    y: Number(projectile.y || 0) + x * s + y * c,
  }));
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  return {
    key: projectile.key,
    role: 'attack',
    active: true,
    points,
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
    reaction: projectile.reaction,
  };
}

function drawProjectile(ctx, projectile, effectAssets) {
  const asset = projectile.asset || resolveEffectAsset(effectAssets, projectile.imageKey, projectile.ownerId);
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
  if (projectile.ratTrap || projectile.linearSpear || projectile.powderBomb || projectile.mageFire) return;
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
  return (
    (!world?.quarterView?.unbounded && (projectile.x < minX || projectile.x > maxX)) ||
    projectile.y < minY ||
    projectile.y > maxY
  );
}

function clampFrame(value, frameCount) {
  const number = Math.round(Number(value || 1));
  if (!Number.isFinite(number)) return 1;
  return Math.min(Math.max(1, frameCount), Math.max(1, number));
}

function lerp(a, b, t) {
  return Number(a || 0) + (Number(b || 0) - Number(a || 0)) * t;
}

function projectileGroundDirection(x, targetX, depth, targetDepth) {
  const dx = targetX - x,
    dz = targetDepth - depth,
    length = Math.hypot(dx, dz) || 1;
  return { x: dx / length, z: dz / length };
}
