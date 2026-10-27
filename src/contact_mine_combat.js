import { overlappingAttackRegion } from './interaction_overlap_helper.js';

export function breakContactMine(mine, actor, world, nativeAttacks) {
  if (!actor || actor.player.dead || !actor.player.onGround || Math.abs(actor.player.y - mine.y) > 40) return false;
  const prepared = world?.quarterView?.prepareAttackRegions?.(actor, nativeAttacks) ?? nativeAttacks;
  const attacks = world?.quarterView?.attackRegions?.(actor, prepared) ?? prepared;
  const region = {
    x: mine.x - 24,
    y: world?.quarterView ? mine.quarterDepth - 24 : mine.y - 40,
    w: 48,
    h: world?.quarterView ? 48 : 40,
    reaction: { hurtByAttack: true },
  };
  if (!overlappingAttackRegion(actor, attacks, [region])) return false;
  mine.active = false;
  world?.combatSounds?.event?.('trapBreak', mine);
  return true;
}
