import { progressionEffects, progressionMaxHealth } from './skill_progression_effects.js';
import { chargeAttackScale } from './charge_attack_helper.js';
import { baseHealth } from './actor_health_helper.js';
// Run modifiers live on runtime players; authored tuning and snapshots stay untouched.
export function upgradeEffects(counts = {}) {
  const count = (id) => Math.max(0, Number(counts[id]) || 0);
  const reduction = (id, step) => Math.max(0.2, 1 - count(id) * step);
  return {
    damage: 1 + count('sharp-blade') * 0.1,
    health: 1 + count('steel-feathers') * 0.1,
    speed: 1 + count('crow-footsteps') * 0.1,
    reach: 1 + count('long-shadow') * 0.1,
    knockback: 1 + count('forceful-strike') * 0.2,
    resistance: reduction('rooted-stance', 0.15),
    stagger: reduction('unyielding-will', 0.1),
    windup: 1,
    recovery: 1 / (1 + count('rapid-combo') * 0.1),
    jump: 1 + count('leaping-feather') * 0.1,
  };
}

export function applyRunUpgradeEffects(actors, playerActor, snapshot) {
  for (const actor of actors) {
    const previous = actor.maxHp ?? baseHealth(actor.tuning);
    const effects = upgradeEffects(snapshot[actor === playerActor ? 'player' : 'enemy']);
    actor.player.runUpgrades = effects;
    actor.maxHp = progressionMaxHealth(actor);
    // Grant only the newly added capacity, equally for both sides; dead actors stay dead.
    if (!actor.player.dead && actor.hp > 0)
      actor.hp = Math.min(actor.maxHp, actor.hp + Math.max(0, actor.maxHp - previous));
  }
}

export function clearRunUpgradeEffects(actors) {
  for (const actor of actors) {
    delete actor.player.runUpgrades;
    delete actor.player.runUpgradeAttackWindow;
    actor.maxHp = progressionMaxHealth(actor);
    actor.hp = Math.min(actor.hp, actor.maxHp);
  }
}

export function scaleUpgradeAttackRegions(player, regions) {
  const scale = (player.runUpgrades?.reach || 1) * progressionEffects(player).reach * chargeAttackScale(player);
  if (scale === 1) return regions;
  // Expand damage geometry about the actor without scaling hurt/collision boxes or the sprite.
  return regions.map((region) => {
    const points = region.points?.map((point) => ({
      x: player.x + (point.x - player.x) * scale,
      y: player.y + (point.y - player.y) * scale,
    }));
    if (!points?.length)
      return {
        ...region,
        x: player.x + (region.x - player.x) * scale,
        y: player.y + (region.y - player.y) * scale,
        w: region.w * scale,
        h: region.h * scale,
      };
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    return {
      ...region,
      points,
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  });
}

export function upgradeVelocity(player, settings, x, y) {
  const effects = progressionEffects(player);
  if (settings.group !== 'movement') return { x, y };
  const skillJump =
    player.customActionKey === player.runSkillActions?.doubleJump
      ? 1 + Math.max(0, (player.runSkills?.doubleJump || 1) - 1) * 0.1
      : 1;
  const action = player.actions?.find((entry) => entry.key === player.customActionKey);
  const walking = action?.trigger?.type === 'single' &&
    action.trigger.keys?.some((key) => ['ArrowRight', 'ArrowLeft'].includes(key));
  const windstep = walking ? 1 + Math.max(0, player.runSkills?.sprint || 0) * 0.1 : 1;
  return { x: x * (player.runUpgrades?.speed || 1) * effects.speed * windstep, y: y < 0 ? y * Math.sqrt((player.runUpgrades?.jump || 1) * skillJump * effects.jump) : y };
}
