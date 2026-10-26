import { renderSkillTree } from './skill_tree_choice_view.js';
import { SKILL_PATHS } from './skill_progression_data.js';
import { UPGRADE_CARDS, upgradeEffectLabel } from './upgrade_card_data.js';

export function createPauseStatusView(root, onClose) {
  const modal=document.createElement('div');modal.className='upgrade-choice skill-choice pause-status';modal.hidden=true;
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','일시정지 · 성장 기록');
  const panel=document.createElement('section');panel.className='upgrade-choice-panel';modal.append(panel);root.append(modal);
  let resizeObserver;
  function heading(text) {const h=document.createElement('h3');h.textContent=text;return h;}
  return {
    hide(){modal.hidden=true;},
    show(skill, upgrades, actor) {
      resizeObserver?.disconnect();
      panel.replaceChildren();
      const path=SKILL_PATHS.find(p=>p.id===skill.pathId);
      panel.style.setProperty('--tree-accent',path?.color || '#d9c79a');
      const header=document.createElement('header');header.className='pause-status-header';
      const title=document.createElement('h2');title.textContent='일시정지 · 성장 기록';
      const close=document.createElement('button');close.textContent='계속하기 · Tab';close.onclick=onClose;header.append(title,close);panel.append(header);
      const summary=document.createElement('p');summary.className='skill-tree-subtitle';
      summary.textContent=`Lv.${skill.level} · HP ${Math.ceil(actor.hp)} / ${Math.ceil(actor.maxHp)} · XP ${skill.xp} / ${(40+(skill.level-1)*20)*10} · ${path?.name || '계열 미선택'}${skill.banked?` · 보관 포인트 ${skill.banked}`:''}`;
      panel.append(summary);
      const layout=document.createElement('div');layout.className='pause-overview';panel.append(layout);
      const left=document.createElement('section');left.className='pause-tree';layout.append(left);
      left.append(heading('내 스킬트리'));
      if(path) {
        const tree=document.createElement('div');tree.className='skill-tree-content';left.append(tree);
        renderSkillTree(tree,[],skill.ranks,()=>{},path.id);
      } else left.append(heading('첫 레벨업에서 성장 계열을 선택합니다.'));
      const columns=document.createElement('div');columns.className='pause-upgrade-columns';
      for(const side of ['player','enemy']) {
        const section=document.createElement('section');section.append(heading(side==='player'?'내 강화':'적 강화'));
        const entries=Object.entries(upgrades[side] || {}).filter(([,count])=>count>0);
        if(!entries.length) {const p=document.createElement('p');p.textContent='아직 적용된 강화가 없습니다.';section.append(p);}
        for(const [id,count] of entries) {
          const card=UPGRADE_CARDS.find(c=>c.id===id);if(!card) continue;
          const row=document.createElement('div');row.className='pause-upgrade-row';
          const icon=document.createElement('img');icon.src=new URL(`../${card.icon}`,import.meta.url).href;icon.alt='';
          const text=document.createElement('span');text.textContent=`${card.name} ×${count} · ${upgradeEffectLabel(card,count)}`;
          row.title=text.textContent;row.tabIndex=0;row.append(icon,text);section.append(row);
        }
        columns.append(section);
      }
      layout.append(columns);modal.hidden=false;
      const fit=()=>{const board=left.querySelector('.skill-tree-board');if(board) board.style.zoom=String(Math.max(.2,Math.min(1,left.clientWidth/720,(layout.clientHeight-145)/385)));};
      resizeObserver=new ResizeObserver(fit);resizeObserver.observe(layout);fit();
      (panel.querySelector('[data-skill-node]') || close).focus();
    },
  };
}
