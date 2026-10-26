// Recorded foley variants share buffers; gains leave headroom for crowded combat.
const sound = (files, gain, rate = 1, cooldown = 0.06, priority = 2) => ({
  files: Array.isArray(files) ? files : [files],
  gain,
  rate,
  cooldown,
  priority,
});
export const COMBAT_SOUNDS = {
  experiencePickup: sound('v2/experiencePickup.wav', 0.32, 1),
  healthPickup: sound('v2/healthPickup.wav', 0.4, 1),
  clubSwing: sound(['pixabay/club-swing-1.mp3', 'pixabay/club-swing-2.mp3'], 0.26),
  swordSwing: sound(['selected/swing-1.wav', 'selected/swing-2.wav'], 0.24),
  bossSwing: sound('v2/bossSwing.wav', 0.44, 1),
  clubHit: sound(['selected/blunt-hit-1.wav', 'selected/blunt-hit-2.wav'], 0.44),
  swordHit: sound(['selected/blade-hit-1.wav', 'selected/blade-hit-2.wav'], 0.46),
  bossHit: sound('v2/bossHit.wav', 0.65, 1),
  guardRaise: sound('v2/guardRaise.wav', 0.16, 1),
  block: sound(['selected/shield-1.wav', 'selected/shield-2.wav'], 0.34),
  parry: sound(['selected/shield-1.wav', 'selected/shield-2.wav'], 0.42, 1, 0.08, 4),
  footstep: sound(
    [
      'selected/grass-1.wav',
      'selected/grass-2.wav',
      'selected/grass-3.wav',
      'selected/grass-4.wav',
      'selected/grass-5.wav',
      'selected/grass-6.wav',
    ],
    0.1,
    1,
    0.09,
    0
  ),
  armorStep: sound('v2/armorStep.wav', 0.1, 1, 0.23, 0),
  jump: sound('v2/jump.wav', 0.22, 1, 0.12, 1),
  roll: sound('v2/roll.wav', 0.28, 1, 0.18, 1),
  land: sound(['v2/land-1.wav', 'v2/land-2.wav'], 0.32, 1, 0.1, 2),
  bowRelease: sound('v2/bowRelease.wav', 0.38, 1, 0.1),
  spearThrow: sound('v2/spearThrow.wav', 0.4, 1, 0.12),
  bombThrow: sound('v2/bombThrow.wav', 0.22, 1),
  bombLand: sound('v2/bombLand.wav', 0.24, 1),
  explosion: sound('pixabay/explosion-medium.mp3', 0.48, 1, 0.1, 4),
  bigExplosion: sound('pixabay/explosion-medium.mp3', 0.58, 1, 0.18, 4),
  fuse: sound('v2/fuse.wav', 0.12, 1, 0.65, 0),
  fireCast: sound('v2/fireCast.wav', 0.35, 1, 0.13, 2),
  fireBurn: sound('v2/fireBurn.wav', 0.16, 1, 0.8, 0),
  magicCharge: sound('v2/magicCharge.wav', 0.28, 1, 0.5, 2),
  tankRumble: sound('v2/tankRumble.wav', 0.23, 1, 0.6, 1),
  tankCharge: sound('v2/tankCharge.wav', 0.38, 1, 0.6, 2),
  tankCrash: sound('v2/tankCrash.wav', 0.6, 1, 0.25, 4),
  balloonPop: sound('v2/balloonPop.wav', 0.45, 1, 0.15, 3),
  bodyFall: sound('v2/bodyFall.wav', 0.42, 1, 0.12, 2),
  trapSet: sound('v2/trapSet.wav', 0.28, 1, 0.12),
  trapArm: sound('v2/trapArm.wav', 0.2, 1),
  trapSnap: sound('v2/trapSnap.wav', 0.5, 1, 0.12, 4),
  trapBreak: sound('v2/trapBreak.wav', 0.37, 1, 0.1, 3),
  enemyDeath: sound('v2/enemyDeath.wav', 0.3, 1, 0.1, 2),
  bossDeath: sound('v2/bossDeath.wav', 0.6, 1, 0.3, 4),
  playerDeath: sound('v2/playerDeath.wav', 0.6, 1, 0.3, 4),
  bossArrival: sound('v2/bossArrival.wav', 0.4, 1, 1, 3),
};
export function soundPlacement(source, listener) {
  if (!source || !listener) return { gain: 1, pan: 0 };
  const a = source.player || source,
    b = listener.player || listener;
  if (!Number.isFinite(a.x) || !Number.isFinite(b.x)) return { gain: 1, pan: 0 };
  const dx = a.x - b.x,
    dz = (source.quarterDepth ?? a.quarterDepth ?? 0) - (listener.quarterDepth ?? b.quarterDepth ?? 0);
  const distance = Math.hypot(dx, dz);
  return {
    gain: distance >= 1400 ? 0 : 1 / (1 + (distance / 360) ** 2),
    pan: Math.max(-0.85, Math.min(0.85, dx / 650)),
  };
}
