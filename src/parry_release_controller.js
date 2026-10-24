import { parryReleaseStats, stunParriedEnemy } from './parry_skill_helper.js';
import { applyInteractionDamage } from './combat_reaction_helper.js';

export function resolveParryRelease({ actors, playerActor, world, ...callbacks }) {
  const p = playerActor.player;
  if (p.dead || playerActor.hp <= 0 || p.runParryStun > 0) return false;
  const release = parryReleaseStats(p);
  if (!release) return false;
  if (release.kind === 'heal' && playerActor.hp >= playerActor.maxHp) return false;
  p.runParryPoints = 0;
  const amount = release.kind === 'heal' ? Math.min(release.amount, playerActor.maxHp - playerActor.hp) : release.amount;
  p.runParryPulse = { ...release, amount, radius: release.radius || 90, time: 0.6 };
  if (release.kind === 'heal') {
    playerActor.hp += amount;
    return true;
  }
  for (const target of actors) {
    if (target === playerActor || !['mobs', 'bosses'].includes(target.group) || target.hp <= 0 ||
        target.player.dead || target.respawning || target.invulnTime > 0) continue;
    const dx = target.player.x - p.x;
    const dy = world?.quarterView ? (target.quarterDepth || 0) - (playerActor.quarterDepth || 0) : target.player.y - p.y;
    if (Math.hypot(dx, dy) > release.radius) continue;
    const hp = target.hp;
    applyInteractionDamage({ ...callbacks, attacker: playerActor, target, playerActor, world, damage: amount });
    if (target.hp > 0 && target.hp < hp && release.stun > 0) stunParriedEnemy(target, release.stun);
  }
  return true;
}
