const paths = [
  { id: 'attack', name: '공격', color: '#e99c80', description: '연속 공격 · 충전 · 범위 피해', skills: [
    ['combo', '맹타', 'sharp-blade', 'Q 연속 공격', '연속 공격 피해 증가', 10, '%', '공격 4타 / 연속 타격', null],
    ['charge', '응축된 일격', 'swift-preparation', 'Q 유지 → 해제', '충전 공격 피해 증가', 20, '%', '응격 - 기모으기 / 응격 - 공격', null],
    ['chain', '끝없는 연격', 'seamless-finish', 'Q 연속 공격', '추가 연타 수', 1, '타', '공격 4타 이후 새 연타 모션', 'combo'],
    ['shock', '지면 강타', 'forceful-strike', '충전 공격 적중', '충격파 범위', 15, '%', '몽둥이 내려찍기 / 지면 파동', 'charge'],
    ['execute', '처형', 'sharp-blade', 'HP 25% 이하인 적 타격', '추가 피해', 20, '%', '강한 마무리 타격 / 타격 섬광', 'chain'],
    ['crush', '파괴의 일격', 'long-shadow', '최대 충전 공격', '방어 무시 비율', 10, '%', '크게 내려찍기 / 충격 균열', 'shock'],
  ] },
  { id: 'guard', name: '방어', color: '#86b4db', description: '체력 · 회복 · 피해 감소 · 반격', skills: [
    ['health', '강인한 생명', 'steel-feathers', '상시', '최대 HP', 20, ' HP', '습득 시 몸 주변 생명빛', null],
    ['armor', '철의 깃털', 'rooted-stance', '상시', '받는 피해 감소', 5, '%', '피격 시 단단한 깃털 연출', null],
    ['drain', '피의 갈증', 'unyielding-will', '직접 타격 적중', '흡혈 비율', 2, '%', '타격점에서 붉은 빛 흡수', 'health'],
    ['parry', '찰나의 반격', 'rooted-stance', 'E 방어 시작 순간', '패링 추가 판정 시간', .03, '초', '방어 / 패링 섬광', 'armor'],
    ['regen', '불굴의 재생', 'steel-feathers', '5초마다', 'HP 회복량', 3, ' HP', '회복 시 은은한 녹색 맥동', 'drain'],
    ['reflect', '가시 갑옷', 'forceful-strike', '적 공격 방어 시', '피해 반사 비율', 10, '%', '막기 / 반사 충격파', 'parry'],
  ] },
  { id: 'move', name: '이동', color: '#a6c793', description: '공중 이동 · 속도 · 연속 회피', skills: [
    ['jump', '두 번째 날갯짓', 'leaping-feather', '공중에서 Space', '이단점프 높이 보너스', 10, '%', '공중점프', null],
    ['roll', '그림자 구르기', 'seamless-finish', 'W', '구르기 거리 보너스', 10, '%', '구르기 / 짧은 잔상', null],
    ['glide', '검은 날개', 'leaping-feather', '공중에서 Space 유지', '활강 가능 시간', .5, '초', '팔과 망토 펼치기 / 활강', 'jump'],
    ['speed', '바람걸음', 'crow-footsteps', 'Shift 질주', '질주 속도 보너스', 10, '%', '질주 / 바람 잔상', 'roll'],
    ['air', '낙하 강습', 'forceful-strike', '공중에서 Q 길게 누르기', '낙하 타격 피해 보너스', 20, '%', '공중 준비 / 아래로 내려찍기', 'glide'],
    ['doubleRoll', '이중 구르기', 'seamless-finish', 'W 연속 두 번', '추가 구르기 재충전 단축', 10, '%', '구르기 → 구르기 / 연속 잔상', 'speed'],
  ] },
];
let currentPath = paths[0];
let selected = currentPath.skills[0];
let level = 6;
const ranks = {};
const maxRank = 5;
const spent = path => path.skills.reduce((sum, skill) => sum + (ranks[skill[0]] || 0), 0);
const points = () => level - 1 - paths.reduce((sum, path) => sum + spent(path), 0);
const tier = skill => Math.floor(currentPath.skills.indexOf(skill) / 2);
function unlocked(skill) {
  return spent(currentPath) >= tier(skill) * 5 && (!skill[8] || (ranks[skill[8]] || 0) >= 3);
}
function el(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function effect(skill, rank) {
  const amount = Number((skill[5] * rank).toFixed(2));
  if (!rank) return '아직 습득하지 않았습니다';
  return `${skill[4]} ${amount}${skill[6]}`;
}
function render() {
  document.querySelector('main').style.setProperty('--accent', currentPath.color);
  document.querySelector('#level').textContent = `Lv. ${level}`;
  document.querySelector('#points').textContent = points();
  const tabs = document.querySelector('.tabs');
  tabs.replaceChildren();
  for (const path of paths) {
    const button = el('button', path.name);
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(path === currentPath));
    button.style.setProperty('--accent', path.color);
    button.append(el('small', `${spent(path)} 포인트 투자`));
    button.onclick = () => { currentPath = path; selected = path.skills[0]; render(); };
    tabs.append(button);
  }
  document.querySelector('#path-title').textContent = `${currentPath.name}의 길`;
  document.querySelector('#path-description').textContent = currentPath.description;
  document.querySelector('#spent').textContent = `계열 투자 ${spent(currentPath)} PT`;
  const tree = document.querySelector('#tree');
  tree.replaceChildren();
  for (let row = 2; row >= 0; row--) {
    const section = el('div', '', 'tier');
    section.append(el('p', row ? `TIER ${row + 1} / 계열 ${row * 5} PT + 선행 기술 3레벨` : 'TIER 1 / 처음부터 투자 가능', 'tier-label'));
    const nodes = el('div', '', 'tier-nodes');
    for (const skill of currentPath.skills.slice(row * 2, row * 2 + 2)) {
      const rank = ranks[skill[0]] || 0;
      const button = el('button', '', `node${unlocked(skill) ? '' : ' locked'}${rank ? ' learned' : ''}${selected === skill ? ' selected' : ''}`);
      button.type = 'button';
      button.setAttribute('aria-label', `${skill[1]} ${rank}/${maxRank}${unlocked(skill) ? '' : ' 잠김'}`);
      button.setAttribute('aria-pressed', String(selected === skill));
      const icon = el('span', '', 'icon');
      const image = document.createElement('img');
      image.src = `../assets/icons/upgrades/${skill[2]}.svg`;
      image.alt = '';
      icon.append(image);
      button.append(icon, el('span', `${unlocked(skill) ? '' : '잠김 · '}${rank} / ${maxRank}`, 'rank'), el('strong', skill[1]));
      button.onclick = () => { selected = skill; render(); };
      nodes.append(button);
    }
    section.append(nodes);
    tree.append(section);
  }
  renderDetail();
}
function renderDetail() {
  const skill = selected;
  const rank = ranks[skill[0]] || 0;
  const detail = document.querySelector('#detail');
  detail.replaceChildren(el('span', `${currentPath.name} / ${tier(skill) + 1}단계`, 'tag'), el('h3', skill[1]), el('div', `기술 레벨 ${rank} / ${maxRank}`, 'rank-large'));
  for (const [label, value] of [['발동 조건', skill[3]], ['현재 효과', effect(skill, rank)], ['다음 레벨', rank < maxRank ? `${rank ? '' : '최초 습득 시 기술 해금 · '}${effect(skill, rank + 1)}` : '최대 레벨에 도달했습니다'], ['제작할 모션', skill[7]]]) {
    detail.append(el('h4', label), el('p', value));
  }
  detail.append(el('h4', '해금 조건'));
  const parent = currentPath.skills.find(s => s[0] === skill[8]);
  detail.append(el('p', parent ? `${currentPath.name} 계열 ${tier(skill) * 5} PT 투자 + ${parent[1]} 3레벨 (현재 ${ranks[parent[0]] || 0})` : '선행 조건 없음 · 포인트 1개 필요', 'requirements'));
  const invest = el('button', rank >= maxRank ? '최대 레벨' : !unlocked(skill) ? '선행 조건을 먼저 충족하세요' : !points() ? '스킬 포인트가 부족합니다' : rank ? '강화하기 · 1 PT' : '습득하기 · 1 PT', 'invest');
  invest.disabled = !unlocked(skill) || !points() || rank >= maxRank;
  invest.onclick = () => {
    if (!unlocked(skill) || !points() || rank >= maxRank) return;
    ranks[skill[0]] = rank + 1;
    render();
    document.querySelector('#notice').textContent = `${skill[1]} ${rank + 1}레벨에 투자했습니다. 시안이며 게임에는 적용되지 않습니다.`;
  };
  detail.append(invest);
}
document.querySelector('#level-up').onclick = () => { level++; render(); };
document.querySelector('#reset').onclick = () => { for (const key of Object.keys(ranks)) delete ranks[key]; render(); document.querySelector('#notice').textContent = '투자한 포인트를 모두 돌려받았습니다. 새로고침하면 시안은 Lv.6 / 5포인트로 시작합니다.'; };
render();
