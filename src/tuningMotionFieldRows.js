import { poseLabel } from './tuningLabels.js';

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

function linkToggle(group, label) {
  return { type: 'linkToggle', group, label };
}

function animationIntensityRow(key, group = key) {
  return row(`${key}AnimationIntensity`, group, `${poseLabel(key)} 애니메이션 강도`, '0', '2.5', '0.05');
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
  animationIntensityRow('idle'),
  animationIntensityRow('run'),
  linkToggle('run', '이동 연동'),
  row('speed', 'run', '이동 속도', '1', '10', '0.1'),
  row('runAcceleration', 'run', '이동 가속도', '0.02', '0.4', '0.01'),
  row('walkBob', 'run', '이동 상하', '0', '18', '1'),
  animationIntensityRow('jump'),
  row('jumpPower', 'jump', '점프 높이', '40', '720', '5'),
  row('airFlapPower', 'jump', '날개짓 힘', '0', '420', '5'),
  row('airFlapCooldown', 'jump', '날개짓 간격', '0', '0.35', '0.01'),
  animationIntensityRow('fall'),
  animationIntensityRow('glide'),
  row('glideTimeMax', 'glide', '활강 시간', '0', '3', '0.05'),
  row('glideFallSpeed', 'glide', '활강 낙하', '60', '900', '10'),
  animationIntensityRow('roll'),
  row('rollIntensity', 'roll', '구르기 강도', '0', '4', '0.1'),
  row('rollWeapon', 'roll', '구르기 무기', '0', '1', '1'),
  row('dashCooldownMax', 'roll', '구르기 쿨타임', '0', '1.8', '0.01'),
  row('rollEndInvuln', 'roll', '구른 뒤 무적', '0', '1.2', '0.01'),
  row('rollGhostCount', 'roll', '구르기 잔상 수', '0', '8', '1'),
  row('rollGhostInterval', 'roll', '구르기 잔상 간격', '0.01', '0.16', '0.005'),
  row('rollGhostLife', 'roll', '구르기 잔상 지속', '0.04', '0.6', '0.01'),
  row('rollGhostOpacity', 'roll', '구르기 잔상 진하기', '0', '2', '0.05'),
  ...attackRows('roll', 'roll', '구르기', {
    x: ['-160', '180'],
    y: ['-120', '120'],
    w: ['6', '240'],
    h: ['6', '180'],
  }),
  animationIntensityRow('guard'),
  animationIntensityRow('guardBreak'),
  animationIntensityRow('hurt'),
  row('hurtInvuln', 'hurt', '피격 무적', '0', '2', '0.01'),
  animationIntensityRow('death'),
  row('attackCooldownMax', 'attack', '공격 쿨타임', '0', '1.5', '0.01'),
  row('comboResetTime', 'attack', '콤보 유지', '0.2', '2', '0.01'),
  animationIntensityRow('jumpAttack'),
  ...attackRows('jumpAttack', 'jumpAttack', '점공', {
    x: ['-160', '180'],
    y: ['-120', '120'],
    w: ['6', '240'],
    h: ['6', '180'],
  }),
  animationIntensityRow('attack1'),
  ...attackRows('attack1', 'attack1', '1타', {
    x: ['-160', '180'],
    y: ['-120', '120'],
    w: ['6', '240'],
    h: ['6', '180'],
  }),
  animationIntensityRow('attack2'),
  ...attackRows('attack2', 'attack2', '2타', {
    x: ['-160', '180'],
    y: ['-120', '120'],
    w: ['6', '240'],
    h: ['6', '180'],
  }),
  animationIntensityRow('attack3'),
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
    container.append(createMotionSettingElement(item));
  });
}

function createMotionSettingElement(item) {
  if (item.type === 'divider') return createDivider(item);
  if (item.type === 'linkToggle') return createLinkToggle(item);
  return createFieldRow(item);
}

function createDivider({ group }) {
  const element = document.createElement('div');
  element.className = 'setting-divider';
  element.dataset.motionGroup = group;
  return element;
}

function createLinkToggle({ group, label }) {
  const rowElement = document.createElement('div');
  rowElement.className = 'setting-row motion-link-row';
  rowElement.dataset.motionGroup = group;

  const labelElement = document.createElement('span');
  labelElement.textContent = label;

  const guide = document.createElement('span');
  guide.className = 'motion-link-guide';

  const button = document.createElement('button');
  button.className = 'icon-button motion-link-toggle';
  button.type = 'button';
  button.dataset.action = 'toggle-run-motion-link';
  button.setAttribute('aria-label', '이동 속도와 이동 애니메이션 값 연동');
  button.setAttribute('aria-pressed', 'false');
  button.title = '이동 속도와 이동 애니메이션 값 연동';
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93"></path>
      <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07"></path>
    </svg>
  `;

  rowElement.append(labelElement, guide, button);
  return rowElement;
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
