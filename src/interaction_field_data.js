export const INTERACTION_ROLE_DEFS = [
  { prop: 'collision', label: '충돌' },
  { prop: 'hurt', label: '피격' },
  { prop: 'attack', label: '공격' },
  { prop: 'guard', label: '방어' },
];

export const INTERACTION_TOGGLE_PROPS = new Set([
  'active',
  'attack',
  'hurt',
  'collision',
  'guard',
  'followWeapon',
  'noOverlap',
  'hurtByAttack',
  'hurtByCollision',
  'parry',
]);

export const INTERACTION_DECIMAL_PROPS = new Set(['stun', 'deathBurst', 'invincibleTime']);
export const INTERACTION_COLOR_PROPS = new Set([]);
export const INTERACTION_KNOCKBACK_PROPS = new Set([
  'knockbackX',
  'knockbackY',
  'knockback',
  'knockbackExtraVx',
  'knockbackExtraVy',
]);
export const INTERACTION_PUSH_POWER_PROPS = new Set(['pushPower', 'resistance']);
export const INTERACTION_SELECT_PROPS = new Set(['hitMode', 'knockbackMode']);
export const INTERACTION_SELECT_OPTIONS = Object.freeze({
  hitMode: [
    { value: 'box', label: '박스' },
    { value: 'trace', label: '궤적' },
  ],
  knockbackMode: [
    { value: 'add', label: 'Add' },
    { value: 'set', label: 'Set' },
  ],
});

export const INTERACTION_NUMERIC_PROPS = [
  'stun',
  'knockbackX',
  'knockbackY',
  'deathBurst',
  'pushPower',
  'resistance',
  'invincibleTime',
  'damage',
  'knockback',
  'knockbackExtraVx',
  'knockbackExtraVy',
];

export const INTERACTION_FIELD_DEFAULTS = Object.freeze({
  active: 0,
  attack: 0,
  hurt: 0,
  collision: 0,
  guard: 0,
  stun: 0,
  knockbackX: 0,
  knockbackY: 0,
  deathBurst: 1,
  pushPower: 0,
  noOverlap: 1,
  resistance: 1,
  hurtByAttack: 1,
  hurtByCollision: 0,
  invincibleTime: 0,
  damage: 1,
  knockback: 0,
  knockbackMode: 'add',
  knockbackExtraVx: 0,
  knockbackExtraVy: 0,
  hitMode: 'box',
  followWeapon: 1,
  parry: 0,
});

export const INTERACTION_DETAIL_GROUPS = Object.freeze({
  collision: [
    {
      label: 'Collision',
      toggles: [{ prop: 'noOverlap', label: '다른 Collision과 겹치지 않음' }],
      props: [
        { prop: 'pushPower', label: 'Push' },
        { prop: 'resistance', label: 'Resist' },
      ],
    },
  ],
  hurt: [
    {
      label: 'Hurt',
      toggles: [
        { prop: 'hurtByAttack', label: 'Attack Box와 닿으면 피격' },
        { prop: 'hurtByCollision', label: 'Collision Box와 닿으면 피격' },
      ],
      props: [{ prop: 'invincibleTime', label: '무적' }],
    },
  ],
  attack: [
    {
      label: 'Attack',
      toggles: [{ prop: 'followWeapon', label: '무기에 붙이기' }],
      selects: [{ prop: 'hitMode', label: '히트 판정 방식' }],
      modes: [{ prop: 'knockbackMode', label: 'Knockback Mode' }],
      props: [
        { prop: 'knockback', label: 'Knockback' },
        { prop: 'knockbackExtraVx', label: '추가 vx' },
        { prop: 'knockbackExtraVy', label: '추가 vy' },
      ],
    },
  ],
  guard: [
    {
      label: 'Guard',
      toggles: [
        { prop: 'guard', label: '방어' },
        { prop: 'parry', label: '패링' },
        { prop: 'attack', label: '공격' },
      ],
      props: [],
    },
  ],
});

export function interactionDefaultValue(prop) {
  return INTERACTION_FIELD_DEFAULTS[prop] ?? 0;
}

export function normalizeInteractionSelectValue(prop, value) {
  const options = INTERACTION_SELECT_OPTIONS[prop] || [];
  const text = String(value || '');
  return options.some((option) => option.value === text) ? text : interactionDefaultValue(prop);
}

export function normalizeInteractionColorValue(prop, value) {
  const text = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : interactionDefaultValue(prop);
}

export function interactionRoleLabel(prop) {
  return INTERACTION_ROLE_DEFS.find((item) => item.prop === prop)?.label || prop;
}

export function interactionDetailGroups(prop) {
  return INTERACTION_DETAIL_GROUPS[prop] || [];
}

export function interactionDetailFieldProps(role) {
  return interactionDetailGroups(role).flatMap((group) => [
    ...(group.toggles || []).map((item) => item.prop),
    ...(group.selects || []).map((item) => item.prop),
    ...(group.modes || []).map((item) => item.prop),
    ...(group.colors || []).map((item) => item.prop),
    ...(group.props || []).map((item) => item.prop),
  ]);
}
