import { RUN_SKILLS } from './skill_runtime_helper.js';

export const SKILL_PATHS = [
  { id: 'attack', name: '공격', color: '#ff8a78', icon: 'sharp-blade', root: 'attackRoot', first: 'fourthStrike', skills: ['fourthStrike', 'fifthStrike', 'sixthStrike', 'chargeAttack'], motions: [['fourthStrike', '공격 4타'], ['fifthStrike', '공격 5타'], ['sixthStrike', '공격 6타'], ['chargePose', '응격 - 기모으기'], ['chargeAttack', '응격 - 공격']] },
  { id: 'guard', name: '방어', color: '#78bbff', icon: 'rooted-stance', root: 'guardRoot', first: 'parry', skills: ['parry'], motions: [['guard', '방어 · 패링']] },
  { id: 'move', name: '이동', color: '#7ee7ac', icon: 'crow-footsteps', root: 'moveRoot', first: 'doubleJump', skills: ['doubleJump', 'backflip'], motions: [['doubleJump', '이단점프'], ['backflip', '백플립']] },
];

const PASSIVES = [
  { id: 'comboForce', name: '몰아치는 연타', detail: '4·5·6타 피해 +15% · 강화마다 +15%', icon: 'forceful-strike' },
  { id: 'vitality', name: '강인한 생명', detail: '최대 HP +20 · 증가분만큼 회복', icon: 'steel-feathers' },
  { id: 'armor', name: '철의 깃털', detail: '받는 피해 5% 감소 · 최대 60%', icon: 'rooted-stance' },
  { id: 'lifeSteal', name: '피의 갈증', detail: '실제 직접 타격 피해의 2% 회복 · 최대 20%', icon: 'unyielding-will' },
  { id: 'swiftness', name: '바람걸음', detail: '이동 속도 +10% · 최대 +100%', icon: 'crow-footsteps' },
  { id: 'power', name: '무거운 몽둥이', detail: '모든 직접 공격 피해 +10%', icon: 'forceful-strike' },
  { id: 'reach', name: '넓은 궤적', detail: '공격 판정 범위 +10% · 최대 +100%', icon: 'long-shadow' },
  { id: 'leap', name: '가벼운 깃털', detail: '도약 높이 +10% · 최대 +100%', icon: 'leaping-feather' },
];
export const PROGRESSION_SKILLS = [...RUN_SKILLS, ...PASSIVES];
const effectsByNode = { attackRoot: 'fourthStrike', guardRoot: 'parry', moveRoot: 'doubleJump' };
// Every edge advances one tier. A leaf can be trained without reopening earlier branches.
const branches = {
  attackRoot: ['fifthStrike', 'chargeAttack'],
  fifthStrike: ['sixthStrike', 'comboForce'], chargeAttack: ['reach', 'power'],
  guardRoot: ['armor', 'vitality'],
  armor: ['parryMaster', 'lifeSteal'], vitality: ['parryMaster', 'lifeSteal'],
  moveRoot: ['backflip', 'swiftness'],
  backflip: ['jumpMaster', 'leap'], swiftness: ['jumpMaster', 'leap'],
};
effectsByNode.parryMaster = 'parry';
effectsByNode.jumpMaster = 'doubleJump';
const nodeNames = { parryMaster: '숙련된 패링', jumpMaster: '상승의 날갯짓' };
function nodeSkill(id) {
  const effectId = effectsByNode[id] || id;
  const skill = PROGRESSION_SKILLS.find(item => item.id === effectId);
  return { ...skill, name: nodeNames[id] || skill.name, effectId };
}

export function progressionChoices(pathId, route = []) {
  if (!pathId) return SKILL_PATHS.map(path => ({
    id: path.id, pathId: path.id, kind: 'path', name: path.name, color: path.color,
    icon: path.icon, effectId: path.first, detail: `선택 즉시 ${nodeSkill(path.root).name} 습득 · ${nodeSkill(path.root).detail}`,
  }));
  const path = SKILL_PATHS.find(item => item.id === pathId);
  if (!path) return [];
  let current = path.root;
  for (const direction of route.slice(1)) {
    const children = branches[current];
    if (children) {
      if (!children[direction]) return [];
      current = children[direction];
    }
  }
  const mastery = route.length > 0 && !branches[current];
  const nodes = route.length ? (branches[current] || [current]) : [path.root];
  const choices = nodes.map((node, index) => {
    const effectId = effectsByNode[node] || node;
    return ({
    ...nodeSkill(node),
    id: `${path.id}:${route.join('') || 'root'}:${index}`,
    effectId, direction: index, color: path.color, pathId,
    nodeId: node, mastery,
    branchLabel: mastery ? '최상위 기술 숙련 · 이전 분기로 돌아가지 않습니다' : route.length ? `${index ? '오른쪽' : '왼쪽'} 가지` : '트리 시작 기술',
  });
  });
  if (pathId === 'attack' && route.length && !mastery) choices.push({
    ...nodeSkill(current), id: `attack:${route.join('')}:train`, nodeId: current,
    pathId, color: path.color, reinforce: true, branchLabel: '현재 기술 강화 · 다음 분기 유지',
  });
  return choices;
}

// The map and game share the same prerequisite edges.
export function progressionGraph(pathId) {
  const path = SKILL_PATHS.find(item => item.id === pathId);
  if (!path) return [];
  const queue = [{ id: path.root, depth: 0 }];
  const visited = new Set([path.root]);
  const result = [];
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index];
    const children = branches[node.id] || [];
    for (const id of children) {
      if (!visited.has(id)) {
        visited.add(id);
        queue.push({ id, depth: node.depth + 1 });
      }
    }
    const effectId = effectsByNode[node.id] || node.id;
    result.push({ ...nodeSkill(node.id),
      ...node, effectId, children: [...children], root: node.id === path.root });
  }
  return result;
}
