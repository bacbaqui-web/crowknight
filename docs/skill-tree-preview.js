import { SKILL_PATHS, progressionGraph, progressionNodeColor } from '../src/skill_progression_data.js';

const graphs = new Map(SKILL_PATHS.map(path => [path.id, progressionGraph(path.id)]));
const maps = document.querySelector('#maps');
const detail = document.querySelector('#detail');
let filter = 'guard';
let selection = { pathId: 'guard', nodeId: SKILL_PATHS[1].root };
const SVG_NS = 'http://www.w3.org/2000/svg';

const NODE_WIDTH = 196;
const NODE_HEIGHT = 112;

function html(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function svg(tag, attrs, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text != null) node.textContent = text;
  return node;
}
function destinationLabel(node, target) {
  return target.name;
}
function select(pathId, nodeId) {
  selection = { pathId, nodeId };
  for (const element of maps.querySelectorAll('.node')) {
    const active = element.dataset.path === pathId && element.dataset.node === nodeId;
    element.classList.toggle('active', active);
    element.setAttribute('aria-pressed', String(active));
  }
  renderDetail();
}
function drawMap(path) {
  const nodes = graphs.get(path.id);
  const byId = new Map(nodes.map(node => [node.id, node]));
  const maxDepth = Math.max(...nodes.map(node => node.depth));
  const height = (maxDepth + 1) * 168 + 28;
  const WIDTH = Math.max(520, ...nodes.map(node => nodes.filter(other => other.depth === node.depth).length * 240 + 40));
  const positions = new Map();
  for (let depth = 0; depth <= maxDepth; depth++) {
    const row = nodes.filter(node => node.depth === depth);
    row.forEach((node, index) => positions.set(node.id, {
      x: WIDTH / row.length * (index + 0.5) - NODE_WIDTH / 2,
      y: 18 + (maxDepth - depth) * 168,
    }));
  }
  const section = html('article', '', 'map');
  section.style.setProperty('--accent', path.color);
  const heading = html('div', '', 'map-heading');
  const icon = document.createElement('img');
  icon.src = `../assets/icons/upgrades/${path.icon}.svg`; icon.alt = '';
  const title = html('div', '');
  title.append(html('h2', path.name), html('small', `Lv.2 계열 선택과 시작 기술 습득 · ${nodes.length}개 분기 위치`));
  heading.append(icon, title);
  const diagram = svg('svg', { viewBox: `0 0 ${WIDTH} ${height}`, class: 'diagram', role: 'group', 'aria-label': `${path.name} 전체 분기` });
  const defs = svg('defs', {});
  for (const [side, color] of [['left', '#90cafa'], ['right', '#eac083']]) {
    const marker = svg('marker', { id: `${path.id}-${side}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
    marker.append(svg('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: color })); defs.append(marker);
  }
  diagram.append(defs);
  for (const node of nodes) {
    const from = positions.get(node.id);
    node.children.forEach((id, index) => {
      if (id === node.id) return;
      const target = byId.get(id);
      const to = positions.get(id);
      const side = index ? 'right' : 'left';
      const x = from.x + NODE_WIDTH * (index ? .75 : .25);
      const endY = to.y + NODE_HEIGHT;
      const d = `M${x},${from.y} C${x},${from.y - 28} ${to.x + NODE_WIDTH / 2},${endY + 28} ${to.x + NODE_WIDTH / 2},${endY}`;
      diagram.append(svg('path', { d, class: `edge ${side}`, 'marker-end': `url(#${path.id}-${side})` }));
    });
  }
  for (const node of nodes) {
    const { x, y } = positions.get(node.id);
    const group = svg('g', { transform: `translate(${x} ${y})`, class: 'node', tabindex: 0, role: 'button', 'aria-label': `${node.name}${node.root ? ' 시작 기술' : ''}`, 'data-path': path.id, 'data-node': node.id });
    group.style.setProperty('--accent', progressionNodeColor(path.id, node.id));
    group.append(svg('rect', { width: NODE_WIDTH, height: NODE_HEIGHT, rx: 9, style: `stroke:${progressionNodeColor(path.id, node.id)}` }));
    group.append(svg('image', { href: `../assets/icons/upgrades/${node.icon}.svg`, x: 12, y: 14, width: 25, height: 25, 'aria-hidden': 'true' }));
    group.append(svg('text', { x: 47, y: 20, class: 'node-label' }, node.root ? 'Lv.2 · 시작 기술' : `${node.depth + 1}단계 · 선행 기술 필요`));
    group.append(svg('text', { x: 47, y: 39, class: 'node-title' }, node.name));
    node.children.forEach((id, index) => {
      const target = byId.get(id);
      group.append(svg('text', { x: 12, y: 72 + index * 23, class: `destination ${index ? 'right' : 'left'}` }, `${index ? '2 오른쪽' : '1 왼쪽'} · ${destinationLabel(node, target)}`));
    });
    if (!node.children.length) group.append(svg('text', { x: 12, y: 78, class: 'destination' }, '최상위 · 이후 이 기술 숙련'));
    group.addEventListener('click', () => select(path.id, node.id));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(path.id, node.id); }
    });
    diagram.append(group);
  }
  section.append(heading, diagram);
  return section;
}
function renderDetail() {
  const path = SKILL_PATHS.find(item => item.id === selection.pathId);
  const nodes = graphs.get(path.id);
  const node = nodes.find(item => item.id === selection.nodeId);
  detail.style.setProperty('--accent', progressionNodeColor(path.id, node.id));
  const description = html('div', '');
  description.append(html('h2', `${path.name} · ${node.name}`), html('p', node.detail));
  const next = html('div', '', 'next');
  node.children.forEach((id, index) => {
    const target = nodes.find(item => item.id === id);
    const button = html('button', '');
    button.append(html('span', `${index ? '2 · 오른쪽' : '1 · 왼쪽'} 선택 후 다음 분기 보기`, index ? 'right' : 'left'), html('strong', destinationLabel(node, target)));
    button.onclick = () => select(path.id, id);
    next.append(button);
  });
  const parents = nodes.filter(parent => parent.children.includes(node.id));
  description.append(html('p', node.root ? '시작 기술 · 계열 선택 즉시 습득' : `선행 조건: ${parents.map(parent => parent.name).join(' 또는 ')} 습득`));
  if (!node.children.length) next.append(html('p', '현재 최상위 기술입니다. 다음 레벨업부터 이 기술을 계속 강화합니다. 새 상위 기술은 추후 확장합니다.'));
  detail.replaceChildren(description, next);
}
function render() {
  const controls = document.querySelector('#filters');
  controls.replaceChildren();
  for (const item of [{ id: 'all', name: '전체 보기' }, ...SKILL_PATHS]) {
    const button = html('button', item.name);
    button.setAttribute('aria-pressed', String(item.id === filter));
    button.onclick = () => {
      filter = item.id;
      if (filter !== 'all' && selection.pathId !== filter) selection = { pathId: filter, nodeId: SKILL_PATHS.find(path => path.id === filter).root };
      render();
    };
    controls.append(button);
  }
  maps.classList.toggle('single', filter !== 'all');
  maps.replaceChildren(...SKILL_PATHS.filter(path => filter === 'all' || filter === path.id).map(drawMap));
  select(selection.pathId, selection.nodeId);
}
render();
