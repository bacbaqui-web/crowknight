import { renderSkillTree } from './skill_tree_choice_view.js';
import { bindChoiceNumberKeys } from './input_control_controller.js';
import { SKILL_PATHS, PROGRESSION_SKILLS } from './skill_progression_data.js';
export function createExperienceView(root = document.querySelector('.stage-wrap'), { showHud = false } = {}) {
  const hud = document.createElement('div');
  hud.className = 'experience-hud';
  hud.hidden = true;
  const label = document.createElement('div'),
    bar = document.createElement('progress'),
    skills = document.createElement('small');
  hud.append(label, bar, skills);
  root.append(hud);
  const modal = document.createElement('div');
  modal.className = 'upgrade-choice skill-choice';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', '레벨업 기술 선택');
  const panel = document.createElement('section');
  panel.className = 'upgrade-choice-panel';
  const title = document.createElement('h2');
  title.textContent = '레벨업 · 기술 습득과 강화';
  const cards = document.createElement('div');
  cards.className = 'upgrade-choice-cards';
  const subtitle=document.createElement('p');
  subtitle.className='skill-tree-subtitle';
  panel.append(title, subtitle, cards);
  modal.append(panel);
  root.append(modal);
  bindChoiceNumberKeys({ modal, cards });
  modal.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    if (event.key !== 'Tab') return;
    const buttons = [...cards.querySelectorAll('.skill-tree-node, .upgrade-choice-card')];
    const index = buttons.indexOf(document.activeElement);
    event.preventDefault();
    buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
  });
  return {
    render({ level, xp, threshold, ranks, banked = 0 }) {
      label.textContent = `Lv.${level} · ${xp} / ${threshold} XP${banked ? ` · 보관 포인트 ${banked}` : ''}`;
      bar.max = threshold;
      bar.value = xp;
      skills.textContent = Object.entries(ranks)
        .map(([id, rank]) => `${PROGRESSION_SKILLS.find((skill) => skill.id === id)?.name || id} ${rank}/3`)
        .join(' · ');
    },
    setVisible(value) {
      hud.hidden = !value || !showHud;
    },
    show(offered, ranks, choose, pathId) {
      title.textContent = pathId
        ? `레벨업 · ${SKILL_PATHS.find((path) => path.id === pathId)?.name} 계열 기술 습득과 강화`
        : '첫 레벨업 · 이번 판의 길을 선택하세요';
      modal.classList.toggle('path-choice', !pathId);
      subtitle.textContent=pathId?'방향키 / 마우스로 기술 확인 · Enter / 숫자키로 선택':'공격 · 방어 · 이동 — 이번 전투에서 이어갈 계열을 선택하세요';
      panel.style.setProperty('--tree-accent',SKILL_PATHS.find(p=>p.id===pathId)?.color || '#d9c79a');
      cards.classList.toggle('skill-tree-content',Boolean(pathId));
      cards.replaceChildren();
      if(pathId) {
        renderSkillTree(cards,offered,ranks,choose,pathId);
        modal.hidden=false;cards.querySelector('button')?.focus();return;
      }
      for (const [index, skill] of offered.entries()) {
        const button = document.createElement('button');
        button.className = 'upgrade-choice-card';
        button.style.setProperty('--skill-color', skill.color || '#ffffff');
        button.type = 'button';
        const shortcut = document.createElement('kbd');
        shortcut.textContent = String(index + 1);
        button.setAttribute('aria-keyshortcuts', String(index + 1));
        const image = document.createElement('img');
        image.src = new window.URL(`../assets/icons/upgrades/${skill.icon}.svg`, import.meta.url).href;
        image.alt = '';
        const name = document.createElement('strong');
        name.textContent = skill.kind === 'path' ? skill.name : `${skill.name} · ${ranks[skill.effectId] ? '강화' : '습득'} ${(ranks[skill.effectId] || 0) + 1}/${skill.maxRank}`;
        const detail = document.createElement('span');
        detail.textContent = skill.detail;
        if (skill.branchLabel) {
          const branch = document.createElement('small');
          branch.textContent = skill.branchLabel;
          button.append(branch);
        }
        button.append(shortcut, image, name, detail);
        button.onclick = () => choose(skill.id, offered);
        cards.append(button);
      }
      modal.hidden = false;
      cards.querySelector('button')?.focus();
    },
    hide() {
      modal.hidden = true;
    },
  };
}
