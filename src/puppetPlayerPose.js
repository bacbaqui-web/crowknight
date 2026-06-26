import { deg } from './utils.js';

export function createPuppetPose(player) {
  const t = player.animTime;
  const idle = Math.sin(t * 3) * 3;
  const previewPose = player.posePreview?.pose;
  const state = previewPose?.startsWith('attack') ? 'attack' : previewPose || player.state;
  const intensityKey = previewPose || player.poseKey;
  const p = createBasePose();

  if (state === 'idle') {
    p.scaleY = 1 + idle * 0.006;
    p.body = deg(Math.sin(t * 2) * 2);
    p.head = deg(Math.sin(t * 2.5) * 2);
    p.upperArmL = deg(8 + Math.sin(t * 2.2) * 4);
    p.upperArmR = deg(-8 - Math.sin(t * 2.2) * 4);
  }

  if (state === 'run') {
    p.upperArmL = 0;
    p.lowerArmL = deg(18);
    p.upperArmR = 0;
    p.lowerArmR = deg(18);
    p.upperLegL = 0;
    p.lowerLegL = deg(5);
    p.upperLegR = 0;
    p.lowerLegR = deg(5);
  }

  if (state === 'jump') {
    p.body = deg(-7);
    p.head = deg(5);
    p.upperArmL = deg(-38);
    p.upperArmR = deg(32);
    p.upperLegL = deg(-22);
    p.lowerLegL = deg(42);
    p.upperLegR = deg(18);
    p.lowerLegR = deg(28);
  }

  if (state === 'fall') {
    p.body = deg(5);
    p.head = deg(-4);
    p.upperArmL = deg(-10);
    p.lowerArmL = deg(32);
    p.upperArmR = deg(16);
    p.lowerArmR = deg(30);
  }

  if (state === 'glide') {
    p.body = deg(-3);
    p.head = deg(3);
    p.upperArmL = deg(-82);
    p.lowerArmL = deg(18);
    p.upperArmR = deg(82);
    p.lowerArmR = deg(18);
    p.upperLegL = deg(-10);
    p.lowerLegL = deg(22);
    p.upperLegR = deg(10);
    p.lowerLegR = deg(22);
  }

  if (state === 'attack') {
    const attackKey = intensityKey?.startsWith('attack') ? intensityKey : `attack${player.comboStep || 1}`;
    applyAttackPose(p, attackKey, player.getPoseFrameProgress());
  }

  if (state === 'jumpAttack') {
    const q = player.getPoseFrameProgress();
    const slash = Math.sin(Math.min(1, q) * Math.PI);
    p.bobY = -slash * 8;
    p.root = deg(-10 + slash * 18);
    p.body = deg(-18 + slash * 16);
    p.head = deg(12 - slash * 8);
    p.upperArmL = deg(-58 + slash * 20);
    p.lowerArmL = deg(26);
    p.upperArmR = deg(70 - slash * 24);
    p.lowerArmR = deg(-12);
    p.upperLegL = deg(-34);
    p.lowerLegL = deg(56);
    p.upperLegR = deg(24);
    p.lowerLegR = deg(42);
    p.weapon = deg(72 - slash * 116);
  }

  if (state === 'guard') {
    const block = player.guardBlockTime > 0 ? Math.sin((player.guardBlockTime / 0.16) * Math.PI) : 0;
    p.body = deg(-8 - block * 5);
    p.head = deg(4);
    p.upperArmL = deg(-22);
    p.lowerArmL = deg(28);
    p.upperArmR = deg(-58 - block * 12);
    p.lowerArmR = deg(-34);
    p.upperLegL = deg(-6);
    p.upperLegR = deg(10);
    p.weapon = deg(-12);
  }

  if (state === 'guardBreak') {
    const q = player.getPoseFrameProgress();
    const snap = Math.sin(Math.min(1, q) * Math.PI);
    p.bobY = -snap * 6;
    p.body = deg(18 + snap * 16);
    p.head = deg(-12);
    p.upperArmL = deg(56);
    p.lowerArmL = deg(26);
    p.upperArmR = deg(-84 - snap * 20);
    p.lowerArmR = deg(-44);
    p.upperLegL = deg(18);
    p.lowerLegL = deg(24);
    p.upperLegR = deg(-16);
    p.lowerLegR = deg(30);
    p.weapon = deg(34);
  }

  if (state === 'hurt') {
    const q = player.getPoseFrameProgress();
    const recoil = Math.sin(Math.min(1, q) * Math.PI);
    p.bobY = -recoil * 5;
    p.body = deg(-12 - recoil * 8);
    p.head = deg(10 + recoil * 6);
    p.upperArmL = deg(34 + recoil * 18);
    p.lowerArmL = deg(22);
    p.upperArmR = deg(-34 - recoil * 18);
    p.lowerArmR = deg(-18);
    p.upperLegL = deg(-10);
    p.lowerLegL = deg(24);
    p.upperLegR = deg(14);
    p.lowerLegR = deg(20);
  }

  if (state === 'death') {
    const q = player.getPoseFrameProgress();
    const fall = 1 - Math.pow(1 - q, 3);
    const settle = Math.sin(Math.min(1, q) * Math.PI);
    p.bobY = fall * 46;
    p.root = deg(78 * fall);
    p.scaleY = 1 - fall * 0.2;
    p.body = deg(24 + fall * 18);
    p.head = deg(-22 + settle * 8);
    p.upperArmL = deg(70 - fall * 18);
    p.lowerArmL = deg(40);
    p.upperArmR = deg(-86 + fall * 24);
    p.lowerArmR = deg(-36);
    p.upperLegL = deg(-34 + fall * 18);
    p.lowerLegL = deg(62 - fall * 16);
    p.upperLegR = deg(38 - fall * 12);
    p.lowerLegR = deg(54 - fall * 14);
    p.weapon = deg(-48 + fall * 24);
  }

  return applyAnimationIntensity(p, intensityKey, player.motion.animationIntensity);
}

function applyAttackPose(p, key, t) {
  const q = Math.min(1, Math.max(0, Number(t || 0)));
  const swing = Math.sin(q * Math.PI);
  const recover = 1 - Math.pow(1 - q, 2);

  if (key === 'attack2') {
    p.root = deg(-6 + swing * 12);
    p.body = deg(-10 + recover * 18);
    p.head = deg(8 - swing * 6);
    p.upperArmL = deg(72 - swing * 132);
    p.lowerArmL = deg(18 - swing * 44);
    p.upperArmR = deg(-42 + swing * 34);
    p.lowerArmR = deg(-12);
    p.upperLegL = deg(-14);
    p.lowerLegL = deg(26);
    p.upperLegR = deg(18);
    p.lowerLegR = deg(18);
    p.weapon = deg(-84 + swing * 158);
    return;
  }

  if (key === 'attack3') {
    p.bobY = -swing * 5;
    p.root = deg(8 + swing * 28);
    p.body = deg(18 + swing * 20);
    p.head = deg(-14);
    p.upperArmL = deg(-84 + swing * 42);
    p.lowerArmL = deg(30);
    p.upperArmR = deg(78 - swing * 118);
    p.lowerArmR = deg(-24);
    p.upperLegL = deg(22);
    p.lowerLegL = deg(34);
    p.upperLegR = deg(-28);
    p.lowerLegR = deg(42);
    p.weapon = deg(112 - swing * 186);
    return;
  }

  p.root = deg(4 + swing * 10);
  p.body = deg(10 + swing * 12);
  p.head = deg(-6 + swing * 4);
  p.upperArmL = deg(-68 + swing * 104);
  p.lowerArmL = deg(20 + swing * 18);
  p.upperArmR = deg(42 - swing * 26);
  p.lowerArmR = deg(-18);
  p.upperLegL = deg(12);
  p.lowerLegL = deg(20);
  p.upperLegR = deg(-10);
  p.lowerLegR = deg(24);
  p.weapon = deg(82 - swing * 148);
}

function applyAnimationIntensity(p, key, intensityConfig) {
  const value = typeof intensityConfig === 'object' ? intensityConfig?.[key] : intensityConfig;
  const intensity = Math.max(0, Number(value ?? 1));
  const base = createBasePose();

  Object.keys(base).forEach((key) => {
    p[key] = base[key] + (p[key] - base[key]) * intensity;
  });
  return p;
}

function createBasePose() {
  return {
    bobY: 0,
    scaleY: 1,
    body: 0,
    head: 0,
    upperArmL: deg(12),
    lowerArmL: deg(6),
    upperArmR: deg(-12),
    lowerArmR: deg(-8),
    upperLegL: deg(4),
    lowerLegL: deg(5),
    upperLegR: deg(-4),
    lowerLegR: deg(5),
    weapon: 0,
    root: 0,
  };
}
