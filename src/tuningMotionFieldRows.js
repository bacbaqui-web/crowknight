function row(field, group, label, min, max, step, number = null) {
  return {
    type: 'row',
    field,
    group,
    label,
    range: { min, max, step },
    number: number || { min, max, step },
  };
}

function divider(group) {
  return { type: 'divider', group };
}

function attackRows(prefix, group, label, { x, y, w, h }) {
  return [
    row(`${prefix}HitboxX`, group, `${label} 히트 X`, x[0], x[1], '1', { step: '1' }),
    row(`${prefix}HitboxY`, group, `${label} 히트 Y`, y[0], y[1], '1', { step: '1' }),
    row(`${prefix}HitboxW`, group, `${label} 히트 W`, '6', w[1], '1', { min: '6', step: '1' }),
    row(`${prefix}HitboxH`, group, `${label} 히트 H`, '6', h[1], '1', { min: '6', step: '1' }),
    row(`${prefix}HitboxRot`, group, `${label} 히트 회전`, '-180', '180', '1', { step: '1' }),
    divider(group),
    row(`${prefix}Stun`, group, `${label} 경직`, '0', '1.2', '0.01'),
    row(`${prefix}KnockbackX`, group, `${label} 넉백 X`, '0', '1200', '10'),
    row(`${prefix}KnockbackY`, group, `${label} 넉백 Y`, '0', '700', '10'),
    row(`${prefix}DeathBurst`, group, `${label} 파편 힘`, '0', '4', '0.05'),
  ];
}

const MOTION_FIELD_ROWS = [
  row('idleAnimationIntensity', 'idle', '대기 애니메이션 강도', '0', '2.5', '0.05'),
  row('runAnimationIntensity', 'run', '이동 애니메이션 강도', '0', '2.5', '0.05'),
  row('speed', 'run', '이동 속도', '80', '620', '5'),
  row('walkSpeed', 'run', '이동 속도감', '4', '24', '1'),
  row('walkBob', 'run', '이동 상하', '0', '18', '1'),
  row('walkBody', 'run', '이동 몸통', '0', '24', '1'),
  row('walkArmSwing', 'run', '이동 팔', '0', '90', '1'),
  row('walkLegSwing', 'run', '이동 다리', '0', '90', '1'),
  row('jumpAnimationIntensity', 'jump', '점프 애니메이션 강도', '0', '2.5', '0.05'),
  row('jumpPower', 'jump', '점프 힘', '300', '1200', '10'),
  row('airFlapPower', 'jump', '공중 점프 힘', '0', '420', '5'),
  row('airFlapCooldown', 'jump', '공중 점프 간격', '0', '0.35', '0.01'),
  row('jumpHoldMax', 'jump', '점프 유지', '0', '0.35', '0.01'),
  row('jumpHoldForce', 'jump', '추가 상승', '0', '1400', '10'),
  row('jumpRiseGravity', 'jump', '상승 감속', '0.42', '2.4', '0.01'),
  row('jumpRiseEase', 'jump', '상승 이징', '0.4', '5', '0.1'),
  row('fallAnimationIntensity', 'fall', '낙하 애니메이션 강도', '0', '2.5', '0.05'),
  row('glideAnimationIntensity', 'glide', '활강 애니메이션 강도', '0', '2.5', '0.05'),
  row('glideTimeMax', 'glide', '활강 시간', '0', '3', '0.05'),
  row('glideFallSpeed', 'glide', '활강 낙하', '60', '900', '10'),
  row('rollAnimationIntensity', 'roll', '구르기 애니메이션 강도', '0', '2.5', '0.05'),
  row('rollDistance', 'roll', '구르기 거리', '60', '520', '10'),
  row('dashDuration', 'roll', '구르기 시간', '0.04', '0.6', '0.01'),
  row('dashCooldownMax', 'roll', '구르기 쿨타임', '0', '1.8', '0.01'),
  row('rollEndInvuln', 'roll', '구른 뒤 무적', '0', '1.2', '0.01'),
  row('dashLean', 'roll', '구르기 기울기', '-45', '55', '1'),
  row('rollSpin', 'roll', '구르기 회전', '0', '900', '10'),
  row('rollTuck', 'roll', '구르기 접힘', '0', '110', '1'),
  row('rollLift', 'roll', '구르기 높이', '0', '80', '1'),
  row('guardAnimationIntensity', 'guard', '방어 애니메이션 강도', '0', '2.5', '0.05'),
  row('guardBreakAnimationIntensity', 'guardBreak', '방어 풀림 강도', '0', '2.5', '0.05'),
  row('hurtAnimationIntensity', 'hurt', '피격 애니메이션 강도', '0', '2.5', '0.05'),
  row('hurtInvuln', 'hurt', '피격 무적', '0', '2', '0.01'),
  row('deathAnimationIntensity', 'death', '사망 애니메이션 강도', '0', '2.5', '0.05'),
  row('attackCooldownMax', 'attack', '공격 쿨타임', '0', '1.5', '0.01'),
  row('comboResetTime', 'attack', '콤보 유지', '0.2', '2', '0.01'),
  row('jumpAttackAnimationIntensity', 'jumpAttack', '점공 애니메이션 강도', '0', '2.5', '0.05'),
  ...attackRows('jumpAttack', 'jumpAttack', '점공', {
    x: ['-160', '180'],
    y: ['-120', '120'],
    w: ['6', '240'],
    h: ['6', '180'],
  }),
  row('attack1AnimationIntensity', 'attack1', '1타 애니메이션 강도', '0', '2.5', '0.05'),
  ...attackRows('attack1', 'attack1', '1타', {
    x: ['-160', '180'],
    y: ['-120', '120'],
    w: ['6', '240'],
    h: ['6', '180'],
  }),
  row('attack2AnimationIntensity', 'attack2', '2타 애니메이션 강도', '0', '2.5', '0.05'),
  ...attackRows('attack2', 'attack2', '2타', {
    x: ['-160', '180'],
    y: ['-120', '120'],
    w: ['6', '240'],
    h: ['6', '180'],
  }),
  row('attack3AnimationIntensity', 'attack3', '3타 애니메이션 강도', '0', '2.5', '0.05'),
  ...attackRows('attack3', 'attack3', '3타', {
    x: ['-180', '220'],
    y: ['-140', '140'],
    w: ['6', '280'],
    h: ['6', '220'],
  }),
];

export function populateMotionSettingRows(container) {
  if (!container || container.children.length) return;
  MOTION_FIELD_ROWS.forEach((item) => {
    container.append(item.type === 'divider' ? createDivider(item) : createFieldRow(item));
  });
}

function createDivider({ group }) {
  const element = document.createElement('div');
  element.className = 'setting-divider';
  element.dataset.motionGroup = group;
  return element;
}

function createFieldRow({ field, group, label, range, number }) {
  const rowElement = document.createElement('label');
  rowElement.className = 'setting-row';
  rowElement.dataset.field = field;
  rowElement.dataset.motionGroup = group;

  const labelElement = document.createElement('span');
  labelElement.textContent = label;
  rowElement.append(labelElement, createInput('range', range), createInput('number', number));
  return rowElement;
}

function createInput(type, attributes) {
  const input = document.createElement('input');
  input.type = type;
  Object.entries(attributes).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  return input;
}
