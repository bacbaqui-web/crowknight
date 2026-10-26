// Recorded foley variants share buffers; gains leave headroom for crowded combat.
const sound = (files, gain, rate = 1, cooldown = 0.06, priority = 2) => ({
  files: Array.isArray(files) ? files : [files],
  gain,
  rate,
  cooldown,
  priority,
});
export const COMBAT_SOUNDS = {
  experiencePickup: sound('experience-soft.wav', 0.32, 0.92),
  healthPickup: sound('health-pickup.wav', 0.4),
  clubSwing: sound('club-swing.wav', 0.33, 0.92),
  swordSwing: sound('sword-swing.wav', 0.26, 1.08),
  bossSwing: sound('club-swing.wav', 0.44, 0.68),
  clubHit: sound('club-hit.wav', 0.55, 0.9),
  swordHit: sound('sword-hit.wav', 0.35),
  bossHit: sound('club-hit.wav', 0.65, 0.72),
  guardRaise: sound('guard-raise.wav', 0.16, 1.15),
  block: sound('shield-block.wav', 0.4, 0.93),
  parry: sound('shield-block.wav', 0.48, 1.28, 0.08, 4),
  footstep: sound(['foot-dirt-1.wav', 'foot-dirt-2.wav', 'foot-dirt-3.wav'], 0.19, 1, 0.09, 0),
  armorStep: sound('armor-jingle.wav', 0.1, 1, 0.23, 0),
  jump: sound('cloth-move.wav', 0.22, 1.2, 0.12, 1),
  roll: sound('cloth-roll.wav', 0.28, 0.95, 0.18, 1),
  land: sound(['land-1.wav', 'land-2.wav'], 0.32, 0.9, 0.1, 2),
  bowRelease: sound('bow-release.wav', 0.38, 1, 0.1),
  spearThrow: sound('sword-swing.wav', 0.4, 0.78, 0.12),
  bombThrow: sound('cloth-move.wav', 0.22, 0.85),
  bombLand: sound('metal-drop.wav', 0.24, 0.8),
  explosion: sound(['explosion-1.wav', 'explosion-2.wav'], 0.6, 1, 0.1, 4),
  bigExplosion: sound('explosion-1.wav', 0.7, 0.72, 0.18, 4),
  fuse: sound('fire-crackle.wav', 0.12, 1.2, 0.65, 0),
  fireCast: sound('fire-cast.wav', 0.35, 0.9, 0.13, 2),
  fireBurn: sound('fire-crackle.wav', 0.16, 1, 0.8, 0),
  magicCharge: sound('magic-charge.wav', 0.28, 0.85, 0.5, 2),
  tankRumble: sound('tank-rattle.wav', 0.23, 0.85, 0.6, 1),
  tankCharge: sound('tank-rattle.wav', 0.38, 1.2, 0.6, 2),
  tankCrash: sound('metal-crash.wav', 0.6, 0.72, 0.25, 4),
  balloonPop: sound('balloon-pop.wav', 0.45, 1, 0.15, 3),
  bodyFall: sound('land-2.wav', 0.42, 0.72, 0.12, 2),
  trapSet: sound('metal-set.wav', 0.28, 1, 0.12),
  trapArm: sound('metal-click.wav', 0.2, 1.15),
  trapSnap: sound('trap-snap.wav', 0.5, 1, 0.12, 4),
  trapBreak: sound('metal-crash.wav', 0.37, 1.15, 0.1, 3),
  enemyDeath: sound('armor-fall.wav', 0.3, 0.9, 0.1, 2),
  bossDeath: sound('metal-crash.wav', 0.6, 0.6, 0.3, 4),
  playerDeath: sound('armor-fall.wav', 0.6, 0.7, 0.3, 4),
  bossArrival: sound('metal-drop.wav', 0.4, 0.65, 1, 3),
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
