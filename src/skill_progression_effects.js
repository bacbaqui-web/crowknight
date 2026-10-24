import { baseHealth } from './actor_health_helper.js';

export function progressionEffects(player) {
  const ranks = player?.runSkills || {};
  return {
    damage: 1 + (ranks.power || 0) * 0.1,
    armor: 1 - Math.min(0.6, (ranks.armor || 0) * 0.05),
    lifeSteal: Math.min(0.2, (ranks.lifeSteal || 0) * 0.02),
    speed: 1 + Math.min(1, (ranks.swiftness || 0) * 0.1),
    reach: 1 + Math.min(1, (ranks.reach || 0) * 0.1),
    jump: 1 + Math.min(1, (ranks.leap || 0) * 0.1),
    health: (ranks.vitality || 0) * 20,
  };
}

export function progressionMaxHealth(actor) {
  return baseHealth(actor.tuning) * (actor.player?.runUpgrades?.health || 1) + progressionEffects(actor.player).health;
}

export function syncProgressionHealth(actor, grantIncrease = false) {
  const previous = actor.maxHp ?? baseHealth(actor.tuning);
  actor.maxHp = progressionMaxHealth(actor);
  if (actor.hp != null) actor.hp = Math.min(actor.maxHp,
    actor.hp + (grantIncrease && actor.hp > 0 && !actor.player.dead ? Math.max(0, actor.maxHp - previous) : 0));
}
