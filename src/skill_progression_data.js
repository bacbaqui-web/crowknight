import { RUN_SKILLS } from './skill_runtime_helper.js';

export const SKILL_PATHS = [
  { id: 'attack', name: '공격', color: '#ff8a78', icon: 'sharp-blade', root: 'attackRoot', first: 'fourthStrike', skills: ['fourthStrike', 'chargeAttack'], motions: [['fourthStrike', '공격 4타'], ['chargePose', '응격 - 기모으기'], ['chargeAttack', '응격 - 공격']] },
  { id: 'guard', name: '방어', color: '#78bbff', icon: 'rooted-stance', root: 'guardRoot', first: 'parry', skills: ['parry'], motions: [['guard', '방어 · 패링']] },
  { id: 'move', name: '이동', color: '#7ee7ac', icon: 'crow-footsteps', root: 'moveRoot', first: 'doubleJump', skills: ['doubleJump', 'backflip'], motions: [['doubleJump', '이단점프'], ['backflip', '백플립']] },
];

const PASSIVES = [
  { id: 'vitality', name: '강인한 생명', detail: '최대 HP +20 · 증가분만큼 회복', icon: 'steel-feathers' },
  { id: 'armor', name: '철의 깃털', detail: '받는 피해 5% 감소 · 최대 60%', icon: 'rooted-stance' },
  { id: 'lifeSteal', name: '피의 갈증', detail: '실제 직접 타격 피해의 2% 회복 · 최대 20%', icon: 'unyielding-will' },
  { id: 'swiftness', name: '바람걸음', detail: '이동 속도 +10% · 최대 +100%', icon: 'crow-footsteps' },
  { id: 'power', name: '무거운 몽둥이', detail: '모든 직접 공격 피해 +10%', icon: 'forceful-strike' },
  { id: 'reach', name: '넓은 궤적', detail: '공격 판정 범위 +10% · 최대 +100%', icon: 'long-shadow' },
  { id: 'leap', name: '가벼운 깃털', detail: '도약 높이 +10% · 최대 +100%', icon: 'leaping-feather' },
];
export const PROGRESSION_SKILLS = [...RUN_SKILLS, ...PASSIVES];
const effectsByNode = { attackRoot: 'fourthStrike', guardRoot: 'vitality', moveRoot: 'swiftness', combo: 'fourthStrike' };
const branches = {
  attackRoot: ['combo', 'chargeAttack'], guardRoot: ['armor', 'parry'], moveRoot: ['doubleJump', 'backflip'],
  combo: ['combo', 'power'],
  fourthStrike: ['fourthStrike', 'chargeAttack'], chargeAttack: ['chargeAttack', 'reach'],
  power: ['power', 'fourthStrike'], reach: ['reach', 'power'],
  vitality: ['armor', 'parry'], armor: ['armor', 'vitality'],
  parry: ['parry', 'lifeSteal'], lifeSteal: ['lifeSteal', 'vitality'],
  swiftness: ['doubleJump', 'backflip'], doubleJump: ['doubleJump', 'leap'],
  backflip: ['backflip', 'swiftness'], leap: ['leap', 'swiftness'],
};

export function progressionChoices(pathId, route = []) {
  if (!pathId) return SKILL_PATHS.map(path => ({
    id: path.id, pathId: path.id, kind: 'path', name: path.name, color: path.color,
    icon: path.icon, detail: `${path.name}의 길 선택 · 다음 레벨업부터 시작 기술 습득`,
  }));
  const path = SKILL_PATHS.find(item => item.id === pathId);
  if (!path) return [];
  let current = path.root;
  for (const direction of route.slice(1)) current = branches[current][direction];
  const nodes = route.length ? branches[current] : [path.root];
  return nodes.map((node, index) => {
    const effectId = effectsByNode[node] || node;
    return ({
    ...PROGRESSION_SKILLS.find(skill => skill.id === effectId),
    id: `${path.id}:${route.join('') || 'root'}:${index}`,
    effectId, direction: index, color: path.color, pathId,
    branchLabel: route.length ? `${index ? '오른쪽' : '왼쪽'} 가지` : '트리 시작 기술',
  });
  });
}
