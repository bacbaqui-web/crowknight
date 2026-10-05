import { bindChoiceNumberKeys } from './input_control_controller.js';
import { RUN_SKILLS } from './skill_runtime_helper.js';
import { SKILL_PATHS } from './skill_progression_data.js';
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
  panel.append(title, cards);
  modal.append(panel);
  root.append(modal);
  bindChoiceNumberKeys({ modal, cards });
  modal.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    if (event.key !== 'Tab') return;
    const buttons = [...cards.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    event.preventDefault();
    buttons[(index + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
  });
  return {
    render({ level, xp, threshold, ranks }) {
      label.textContent = `Lv.${level} · ${xp} / ${threshold} XP`;
      bar.max = threshold;
      bar.value = xp;
      skills.textContent = Object.entries(ranks)
        .map(([id, rank]) => `${RUN_SKILLS.find((skill) => skill.id === id)?.name || id} ${rank}`)
        .join(' · ');
    },
    setVisible(value) {
      hud.hidden = !value || !showHud;
    },
    show(offered, ranks, choose, pathId) {
      title.textContent = pathId
        ? `레벨업 · ${SKILL_PATHS.find((path) => path.id === pathId)?.name} 계열 기술 습득과 강화`
        : '첫 레벨업 · 이번 판의 기술 계열을 선택하세요';
      cards.replaceChildren();
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
        name.textContent = `${skill.name} · ${ranks[skill.id] ? '강화' : '습득'}`;
        const detail = document.createElement('span');
        detail.textContent = skill.detail;
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
