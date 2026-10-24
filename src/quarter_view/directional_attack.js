import { attackPlane } from '../attack_plane_helper.js';
import { regionPoints } from '../interaction_swept_region_helper.js';
import { progressionEffects } from '../skill_progression_effects.js';
import { chargeAttackScale } from '../charge_attack_helper.js';
import { ATTACK_INTERACTION_OBJECT_KEY, GUARD_INTERACTION_OBJECT_KEY } from '../interaction_object_model_data.js';
import { depthOf, normalizeDirection } from './camera.js';
import { isProjectileAttack } from './weapon_contact.js';

export function directionalAttackRegions(actor, regions) {
  if (isProjectileAttack(actor)) return regions;
  const player = actor.player;
  const body = player.hurtInteractionRegions?.[0];
  const originX = body ? body.x + body.w / 2 : player.x;
  const elevation = body ? body.y + body.h / 2 : player.y - 55;
  const aim = actor.quarterInputDirection || actor.quarterAim || { x: player.facing || 1, z: 0 };
  const direction = normalizeDirection(aim.x, aim.z) || { x: player.facing || 1, z: 0 };
  const reach = (player.runUpgrades?.reach || 1) * progressionEffects(player).reach * chargeAttackScale(player);
  const halfAngle = (35 * Math.PI) / 180;
  const depthReach = 1 + 0.35 * Math.abs(direction.z);
  return regions.map((region) => {
    if (![ATTACK_INTERACTION_OBJECT_KEY, GUARD_INTERACTION_OBJECT_KEY].includes(region.key)) return region;
    // Native regions already contain the reach multiplier. Recover their authored extent before measuring it.
    const length =
      Math.max(
        100,
        ...regionPoints(region).map((point) =>
          Math.hypot(
            player.x + (point.x - player.x) / reach - originX,
            player.y + (point.y - player.y) / reach - elevation
          )
        )
      ) *
      reach *
      depthReach;
    // A convex 70-degree sector uses the same polygon for display and collision.
    const points = [{ x: originX, y: depthOf(actor) }];
    for (let step = 0; step <= 16; step++) {
      const angle = -halfAngle + (2 * halfAngle * step) / 16;
      const forward = Math.cos(angle) * length,
        side = Math.sin(angle) * length;
      points.push({
        x: originX + direction.x * forward - direction.z * side,
        y: depthOf(actor) + direction.z * forward + direction.x * side,
      });
    }
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    return {
      ...region,
      points,
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
      reaction: { ...region.reaction, hitMode: 'box' },
      quarterDirectionalBox: true,
      quarterPlane: 'ground',
      quarterElevation: elevation,
      quarterHeightRange: attackPlane(actor) === 'height' ? [elevation - 30, elevation + 30] : null,
      quarterBoxLength: length,
      quarterBoxOrigin: { x: originX, depth: depthOf(actor), y: elevation },
      quarterBoxAim: direction,
    };
  });
}
