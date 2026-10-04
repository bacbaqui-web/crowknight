import { clone } from './common_helper.js';
export const RUN_SKILLS = [
  {
    id: 'chargeAttack',
    name: '응축된 일격',
    detail: 'Q 길게 누르고 놓으면 강공격 · 최대 3배 피해 · 강화마다 범위·히트박스·이펙트 +20%',
    icon: 'swift-preparation',
  },
  { id: 'fourthStrike', name: '네 번째 칼날', detail: '공격 4타 해금 · 강화마다 4타 피해 +20%', icon: 'sharp-blade' },
  {
    id: 'parry',
    name: '찰나의 반격',
    detail: 'E 방어 시작 순간 패링 · 강화마다 판정 시간 +0.03초',
    icon: 'rooted-stance',
  },
  {
    id: 'doubleJump',
    name: '두 번째 날갯짓',
    detail: '공중 점프 1회 · 강화마다 도약 높이 +10%',
    icon: 'leaping-feather',
  },
  {
    id: 'backflip',
    name: '뒤집는 그림자',
    detail: '↑ + W 백플립 해금 · 강화마다 회피 시간 +0.05초',
    icon: 'seamless-finish',
  },
];

export function prepareSkillActions(tuning) {
  const actions = tuning.customActions;
  const sprint = actions.find((action) => action.name === '질주');
  if (sprint?.trigger?.type === 'sequence' && sprint.trigger.keys?.every((key) => key === 'ArrowRight')) {
    sprint.trigger = { type: 'single', keys: ['Shift'], triggerMode: 'pressLoop', repeatWhileHeld: true };
    tuning.actionTriggers[sprint.key] = clone(sprint.trigger);
  }
  const find = (name) => actions.find((action) => action.name === name)?.key;
  tuning.skillActions = {
    fourthStrike: find('공격4'),
    doubleJump: find('공중점프'),
    backflip: find('백플립'),
    ...tuning.skillActions,
  };
  function add(id, name, source, trigger, condition, group) {
    if (
      id === 'chargeAttack' &&
      tuning.chargePoseVersion >= 3 &&
      tuning.skillActions[id] === tuning.skillActions.firstStrike
    )
      return;
    if (tuning.skillActions[id] && actions.some((action) => action.key === tuning.skillActions[id])) return;
    tuning.skillPrototypeReady = false;
    const key = `skill_${id}`;
    actions.push({ key, name, trigger });
    tuning.actionTriggers[key] = trigger;
    tuning.actionSettings[key] = clone(tuning.actionSettings[source] || tuning.actionSettings.idle);
    Object.assign(tuning.actionSettings[key], { condition, group, duration: 0.6 });
    tuning.actionOffsets[key] = clone(tuning.actionOffsets[source] || tuning.actionOffsets.idle);
    tuning.skillActions[id] = key;
  }
  add(
    'fourthStrike',
    '공격4',
    find('공격3') || find('공격') || 'idle',
    { type: 'single', keys: ['Q'], triggerMode: 'tap' },
    'ground',
    'attack'
  );
  add(
    'doubleJump',
    '공중점프',
    find('점프') || 'idle',
    { type: 'single', keys: ['Space'], triggerMode: 'tap' },
    'air',
    'movement'
  );
  add(
    'backflip',
    '백플립',
    find('구르기') || 'idle',
    { type: 'holdCombo', hold: 'ArrowUp', press: 'W', triggerMode: 'tap' },
    'ground',
    'special'
  );
  add('guard', '방어', 'idle', { type: 'single', keys: ['E'], triggerMode: 'press' }, 'ground', 'special');
  tuning.skillActions.firstStrike = find('공격') || 'idle';
  const chargeMissing = !tuning.skillActions.chargeAttack;
  const manualTrigger = { type: 'sequence', keys: ['E', 'E', 'E', 'E'], maxGapMs: 1, triggerMode: 'tap' };
  add('chargePose', '기 모으기', 'idle', manualTrigger, 'ground', 'special');
  add('chargeAttack', '응축된 일격', find('공격4') || find('공격') || 'idle', manualTrigger, 'ground', 'attack');
  const chargeAction = actions.find((action) => action.key === tuning.skillActions.chargeAttack);
  if (chargeAction && chargeAction.name === '강공격') chargeAction.name = '응축된 일격';
  if (chargeAction && tuning.actionNames?.[chargeAction.key] === '강공격')
    tuning.actionNames[chargeAction.key] = '응축된 일격';
  if (chargeAction) tuning.actionSettings[tuning.skillActions.chargeAttack].group = 'attack';
  if (chargeMissing) {
    const pose = tuning.actionSettings[tuning.skillActions.chargePose];
    pose.duration = 2;
    pose.playback = 'loop';
    pose.formulas = [];
    const attack = tuning.actionSettings[tuning.skillActions.chargeAttack];
    attack.formulas = (attack.formulas || []).filter((formula) => !['link', 'cast', 'cooldown'].includes(formula.type));
    const region = tuning.actionOffsets[tuning.skillActions.chargeAttack].attackInteractionObject;
    if (region) {
      for (const frame of [region.start, region.end, ...(region.keyframes || [])].filter(Boolean)) {
        frame.active = frame.attack = 1;
        frame.followWeapon = 0;
        frame.w = 160;
        frame.h = 70;
        frame.x = 75;
        frame.y = -45;
      }
    }
  }
  if (!tuning.chargePoseVersion || tuning.chargePoseVersion < 2) {
    const first = tuning.skillActions.firstStrike,
      heavy = tuning.skillActions.chargeAttack;
    tuning.actionOffsets[heavy] = clone(tuning.actionOffsets[first]);
    tuning.effectOffsets[heavy] = clone(tuning.effectOffsets[first] || {});
    tuning.effectSettings[heavy] = clone(tuning.effectSettings[first] || {});
    tuning.actionSettings[heavy] = clone(tuning.actionSettings[first]);
    tuning.actionSettings[heavy].formulas = (tuning.actionSettings[heavy].formulas || []).filter(
      (formula) => !['link', 'cast', 'cooldown'].includes(formula.type)
    );
    tuning.chargePoseVersion = 2;
  }
  if (tuning.chargePoseVersion < 3) {
    // Rebind the authored charged-strike animation as the charging pose without rewriting it.
    tuning.skillActions.chargePose = tuning.skillActions.chargeAttack;
    tuning.skillActions.chargeAttack = tuning.skillActions.firstStrike;
    tuning.chargePoseVersion = 3;
  }
  if (tuning.chargePoseVersion < 4) {
    const pose =
      actions.find((action) => action.key === 'skill_chargePose') ||
      actions.find((action) => action.name === '기 모으기');
    const strike =
      actions.find((action) => action.key === 'skill_chargeAttack') ||
      actions.find((action) => action.name === '응축된 일격');
    if (pose && strike) {
      pose.name = '응격 - 기모으기';
      if (tuning.actionNames) tuning.actionNames[pose.key] = pose.name;
      tuning.actionSettings[pose.key].group = 'special';
      tuning.actionSettings[strike.key].group = 'attack';
      tuning.skillActions.chargePose = pose.key;
      tuning.skillActions.chargeAttack = strike.key;
      tuning.chargePoseVersion = 4;
    }
  }
  const chargedStrike = actions.find((action) => action.key === tuning.skillActions.chargeAttack);
  if (chargedStrike?.name === '응축된 일격') {
    chargedStrike.name = '응격 - 공격';
    if (tuning.actionNames) tuning.actionNames[chargedStrike.key] = chargedStrike.name;
  }
  if (!tuning.skillPrototypeReady) {
    const strike = tuning.actionOffsets[tuning.skillActions.fourthStrike];
    const region = strike.attackInteractionObject || {};
    const frames = region.keyframes || [region.start, region.end].filter(Boolean);
    if (!frames.some((frame) => frame.active && frame.attack)) {
      const pose = { ...region.start, x: 70, y: -45, w: 130, h: 65, active: 0, attack: 0, followWeapon: 0 };
      strike.attackInteractionObject = {
        ...region,
        start: { ...pose },
        end: { ...pose },
        keyframes: [
          { ...pose, id: 'start', t: 0 },
          { ...pose, id: 'strike', t: 0.2, active: 1, attack: 1 },
          { ...pose, id: 'recover', t: 0.5 },
          { ...pose, id: 'end', t: 1 },
        ],
      };
    }
    const guard = tuning.actionOffsets[tuning.skillActions.guard];
    for (const [part, rot] of [
      ['upperArmL', -55],
      ['lowerArmL', -25],
    ]) {
      const offset = guard[part];
      if (!offset) continue;
      for (const frame of [offset.start, offset.end, ...(offset.keyframes || [])].filter(Boolean)) frame.rot = rot;
    }
    tuning.skillPrototypeReady = true;
  }
}

export function canUseRunSkill(player, key) {
  if (!player.runSkills) return true;
  const bindings = player.runSkillActions || {};
  if (
    (bindings.chargePose === key || (bindings.chargeAttack === key && key !== bindings.firstStrike)) &&
    !player.runSkills.chargeAttack
  )
    return false;
  for (const id of ['fourthStrike', 'doubleJump', 'backflip']) {
    if (bindings[id] !== key) continue;
    if (!player.runSkills[id]) return false;
    if (id === 'doubleJump' && (player.onGround || player.runAirJumpUsed)) return false;
  }
  return true;
}
export function startRunSkill(player, key) {
  if (!player.runSkills) return;
  const bindings = player.runSkillActions;
  if (key === bindings.doubleJump) {
    player.runAirJumpUsed = true;
    player.vy = 0;
    player.velocityControl = null;
  }
  if (key === bindings.guard && player.runGuardReady)
    player.runParryTime = 0.15 + Math.max(0, (player.runSkills.parry || 1) - 1) * 0.03;
  if (key === bindings.backflip) player.runEvadeTime = 0.25 + Math.max(0, player.runSkills.backflip - 1) * 0.05;
}
export function updateRunSkills(player, dt) {
  if (player.onGround) player.runAirJumpUsed = false;
  player.runParryTime = Math.max(0, (player.runParryTime || 0) - dt);
  player.runEvadeTime = Math.max(0, (player.runEvadeTime || 0) - dt);
}
export function runSkillDamageMultiplier(player) {
  if (player.runSkills && player.runChargedAttack && player.customActionKey === player.runSkillActions.chargeAttack)
    return player.runChargedPower || 1;
  return player.runSkills && player.customActionKey === player.runSkillActions.fourthStrike
    ? 1 + Math.max(0, player.runSkills.fourthStrike - 1) * 0.2
    : 1;
}
