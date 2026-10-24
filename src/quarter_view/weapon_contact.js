import { ATTACK_INTERACTION_OBJECT_KEY, GUARD_INTERACTION_OBJECT_KEY } from '../interaction_object_model_data.js';
import { transformMatrixPoint } from '../puppet_player_geometry_helper.js';
import { scaleUpgradeAttackRegions } from '../run_upgrade_effect_helper.js';

export function isProjectileAttack(actor) {
  return (
    actor.player.actionSettings?.[actor.player.actionKey]?.formulas?.some(
      (formula) => formula.type === 'projectile' && formula.enabled
    ) || false
  );
}

export function weaponContactRegion(actor, original) {
  const player = actor.player;
  const name = player.customActions?.find((action) => action.key === player.actionKey)?.name || '';
  const partKey = original.key === GUARD_INTERACTION_OBJECT_KEY || /방패|shield/i.test(name) ? 'shield' : 'weapon';
  const part = player.rig?.[partKey];
  if (!part) return original;
  const matrix = partKey === 'shield' ? player.shieldAnchorTransform?.() : player.weaponAnchorTransform?.();
  if (!matrix) return original;
  const offset = player.getPartOffset(partKey);
  const width = Math.max(1, (part.w || part.baseW || 1) + (offset.w || 0)),
    height = Math.max(1, (part.h || part.baseH || 1) + (offset.h || 0));
  const ax = (((part.ax ?? part.ox ?? 0) + (offset.ax || 0)) * width) / (part.baseW || part.w || 1);
  const ay = (((part.ay ?? part.oy ?? 0) + (offset.ay || 0)) * height) / (part.baseH || part.h || 1);
  // Melee blades start beyond the grip; shield bashes use the complete shield face.
  const grip = partKey === 'weapon' ? Math.min(width * 0.45, Math.max(0, ax)) : 0;
  const points = [
    [grip - ax, -ay],
    [width - ax, -ay],
    [width - ax, height - ay],
    [grip - ax, height - ay],
  ].map(([x, y]) => transformMatrixPoint(matrix, x, y));
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  return {
    ...original,
    points,
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}

export function alignEnemyWeaponRegions(actor, regions) {
  if (!regions.length || actor.id === 'player_01' || isProjectileAttack(actor)) return regions;
  return regions.map((region) =>
    [ATTACK_INTERACTION_OBJECT_KEY, GUARD_INTERACTION_OBJECT_KEY].includes(region.key)
      ? scaleUpgradeAttackRegions(actor.player, [weaponContactRegion(actor, region)])[0]
      : region
  );
}
