import { clamp, deg } from './utils.js';
import { drawPuppetAnchorDot, drawPuppetDebug } from './puppetPlayerDebug.js';
import {
  recordPuppetAnchorDebugPoint,
  recordPuppetEditHandle,
  recordPuppetImageRegion,
  recordPuppetJointRegion,
} from './puppetPlayerEditRegions.js';
import { glowSilhouetteFor, groupAnchor, partHeight, partWidth, shouldGlowPartKey } from './puppetPlayerGeometry.js';

export function drawPuppetPlayer(player, ctx) {
  const p = player.getPose();
  const r = player.rig;
  const master = player.getPartOffset('master');

  player.anchorDebugPoints = [];
  player.hitRegions = [];
  player.editHandles = {};
  ctx.save();
  ctx.translate(player.x, player.y + p.bobY);
  ctx.scale(player.facing * player.transform.scale, player.transform.scale * p.scaleY);
  ctx.translate(player.transform.anchorX, player.transform.anchorY);
  ctx.rotate(p.root);
  ctx.translate(master.anchorX || 0, master.anchorY || 0);
  ctx.translate(master.x || 0, master.y || 0);
  ctx.rotate(deg(master.rot || 0));
  ctx.scale(Math.max(0.05, 1 + Number(master.w || 0)), Math.max(0.05, 1 + Number(master.h || 0)));
  recordPuppetEditHandle(player, ctx, 'master');
  ctx.translate(-(master.anchorX || 0), -(master.anchorY || 0));
  ctx.globalAlpha *= clamp(master.opacity ?? 1, 0, 1);
  player.layerOrder.forEach((layer) => drawPuppetLayer(player, ctx, layer, p, r));
  ctx.restore();

  if (player.anchorDebugPoints.length) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    player.anchorDebugPoints.forEach((point) => drawPuppetAnchorDot(ctx, point.x, point.y));
    ctx.restore();
  }
  if (player.debugHitbox) drawPuppetDebug(ctx, player);
}

export function drawPuppetLayer(player, ctx, layer, pose, rig) {
  const layers = {
    leftLeg: () => {
      const hip = player.getPartOffset('hipL');
      const x = rig.hipL.x + hip.x;
      const y = rig.hipL.y + hip.y;
      const group = puppetGroupControl(rig.hipL, hip);
      const anchor = groupAnchor(x, y, group);
      recordPuppetJointRegion(player, ctx, 'hipL', anchor.x, anchor.y);
      if (player.anchorDebugPart === 'hipL') recordPuppetAnchorDebugPoint(player, ctx, anchor.x, anchor.y);
      drawPuppetLeg(
        player,
        ctx,
        x,
        y,
        pose.upperLegL + deg((rig.hipL.rot || 0) + (hip.rot || 0)),
        pose.lowerLegL,
        'L',
        group
      );
    },
    body: () => drawPuppetImagePart(player, ctx, player.assets.body, rig.body, 0, 0, pose.body, 'body'),
    head: () => {
      const neck = player.getPartOffset('neck');
      const x = rig.neck.x + neck.x;
      const y = rig.neck.y + neck.y;
      recordPuppetJointRegion(player, ctx, 'neck', x, y);
      if (player.anchorDebugPart === 'neck') recordPuppetAnchorDebugPoint(player, ctx, x, y);
      drawPuppetImagePart(
        player,
        ctx,
        player.assets.head,
        rig.head,
        x,
        y,
        pose.head + deg((rig.neck.rot || 0) + (neck.rot || 0)),
        'head'
      );
    },
    cape: () => drawPuppetImagePart(player, ctx, player.assets.cape, rig.cape, 0, 0, pose.body * 0.4, 'cape'),
    shield: () => drawPuppetImagePart(player, ctx, player.assets.shield, rig.shield, 0, 0, 0, 'shield'),
    leftArm: () => {
      const shoulder = player.getPartOffset('shoulderL');
      const x = rig.shoulderL.x + shoulder.x;
      const y = rig.shoulderL.y + shoulder.y;
      const group = puppetGroupControl(rig.shoulderL, shoulder);
      const anchor = groupAnchor(x, y, group);
      recordPuppetJointRegion(player, ctx, 'shoulderL', anchor.x, anchor.y);
      if (player.anchorDebugPart === 'shoulderL') recordPuppetAnchorDebugPoint(player, ctx, anchor.x, anchor.y);
      drawPuppetArm(
        player,
        ctx,
        x,
        y,
        pose.upperArmL + deg((rig.shoulderL.rot || 0) + (shoulder.rot || 0)),
        pose.lowerArmL,
        'L',
        pose.weapon,
        false,
        group
      );
    },
    rightLeg: () => {
      const hip = player.getPartOffset('hipR');
      const x = rig.hipR.x + hip.x;
      const y = rig.hipR.y + hip.y;
      const group = puppetGroupControl(rig.hipR, hip);
      const anchor = groupAnchor(x, y, group);
      recordPuppetJointRegion(player, ctx, 'hipR', anchor.x, anchor.y);
      if (player.anchorDebugPart === 'hipR') recordPuppetAnchorDebugPoint(player, ctx, anchor.x, anchor.y);
      drawPuppetLeg(
        player,
        ctx,
        x,
        y,
        pose.upperLegR + deg((rig.hipR.rot || 0) + (hip.rot || 0)),
        pose.lowerLegR,
        'R',
        group
      );
    },
    rightArm: () => {
      const shoulder = player.getPartOffset('shoulderR');
      const x = rig.shoulderR.x + shoulder.x;
      const y = rig.shoulderR.y + shoulder.y;
      const group = puppetGroupControl(rig.shoulderR, shoulder);
      const anchor = groupAnchor(x, y, group);
      recordPuppetJointRegion(player, ctx, 'shoulderR', anchor.x, anchor.y);
      if (player.anchorDebugPart === 'shoulderR') recordPuppetAnchorDebugPoint(player, ctx, anchor.x, anchor.y);
      drawPuppetArm(
        player,
        ctx,
        x,
        y,
        pose.upperArmR + deg((rig.shoulderR.rot || 0) + (shoulder.rot || 0)),
        pose.lowerArmR,
        'R',
        pose.weapon,
        !player.isRolling,
        group
      );
    },
  };

  layers[layer]?.();
}

export function puppetGroupControl(base = {}, offset = {}) {
  return {
    w: Math.max(0.05, Number(base.w ?? 1) + Number(offset.w || 0)),
    h: Math.max(0.05, Number(base.h ?? 1) + Number(offset.h || 0)),
    opacity: clamp((base.opacity ?? 1) * (offset.opacity ?? 1), 0, 1),
    ax: Number(base.ax || 0),
    ay: Number(base.ay || 0),
    anchorOffsetX: Number(base.anchorOffsetX || 0),
    anchorOffsetY: Number(base.anchorOffsetY || 0),
  };
}

export function drawPuppetArm(
  player,
  ctx,
  x,
  y,
  upperRotation,
  lowerRotation,
  side,
  weaponRotation,
  weapon,
  group = {}
) {
  const r = player.rig;
  const upperImage = side === 'L' ? player.assets.upperArmL : player.assets.upperArmR;
  const lowerImage = side === 'L' ? player.assets.lowerArmL : player.assets.lowerArmR;
  const upperKey = side === 'L' ? 'upperArmL' : 'upperArmR';
  const lowerKey = side === 'L' ? 'lowerArmL' : 'lowerArmR';
  const upperPart = r[upperKey];
  const lowerPart = r[lowerKey];

  ctx.save();
  ctx.globalAlpha *= clamp(group.opacity ?? 1, 0, 1);
  ctx.translate(
    x + Number(group.anchorOffsetX || 0) + Number(group.ax || 0),
    y + Number(group.anchorOffsetY || 0) + Number(group.ay || 0)
  );
  ctx.scale(Math.max(0.05, group.w ?? 1), Math.max(0.05, group.h ?? 1));
  ctx.rotate(upperRotation);
  ctx.translate(-Number(group.ax || 0), -Number(group.ay || 0));
  drawPuppetImagePart(player, ctx, upperImage, upperPart, 0, 0, 0, upperKey);
  ctx.translate(0, upperPart.h - 8);
  ctx.rotate(lowerRotation);
  drawPuppetImagePart(player, ctx, lowerImage, lowerPart, 0, 0, 0, lowerKey);

  if (weapon) {
    ctx.translate(0, lowerPart.h - 4);
    ctx.rotate(weaponRotation);
    drawPuppetImagePart(player, ctx, player.assets.weapon, r.weapon, 0, 0, 0, 'weapon');
  }

  ctx.restore();
}

export function drawPuppetLeg(player, ctx, x, y, upperRotation, lowerRotation, side, group = {}) {
  const r = player.rig;
  const upperImage = side === 'L' ? player.assets.upperLegL : player.assets.upperLegR;
  const lowerImage = side === 'L' ? player.assets.lowerLegL : player.assets.lowerLegR;
  const upperKey = side === 'L' ? 'upperLegL' : 'upperLegR';
  const lowerKey = side === 'L' ? 'lowerLegL' : 'lowerLegR';
  const upperPart = r[upperKey];
  const lowerPart = r[lowerKey];

  ctx.save();
  ctx.globalAlpha *= clamp(group.opacity ?? 1, 0, 1);
  ctx.translate(
    x + Number(group.anchorOffsetX || 0) + Number(group.ax || 0),
    y + Number(group.anchorOffsetY || 0) + Number(group.ay || 0)
  );
  ctx.scale(Math.max(0.05, group.w ?? 1), Math.max(0.05, group.h ?? 1));
  ctx.rotate(upperRotation);
  ctx.translate(-Number(group.ax || 0), -Number(group.ay || 0));
  drawPuppetImagePart(player, ctx, upperImage, upperPart, 0, 0, 0, upperKey);
  ctx.translate(0, upperPart.h - 8);
  ctx.rotate(lowerRotation);
  drawPuppetImagePart(player, ctx, lowerImage, lowerPart, 0, 0, 0, lowerKey);
  ctx.restore();
}

export function drawPuppetImagePart(player, ctx, image, part, baseX, baseY, rotation, key) {
  const offset = key ? player.getPartOffset(key) : { x: 0, y: 0, w: 0, h: 0, rot: 0 };
  const imageX = baseX + (part.x || 0) + (part.anchorOffsetX || 0) + offset.x;
  const imageY = baseY + (part.y || 0) + (part.anchorOffsetY || 0) + offset.y;
  const referenceW = part.baseW || partWidth(image);
  const referenceH = part.baseH || partHeight(image);
  const width = Math.max(1, (part.w || referenceW) + (offset.w || 0));
  const height = Math.max(1, (part.h || referenceH) + (offset.h || 0));
  const anchorLocalX = part.ax ?? part.ox;
  const anchorLocalY = part.ay ?? part.oy;
  const scaledAnchorX = anchorLocalX * (width / Math.max(1, referenceW));
  const scaledAnchorY = anchorLocalY * (height / Math.max(1, referenceH));
  const anchorX = imageX + anchorLocalX;
  const anchorY = imageY + anchorLocalY;

  ctx.save();
  ctx.translate(anchorX, anchorY);
  const placementMatrix = ctx.getTransform();
  ctx.rotate(rotation + deg((part.rot || 0) + (offset.rot || 0)));
  recordPuppetImageRegion(player, ctx, key, -scaledAnchorX, -scaledAnchorY, width, height);
  recordPuppetEditHandle(player, ctx, key, placementMatrix);
  ctx.globalAlpha *= clamp((part.opacity ?? 1) * (offset.opacity ?? 1), 0, 1);
  if (shouldGlowPartKey(key, player.glowPart, player.glowParts)) {
    drawPuppetImageGlow(ctx, image, -scaledAnchorX, -scaledAnchorY, width, height);
  }
  ctx.drawImage(image, -scaledAnchorX, -scaledAnchorY, width, height);
  ctx.restore();

  if (player.anchorDebugPart === key) recordPuppetAnchorDebugPoint(player, ctx, anchorX, anchorY);
}

export function drawPuppetImageGlow(ctx, image, x, y, w, h) {
  const silhouette = glowSilhouetteFor(image);
  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-0.7, -0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [0.7, 0.7],
  ];

  ctx.save();
  ctx.shadowColor = 'rgba(124, 195, 162, 0.95)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha *= 0.92;
  offsets.forEach(([dx, dy]) => {
    ctx.drawImage(silhouette, x + dx, y + dy, w, h);
  });
  ctx.restore();
}
