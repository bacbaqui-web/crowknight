export const ATTACK_PLANES = [
  { value: 'auto', label: '자동 (화살·점프공격은 높이)' },
  { value: 'ground', label: '지면 공격 (높이 무시)' },
  { value: 'height', label: '높이 공격 (공중 판정)' },
];
export function normalizeAttackPlane(value) {
  return ATTACK_PLANES.some((option) => option.value === value) ? value : 'auto';
}
export function attackPlane(actor, key = actor.player.actionKey, projectile = false) {
  const player = actor.player,
    settings = player.actionSettings?.[key] || {};
  const selected = normalizeAttackPlane(actor.quarterAttackPlanes?.[key] ?? settings.quarterAttackPlane);
  if (selected !== 'auto') return selected;
  const name = player.customActions?.find((action) => action.key === key)?.name || key || '';
  const airborne =
    /jumpAttack|공중.*공격|낙하.*공격/.test(name) || (settings.condition === 'air' && settings.group === 'attack');
  const arrow =
    Array.isArray(settings.formulas) &&
    settings.formulas.some((formula) => formula.type === 'projectile' && formula.enabled);
  return projectile || airborne || arrow ? 'height' : 'ground';
}
