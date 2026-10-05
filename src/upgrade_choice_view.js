import { UPGRADE_CARDS, upgradeEffectLabel } from './upgrade_card_data.js';

export function createUpgradeChoiceView({ root = document.querySelector('.stage-wrap'), onChoose }) {
  const modal = document.createElement('div');
  modal.className = 'upgrade-choice boss-upgrade-choice';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'upgradeChoiceTitle');
  const panel = document.createElement('section');
  panel.className = 'upgrade-choice-panel';
  const title = document.createElement('h2');
  title.id = 'upgradeChoiceTitle';
  title.textContent = '보스 처치 · 강화 선택';
  const description = document.createElement('p');
  description.textContent = '선택한 효과는 나에게, 남은 효과는 모든 적에게 적용됩니다.';
  const cards = document.createElement('div');
  cards.className = 'upgrade-choice-cards';
  panel.append(title, description, cards);
  modal.append(panel);
  root.append(modal);
  let previousFocus;
  modal.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    const number = Number(event.key);
    if (number === 1 || number === 2) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) cards.querySelectorAll('button')[number - 1]?.click();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = [...cards.querySelectorAll('button')];
    const first = buttons[0],
      last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  return {
    show(pair) {
      previousFocus = document.activeElement;
      cards.replaceChildren();
      pair.forEach((id, index) => {
        const card = UPGRADE_CARDS.find((item) => item.id === id);
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-keyshortcuts', String(index + 1));
        const shortcut = document.createElement('kbd');
        shortcut.textContent = String(index + 1);
        button.className = 'upgrade-choice-card';
        const image = document.createElement('img');
        image.src = card.icon;
        image.alt = '';
        const name = document.createElement('strong');
        name.textContent = card.name;
        const effect = document.createElement('span');
        effect.textContent = upgradeEffectLabel(card);
        const target = document.createElement('small');
        target.textContent = '내가 획득 · 다른 카드는 적이 획득';
        button.append(shortcut, image, name, effect, target);
        button.addEventListener('click', () => onChoose(id, pair));
        cards.append(button);
      });
      modal.hidden = false;
      cards.querySelector('button')?.focus();
    },
    hide() {
      modal.hidden = true;
      if (previousFocus?.isConnected) previousFocus.focus();
    },
  };
}
