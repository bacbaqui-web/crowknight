export function createProjectileSoundEvents(play) {
  let states = new WeakMap();
  function update(projectiles = []) {
    for (const p of projectiles) {
      if (!p.active) continue;
      const before = states.get(p);
      if (!before) {
        if (p.bossHazard === 'punch') play('bossSwing', p);
        else if (p.ratTrap) play('trapSet', p);
        else if (p.linearSpear) play('spearThrow', p);
        else if (p.mageFire || ['fireball', 'rain'].includes(p.bossHazard)) play('fireCast', p);
        else if (p.powderBomb) play(p.bossHazard === 'mine' ? 'trapSet' : 'bombThrow', p);
        else play(p.ownerId === 'archer' ? 'bowRelease' : 'spearThrow', p);
      }
      if (p.phase !== before?.phase) {
        if (p.ratTrap) {
          if (p.phase === 'armed') play('trapArm', p);
          if (p.phase === 'closed') play('trapSnap', p);
          if (p.phase === 'broken') play('trapBreak', p);
        } else if (p.phase === 'blast' && p.bossHazard !== 'punch')
          play(['giant', 'barrel', 'missile'].includes(p.bossHazard) ? 'bigExplosion' : 'explosion', p);
        else if (p.phase === 'fuse') play('bombLand', p);
      }
      const clock = p.age ?? p.phaseTime ?? 0;
      const interval = Math.floor(clock / 0.9);
      if (interval !== before?.interval) {
        if (p.phase === 'burn') play('fireBurn', p);
        if (p.phase === 'fuse') play('fuse', p);
      }
      states.set(p, { phase: p.phase, interval });
    }
  }
  return {
    update,
    reset() {
      states = new WeakMap();
    },
  };
}
