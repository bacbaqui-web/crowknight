import { depthOf, normalizeDirection } from './camera.js';
import { previousAttackRegion } from '../interaction_overlap_helper.js';
import { interactionRegionCenter, applyKnockback } from '../combat_reaction_helper.js';

export function applyGroundKnockback(attacker, target, region) {
  const reaction = region?.reaction || {};
  const aim = attacker.quarterAim || { x: attacker.player.facing || 1, z: 0 };
  let direction = aim;
  if (reaction.knockbackMode !== 'set') {
    const previous = previousAttackRegion(attacker, region);
    const current = interactionRegionCenter(region);
    const before = previous && interactionRegionCenter(previous);
    direction =
      (before && normalizeDirection(current.x - before.x, current.y - before.y)) ||
      normalizeDirection(target.player.x - attacker.player.x, depthOf(target) - depthOf(attacker)) ||
      aim;
  }
  const power = Math.max(0, Number(reaction.knockback || 0));
  const forward = Number(reaction.knockbackExtraVx || 0),
    lateral = -Number(reaction.knockbackExtraVy || 0) * (attacker.player.facing || 1);
  const multiplier = (attacker.player.runUpgrades?.knockback || 1) * (target.player.runUpgrades?.resistance || 1);
  const dx = (direction.x * power + aim.x * forward - aim.z * lateral) * multiplier;
  const dz = (direction.z * power + aim.z * forward + aim.x * lateral) * multiplier;
  if (Math.hypot(dx, dz) <= 0.0001) return;
  const oldAxis = target.quarterImpulse || target.quarterAim || { x: target.player.facing || 1, z: 0 };
  const oldSpeed = Number(target.player.vx || 0) * (target.quarterVelocityFacing || target.player.facing || 1);
  const vx = oldAxis.x * oldSpeed + dx,
    vz = oldAxis.z * oldSpeed + dz;
  target.quarterImpulse = normalizeDirection(vx, vz);
  target.quarterImpulseSerial = target.player.attackSerial;
  target.player.vx = Math.hypot(vx, vz) * (target.player.facing || 1);
  target.quarterVelocityFacing = target.player.facing || 1;
  target.player.velocityControl = { ...target.player.velocityControl, x: true };
}

export function applyQuarterKnockback(attacker, target, region, world) {
  if (!['height', 'effect-height'].includes(region.quarterPlane)) return applyGroundKnockback(attacker, target, region);
  const before = target.player.vx;
  applyKnockback(attacker, target, region, { ...world, quarterView: null });
  if (target.player.vx === before) return;
  const aim = region.quarterOrigin?.aim || attacker.quarterAim || { x: attacker.player.facing || 1, z: 0 };
  const sign = (attacker.player.facing || 1) * (target.player.facing || 1);
  target.quarterImpulse = { x: aim.x * sign, z: aim.z * sign };
  target.quarterImpulseSerial = target.player.attackSerial;
}
