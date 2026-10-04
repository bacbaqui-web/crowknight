import { UPGRADE_CARDS, upgradeEffectLabel } from './upgrade_card_data.js';

export function createUpgradeHud({ root = document.querySelector('.stage-wrap') } = {}) {
  if (!root) return { render() {}, setVisible() {} };
  const hud = document.createElement('aside');
  hud.className = 'upgrade-hud';
  hud.setAttribute('aria-label', '이번 판 강화 현황');
  hud.hidden = true;
  const rows = {};
  for (const [side, label] of [
    ['player', '내 강화'],
    ['enemy', '적 강화'],
  ]) {
    const row = document.createElement('section');
    row.className = `upgrade-hud-row upgrade-hud-${side}`;
    const heading = document.createElement('h2');
    heading.textContent = label;
    const list = document.createElement('div');
    list.className = 'upgrade-hud-list';
    row.append(heading, list);
    hud.append(row);
    rows[side] = list;
  }
  const detail = document.createElement('output');
  detail.className = 'upgrade-hud-detail';
  detail.hidden = true;
  hud.append(detail);
  root.append(hud);
  let signature = '';
  function render(snapshot) {
    const next = JSON.stringify(snapshot);
    if (next === signature) return;
    signature = next;
    detail.hidden = true;
    for (const side of ['player', 'enemy']) {
      const list = rows[side];
      list.replaceChildren();
      for (const card of UPGRADE_CARDS) {
        const count = snapshot?.[side]?.[card.id] || 0;
        if (!count) continue;
        const text = `${side === 'player' ? '내' : '적'} ${card.name} · ${count}회 · ${upgradeEffectLabel(card, count)}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'upgrade-hud-icon';
        button.title = text;
        button.setAttribute('aria-label', text);
        const image = document.createElement('img');
        image.src = card.icon;
        image.alt = '';
        const badge = document.createElement('span');
        badge.textContent = `×${count}`;
        button.append(image, badge);
        button.addEventListener('click', () => {
          detail.textContent = text;
          detail.hidden = false;
        });
        list.append(button);
      }
      if (!list.childElementCount) {
        const empty = document.createElement('span');
        empty.className = 'upgrade-hud-empty';
        empty.textContent = '강화 없음';
        list.append(empty);
      }
    }
  }
  return {
    render,
    setVisible: (visible) => {
      hud.hidden = !visible;
      if (!visible) detail.hidden = true;
    },
  };
}
