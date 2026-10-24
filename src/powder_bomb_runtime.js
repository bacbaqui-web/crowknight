import { QUARTER_PROJECTION } from './quarter_view/camera.js';
import { ACTION_FPS } from './game_config_data.js';

export const POWDER_BOMB = Object.freeze({ fuse: 1.25, blast: 0.35, radius: 85 });

// Boss-specific behavior stays separate from ordinary arrows and thrown spears.
export function configurePowderBomb(projectile, actor, world) {
  if (actor.id !== 'powder_chief' || projectile.actionKey !== 'powderThrow') return;
  const hand = actor.player.weaponAnchorTransform?.();
  if (hand) {
    projectile.startX = projectile.x = hand.e;
    projectile.startY = projectile.y = hand.f + 9;
  }
  projectile.powderBomb = true;
  projectile.asset = actor.player.assets.weapon;
  projectile.targetY = Number(world?.floorY ?? projectile.targetY);
  projectile.phase = 'flight';
  projectile.phaseTime = 0;
  projectile.radius = POWDER_BOMB.radius;
  projectile.quarterPlane = 'ground';
}

export function advancePowderBomb(projectile, dt) {
  if (!projectile.powderBomb) return false;
  const previousPhase = projectile.phase;
  projectile.elapsedFrames += Math.max(0, Number(dt || 0)) * ACTION_FPS;
  const flight = projectile.flightFrames / ACTION_FPS;
  const age = projectile.elapsedFrames / ACTION_FPS;
  const progress = Math.min(1, age / flight);
  projectile.x = projectile.startX + (projectile.targetX - projectile.startX) * progress;
  projectile.y = projectile.startY + (projectile.targetY - projectile.startY) * progress;
  projectile.y -= projectile.arcHeight * 4 * progress * (1 - progress);
  if (projectile.startDepth != null) {
    projectile.quarterDepth = projectile.startDepth + (projectile.targetDepth - projectile.startDepth) * progress;
  }
  projectile.angle = progress * Math.PI * 2;
  projectile.phase = age < flight ? 'flight' : age < flight + POWDER_BOMB.fuse ? 'fuse' : 'blast';
  projectile.phaseTime = Math.max(0, age - flight - (projectile.phase === 'blast' ? POWDER_BOMB.fuse : 0));
  // Keep a damage frame even when a slow frame steps across the whole blast.
  if (age >= flight + POWDER_BOMB.fuse + POWDER_BOMB.blast && previousPhase === 'blast') projectile.active = false;
  return true;
}

export function powderBlastRegion(projectile) {
  const radius = projectile.radius;
  return {
    key: projectile.key,
    role: 'attack',
    active: projectile.active && projectile.phase === 'blast' && !projectile.damageSpent,
    points: blastEllipse(projectile.targetX, projectile.targetY - radius / 2, radius, radius / 2),
    x: projectile.targetX - radius,
    y: projectile.targetY - radius,
    w: radius * 2,
    h: radius,
    reaction: projectile.reaction,
  };
}

export function blastEllipse(x, y, rx, ry) {
  return Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    return { x: x + Math.cos(angle) * rx, y: y + Math.sin(angle) * ry };
  });
}

export function drawPowderBomb(ctx, projectile, project = null) {
  const at = (position, draw) => (project ? project(position, draw) : draw());
  if (projectile.phase !== 'blast') {
    at({ ...projectile, x: projectile.targetX, quarterDepth: projectile.targetDepth }, () => {
      const progress = Math.min(1, projectile.phaseTime / POWDER_BOMB.fuse);
      ctx.save();
      ctx.fillStyle = `rgba(220,35,30,${0.12 + progress * 0.2})`;
      ctx.strokeStyle = '#ff5950';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        projectile.targetX,
        projectile.targetY,
        projectile.radius,
        project ? projectile.radius * QUARTER_PROJECTION.slope : 15,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }
  at(projectile, () => {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    if (projectile.phase === 'blast') {
      const fade = 1 - Math.min(1, projectile.phaseTime / POWDER_BOMB.blast);
      ctx.globalAlpha *= Math.max(0.15, fade);
      ctx.fillStyle = '#f17b2e';
      ctx.beginPath();
      ctx.ellipse(0, -projectile.radius / 2, projectile.radius, projectile.radius / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe5a0';
      ctx.beginPath();
      ctx.ellipse(0, -projectile.radius / 2, projectile.radius * 0.65, projectile.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.translate(0, -17);
      ctx.rotate(projectile.phase === 'flight' ? projectile.angle : 0);
      if (projectile.asset) ctx.drawImage(projectile.asset, -14, -17, 28, 34);
      ctx.fillStyle = '#ffdf73';
      ctx.beginPath();
      ctx.arc(3, -16, 3 + Math.sin(projectile.elapsedFrames * 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}
