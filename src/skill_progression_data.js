import { RUN_SKILLS } from './skill_runtime_helper.js';

export const SKILL_PATHS = [
  { id: 'attack', name: '공격', color: '#ff8a78', icon: 'sharp-blade', root: 'attackRoot', first: 'fourthStrike', skills: ['fourthStrike', 'fifthStrike', 'sixthStrike', 'chargeAttack'], motions: [['fourthStrike', '공격 4타'], ['fifthStrike', '공격 5타'], ['sixthStrike', '공격 6타'], ['chargePose', '응격 - 기모으기'], ['chargeAttack', '응격 - 공격']] },
  { id: 'guard', name: '방어', color: '#78bbff', icon: 'rooted-stance', root: 'guardRoot', first: 'parry', skills: ['parry', 'parryHeal', 'parryBurst', 'deepHealing', 'wideBurst', 'stunningBurst'], motions: [['guard', '방어 · 패링']] },
  { id: 'move', name: '이동', color: '#7ee7ac', icon: 'crow-footsteps', root: 'moveRoot', first: 'sprint', skills: ['sprint', 'doubleJump', 'rollChain', 'plunge', 'glide', 'rollStrike', 'blink'], motions: [['sprint', '달리기'], ['doubleJump', '이단점프'], ['roll', '구르기 · 가시 깃털'], ['plunge', '까마귀 강하'], ['glide', '활강'], ['blink', '순보']] },
];

const PASSIVES = [
  { id: 'parryHeal', name: '생명의 반향', detail: 'R: 포인트 전부 소모 · 포인트² × 2 HP 회복(5개=50 HP) · 강화마다 회복량 +25%', icon: 'steel-feathers' },
  { id: 'parryBurst', name: '분노의 파동', detail: 'R: 포인트 전부 소모 · 주변 200 범위에 포인트² × 5 피해(5개=125) · 강화마다 피해 +25%', icon: 'forceful-strike' },
  { id: 'deepHealing', name: '깊은 생명', detail: '생명의 반향 회복량 +50% · 강화마다 +50%', icon: 'unyielding-will' },
  { id: 'wideBurst', name: '퍼지는 파동', detail: '분노의 파동 반경 +40 · 강화마다 +40', icon: 'long-shadow' },
  { id: 'stunningBurst', name: '진압의 파동', detail: '분노의 파동 적중 시 0.5초 스턴 · 강화마다 +0.5초', icon: 'rooted-stance' },
  { id: 'comboForce', name: '몰아치는 연타', detail: '4·5·6타 피해 +15% · 강화마다 +15%', icon: 'forceful-strike' },
  { id: 'vitality', name: '강인한 생명', detail: '최대 HP +20 · 증가분만큼 회복', icon: 'steel-feathers' },
  { id: 'armor', name: '철의 깃털', detail: '받는 피해 5% 감소 · 최대 60%', icon: 'rooted-stance' },
  { id: 'lifeSteal', name: '피의 갈증', detail: '실제 직접 타격 피해의 2% 회복 · 최대 20%', icon: 'unyielding-will' },
  { id: 'swiftness', name: '바람걸음', detail: '이동 속도 +10% · 최대 +100%', icon: 'crow-footsteps' },
  { id: 'power', name: '무거운 몽둥이', detail: '모든 직접 공격 피해 +10%', icon: 'forceful-strike' },
  { id: 'reach', name: '넓은 궤적', detail: '공격 판정 범위 +10% · 최대 +100%', icon: 'long-shadow' },
  { id: 'leap', name: '가벼운 깃털', detail: '도약 높이 +10% · 최대 +100%', icon: 'leaping-feather' },
];
export const MAX_SKILL_RANK = 3;
export const PROGRESSION_SKILLS = [...RUN_SKILLS, ...PASSIVES].map(skill => ({ ...skill, maxRank: MAX_SKILL_RANK }));
const effectsByNode = { attackRoot: 'fourthStrike', guardRoot: 'parry', moveRoot: 'sprint' };
// Every edge advances one tier. A leaf can be trained without reopening earlier branches.
const branches = {
  attackRoot: ['fifthStrike', 'chargeAttack'],
  fifthStrike: ['sixthStrike', 'comboForce'], chargeAttack: ['reach', 'power'],
  guardRoot: ['parryHeal', 'parryBurst'],
  parryHeal: ['deepHealing', 'vitality'], parryBurst: ['wideBurst', 'stunningBurst'],
  moveRoot: ['doubleJump', 'rollChain'],
  doubleJump: ['plunge', 'glide'], rollChain: ['rollStrike', 'blink'],
};
function nodeSkill(id) {
  const effectId = effectsByNode[id] || id;
  const skill = PROGRESSION_SKILLS.find(item => item.id === effectId);
  return { ...skill, effectId };
}

export function progressionNodeColor(pathId, nodeId) {
  if (pathId === 'guard') {
    if (['parryHeal', 'deepHealing', 'vitality'].includes(nodeId)) return '#70e69b';
    if (['parryBurst', 'wideBurst', 'stunningBurst'].includes(nodeId)) return '#ff716d';
  }
  return SKILL_PATHS.find(path => path.id === pathId)?.color;
}

export function progressionChoices(pathId, route = [], ranks = {}) {
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
    effectId, direction: index, color: progressionNodeColor(pathId, node), pathId,
    nodeId: node, mastery,
    branchLabel: mastery ? '최상위 기술 숙련 · 이전 분기로 돌아가지 않습니다' : route.length ? `${index ? '오른쪽' : '왼쪽'} 가지` : '트리 시작 기술',
  });
  });
  if (['attack', 'guard', 'move'].includes(pathId) && route.length && !mastery) choices.push({
    ...nodeSkill(current), id: `${pathId}:${route.join('')}:train`, nodeId: current,
    pathId, color: progressionNodeColor(pathId, current), reinforce: true, branchLabel: '현재 기술 강화 · 다음 분기 유지',
  });
  return choices.filter(choice => (ranks[choice.effectId] || 0) < MAX_SKILL_RANK);
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
