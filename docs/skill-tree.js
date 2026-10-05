import { SKILL_PATHS } from '../src/skill_progression_data.js';
import { RUN_SKILLS } from '../src/skill_runtime_helper.js';
const key = 'crowKnight.skillTreePlan.v1';
const trees = document.querySelector('#trees');
const dialog = document.querySelector('#editor');
const form = document.querySelector('#skill-form');
const status = document.querySelector('#status');
const descriptions = {attack:'연속 타격과 강공격으로 공격을 확장합니다.',guard:'패링을 중심으로 방어와 반격을 확장합니다.',jump:'공중 이동과 공중 기술을 확장합니다.',roll:'회피와 위치 전환 기술을 확장합니다.'};
const motions = {fourthStrike:'공격 4타',chargeAttack:'응격 - 기모으기 → 응격 - 공격',parry:'방어 · 패링',doubleJump:'공중점프 (이단점프)',backflip:'백플립'};
const triggers = {fourthStrike:'Q 연속 공격의 4타',chargeAttack:'Q 길게 누르기 → 놓기',parry:'E 방어 시작 순간',doubleJump:'공중에서 Space',backflip:'↑ + W'};
let plan = { overrides:{}, additions:[] };
let editing;
function validate(value) {
  if (!value || !value.overrides || typeof value.overrides !== 'object' || Array.isArray(value.overrides) || !Array.isArray(value.additions)) throw new Error('설계 파일 형식이 맞지 않습니다.');
  const ids = new Set(RUN_SKILLS.map(s => s.id));
  for (const node of value.additions) {
    if (!node || typeof node.id !== 'string' || ids.has(node.id) || !SKILL_PATHS.some(p => p.id === node.pathId) || typeof node.name !== 'string') throw new Error('추가 기술 데이터가 올바르지 않습니다.');
    ids.add(node.id);
  }
  return value;
}
try { const saved = localStorage.getItem(key); if (saved) plan = validate(JSON.parse(saved)); } catch { status.textContent='저장된 설계를 읽지 못했습니다. 원본 기술 목록을 표시합니다.'; }
function nodes(path) {
  return [...path.skills.map(id => {
    const skill = RUN_SKILLS.find(s => s.id === id);
    return {id,pathId:path.id,name:skill.name,parent:id === path.first ? '' : path.first,
      trigger:triggers[id],effect:skill.detail.split(' · 강화마다')[0],upgrade:skill.detail.includes(' · 강화마다') ? skill.detail.split(' · 강화마다')[1] : '',motion:motions[id],notes:'',...plan.overrides[id],implemented:true,current:skill.detail};
  }), ...plan.additions.filter(n => n.pathId === path.id).map(n => ({...n,implemented:false}))];
}
function element(tag, text, className) {
  const el = document.createElement(tag); el.textContent=text; if(className) el.className=className; return el;
}
function render() {
  trees.replaceChildren();
  for (const path of SKILL_PATHS) {
    const column = element('article','','tree');column.style.setProperty('--color',path.color);
    column.append(element('h2',path.name),element('p',descriptions[path.id],'intro'),element('div','첫 레벨업 · 이 계열 선택','root'));
    const list = element('div','','nodes');const all=nodes(path);
    const ordered=[];const visited=new Set();
    function branch(parent,depth) {
      for(const node of all)if(node.parent===parent&&!visited.has(node.id)){visited.add(node.id);ordered.push({node,depth});branch(node.id,depth+1);}
    }
    branch('',0);for(const node of all)if(!visited.has(node.id))ordered.push({node,depth:0});
    for (const {node,depth} of ordered) {
      const wrap=element('div','','node');wrap.style.marginLeft=`${Math.min(depth,3)*12}px`;const card=element('button','','card');card.type='button';
      card.append(element('span',node.implemented?'● 현재 구현':'○ 추가 계획',node.implemented?'badge':'badge planned'));
      const parent=all.find(n => n.id === node.parent);
      card.append(element('strong',node.name),element('small',parent?`선행: ${parent.name}${node.implemented?' · 연결은 기획용':''}`:'계열 시작 기술'));
      if(node.trigger)card.append(element('p',`발동: ${node.trigger}`));
      card.append(element('p',node.effect||'습득 효과를 정해 주세요'));
      if(node.upgrade) card.append(element('p',`강화: ${node.upgrade}`));
      card.append(element('p',`모션: ${node.motion||'미정'}`,'motion'));
      card.addEventListener('click',() => open(path,node));wrap.append(card);list.append(wrap);
    }
    const add=element('button','＋ 이 계열에 기술 추가','add');add.type='button';add.addEventListener('click',() => open(path,{id:crypto.randomUUID(),pathId:path.id,parent:path.first,name:'',implemented:false}));
    column.append(list,add);trees.append(column);
  }
}
function open(path,node) {
  editing={path,node};form.reset();document.querySelector('#editor-path').textContent=`${path.name} 계열`;
  const current=document.querySelector('#current-effect');current.hidden=!node.implemented;current.textContent=`게임의 현재 효과: ${node.current} · 아래 수정은 설계 메모입니다.`;
  const select=form.elements.parent;select.replaceChildren(new Option('계열 시작 / 선행 없음',''));
  const all=nodes(path);
  const descendants=new Set([node.id]);let changed=true;
  while(changed){changed=false;for(const n of all)if(descendants.has(n.parent)&&!descendants.has(n.id)){descendants.add(n.id);changed=true;}}
  for(const n of all)if(!descendants.has(n.id))select.add(new Option(n.name,n.id));
  for(const field of ['name','parent','trigger','effect','upgrade','motion','notes'])form.elements[field].value=node[field]||'';
  document.querySelector('#delete').hidden=node.implemented||!plan.additions.some(n => n.id===node.id);
  dialog.showModal();
}
function save() {
  try { localStorage.setItem(key,JSON.stringify(plan));status.textContent='설계를 이 브라우저에 저장했습니다. 게임에 반영하려면 기술 구현과 모션 연결이 필요합니다.'; } catch {status.textContent='브라우저 저장에 실패했습니다. 설계 내보내기로 백업해 주세요.';}
  render();
}
form.addEventListener('submit',event => {
  event.preventDefault();const {node}=editing;const values={};
  for(const field of ['name','parent','trigger','effect','upgrade','motion','notes'])values[field]=form.elements[field].value.trim();
  if(!values.name)return;
  if(node.implemented)plan.overrides[node.id]=values;
  else {const index=plan.additions.findIndex(n => n.id===node.id);const value={...values,id:node.id,pathId:node.pathId};if(index<0)plan.additions.push(value);else plan.additions[index]=value;}
  save();dialog.close();
});
document.querySelector('#close').onclick=() => dialog.close();
document.querySelector('#delete').onclick=() => {
  const id=editing.node.id;plan.additions=plan.additions.filter(n => n.id!==id);
  for(const n of plan.additions)if(n.parent===id)n.parent='';
  for(const n of Object.values(plan.overrides))if(n.parent===id)n.parent='';
  save();dialog.close();
};
document.querySelector('#export').onclick=() => {
  const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='crow-knight-skill-tree.json';a.click();setTimeout(() => URL.revokeObjectURL(url),1000);
};
document.querySelector('#import').onchange=async event => {
  try {const file=event.target.files[0];if(!file)return;if(file.size>1000000)throw new Error('1MB 이하 설계 파일을 선택해 주세요.');plan=validate(JSON.parse(await file.text()));save();} catch(error){status.textContent=`불러오기 실패: ${error.message}`;}event.target.value='';
};
render();
