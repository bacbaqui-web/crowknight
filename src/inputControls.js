import { GAME_KEYS } from './gameConfig.js';
import { isTextInput } from './tuningPanelBindings.js';

export function bindKeyboardControls({ keys, pressed, handleShortcut }) {
  addEventListener(
    'keydown',
    (event) => {
      if (handleShortcut(event)) return;
      if (event.metaKey || event.ctrlKey) return;
      if (!GAME_KEYS.has(event.code)) return;
      if (isTextInput(event.target) && !isSettingsPanelTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!keys.has(event.code)) pressed.add(event.code);
      keys.add(event.code);
    },
    true
  );

  addEventListener(
    'keyup',
    (event) => {
      if (event.metaKey || event.ctrlKey) return;
      if (!GAME_KEYS.has(event.code)) return;
      if (isTextInput(event.target) && !isSettingsPanelTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      keys.delete(event.code);
    },
    true
  );
}

export function bindTouchControls(keys, pressed) {
  document.querySelectorAll('[data-hold-code]').forEach((button) => {
    const code = button.dataset.holdCode;
    const release = () => {
      keys.delete(code);
      button.classList.remove('is-pressed');
    };

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
      button.classList.add('is-pressed');
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  document.querySelectorAll('[data-tap-code]').forEach((button) => {
    const code = button.dataset.tapCode;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      pressed.add(code);
      button.classList.add('is-pressed');
      setTimeout(() => button.classList.remove('is-pressed'), 120);
    });
  });
}

function isSettingsPanelTarget(target) {
  return Boolean(target?.closest?.('#tuningPanel'));
}

export function bindBattleControls({ startBattleButton, homeStartButton, endBattleButton }, actions) {
  startBattleButton?.addEventListener('click', actions.startRun);
  homeStartButton?.addEventListener('click', actions.startRun);

  endBattleButton?.addEventListener('click', () => {
    actions.endRun();
    endBattleButton.blur();
  });
}

export function bindCollapsibleSections() {
  document.querySelectorAll('[data-collapsible]').forEach((section) => {
    const button = section.querySelector('.section-toggle');
    button.addEventListener('click', () => {
      const isOpen = section.classList.toggle('is-open');
      section.dispatchEvent(new CustomEvent('sectiontoggle', { detail: { isOpen } }));
    });
  });
}
