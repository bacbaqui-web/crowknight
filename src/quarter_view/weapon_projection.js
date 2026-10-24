import { attackPlane } from '../attack_plane_helper.js';
import { transformMatrixPoint } from '../puppet_player_geometry_helper.js';
import { attackPoint, screenPoint } from './attack_geometry.js';
import { isProjectileAttack, weaponContactRegion, scaleWeaponContact } from './weapon_contact.js';

// The sprite, contact polygon and glow all use this same hand-anchored attack plane.
export function weaponImageProjection(actor, key, world, view) {
  const player = actor.player;
  if (!['weapon', 'shield'].includes(key) || isProjectileAttack(actor)) return null;
  if (player.actionSettings?.[player.actionKey]?.group !== 'attack') return null;
  const contact = weaponContactRegion(actor, { key: 'attackInteractionObject' });
  if (!contact.quarterWeaponContact || contact.quarterWeaponPart !== key) return null;
  const matrix = key === 'shield' ? player.shieldAnchorTransform() : player.weaponAnchorTransform();
  const plane = attackPlane(actor);
  const project = (x, y) => {
    const point = transformMatrixPoint(matrix, x, y);
    const scaled = scaleWeaponContact(actor, { points: [point], quarterWeaponAnchor: contact.quarterWeaponAnchor })
      .points[0];
    return screenPoint(attackPoint(actor, scaled, 0, plane, contact.quarterWeaponAnchor), world, view);
  };
  const origin = project(0, 0),
    x = project(1, 0),
    y = project(0, 1);
  return { a: x.x - origin.x, b: x.y - origin.y, c: y.x - origin.x, d: y.y - origin.y, e: origin.x, f: origin.y };
}
