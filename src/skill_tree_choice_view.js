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
export function adjacentSkillNode(nodes, currentId, key) {
  const current=nodes.find(n=>n.id===currentId);
  const axis={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
  if(!current || !axis) return null;
  return nodes.filter(n=>(n.x-current.x)*axis[0]+(n.y-current.y)*axis[1]>1)
    .sort((a,b)=>score(a)-score(b))[0] || null;
  function score(n) {
    const dx=n.x-current.x,dy=n.y-current.y;
    return Math.hypot(dx,dy)+Math.abs(dx*axis[1]-dy*axis[0])*2;
  }
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
  const elements=new Map();
  let inspected=offered[0]?.nodeId;
  function explain(node,choice) {
    inspected=node.id;
    elements.forEach((el,id)=>el.classList.toggle('inspected',id===node.id));
    detail.replaceChildren();
    const name=document.createElement('strong'),text=document.createElement('p');
    name.textContent=node.name;text.textContent=node.detail;
    const hint=document.createElement('small');hint.textContent=choice?'방향키로 둘러보기 · Enter / 클릭 / 숫자키로 습득·강화':ranks[node.effectId]?'이미 습득한 기술입니다.':'선행 기술을 따라 진행하면 열립니다. 선택하지 않은 가지로는 돌아갈 수 없습니다.';
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

    }
    el.tabIndex=0;el.dataset.skillNode=node.id;
    el.setAttribute('aria-label',`${node.name} · ${status.textContent} · ${node.detail}`);
    el.addEventListener('focus',()=>explain(node,choice));
    elements.set(node.id,el);
    el.title=node.detail;el.addEventListener('pointermove',()=>{if(inspected!==node.id) explain(node,choice);});
    tree.append(el);
  }
  // Keep DOM button order identical to numeric-choice order even though positions follow the tree.
  offered.forEach((choice,i)=>drawNode(byId.get(choice.nodeId),choice,i));
  nodes.filter(n=>!offered.some(s=>s.nodeId===n.id)).forEach(n=>drawNode(n));
  tree.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();event.stopPropagation();
    const next=adjacentSkillNode(nodes,document.activeElement?.dataset.skillNode || inspected,event.key);
    if(next) {
      const el=elements.get(next.id);el.focus({preventScroll:true});
      el.scrollIntoView({block:'nearest',inline:'nearest'});
    }
  });
  scroll.append(tree);cards.append(scroll,detail);
  if(offered[0]) explain(byId.get(offered[0].nodeId),offered[0]);
}
