import { progressionGraph, progressionNodeColor } from './skill_progression_data.js';

export function skillTreeLayout(pathId) {
  const nodes=progressionGraph(pathId), byId=new Map(nodes.map(n=>[n.id,n]));
  let leaf=0;
  function place(id) {
    const n=byId.get(id);
    n.column=n.children.length?n.children.map(place).reduce((a,b)=>a+b,0)/n.children.length:leaf++;
    return n.column;
  }
  if(nodes.length) place(nodes[0].id);
  return nodes.map(n=>({...n,x:90+n.column*180,y:315-n.depth*125}));
}
export function renderSkillTree(cards, offered, ranks, choose, pathId) {
  const nodes=skillTreeLayout(pathId), byId=new Map(nodes.map(n=>[n.id,n]));
  const scroll=document.createElement('div');scroll.className='skill-tree-scroll';
  const tree=document.createElement('div');tree.className='skill-tree-board';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 720 385');svg.classList.add('skill-tree-lines');svg.setAttribute('aria-hidden','true');
  for(const node of nodes) for(const id of node.children) {
    const child=byId.get(id),line=document.createElementNS(svg.namespaceURI,'path');
    line.setAttribute('d',`M ${node.x} ${node.y-20} V ${(node.y+child.y)/2} H ${child.x} V ${child.y+20}`);
    if(ranks[child.effectId]) line.classList.add('learned');
    else if(offered.some(s=>s.nodeId===id)) line.classList.add('available');
    svg.append(line);
  }
  tree.append(svg);
  const detail=document.createElement('div');detail.className='skill-tree-detail';detail.setAttribute('aria-live','polite');
  function explain(node,choice) {
    detail.replaceChildren();
    const name=document.createElement('strong'),text=document.createElement('p');
    name.textContent=node.name;text.textContent=node.detail;
    const hint=document.createElement('small');hint.textContent=choice?'클릭하거나 표시된 숫자키로 습득·강화합니다.':ranks[node.effectId]?'이미 습득한 기술입니다.':'선행 기술을 따라 진행하면 열립니다. 선택하지 않은 가지로는 돌아갈 수 없습니다.';
    detail.append(name,text,hint);
  }
  function drawNode(node,choice,index) {
    const rank=ranks[node.effectId]||0,el=document.createElement(choice?'button':'div');
    el.className=`skill-tree-node ${choice?'available':rank?'learned':'locked'}`;
    el.style.left=`${node.x}px`;el.style.top=`${node.y}px`;el.style.setProperty('--node-color',progressionNodeColor(pathId,node.id));
    const icon=document.createElement('img');icon.src=new URL(`../assets/icons/upgrades/${node.icon}.svg`,import.meta.url).href;icon.alt='';
    const name=document.createElement('strong');name.textContent=node.name;
    const status=document.createElement('small');status.textContent=choice?`${rank?'강화':'습득'} ${rank+1}/3`:rank?`습득 ${rank}/3`:'미습득';
    el.append(icon,name,status);
    if(choice) {
      el.type='button';const key=document.createElement('kbd');key.textContent=index+1;el.append(key);
      el.setAttribute('aria-keyshortcuts',String(index+1));el.onclick=()=>choose(choice.id,offered);
      el.addEventListener('focus',()=>explain(node,choice));
    }
    el.title=node.detail;el.addEventListener('pointerenter',()=>explain(node,choice));
    tree.append(el);
  }
  // Keep DOM button order identical to numeric-choice order even though positions follow the tree.
  offered.forEach((choice,i)=>drawNode(byId.get(choice.nodeId),choice,i));
  nodes.filter(n=>!offered.some(s=>s.nodeId===n.id)).forEach(n=>drawNode(n));
  scroll.append(tree);cards.append(scroll,detail);
  if(offered[0]) explain(byId.get(offered[0].nodeId),offered[0]);
}
