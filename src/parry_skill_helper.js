export function parryStats(player) {
  const rank = Math.max(1, player.runSkills?.parry || 1);
  return { window: Math.min(0.6, 0.15 + (rank - 1) * 0.03), stun: Math.min(1.5, 0.6 + (rank - 1) * 0.25) };
}

export function parryColor(player) {
  return player.runSkills?.parryHeal ? '#70e69b' : player.runSkills?.parryBurst ? '#ff716d' : '#8dcaff';
}

export function stunParriedEnemy(actor, seconds) {
  const p = actor.player;
  if (p.dead || (actor.id === 'ram_tank' && p.actionKey === 'tankCharge')) return;
  seconds = actor.group === 'bosses' ? Math.min(0.6, seconds * 0.5) : Math.min(1.5, seconds);
  p.runParryStun = Math.max(p.runParryStun || 0, seconds);
  p.hurtTime = Math.max(p.hurtTime || 0, seconds);
  p.customActionKey = null;
  p.customActionTime = 0;
  p.customActionElapsed = 0;
  p.customActionTargetMove = null;
  p.velocityControl = null;
  p.vx = 0;
  p.vxInertia = null;
}

export function trySkillParry(attacker, target, world) {
  const p = target.player;
  if (!p.runSkills?.parry || !p.runSkillActions?.guard ||
      p.customActionKey !== p.runSkillActions.guard || !(p.runParryTime > 0)) return false;
  p.runParryTime = 0;
  p.runParryPoints = Math.min(5, (p.runParryPoints || 0) + 1);
  stunParriedEnemy(attacker, parryStats(p).stun);
  target.hitCancelFlashTime = 0.2;
  world?.combatSounds?.contact('parry', attacker, target);
  return true;
}

export function parryReleaseStats(player) {
  const ranks = player.runSkills || {};
  const points = Math.max(0, Math.min(5, player.runParryPoints || 0));
  if (!points || (!ranks.parryHeal && !ranks.parryBurst)) return null;
  if (ranks.parryHeal) return {
    kind: 'heal', points, amount: 2 * points ** 2 * (1 + (ranks.parryHeal - 1) * 0.25 + (ranks.deepHealing || 0) * 0.5), radius: 0,
  };
  return { kind: 'burst', points, amount: 5 * points ** 2 * (1 + (ranks.parryBurst - 1) * 0.25),
    radius: 200 + (ranks.wideBurst || 0) * 40, stun: (ranks.stunningBurst || 0) * 0.5 };
}

export function drawParryStatus(ctx, actor, x, y) {
  const p = actor.player;
  if (!p) return;
  if (p.runSkills?.parry) {
    ctx.save();
    const color = parryColor(p);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();ctx.arc(x + (i - 2) * 13, y - 11, 4, 0, Math.PI * 2);
      ctx.fillStyle = i < (p.runParryPoints || 0) ? color : '#16202c';
      ctx.fill();ctx.strokeStyle = color;ctx.lineWidth = 1;ctx.stroke();
    }
    if (p.runSkills.parryHeal || p.runSkills.parryBurst) {
      ctx.fillStyle = color;ctx.font = '10px sans-serif';ctx.textAlign = 'center';
      ctx.fillText('R · ' + (p.runSkills.parryHeal ? '회복' : '파동'), x, y - 23);
    }
    ctx.restore();
  }
  if (p.runParryStun > 0) {
    ctx.save();ctx.fillStyle = '#ffe58a';ctx.font = '12px sans-serif';ctx.textAlign = 'center';
    ctx.fillText('✦ 스턴 ✦', x, y - 12);ctx.restore();
  }
  const pulse = p.runParryPulse;
  if (pulse?.time > 0) {
    ctx.save();ctx.globalAlpha *= Math.min(1, pulse.time * 2);
    ctx.strokeStyle = pulse.kind === 'heal' ? '#70e69b' : '#ff716d';ctx.lineWidth = 3;
    ctx.beginPath();ctx.arc(p.x, p.y - 30, pulse.radius * (1 - pulse.time / 0.6), 0, Math.PI * 2);ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;ctx.font = 'bold 14px sans-serif';ctx.textAlign = 'center';
    ctx.fillText(pulse.kind === 'heal' ? `+${Math.round(pulse.amount)} HP` : '패링 파동', x, y - 40);ctx.restore();
  }
}
