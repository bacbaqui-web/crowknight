import { renderSkillTree } from './skill_tree_choice_view.js';
import { SKILL_PATHS, PROGRESSION_SKILLS } from './skill_progression_data.js';
import { UPGRADE_CARDS, upgradeEffectLabel } from './upgrade_card_data.js';

export function createPauseStatusView(root, onClose) {
  const modal=document.createElement('div');modal.className='upgrade-choice skill-choice pause-status';modal.hidden=true;
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','일시정지 · 성장 기록');
  const panel=document.createElement('section');panel.className='upgrade-choice-panel';modal.append(panel);root.append(modal);
  function heading(text) {const h=document.createElement('h3');h.textContent=text;return h;}
  return {
    hide(){modal.hidden=true;},
    show(skill, upgrades, actor) {
      panel.replaceChildren();
      const path=SKILL_PATHS.find(p=>p.id===skill.pathId);
      panel.style.setProperty('--tree-accent',path?.color || '#d9c79a');
      const header=document.createElement('header');header.className='pause-status-header';
      const title=document.createElement('h2');title.textContent='일시정지 · 성장 기록';
      const close=document.createElement('button');close.textContent='계속하기 · Tab';close.onclick=onClose;header.append(title,close);panel.append(header);
      const summary=document.createElement('p');summary.className='skill-tree-subtitle';
      summary.textContent=`Lv.${skill.level} · HP ${Math.ceil(actor.hp)} / ${Math.ceil(actor.maxHp)} · XP ${skill.xp} / ${(40+(skill.level-1)*20)*10} · ${path?.name || '계열 미선택'}${skill.banked?` · 보관 포인트 ${skill.banked}`:''}`;
      panel.append(summary);
      if(path) {
        const tree=document.createElement('div');tree.className='skill-tree-content';panel.append(tree);
        renderSkillTree(tree,[],skill.ranks,()=>{},path.id);
      } else panel.append(heading('첫 레벨업에서 성장 계열을 선택합니다.'));
      const skills=document.createElement('section');skills.className='pause-skill-list';skills.append(heading('습득한 기술'));
      for(const [id,rank] of Object.entries(skill.ranks)) {
        const data=PROGRESSION_SKILLS.find(s=>s.id===id);if(!data) continue;
        const row=document.createElement('p');row.textContent=`${data.name} ${rank}/3 · ${data.detail}`;skills.append(row);
      }
      if(!Object.keys(skill.ranks).length) {const p=document.createElement('p');p.textContent='아직 습득한 기술이 없습니다.';skills.append(p);}
      panel.append(skills);
      const columns=document.createElement('div');columns.className='pause-upgrade-columns';
      for(const side of ['player','enemy']) {
        const section=document.createElement('section');section.append(heading(side==='player'?'내 강화':'적 강화'));
        const entries=Object.entries(upgrades[side] || {}).filter(([,count])=>count>0);
        if(!entries.length) {const p=document.createElement('p');p.textContent='아직 적용된 강화가 없습니다.';section.append(p);}
        for(const [id,count] of entries) {
          const card=UPGRADE_CARDS.find(c=>c.id===id);if(!card) continue;
          const row=document.createElement('div');row.className='pause-upgrade-row';
          const icon=document.createElement('img');icon.src=card.icon;icon.alt='';
          const text=document.createElement('span');text.textContent=`${card.name} ×${count} · ${upgradeEffectLabel(card,count)}`;
          row.append(icon,text);section.append(row);
        }
        columns.append(section);
      }
      panel.append(columns);modal.hidden=false;(panel.querySelector('[data-skill-node]') || close).focus();
    },
  };
}
