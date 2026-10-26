import { attackPlane } from '../attack_plane_helper.js';
import { regionPoints } from '../interaction_swept_region_helper.js';
import { progressionEffects } from '../skill_progression_effects.js';
import { chargeAttackScale } from '../charge_attack_helper.js';
import { ATTACK_INTERACTION_OBJECT_KEY, GUARD_INTERACTION_OBJECT_KEY } from '../interaction_object_model_data.js';
import { depthOf, normalizeDirection, QUARTER_PROJECTION } from './camera.js';
import { isProjectileAttack, weaponContactRegion } from './weapon_contact.js';

export function directionalAttackRegions(actor, regions) {
  if (isProjectileAttack(actor)) return regions;
  if (['mobs', 'bosses'].includes(actor.group)) return nativeEnemyAttackRegions(actor, regions);
  const player = actor.player;
  const body = player.hurtInteractionRegions?.[0];
  const originX = body ? body.x + body.w / 2 : player.x;
  const elevation = body ? body.y + body.h / 2 : player.y - 55;
  const aim = actor.quarterAim || actor.quarterInputDirection || { x: player.facing || 1, z: 0 };
  const direction = normalizeDirection(aim.x, aim.z) || { x: player.facing || 1, z: 0 };
  const reach = (player.runUpgrades?.reach || 1) * progressionEffects(player).reach * chargeAttackScale(player);
  const halfAngle = (60 * Math.PI) / 180;
  const actionName = player.customActions?.find((action) => action.key === player.actionKey)?.name;
  const strike = /^(?:attack|공격)\s*([123])?$/.exec(actionName || player.actionKey || '');
  const comboScale = strike ? 1 + (Number(strike[1] || 1) - 1) * 0.03 : 1;
  const sizeScale = 1.15 * comboScale;
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
      sizeScale;
    // A convex 120-degree sector uses the same polygon for display and collision.
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
      quarterTrailScale: reach * comboScale,
      quarterDirectionScale: sizeScale,
      quarterBoxOrigin: { x: originX, depth: depthOf(actor), y: elevation },
      quarterBoxAim: direction,
    };
  });
}

export function nativeEnemyAttackRegions(actor, regions) {
  return regions.map((region) => {
    const native = actor.id === 'spearman' ? weaponContactRegion(actor, region, true) : region;
    const shift = depthOf(actor) * QUARTER_PROJECTION.slope;
    return {
      ...native,
      points: regionPoints(native).map((p) => ({ x: p.x, y: p.y + shift })),
      y: native.y + shift,
      reaction: { ...native.reaction, hitMode: 'box' },
      quarterNativeWeapon: true,
      quarterPlane: 'effect-height',
      quarterOrigin: {
        x: actor.player.x,
        depth: depthOf(actor),
        facing: actor.player.facing || 1,
        aim: { x: actor.player.facing || 1, z: 0 },
      },
    };
  });
}
