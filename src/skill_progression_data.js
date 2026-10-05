import { RUN_SKILLS } from './skill_runtime_helper.js';

export const SKILL_PATHS = [
  { id: 'attack', name: '공격', color: '#ff8a78', first: 'fourthStrike', skills: ['fourthStrike', 'chargeAttack'], motions: [['fourthStrike', '공격 4타'], ['chargePose', '응격 - 기모으기'], ['chargeAttack', '응격 - 공격']] },
  { id: 'guard', name: '방어', color: '#78bbff', first: 'parry', skills: ['parry'], motions: [['guard', '방어 · 패링']] },
  { id: 'jump', name: '점프', color: '#7ee7ac', first: 'doubleJump', skills: ['doubleJump'], motions: [['doubleJump', '이단점프']] },
  { id: 'roll', name: '구르기', color: '#cf9aff', first: 'backflip', skills: ['backflip'], motions: [['backflip', '백플립']] },
];

export function progressionChoices(pathId) {
  if (!pathId) return SKILL_PATHS.map((path) => {
    const skill = RUN_SKILLS.find((item) => item.id === path.first);
    return { ...skill, pathId: path.id, color: path.color, name: `${path.name} · ${skill.name}`,
      detail: `${skill.detail} · 이번 판은 ${path.name} 계열로 성장합니다` };
  });
  const path = SKILL_PATHS.find((item) => item.id === pathId);
  return path ? RUN_SKILLS.filter((skill) => path.skills.includes(skill.id)).map((skill) => ({ ...skill, color: path.color, pathId })) : [];
}
