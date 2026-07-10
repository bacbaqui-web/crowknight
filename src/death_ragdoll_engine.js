import { clamp } from './common_helper.js';
import { partHeight, partWidth } from './puppet_player_geometry_helper.js';

const DEATH_RAGDOLL_GRAVITY_SCALE = 0.82;
const DEATH_RAGDOLL_FRICTION = 0.993;
const DEATH_RAGDOLL_BOUNCE = 0.24;
const DEATH_RAGDOLL_LIFE = 2.4;
const DEATH_RAGDOLL_PARTS = [
  { key: 'cape', asset: 'cape', x: -4, y: -50, weight: 0.95, spin: 0.8 },
  { key: 'lowerLegL', asset: 'lowerLegL', x: -24, y: 8, weight: 0.64, spin: -1.2 },
  { key: 'upperLegL', asset: 'upperLegL', x: -18, y: -18, weight: 0.74, spin: -0.9 },
  { key: 'lowerLegR', asset: 'lowerLegR', x: 24, y: 8, weight: 0.64, spin: 1.2 },
  { key: 'upperLegR', asset: 'upperLegR', x: 18, y: -18, weight: 0.74, spin: 0.9 },
  { key: 'body', asset: 'body', x: 0, y: -54, weight: 1.25, spin: 0.35 },
  { key: 'upperArmL', asset: 'upperArmL', x: -33, y: -64, weight: 0.72, spin: -1 },
  { key: 'lowerArmL', asset: 'lowerArmL', x: -48, y: -34, weight: 0.62, spin: -1.35 },
  { key: 'upperArmR', asset: 'upperArmR', x: 33, y: -64, weight: 0.72, spin: 1 },
  { key: 'lowerArmR', asset: 'lowerArmR', x: 48, y: -34, weight: 0.62, spin: 1.35 },
  { key: 'shield', asset: 'shield', x: -54, y: -42, weight: 0.78, spin: -1.5 },
  { key: 'weapon', asset: 'weapon', x: 56, y: -42, weight: 0.58, spin: 1.65 },
  { key: 'head', asset: 'head', x: 0, y: -102, weight: 1.05, spin: 0.75 },
];

export function startDeathRagdoll(player, impulse = {}, world = null) {
  if (!player || player.deathRagdoll?.active) return;
  const vector = normalizeDeathImpulse(player, impulse);
  const scale = Math.max(0.05, Number(player.transform?.scale || 1));
  const floorY = Number(world?.floorY ?? player.floorY ?? player.y);
  player.floorY = floorY;
  player.deathRagdoll = {
    active: true,
    elapsed: 0,
    floorY,
    parts: createDeathRagdollParts(player, vector, scale),
  };
}

export function updateDeathRagdoll(player, dt, world = null) {
  const ragdoll = player?.deathRagdoll;
  if (!ragdoll?.active) return false;
  const delta = Math.max(0, Number(dt || 0));
  const floorY = Number(world?.floorY ?? ragdoll.floorY ?? player.floorY ?? player.y);
  const gravity = Number(world?.gravity ?? 980) * DEATH_RAGDOLL_GRAVITY_SCALE;
  ragdoll.elapsed += delta;
  ragdoll.floorY = floorY;

  ragdoll.parts.forEach((part) => {
    part.x += part.vx * delta;
    part.y += part.vy * delta;
    part.vy += gravity * delta;
    part.vx *= DEATH_RAGDOLL_FRICTION;
    part.rot += part.rotSpeed * delta;

    const floorLimit = floorY - part.h * 0.18;
    if (part.y > floorLimit && part.vy > 0) {
      part.y = floorLimit;
      part.vy *= -DEATH_RAGDOLL_BOUNCE;
      part.vx *= 0.74;
      part.rotSpeed *= 0.7;
    }
  });
  return true;
}

export function drawDeathRagdoll(player, ctx) {
  const ragdoll = player?.deathRagdoll;
  if (!ragdoll?.active) return false;
  const alpha = clamp(1 - Math.max(0, ragdoll.elapsed - DEATH_RAGDOLL_LIFE) / 0.45, 0, 1);
  ragdoll.parts.forEach((part) => {
    if (!part.image || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha * part.opacity;
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rot);
    ctx.scale(part.facing, 1);
    ctx.drawImage(part.image, -part.w / 2, -part.h / 2, part.w, part.h);
    ctx.restore();
  });
  return true;
}

function createDeathRagdollParts(player, vector, scale) {
  const baseSpeed = 330 + vector.power * 110;
  const axis = { x: vector.x, y: vector.y };
  const side = { x: -axis.y, y: axis.x };
  return DEATH_RAGDOLL_PARTS.map((def, index) => {
    const image = player.assets?.[def.asset];
    if (!image) return null;
    const rigPart = player.rig?.[def.key] || {};
    const offset = typeof player.getPartOffset === 'function' ? player.getPartOffset(def.key) : {};
    const snapshot = deathRagdollPartSnapshot(player, def.key, image, rigPart, offset, scale);
    const spread = (index / Math.max(1, DEATH_RAGDOLL_PARTS.length - 1) - 0.5) * 0.88;
    const speed = (baseSpeed * (0.96 + vector.power * 0.18)) / Math.max(0.1, def.weight);
    const sideSpeed = speed * spread;
    const sourceVx = Number(player.vx || 0) * 0.22;
    const sourceVy = Math.min(0, Number(player.vy || 0)) * 0.08;
    return {
      image,
      x: snapshot.x ?? player.x + def.x * Number(player.facing || 1) * scale,
      y: snapshot.y ?? player.y + def.y * scale,
      vx: axis.x * speed + side.x * sideSpeed + sourceVx,
      vy: axis.y * speed + side.y * sideSpeed - 150 * vector.power + sourceVy,
      rot: snapshot.rot + randomRange(-0.08, 0.08),
      rotSpeed: (def.spin + randomRange(-0.55, 0.55)) * (3.2 + vector.power),
      w: snapshot.w,
      h: snapshot.h,
      opacity: clamp(Number(rigPart.opacity ?? 1) * Number(offset.opacity ?? 1), 0, 1),
      facing: snapshot.facing,
    };
  }).filter(Boolean);
}

function deathRagdollPartSnapshot(player, key, image, rigPart = {}, offset = {}, scale = 1) {
  return {
    ...deathRagdollPartSize(player, key, image, rigPart, offset, scale),
    rot: 0,
    facing: Number(player.facing || 1) < 0 ? -1 : 1,
  };
}

function deathRagdollPartSize(player, key, image, rigPart = {}, offset = {}, scale = 1) {
  const referenceW = Number(rigPart.baseW || 0) || partWidth(image) || 20;
  const referenceH = Number(rigPart.baseH || 0) || partHeight(image) || 20;
  const pose = typeof player?.getPose === 'function' ? player.getPose() : {};
  const master = typeof player?.getPartOffset === 'function' ? player.getPartOffset('master') : {};
  const group = deathRagdollGroupScale(player, key);
  const scaleX = scale * Math.max(0.05, 1 + Number(master.w || 0)) * group.w;
  const scaleY = scale * Math.max(0.05, Number(pose.scaleY ?? 1)) * Math.max(0.05, 1 + Number(master.h || 0)) * group.h;
  return {
    w: Math.max(5, (Number(rigPart.w || referenceW) + Number(offset.w || 0)) * scaleX),
    h: Math.max(5, (Number(rigPart.h || referenceH) + Number(offset.h || 0)) * scaleY),
  };
}

function deathRagdollGroupScale(player, key) {
  const groupKey = deathRagdollGroupKey(key);
  if (!groupKey) return { w: 1, h: 1 };
  const base = player?.rig?.[groupKey] || {};
  const offset = typeof player?.getPartOffset === 'function' ? player.getPartOffset(groupKey) : {};
  const group =
    typeof player?.groupControl === 'function'
      ? player.groupControl(base, offset)
      : {
          w: Math.max(0.05, Number(base.w ?? 1) + Number(offset.w || 0)),
          h: Math.max(0.05, Number(base.h ?? 1) + Number(offset.h || 0)),
        };
  return {
    w: Math.max(0.05, Number(group.w ?? 1)),
    h: Math.max(0.05, Number(group.h ?? 1)),
  };
}

function deathRagdollGroupKey(key) {
  if (key === 'upperArmL' || key === 'lowerArmL' || key === 'shield') return 'shoulderL';
  if (key === 'upperArmR' || key === 'lowerArmR' || key === 'weapon') return 'shoulderR';
  if (key === 'upperLegL' || key === 'lowerLegL') return 'hipL';
  if (key === 'upperLegR' || key === 'lowerLegR') return 'hipR';
  return null;
}

function normalizeDeathImpulse(player, impulse = {}) {
  const fallbackFacing = Number(player?.facing || 1) < 0 ? -1 : 1;
  const rawX = Number(impulse.x || 0);
  const rawY = Number(impulse.y || 0);
  const length = Math.hypot(rawX, rawY);
  if (length > 0.0001) {
    const horizontalSign = Math.sign(rawX) || fallbackFacing;
    const horizontal = horizontalSign * Math.max(Math.abs(rawX), length * 0.72);
    const liftedY = Math.min(rawY, -length * 0.24);
    const adjustedLength = Math.hypot(horizontal, liftedY) || 1;
    return {
      x: horizontal / adjustedLength,
      y: liftedY / adjustedLength,
      power: clamp(Number(impulse.power ?? length / 520), 0.75, 3.2),
    };
  }
  return {
    x: fallbackFacing,
    y: -0.22,
    power: 1,
  };
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
