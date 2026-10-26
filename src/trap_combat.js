import { overlappingAttackRegion } from './interaction_overlap_helper.js';
import { applyInteractionDamage } from './combat_reaction_helper.js';
import { closeTrap, canStepOnTrap, rootInTrap } from './trapper_runtime.js';

export function resolveTrapCombat(trap, options, nativeAttacks) {
  const { playerActor: actor, world } = options;
  if (!actor || actor.player.dead || !['arming', 'armed'].includes(trap.phase)) return;
  const p = actor.player;
  // Only ground-level melee can break a floor trap; an aerial swing passes over it.
  if (p.onGround && Math.abs(p.y - trap.y) <= 25) {
    const prepared = world?.quarterView?.prepareAttackRegions?.(actor, nativeAttacks) ?? nativeAttacks;
    const attacks = world?.quarterView?.attackRegions?.(actor, prepared) ?? prepared;
    const region = {
      x: trap.x - 27,
      y: world?.quarterView ? trap.quarterDepth - 24 : trap.y - 28,
      w: 54,
      h: world?.quarterView ? 48 : 28,
      reaction: { hurtByAttack: true },
    };
    if (overlappingAttackRegion(actor, attacks, [region])) {
      closeTrap(trap, 'broken');
      world?.combatSounds?.contact('block', actor, trap.owner);
      return;
    }
  }
  if (trap.phase !== 'armed' || !canStepOnTrap(trap, actor, world?.quarterView)) return;
  const hp = actor.hp;
  closeTrap(trap, 'closed');
  applyInteractionDamage({
    ...options,
    attacker: trap.owner,
    target: actor,
    damage: trap.damage,
    allowParry: false,
    preserveAction: true,
    comboStep: 1,
    invincibleTime: 0.15,
  });
  if (actor.hp < hp && actor.hp > 0 && !p.dead) rootInTrap(actor);
}
