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

function attackRows(prefix, group, label) {
  return [
    row(`${prefix}Stun`, group, `${label} 경직`, '0', '1.2', '0.01'),
    row(`${prefix}KnockbackX`, group, `${label} 넉백 X`, '0', '1200', '10'),
    row(`${prefix}KnockbackY`, group, `${label} 넉백 Y`, '0', '700', '10'),
    row(`${prefix}DeathBurst`, group, `${label} 파편 힘`, '0', '4', '0.05'),
  ];
}

const MOTION_FIELD_ROWS = [
  row('speed', 'run', '이동 속도', '1', '10', '0.1'),
  row('runAcceleration', 'run', '이동 가속도', '0.02', '0.4', '0.01'),
  row('jumpPower', 'jump', '점프 높이', '40', '720', '5'),
  row('airFlapPower', 'jump', '날개짓 힘', '0', '420', '5'),
  row('airFlapCooldown', 'jump', '날개짓 간격', '0', '0.35', '0.01'),
  row('glideTimeMax', 'glide', '활강 시간', '0', '3', '0.05'),
  row('glideFallSpeed', 'glide', '활강 낙하', '60', '900', '10'),
  row('rollIntensity', 'roll', '구르기 강도', '0', '4', '0.1'),
  row('rollWeapon', 'roll', '구르기 무기', '0', '1', '1'),
  row('dashCooldownMax', 'roll', '구르기 쿨타임', '0', '1.8', '0.01'),
  row('rollEndInvuln', 'roll', '구른 뒤 무적', '0', '1.2', '0.01'),
  row('rollGhostCount', 'roll', '구르기 잔상 수', '0', '8', '1'),
  row('rollGhostInterval', 'roll', '구르기 잔상 간격', '0.01', '0.16', '0.005'),
  row('rollGhostLife', 'roll', '구르기 잔상 지속', '0.04', '0.6', '0.01'),
  row('rollGhostOpacity', 'roll', '구르기 잔상 진하기', '0', '2', '0.05'),
  ...attackRows('roll', 'roll', '구르기'),
  row('hurtInvuln', 'hurt', '피격 무적', '0', '2', '0.01'),
  row('attackCooldownMax', 'attack', '공격 쿨타임', '0', '1.5', '0.01'),
  row('comboResetTime', 'attack', '콤보 유지', '0.2', '2', '0.01'),
  ...attackRows('jumpAttack', 'jumpAttack', '점공'),
  ...attackRows('attack1', 'attack1', '1타'),
  ...attackRows('attack2', 'attack2', '2타'),
  ...attackRows('attack3', 'attack3', '3타'),
];

export function populateMotionSettingRows(container) {
  if (!container || container.children.length) return;
  MOTION_FIELD_ROWS.forEach((item) => {
    container.append(createMotionSettingElement(item));
  });
}

function createMotionSettingElement(item) {
  return createFieldRow(item);
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
